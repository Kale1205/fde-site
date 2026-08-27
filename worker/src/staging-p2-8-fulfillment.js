import { appendAuditEvent } from './staging-audit-log.js';
import { STAGING_ORDER_TTL } from './staging-expiry-cron.js';
import { stagingOrderIndexKey } from './staging-stripe-webhook.js';

export const P2_8_QA_PATH = '/__staging/p2-8';
export const P2_8_PREPARE_PATH = '/__staging/p2-8/prepare';
export const P2_8_SIMULATE_DELIVERY_PATH = '/__staging/p2-8/simulate-delivery';
export const P2_8_STATUS_PATH = '/__staging/p2-8/status';
export const P2_8_FLOW = Object.freeze([
  'payment_confirmed',
  'preparing_delivery',
  'delivered'
]);

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const encoder = new TextEncoder();

class P28Error extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'P28Error';
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
  const data = encoder.encode('baked-kale-staging-p2-8-authorization');
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
  if (!clean(env?.STAGING_CHECKOUT_SETUP_KEY, 1000)) throw new P28Error('P2_8_AUTH_NOT_CONFIGURED', 503);
  if (!await secretsMatch(env.STAGING_CHECKOUT_SETUP_KEY, request.headers.get('X-FDE-Staging-Checkout-Key'))) {
    throw new P28Error('P2_8_AUTH_FAILED', 403);
  }
}

