import { appendAuditEvent } from './staging-audit-log.js';
import { STAGING_ORDER_TTL } from './staging-expiry-cron.js';
import { getQuoteState } from './staging-quote-policy.js';
import { stagingOrderIndexKey } from './staging-stripe-webhook.js';

export const STRIPE_CHECKOUT_PATH = '/__staging/stripe/checkout-session';
export const STRIPE_API_URL = 'https://api.stripe.com/v1/checkout/sessions';
export const STRIPE_CHECKOUT_MAX_BODY_BYTES = 16 * 1024;

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const encoder = new TextEncoder();

const PRICE_CATALOG = Object.freeze({
  'fde-ims-license:usd': Object.freeze({
    productKey: 'fde-ims-license', currency: 'usd', mode: 'payment', amountTotal: 34900,
    priceBinding: 'STRIPE_PRICE_LICENSE_USD'
  }),
  'fde-ims-license:jpy': Object.freeze({
    productKey: 'fde-ims-license', currency: 'jpy', mode: 'payment', amountTotal: 49800,
    priceBinding: 'STRIPE_PRICE_LICENSE_JPY'
  }),
  'fde-ims-license-plus:usd': Object.freeze({
    productKey: 'fde-ims-license-plus', currency: 'usd', mode: 'payment', amountTotal: 69900,
    priceBinding: 'STRIPE_PRICE_LICENSE_PLUS_USD'
  }),
  'fde-ims-license-plus:jpy': Object.freeze({
    productKey: 'fde-ims-license-plus', currency: 'jpy', mode: 'payment', amountTotal: 99800,
    priceBinding: 'STRIPE_PRICE_LICENSE_PLUS_JPY'
  })
});

class CheckoutError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'CheckoutError';
    this.code = code;
    this.status = status;
  }
}

const responseJson = (data, status = 200) => new Response(JSON.stringify(data), {
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
  const data = encoder.encode('baked-kale-staging-checkout-authorization');
  const expectedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(expectedValue), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const suppliedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(suppliedValue), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const suppliedSignature = await crypto.subtle.sign('HMAC', suppliedKey, data);
  return crypto.subtle.verify('HMAC', expectedKey, suppliedSignature, data);
}

async function readJsonBounded(request) {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > STRIPE_CHECKOUT_MAX_BODY_BYTES) {
    throw new CheckoutError('CHECKOUT_BODY_TOO_LARGE', 413);
  }
  if (!request.body) throw new CheckoutError('CHECKOUT_BODY_REQUIRED');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > STRIPE_CHECKOUT_MAX_BODY_BYTES) {
        await reader.cancel('body too large');
        throw new CheckoutError('CHECKOUT_BODY_TOO_LARGE', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
    return parsed;
  } catch {
    throw new CheckoutError('CHECKOUT_JSON_INVALID');
  }
}

export function resolveStripePrice(env, productKey, currency) {
  const normalizedProduct = clean(productKey, 120);
  const normalizedCurrency = clean(currency, 10).toLowerCase();
  const catalogEntry = PRICE_CATALOG[`${normalizedProduct}:${normalizedCurrency}`];
  if (!catalogEntry) throw new CheckoutError('CHECKOUT_PRICE_NOT_ALLOWED');
  const priceId = clean(env?.[catalogEntry.priceBinding], 160);
  if (!/^price_[A-Za-z0-9_]+$/.test(priceId)) throw new CheckoutError('CHECKOUT_PRICE_NOT_CONFIGURED', 503);
  return { ...catalogEntry, priceId };
}

function configuredUrl(env, binding) {
  const raw = clean(env?.[binding], 1000);
  let url;
  try { url = new URL(raw); } catch { throw new CheckoutError('CHECKOUT_URL_NOT_CONFIGURED', 503); }
  if (url.protocol !== 'https:' || url.hostname !== 'kales-fde-staging.pages.dev') {
    throw new CheckoutError('CHECKOUT_URL_NOT_ALLOWED', 503);
  }
  return url.toString();
}

async function loadOrder(env, orderId) {
  if (!env?.ORDER_STATUS?.get || !env.ORDER_STATUS?.put) throw new CheckoutError('STAGING_KV_NOT_CONFIGURED', 503);
  const orderKey = await env.ORDER_STATUS.get(stagingOrderIndexKey(orderId));
  if (!orderKey) throw new CheckoutError('CHECKOUT_ORDER_NOT_FOUND', 404);
  const raw = await env.ORDER_STATUS.get(orderKey);
  if (!raw) throw new CheckoutError('CHECKOUT_ORDER_NOT_FOUND', 404);
  let order;
  try { order = JSON.parse(raw); } catch { throw new CheckoutError('CHECKOUT_ORDER_RECORD_INVALID', 500); }
  if (clean(order?.stagingOrderId, 120) !== orderId) throw new CheckoutError('CHECKOUT_ORDER_INDEX_MISMATCH', 500);
  return { orderKey, order };
}

