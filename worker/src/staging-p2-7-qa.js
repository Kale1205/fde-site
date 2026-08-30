import { appendAuditEvent } from './staging-audit-log.js';
import { STAGING_ORDER_TTL } from './staging-expiry-cron.js';
import { createQuoteWindow, getQuoteState } from './staging-quote-policy.js';
import { stagingOrderIndexKey } from './staging-stripe-webhook.js';

export const P2_7_QA_PATH = '/__staging/p2-7';
export const P2_7_ORDER_PATH = '/__staging/p2-7/order';
export const P2_7_EULA_PATH = '/__staging/p2-7/eula';
export const P2_7_STATUS_PATH = '/__staging/p2-7/status';
export const P2_7_EULA_VERSION = 'FDE-IMS-STAGING-EULA-2026-08-27';

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const encoder = new TextEncoder();

class P27Error extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'P27Error';
    this.code = code;
    this.status = status;
  }
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-FDE-Environment': 'staging'
  }
});

async function secretsMatch(expected, supplied) {
  const expectedValue = clean(expected, 1000);
  const suppliedValue = clean(supplied, 1000);
  if (!expectedValue || !suppliedValue) return false;
  const data = encoder.encode('baked-kale-staging-p2-7-authorization');
  const expectedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(expectedValue), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const suppliedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(suppliedValue), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const suppliedSignature = await crypto.subtle.sign('HMAC', suppliedKey, data);
  return crypto.subtle.verify('HMAC', expectedKey, suppliedSignature, data);
}

async function requireOperator(request, env) {
  if (!clean(env?.STAGING_CHECKOUT_SETUP_KEY, 1000)) throw new P27Error('P2_7_AUTH_NOT_CONFIGURED', 503);
  if (!await secretsMatch(env.STAGING_CHECKOUT_SETUP_KEY, request.headers.get('X-FDE-Staging-Checkout-Key'))) {
    throw new P27Error('P2_7_AUTH_FAILED', 403);
  }
}