async function readJson(request) {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > 16 * 1024) throw new P28Error('P2_8_BODY_TOO_LARGE', 413);
  let raw;
  try { raw = await request.json(); } catch { throw new P28Error('P2_8_JSON_INVALID'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new P28Error('P2_8_JSON_INVALID');
  return raw;
}

async function loadOrder(env, orderId) {
  if (!env?.ORDER_STATUS?.get || !env.ORDER_STATUS?.put) throw new P28Error('STAGING_KV_NOT_CONFIGURED', 503);
  const orderKey = await env.ORDER_STATUS.get(stagingOrderIndexKey(orderId));
  if (!orderKey) throw new P28Error('P2_8_ORDER_NOT_FOUND', 404);
  const raw = await env.ORDER_STATUS.get(orderKey);
  if (!raw) throw new P28Error('P2_8_ORDER_NOT_FOUND', 404);
  let order;
  try { order = JSON.parse(raw); } catch { throw new P28Error('P2_8_ORDER_RECORD_INVALID', 500); }
  if (clean(order?.stagingOrderId, 120) !== orderId) throw new P28Error('P2_8_ORDER_INDEX_MISMATCH', 500);
  return { orderKey, order };
}

function assertStagingPaidOrder(order) {
  if (order?.staging !== true || order?.dryRun !== true) throw new P28Error('P2_8_STAGING_ORDER_REQUIRED', 409);
  if (clean(order?.payment?.provider, 40) !== 'stripe') throw new P28Error('P2_8_STRIPE_PAYMENT_REQUIRED', 409);
  if (!clean(order?.payment?.providerEventId, 160) || !clean(order?.paymentConfirmedAt, 80)) {
    throw new P28Error('P2_8_WEBHOOK_CONFIRMATION_REQUIRED', 409);
  }
  if (order?.eulaAcceptance?.accepted !== true || !clean(order?.eulaAcceptance?.acceptedAt, 80)) {
    throw new P28Error('P2_8_EULA_ACCEPTANCE_REQUIRED', 409);
  }
}

function buildManifest(order, now) {
  return {
    schemaVersion: 1,
    staging: true,
    mode: 'staging_simulation_only',
    preparedAt: now.toISOString(),
    paymentConfirmedAt: clean(order.paymentConfirmedAt, 80),
    productKey: clean(order?.paymentExpectation?.productKey || order?.product, 120),
    artifacts: {
      invoice: { required: true, status: 'payment_provider_reference_only' },
      deliveryNote: { required: true, status: 'simulated_ready' },
      receipt: { required: true, status: 'payment_provider_reference_only' },
      installer: { required: true, status: 'withheld_product_not_released' }
    },
    customerMailSent: false,
    installerReleased: false,
    productionDeliveryEnabled: false
  };
}

export async function prepareFulfillment(env, raw, now = new Date()) {
  const orderId = clean(raw?.orderId, 120);
  if (!orderId) throw new P28Error('P2_8_ORDER_ID_REQUIRED');
  const { orderKey, order } = await loadOrder(env, orderId);
  assertStagingPaidOrder(order);

  if (order.orderStatus === 'preparing_delivery' && order?.fulfillment?.manifest) {
    return { orderId, reused: true, orderStatus: 'preparing_delivery', fulfillment: order.fulfillment };
  }
  if (order.orderStatus !== 'payment_confirmed') throw new P28Error('P2_8_PREPARE_STATE_NOT_ELIGIBLE', 409);

  const manifest = buildManifest(order, now);
  await appendAuditEvent(env, {
    eventId: `p2-8-prepare-${orderId}`,
    orderId,
    actor: 'operator:staging-qa',
    action: 'fulfillment_preparation_started',
    fromStatus: 'payment_confirmed',
    toStatus: 'preparing_delivery',
    reason: 'p2_8_staging_fulfillment_boundary',
    source: 'p2_8_qa',
    occurredAt: now,
    metadata: {
      deliveryMode: manifest.mode,
      customerMailSent: false,
      installerReleased: false,
      productionDeliveryEnabled: false
    }
  }, { expirationTtl: STAGING_ORDER_TTL });

  const fulfillment = {
    manifest,
    simulation: null
  };
  await env.ORDER_STATUS.put(orderKey, JSON.stringify({
    ...order,
    orderStatus: 'preparing_delivery',
    fulfillment,
    updatedAt: now.toISOString()
  }), { expirationTtl: STAGING_ORDER_TTL });

  return { orderId, reused: false, orderStatus: 'preparing_delivery', fulfillment };
}

export async function simulateDelivery(env, raw, now = new Date()) {
  const orderId = clean(raw?.orderId, 120);
  if (!orderId) throw new P28Error('P2_8_ORDER_ID_REQUIRED');
  if (raw?.confirmSimulation !== true) throw new P28Error('P2_8_SIMULATION_CONFIRMATION_REQUIRED');
  const { orderKey, order } = await loadOrder(env, orderId);
  assertStagingPaidOrder(order);

  if (order.orderStatus === 'delivered' && order?.fulfillment?.simulation?.completed === true) {
    return { orderId, reused: true, orderStatus: 'delivered', fulfillment: order.fulfillment };
  }
  if (order.orderStatus !== 'preparing_delivery' || !order?.fulfillment?.manifest) {
    throw new P28Error('P2_8_DELIVERY_STATE_NOT_ELIGIBLE', 409);
  }

  const simulation = {
    completed: true,
    completedAt: now.toISOString(),
    mode: 'staging_simulation_only',
    customerMailSent: false,
    installerReleased: false,
    productionDeliveryEnabled: false
  };

  await appendAuditEvent(env, {
    eventId: `p2-8-delivery-${orderId}`,
    orderId,
    actor: 'operator:staging-qa',
    action: 'delivery_simulated',
    fromStatus: 'preparing_delivery',
    toStatus: 'delivered',
    reason: 'p2_8_staging_delivery_simulation',
    source: 'p2_8_qa',
    occurredAt: now,
    metadata: {
      simulationOnly: true,
      customerMailSent: false,
      installerReleased: false,
      productionDeliveryEnabled: false
    }
  }, { expirationTtl: STAGING_ORDER_TTL });

  const fulfillment = { ...order.fulfillment, simulation };
  await env.ORDER_STATUS.put(orderKey, JSON.stringify({
    ...order,
    orderStatus: 'delivered',
    fulfillment,
    stagingDeliveredAt: now.toISOString(),
    updatedAt: now.toISOString()
  }), { expirationTtl: STAGING_ORDER_TTL });

  return { orderId, reused: false, orderStatus: 'delivered', fulfillment };
}

export async function fulfillmentStatus(env, raw) {
  const orderId = clean(raw?.orderId, 120);
  if (!orderId) throw new P28Error('P2_8_ORDER_ID_REQUIRED');
  const { order } = await loadOrder(env, orderId);
  return {
    orderId,
    orderStatus: clean(order.orderStatus, 80),
    webhookConfirmed: ['payment_confirmed', 'preparing_delivery', 'delivered'].includes(clean(order.orderStatus, 80)),
    paymentConfirmedAt: clean(order.paymentConfirmedAt, 80) || null,
    fulfillment: order.fulfillment || null,
    simulationOnly: order?.fulfillment?.simulation?.completed === true,
    customerMailSent: false,
    installerReleased: false,
    productionDeliveryEnabled: false
  };
}

function qaHtml() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>P2-8 Fulfillment QA | Baked Kale</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f4f7f5;color:#173126}.wrap{max-width:720px;margin:auto;padding:24px}.card{background:#fff;border:1px solid #ccd8d0;border-radius:14px;padding:18px;margin:14px 0}h1{font-size:24px}h2{font-size:18px;margin-top:0}label{display:block;font-weight:700;margin:12px 0 6px}input,button{font:inherit}input[type=password],input[type=text]{width:100%;box-sizing:border-box;padding:12px;border:1px solid #aebdb4;border-radius:9px;background:#fff}button{display:inline-block;margin-top:12px;padding:11px 15px;border:0;border-radius:9px;background:#173126;color:#fff;font-weight:800}button:disabled{opacity:.45}.warn{background:#fff8e6;border-color:#e1c778}.muted{color:#66756d;font-size:13px;line-height:1.6}.check{display:flex;gap:10px;align-items:flex-start}.check input{margin-top:4px}pre{white-space:pre-wrap;word-break:break-word;background:#eef3f0;padding:12px;border-radius:9px;font-size:12px}</style></head><body><main class="wrap"><h1>P2-8 Fulfillment QA</h1><div class="card warn"><strong>staging専用の納品シミュレーションです。</strong><p class="muted">本番決済、顧客メール、実installer配布は有効化されません。P2-7でpayment_confirmedになったOrder IDを使います。</p></div><div class="card"><label>Staging Checkout操作キー</label><input id="key" type="password" autocomplete="off" placeholder="Cloudflare Secretに登録した操作キー"><label>Order ID</label><input id="orderId" type="text" autocomplete="off" placeholder="P2-7で決済確認したOrder ID"><button id="status">状態を確認</button></div><div class="card"><h2>1. 納品準備へ進める</h2><button id="prepare">payment_confirmed → preparing_delivery</button><p class="muted">納品書・領収書・installerの「準備境界」だけを記録します。実ファイルは送信しません。</p></div><div class="card"><h2>2. staging納品完了をシミュレーション</h2><div class="check"><input id="confirm" type="checkbox"><label for="confirm" style="margin:0">実installerやメールを送らないstagingシミュレーションであることを確認</label></div><button id="deliver" disabled>preparing_delivery → delivered をシミュレーション</button></div><div class="card"><h2>結果</h2><pre id="out">準備完了</pre></div></main><script>const $=id=>document.getElementById(id);const show=x=>{$('out').textContent=typeof x==='string'?x:JSON.stringify(x,null,2)};async function post(path,body){const key=$('key').value.trim();const orderId=$('orderId').value.trim();if(!key)throw new Error('操作キーを入力してください');if(!orderId)throw new Error('Order IDを入力してください');const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-FDE-Staging-Checkout-Key':key},body:JSON.stringify({orderId,...body})});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error((j.error||'HTTP_ERROR')+' (HTTP '+r.status+')');return j}$('confirm').onchange=()=>{$('deliver').disabled=!$('confirm').checked};$('status').onclick=async()=>{try{show(await post('${P2_8_STATUS_PATH}',{}))}catch(e){show(e.message)}};$('prepare').onclick=async()=>{try{show(await post('${P2_8_PREPARE_PATH}',{}))}catch(e){show(e.message)}};$('deliver').onclick=async()=>{try{show(await post('${P2_8_SIMULATE_DELIVERY_PATH}',{confirmSimulation:true}))}catch(e){show(e.message)}};</script></body></html>`;
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

export async function handleP28Qa(request, env, { now = new Date() } = {}) {
  const url = new URL(request.url);
  if (url.pathname === P2_8_QA_PATH) {
    if (request.method !== 'GET') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    return html();
  }
  if (![P2_8_PREPARE_PATH, P2_8_SIMULATE_DELIVERY_PATH, P2_8_STATUS_PATH].includes(url.pathname)) {
    return json({ ok: false, error: 'P2_8_ROUTE_NOT_FOUND' }, 404);
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    await requireOperator(request, env);
    const raw = await readJson(request);
    const result = url.pathname === P2_8_PREPARE_PATH
      ? await prepareFulfillment(env, raw, now)
      : url.pathname === P2_8_SIMULATE_DELIVERY_PATH
        ? await simulateDelivery(env, raw, now)
        : await fulfillmentStatus(env, raw);
    return json({
      ok: true,
      staging: true,
      liveMode: false,
      productionDeliveryEnabled: false,
      customerMailSent: false,
      installerReleased: false,
      ...result
    });
  } catch (error) {
    const code = error instanceof P28Error ? error.code : clean(error?.message, 160) || 'P2_8_PROCESSING_FAILED';
    const status = error instanceof P28Error ? error.status : 503;
    console.error(JSON.stringify({ message: 'P2-8 staging fulfillment rejected', error: code, status }));
    return json({ ok: false, error: code }, status);
  }
}