function assertOrderEligible(order, now) {
  if (order?.staging !== true || order?.dryRun !== true) throw new CheckoutError('CHECKOUT_STAGING_ORDER_REQUIRED', 409);
  if (getQuoteState(order?.quoteExpiresAt, now) !== 'valid') throw new CheckoutError('CHECKOUT_QUOTE_EXPIRED', 409);
  if (!['order_received', 'billing_preparation', 'awaiting_payment'].includes(clean(order?.orderStatus, 80))) {
    throw new CheckoutError('CHECKOUT_ORDER_STATE_NOT_ELIGIBLE', 409);
  }
  const acceptance = order?.eulaAcceptance;
  if (!acceptance || !clean(acceptance.version, 120) || !clean(acceptance.acceptedAt, 80)) {
    throw new CheckoutError('CHECKOUT_EULA_ACCEPTANCE_REQUIRED', 409);
  }
}

function reusableSession(order, price, now) {
  const expected = order?.paymentExpectation;
  if (clean(order?.orderStatus, 80) !== 'awaiting_payment' || expected?.provider !== 'stripe') return null;
  if (
    clean(expected.productKey, 120) !== price.productKey ||
    clean(expected.currency, 10).toLowerCase() !== price.currency ||
    clean(expected.priceId, 160) !== price.priceId ||
    clean(expected.checkoutSessionId, 160).startsWith('cs_test_') === false ||
    clean(order?.checkoutUrl, 1000).startsWith('https://checkout.stripe.com/') === false
  ) return null;
  const expiresAt = new Date(order.checkoutExpiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return null;
  return {
    reused: true,
    checkoutSessionId: expected.checkoutSessionId,
    checkoutUrl: order.checkoutUrl,
    expiresAt: order.checkoutExpiresAt
  };
}

function stripeForm({ order, orderId, price, successUrl, cancelUrl }) {
  const form = new URLSearchParams({
    mode: price.mode,
    'line_items[0][price]': price.priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: orderId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'required',
    'tax_id_collection[enabled]': 'true',
    'metadata[baked_kale_order_id]': orderId,
    'metadata[product_key]': price.productKey,
    'metadata[price_id]': price.priceId
  });
  const email = clean(order?.email, 500);
  if (email) form.set('customer_email', email);
  const detailPrefix = price.mode === 'subscription' ? 'subscription_data' : 'payment_intent_data';
  form.set(`${detailPrefix}[metadata][baked_kale_order_id]`, orderId);
  form.set(`${detailPrefix}[metadata][product_key]`, price.productKey);
  form.set(`${detailPrefix}[metadata][price_id]`, price.priceId);
  return form;
}

async function createStripeSession(env, input, order, price) {
  const secretKey = clean(env?.STRIPE_SECRET_KEY, 1000);
  if (!secretKey) throw new CheckoutError('STRIPE_API_NOT_CONFIGURED', 503);
  const successUrl = configuredUrl(env, 'STAGING_CHECKOUT_SUCCESS_URL');
  const cancelUrl = configuredUrl(env, 'STAGING_CHECKOUT_CANCEL_URL');
  const form = stripeForm({ order, orderId: input.orderId, price, successUrl, cancelUrl });
  let response;
  try {
    response = await fetch(STRIPE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `fde-staging-checkout-${input.orderId}-${price.productKey}-${price.currency}`
      },
      body: form
    });
  } catch {
    throw new CheckoutError('STRIPE_API_UNAVAILABLE', 503);
  }
  let session;
  try { session = await response.json(); } catch { throw new CheckoutError('STRIPE_API_RESPONSE_INVALID', 503); }
  if (!response.ok) {
    console.error(JSON.stringify({ message: 'Stripe sandbox Checkout Session rejected', status: response.status, type: clean(session?.error?.type, 80) }));
    throw new CheckoutError('STRIPE_API_REQUEST_REJECTED', 502);
  }
  if (
    session?.object !== 'checkout.session' ||
    session?.livemode !== false ||
    !clean(session?.id, 160).startsWith('cs_test_') ||
    !clean(session?.url, 1000).startsWith('https://checkout.stripe.com/') ||
    clean(session?.mode, 40) !== price.mode ||
    clean(session?.currency, 10).toLowerCase() !== price.currency ||
    Number(session?.amount_total) !== price.amountTotal
  ) throw new CheckoutError('STRIPE_SESSION_RESPONSE_MISMATCH', 502);
  const expiresAt = new Date(Number(session.expires_at) * 1000);
  if (!Number.isFinite(expiresAt.getTime())) throw new CheckoutError('STRIPE_SESSION_EXPIRY_INVALID', 502);
  return {
    checkoutSessionId: clean(session.id, 160),
    checkoutUrl: clean(session.url, 1000),
    expiresAt: expiresAt.toISOString()
  };
}