async function readJson(request) {
  let raw;
  try { raw = await request.json(); } catch { throw new P27Error('P2_7_JSON_INVALID'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new P27Error('P2_7_JSON_INVALID');
  return raw;
}

async function loadOrder(env, orderId) {
  if (!env?.ORDER_STATUS?.get || !env.ORDER_STATUS?.put) throw new P27Error('STAGING_KV_NOT_CONFIGURED', 503);
  const orderKey = await env.ORDER_STATUS.get(stagingOrderIndexKey(orderId));
  if (!orderKey) throw new P27Error('P2_7_ORDER_NOT_FOUND', 404);
  const raw = await env.ORDER_STATUS.get(orderKey);
  if (!raw) throw new P27Error('P2_7_ORDER_NOT_FOUND', 404);
  let order;
  try { order = JSON.parse(raw); } catch { throw new P27Error('P2_7_ORDER_RECORD_INVALID', 500); }
  if (clean(order?.stagingOrderId, 120) !== orderId) throw new P27Error('P2_7_ORDER_INDEX_MISMATCH', 500);
  return { orderKey, order };
}

async function createQaOrder(env, raw, now) {
  if (!env?.ORDER_STATUS?.put) throw new P27Error('STAGING_KV_NOT_CONFIGURED', 503);
  const id = crypto.randomUUID();
  const quote = createQuoteWindow(now);
  const key = `staging:order:${now.getTime()}:${id}`;
  const productKey = clean(raw?.productKey, 120) || 'fde-ims-license';
  const currency = clean(raw?.currency, 10).toLowerCase() || 'jpy';
  if (!['fde-ims-license', 'fde-ims-license-plus'].includes(productKey)) throw new P27Error('P2_7_PRODUCT_NOT_ALLOWED');
  if (!['jpy', 'usd'].includes(currency)) throw new P27Error('P2_7_CURRENCY_NOT_ALLOWED');

  const record = {
    staging: true,
    dryRun: true,
    p27Qa: true,
    mailSent: false,
    receivedAt: now.toISOString(),
    type: 'order',
    lang: clean(raw?.lang, 10) || 'ja',
    name: 'P2-7 Sandbox QA',
    company: 'Baked Kale staging QA',
    country: 'JP',
    email: '',
    product: productKey,
    requestedCurrency: currency,
    message: 'P2-7 staging-only Stripe Sandbox end-to-end verification order.',
    stagingOrderId: id,
    orderStatus: 'order_received',
    ...quote,
    autoCancelEnabled: true
  };

  await env.ORDER_STATUS.put(key, JSON.stringify(record), { expirationTtl: STAGING_ORDER_TTL });
  await env.ORDER_STATUS.put(stagingOrderIndexKey(id), key, { expirationTtl: STAGING_ORDER_TTL });
  try {
    await appendAuditEvent(env, {
      eventId: `p2-7-order-${id}`,
      orderId: id,
      actor: 'operator:staging-qa',
      action: 'quote_issued',
      fromStatus: null,
      toStatus: 'order_received',
      reason: 'p2_7_sandbox_qa_order_created',
      source: 'p2_7_qa',
      occurredAt: now,
      metadata: {
        quoteIssuedAt: quote.quoteIssuedAt,
        quoteExpiresAt: quote.quoteExpiresAt,
        quoteValidityDays: quote.quoteValidityDays,
        productKey,
        currency
      }
    }, { expirationTtl: STAGING_ORDER_TTL });
  } catch (error) {
    await env.ORDER_STATUS.delete?.(key);
    await env.ORDER_STATUS.delete?.(stagingOrderIndexKey(id));
    throw error;
  }
  return { orderId: id, quote, productKey, currency };
}

async function acceptEula(env, raw, now) {
  const orderId = clean(raw?.orderId, 120);
  if (!orderId) throw new P27Error('P2_7_ORDER_ID_REQUIRED');
  if (raw?.accepted !== true) throw new P27Error('P2_7_EULA_ACCEPTANCE_REQUIRED');
  const version = clean(raw?.version, 120);
  if (version !== P2_7_EULA_VERSION) throw new P27Error('P2_7_EULA_VERSION_MISMATCH', 409);

  const { orderKey, order } = await loadOrder(env, orderId);
  const existing = order?.eulaAcceptance;
  if (existing?.version === P2_7_EULA_VERSION && clean(existing?.acceptedAt, 80)) {
    return { orderId, reused: true, eulaAcceptance: existing };
  }
  if (order?.staging !== true || order?.dryRun !== true) throw new P27Error('P2_7_STAGING_ORDER_REQUIRED', 409);
  if (getQuoteState(order.quoteExpiresAt, now) !== 'valid') throw new P27Error('P2_7_QUOTE_EXPIRED', 409);
  const fromStatus = clean(order.orderStatus, 80);
  if (!['order_received', 'billing_preparation'].includes(fromStatus)) {
    throw new P27Error('P2_7_ORDER_STATE_NOT_ELIGIBLE', 409);
  }

  const acceptance = {
    version: P2_7_EULA_VERSION,
    acceptedAt: now.toISOString(),
    accepted: true,
    actor: 'staging-test-operator',
    source: 'p2_7_qa',
    legalEffect: 'staging_test_only'
  };

  await appendAuditEvent(env, {
    eventId: `p2-7-eula-${orderId}-${P2_7_EULA_VERSION}`,
    orderId,
    actor: 'operator:staging-qa',
    action: 'eula_accepted',
    fromStatus,
    toStatus: fromStatus,
    reason: 'staging_test_eula_acceptance_recorded',
    source: 'p2_7_qa',
    occurredAt: now,
    metadata: {
      eulaVersion: P2_7_EULA_VERSION,
      legalEffect: 'staging_test_only'
    }
  }, { expirationTtl: STAGING_ORDER_TTL });

  const updated = { ...order, eulaAcceptance: acceptance, updatedAt: now.toISOString() };
  await env.ORDER_STATUS.put(orderKey, JSON.stringify(updated), { expirationTtl: STAGING_ORDER_TTL });
  return { orderId, reused: false, eulaAcceptance: acceptance };
}

async function orderStatus(env, raw) {
  const orderId = clean(raw?.orderId, 120);
  if (!orderId) throw new P27Error('P2_7_ORDER_ID_REQUIRED');
  const { order } = await loadOrder(env, orderId);
  const status = clean(order.orderStatus, 80);
  return {
    orderId,
    orderStatus: status,
    quoteExpiresAt: clean(order.quoteExpiresAt, 80),
    eulaAcceptance: order.eulaAcceptance ? {
      version: clean(order.eulaAcceptance.version, 120),
      acceptedAt: clean(order.eulaAcceptance.acceptedAt, 80),
      legalEffect: clean(order.eulaAcceptance.legalEffect, 80)
    } : null,
    checkoutSessionId: clean(order?.paymentExpectation?.checkoutSessionId, 160) || null,
    paymentConfirmedAt: clean(order.paymentConfirmedAt, 80) || null,
    webhookConfirmed: ['payment_confirmed', 'preparing_delivery', 'delivered'].includes(status)
  };
}

function qaHtml() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>P2-7 Stripe Sandbox QA | Baked Kale</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f4f7f5;color:#173126}.wrap{max-width:720px;margin:auto;padding:24px}.card{background:#fff;border:1px solid #ccd8d0;border-radius:14px;padding:18px;margin:14px 0}h1{font-size:24px}h2{font-size:18px;margin-top:0}label{display:block;font-weight:700;margin:12px 0 6px}input,select,button{font:inherit}input,select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #aebdb4;border-radius:9px;background:#fff}button,.link{display:inline-block;margin-top:12px;padding:11px 15px;border:0;border-radius:9px;background:#173126;color:#fff;text-decoration:none;font-weight:800}button:disabled{opacity:.45}.warn{background:#fff8e6;border-color:#e1c778}.ok{color:#0b7045;font-weight:800}.muted{color:#66756d;font-size:13px;line-height:1.6}pre{white-space:pre-wrap;word-break:break-word;background:#eef3f0;padding:12px;border-radius:9px;font-size:12px}.check{display:flex;gap:10px;align-items:flex-start}.check input{width:auto;margin-top:4px}</style></head><body><main class="wrap"><h1>P2-7 Stripe Sandbox QA</h1><div class="card warn"><strong>staging専用です。</strong><p class="muted">ここで保存するEULA同意はテスト記録であり、正式契約ではありません。本番決済・公開Checkoutは有効化されません。UpdatesはLicense専用Add-onの権利判定が完成するまでCheckout対象外です。</p></div><div class="card"><label>Staging Checkout操作キー</label><input id="key" type="password" autocomplete="off" placeholder="Cloudflare Secretに登録した操作キー"><p class="muted">このページはキーを保存しません。SlackやGitHubへ貼らないでください。</p></div><div class="card"><h2>1. Sandboxテスト注文を作成</h2><label>商品</label><select id="product"><option value="fde-ims-license">FDE IMS License</option><option value="fde-ims-license-plus">FDE IMS License Plus</option></select><label>通貨</label><select id="currency"><option value="jpy">JPY</option><option value="usd">USD</option></select><button id="create">テスト注文を作成</button><label>Order ID</label><input id="orderId" autocomplete="off" placeholder="既存Order IDを貼り付けても確認できます"><p class="muted">決済後にこのページへ戻ってOrder IDが消えた場合は、ここへ既存Order IDを貼り付けてWebhook結果を確認できます。</p></div><div class="card"><h2>2. EULA同意を保存</h2><p><a href="https://kales-fde-staging.pages.dev/fde-site/license.html" target="_blank" rel="noopener">License / EULA概要を別タブで確認</a></p><div class="check"><input id="accept" type="checkbox"><label for="accept" style="margin:0">${P2_7_EULA_VERSION} のstagingテスト同意を記録する</label></div><button id="eula" disabled>EULA同意を保存</button></div><div class="card"><h2>3. Stripe Sandbox Checkout</h2><button id="checkout" disabled>Sandbox Checkoutを作成</button><p><a id="checkoutLink" class="link" target="_blank" rel="noopener" hidden>Stripe Sandbox Checkoutを開く</a></p><p class="muted">Checkoutは別タブで開いてください。このQA画面を残しておくとWebhook確認が簡単です。</p></div><div class="card"><h2>4. Webhook結果を確認</h2><button id="status" disabled>注文状態を確認</button><p id="summary" class="ok"></p><pre id="out">準備完了</pre></div></main><script>const $=id=>document.getElementById(id);const out=$('out');const show=x=>{out.textContent=typeof x==='string'?x:JSON.stringify(x,null,2)};async function post(path,body){const key=$('key').value.trim();if(!key)throw new Error('操作キーを入力してください');const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-FDE-Staging-Checkout-Key':key},body:JSON.stringify(body)});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error((j.error||'HTTP_ERROR')+' (HTTP '+r.status+')');return j}function order(){return $('orderId').value.trim()}function syncOrderControls(){$('status').disabled=!order();$('eula').disabled=!$('accept').checked||!order()}$('orderId').oninput=syncOrderControls;$('create').onclick=async()=>{try{const j=await post('${P2_7_ORDER_PATH}',{productKey:$('product').value,currency:$('currency').value,lang:'ja'});$('orderId').value=j.orderId;syncOrderControls();show(j)}catch(e){show(e.message)}};$('accept').onchange=syncOrderControls;$('eula').onclick=async()=>{try{const j=await post('${P2_7_EULA_PATH}',{orderId:order(),accepted:true,version:'${P2_7_EULA_VERSION}'});$('checkout').disabled=false;show(j)}catch(e){show(e.message)}};$('checkout').onclick=async()=>{try{const j=await post('/__staging/stripe/checkout-session',{orderId:order(),productKey:$('product').value,currency:$('currency').value});const a=$('checkoutLink');a.href=j.checkoutUrl;a.hidden=false;show(j)}catch(e){show(e.message)}};$('status').onclick=async()=>{try{const j=await post('${P2_7_STATUS_PATH}',{orderId:order()});$('summary').textContent=j.webhookConfirmed?'Webhook確認済み: payment_confirmed':'現在: '+j.orderStatus;show(j)}catch(e){show(e.message)}};</script></body></html>`;
}

const html = () => new Response(qaHtml(), {
  status: 200,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'X-FDE-Environment': 'staging'
  }
});