export async function handleStripeCheckout(request, env, { now = new Date() } = {}) {
  if (request.method !== 'POST') return responseJson({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  if (clean(env?.STAGING_CHECKOUT_ENABLED, 20).toLowerCase() !== 'true') {
    return responseJson({ ok: false, error: 'STRIPE_CHECKOUT_DISABLED' }, 503);
  }
  if (!clean(env?.STAGING_CHECKOUT_SETUP_KEY, 1000)) {
    return responseJson({ ok: false, error: 'CHECKOUT_AUTH_NOT_CONFIGURED' }, 503);
  }
  if (!await secretsMatch(env.STAGING_CHECKOUT_SETUP_KEY, request.headers.get('X-FDE-Staging-Checkout-Key'))) {
    return responseJson({ ok: false, error: 'CHECKOUT_AUTH_FAILED' }, 403);
  }

  try {
    const raw = await readJsonBounded(request);
    const input = {
      orderId: clean(raw.orderId, 120),
      productKey: clean(raw.productKey, 120),
      currency: clean(raw.currency, 10).toLowerCase()
    };
    if (!input.orderId) throw new CheckoutError('CHECKOUT_ORDER_ID_REQUIRED');
    const price = resolveStripePrice(env, input.productKey, input.currency);
    const { orderKey, order } = await loadOrder(env, input.orderId);
    assertOrderEligible(order, now);
    const reusable = reusableSession(order, price, now);
    if (reusable) return responseJson({ ok: true, staging: true, liveMode: false, ...reusable });

    const session = await createStripeSession(env, input, order, price);
    await appendAuditEvent(env, {
      eventId: `stripe-checkout-${session.checkoutSessionId}`,
      orderId: input.orderId,
      actor: 'system:staging-worker',
      action: 'checkout_session_created',
      fromStatus: clean(order.orderStatus, 80),
      toStatus: 'awaiting_payment',
      reason: 'stripe_sandbox_checkout_session_created',
      source: 'stripe_checkout_session',
      occurredAt: now,
      metadata: {
        checkoutSessionId: session.checkoutSessionId,
        productKey: price.productKey,
        priceId: price.priceId,
        amountTotal: price.amountTotal,
        currency: price.currency,
        mode: price.mode,
        expiresAt: session.expiresAt
      }
    }, { expirationTtl: STAGING_ORDER_TTL });

    const updatedOrder = {
      ...order,
      orderStatus: 'awaiting_payment',
      updatedAt: now.toISOString(),
      checkoutUrl: session.checkoutUrl,
      checkoutExpiresAt: session.expiresAt,
      paymentExpectation: {
        provider: 'stripe',
        checkoutSessionId: session.checkoutSessionId,
        subscriptionId: null,
        mode: price.mode,
        productKey: price.productKey,
        priceId: price.priceId,
        amountTotal: price.amountTotal,
        currency: price.currency
      }
    };
    await env.ORDER_STATUS.put(orderKey, JSON.stringify(updatedOrder), { expirationTtl: STAGING_ORDER_TTL });
    return responseJson({ ok: true, staging: true, liveMode: false, reused: false, ...session });
  } catch (error) {
    const code = error instanceof CheckoutError ? error.code : 'STRIPE_CHECKOUT_PROCESSING_FAILED';
    const status = error instanceof CheckoutError ? error.status : 503;
    console.error(JSON.stringify({ message: 'staging Stripe Checkout rejected', error: code, status }));
    return responseJson({ ok: false, error: code }, status);
  }
}

export function stripeCheckoutConfiguration(env) {
  const required = [
    'STRIPE_SECRET_KEY', 'STAGING_CHECKOUT_SETUP_KEY',
    'STRIPE_PRICE_LICENSE_USD', 'STRIPE_PRICE_LICENSE_JPY',
    'STRIPE_PRICE_LICENSE_PLUS_USD', 'STRIPE_PRICE_LICENSE_PLUS_JPY',
    'STAGING_CHECKOUT_SUCCESS_URL', 'STAGING_CHECKOUT_CANCEL_URL'
  ];
  return required.every(binding => Boolean(clean(env?.[binding], 1000)));
}