export async function handleP27Qa(request, env, { now = new Date() } = {}) {
  const url = new URL(request.url);
  if (url.pathname === P2_7_QA_PATH) {
    if (request.method !== 'GET') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    return html();
  }
  if (![P2_7_ORDER_PATH, P2_7_EULA_PATH, P2_7_STATUS_PATH].includes(url.pathname)) {
    return json({ ok: false, error: 'P2_7_ROUTE_NOT_FOUND' }, 404);
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    await requireOperator(request, env);
    const raw = await readJson(request);
    if (url.pathname === P2_7_ORDER_PATH) {
      const result = await createQaOrder(env, raw, now);
      return json({ ok: true, staging: true, liveMode: false, eulaVersion: P2_7_EULA_VERSION, ...result });
    }
    if (url.pathname === P2_7_EULA_PATH) {
      const result = await acceptEula(env, raw, now);
      return json({ ok: true, staging: true, liveMode: false, ...result });
    }
    const result = await orderStatus(env, raw);
    return json({ ok: true, staging: true, liveMode: false, ...result });
  } catch (error) {
    const code = error instanceof P27Error ? error.code : clean(error?.message, 160) || 'P2_7_PROCESSING_FAILED';
    const status = error instanceof P27Error ? error.status : 503;
    console.error(JSON.stringify({ message: 'P2-7 staging QA rejected', error: code, status }));
    return json({ ok: false, error: code }, status);
  }
}
