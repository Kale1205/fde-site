import { appendAuditEvent } from './staging-audit-log.js';
import { STAGING_ORDER_TTL } from './staging-expiry-cron.js';

export const STRIPE_WEBHOOK_PATH = '/__staging/stripe/webhook';
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
export const STRIPE_EVENT_TTL = 30 * 24 * 60 * 60;
export const STRIPE_MAX_BODY_BYTES = 512 * 1024;
export const STRIPE_ALLOWED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'invoice.paid'
]);

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);

class WebhookError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'WebhookError';
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

function asEpochSeconds(value) {
  const date = value instanceof Date ? value : new Date(value);
  const milliseconds = date.getTime();
  if (!Number.isFinite(milliseconds)) throw new WebhookError('STRIPE_INVALID_RECEIVED_TIME', 500);
  return Math.floor(milliseconds / 1000);
}

function hexToBytes(value) {
  const hex = clean(value, 256).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

export function parseStripeSignature(header) {
  const values = new Map();
  for (const part of clean(header, 4000).split(',')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(value);
  }

  const timestamp = Number(values.get('t')?.[0]);
  const signatures = (values.get('v1') || []).map(hexToBytes).filter(Boolean);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || signatures.length === 0) {
    throw new WebhookError('STRIPE_SIGNATURE_HEADER_INVALID');
  }
  return { timestamp, signatures };
}

async function readBodyBounded(request, maxBytes = STRIPE_MAX_BODY_BYTES) {
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new WebhookError('STRIPE_BODY_TOO_LARGE', 413);
  }
  if (!request.body) throw new WebhookError('STRIPE_BODY_REQUIRED');

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('body too large');
        throw new WebhookError('STRIPE_BODY_TOO_LARGE', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (total === 0) throw new WebhookError('STRIPE_BODY_REQUIRED');
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function verifyStripeSignature({
  rawBody,
  signatureHeader,
  secret,
  receivedAt = new Date(),
  toleranceSeconds = STRIPE_SIGNATURE_TOLERANCE_SECONDS
}) {
  const signingSecret = clean(secret, 1000);
  if (!signingSecret) throw new WebhookError('STRIPE_WEBHOOK_NOT_CONFIGURED', 503);
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const receivedAtSeconds = asEpochSeconds(receivedAt);
  if (Math.abs(receivedAtSeconds - timestamp) > toleranceSeconds) {
    throw new WebhookError('STRIPE_SIGNATURE_TIMESTAMP_OUTSIDE_TOLERANCE');
  }

  const prefix = encoder.encode(`${timestamp}.`);
  const signedPayload = new Uint8Array(prefix.byteLength + rawBody.byteLength);
  signedPayload.set(prefix, 0);
  signedPayload.set(rawBody, prefix.byteLength);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  for (const signature of signatures) {
    if (await crypto.subtle.verify('HMAC', key, signature, signedPayload)) {
      return { timestamp };
    }
  }
  throw new WebhookError('STRIPE_SIGNATURE_INVALID');
}

function requireString(value, code, max = 200) {
  const normalized = clean(value, max);
  if (!normalized) throw new WebhookError(code);
  return normalized;
}

function requireAmount(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new WebhookError('STRIPE_AMOUNT_INVALID');
  return value;
}

function normalizeCurrency(value) {
  const currency = clean(value, 10).toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new WebhookError('STRIPE_CURRENCY_INVALID');
  return currency;
}

function metadataFor(object) {
  const direct = object?.metadata && typeof object.metadata === 'object' ? object.metadata : {};
  const subscription = object?.parent?.subscription_details?.metadata;
  return {
    ...(subscription && typeof subscription === 'object' ? subscription : {}),
    ...direct
  };
}

function normalizeCheckoutSession(event, object) {
  if (object?.object !== 'checkout.session') throw new WebhookError('STRIPE_OBJECT_TYPE_MISMATCH');
  if (object.payment_status !== 'paid') throw new WebhookError('STRIPE_PAYMENT_NOT_PAID');
  const metadata = metadataFor(object);
  const reference = clean(object.client_reference_id, 120);
  const metadataOrderId = clean(metadata.baked_kale_order_id || metadata.order_id, 120);
  if (reference && metadataOrderId && reference !== metadataOrderId) {
    throw new WebhookError('STRIPE_ORDER_REFERENCE_CONFLICT');
  }
  return {
    eventId: requireString(event.id, 'STRIPE_EVENT_ID_REQUIRED', 120),
    eventType: event.type,
    eventCreated: Number.isSafeInteger(event.created) ? event.created : null,
    objectId: requireString(object.id, 'STRIPE_OBJECT_ID_REQUIRED', 160),
    orderId: requireString(reference || metadataOrderId, 'STRIPE_ORDER_REFERENCE_REQUIRED', 120),
    productKey: requireString(metadata.product_key, 'STRIPE_PRODUCT_KEY_REQUIRED', 120),
    priceId: requireString(metadata.price_id, 'STRIPE_PRICE_ID_REQUIRED', 160),
    mode: requireString(object.mode, 'STRIPE_MODE_REQUIRED', 40),
    amountTotal: requireAmount(object.amount_total),
    currency: normalizeCurrency(object.currency),
    subscriptionId: clean(object.subscription, 160) || null
  };
}

function invoicePriceId(object) {
  const firstLine = Array.isArray(object?.lines?.data) ? object.lines.data[0] : null;
  return clean(
    firstLine?.pricing?.price_details?.price ||
    firstLine?.price?.id ||
    metadataFor(object).price_id,
    160
  );
}

function normalizeInvoice(event, object) {
  if (object?.object !== 'invoice') throw new WebhookError('STRIPE_OBJECT_TYPE_MISMATCH');
  if (object.paid !== true || object.status !== 'paid') throw new WebhookError('STRIPE_PAYMENT_NOT_PAID');
  const metadata = metadataFor(object);
  const subscriptionId = clean(
    object?.parent?.subscription_details?.subscription || object?.subscription,
    160
  );
  return {
    eventId: requireString(event.id, 'STRIPE_EVENT_ID_REQUIRED', 120),
    eventType: event.type,
    eventCreated: Number.isSafeInteger(event.created) ? event.created : null,
    objectId: requireString(object.id, 'STRIPE_OBJECT_ID_REQUIRED', 160),
    orderId: requireString(metadata.baked_kale_order_id || metadata.order_id, 'STRIPE_ORDER_REFERENCE_REQUIRED', 120),
    productKey: requireString(metadata.product_key, 'STRIPE_PRODUCT_KEY_REQUIRED', 120),
    priceId: requireString(invoicePriceId(object), 'STRIPE_PRICE_ID_REQUIRED', 160),
    mode: 'subscription',
    amountTotal: requireAmount(object.amount_paid),
    currency: normalizeCurrency(object.currency),
    subscriptionId: requireString(subscriptionId, 'STRIPE_SUBSCRIPTION_ID_REQUIRED', 160)
  };
}

export function normalizeStripeEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new WebhookError('STRIPE_EVENT_INVALID');
  const eventType = requireString(event.type, 'STRIPE_EVENT_TYPE_REQUIRED', 120);
  if (!STRIPE_ALLOWED_EVENT_TYPES.has(eventType)) return { ignored: true, eventType };
  const object = event.data?.object;
  return eventType === 'invoice.paid'
    ? normalizeInvoice(event, object)
    : normalizeCheckoutSession(event, object);
}

export const stagingOrderIndexKey = (orderId) => `staging:order-id:${clean(orderId, 120)}`;
export const stripeEventKey = (eventId) => `staging:stripe-event:${clean(eventId, 120)}`;

function assertMatch(actual, expected, code) {
  if (actual !== expected) throw new WebhookError(code);
}

function validatePaymentExpectation(order, payment) {
  const expected = order?.paymentExpectation;
  if (!expected || typeof expected !== 'object') throw new WebhookError('STRIPE_PAYMENT_EXPECTATION_MISSING', 409);
  assertMatch(clean(expected.provider, 40), 'stripe', 'STRIPE_PROVIDER_MISMATCH');
  assertMatch(clean(payment.mode, 40), clean(expected.mode, 40), 'STRIPE_MODE_MISMATCH');
  assertMatch(payment.productKey, clean(expected.productKey, 120), 'STRIPE_PRODUCT_MISMATCH');
  assertMatch(payment.priceId, clean(expected.priceId, 160), 'STRIPE_PRICE_MISMATCH');
  assertMatch(payment.amountTotal, Number(expected.amountTotal), 'STRIPE_AMOUNT_MISMATCH');
  assertMatch(payment.currency, clean(expected.currency, 10).toLowerCase(), 'STRIPE_CURRENCY_MISMATCH');

  if (payment.eventType === 'invoice.paid') {
    assertMatch(payment.subscriptionId, clean(expected.subscriptionId, 160), 'STRIPE_SUBSCRIPTION_MISMATCH');
  } else {
    assertMatch(payment.objectId, clean(expected.checkoutSessionId, 160), 'STRIPE_SESSION_MISMATCH');
  }
  return expected;
}

function transitionFor(order, payment) {
  const current = clean(order?.orderStatus, 80);
  if (payment.eventType !== 'invoice.paid') {
    if (current !== 'awaiting_payment') throw new WebhookError('STRIPE_ORDER_STATE_NOT_ELIGIBLE', 409);
    return { action: 'payment_confirmed', fromStatus: current, toStatus: 'payment_confirmed' };
  }

  if (current === 'awaiting_payment') {
    return { action: 'payment_confirmed', fromStatus: current, toStatus: 'payment_confirmed' };
  }
  if (['payment_confirmed', 'preparing_delivery', 'delivered'].includes(current)) {
    return { action: 'subscription_payment_confirmed', fromStatus: current, toStatus: current };
  }
  throw new WebhookError('STRIPE_ORDER_STATE_NOT_ELIGIBLE', 409);
}

async function loadOrder(env, orderId) {
  const orderKey = await env.ORDER_STATUS.get(stagingOrderIndexKey(orderId));
  if (!orderKey) throw new WebhookError('STRIPE_ORDER_NOT_FOUND', 404);
  const raw = await env.ORDER_STATUS.get(orderKey);
  if (!raw) throw new WebhookError('STRIPE_ORDER_NOT_FOUND', 404);
  let order;
  try {
    order = JSON.parse(raw);
  } catch {
    throw new WebhookError('STRIPE_ORDER_RECORD_INVALID', 500);
  }
  if (clean(order?.stagingOrderId, 120) !== orderId) throw new WebhookError('STRIPE_ORDER_INDEX_MISMATCH', 500);
  return { orderKey, order };
}

async function processStripeEvent(env, event, receivedAt) {
  if (!env?.ORDER_STATUS?.get || !env.ORDER_STATUS?.put) {
    throw new WebhookError('STAGING_KV_NOT_CONFIGURED', 503);
  }
  const payment = normalizeStripeEvent(event);
  if (payment.ignored) return { ignored: true, eventType: payment.eventType };

  const markerKey = stripeEventKey(payment.eventId);
  const existingMarkerRaw = await env.ORDER_STATUS.get(markerKey);
  if (existingMarkerRaw) {
    try {
      const marker = JSON.parse(existingMarkerRaw);
      if (marker?.status === 'processed') return { duplicate: true, eventId: payment.eventId };
    } catch {
      throw new WebhookError('STRIPE_EVENT_MARKER_INVALID', 500);
    }
  }

  const { orderKey, order } = await loadOrder(env, payment.orderId);
  if (order?.payment?.providerEventId === payment.eventId) {
    await env.ORDER_STATUS.put(markerKey, JSON.stringify({
      schemaVersion: 1,
      staging: true,
      provider: 'stripe',
      eventId: payment.eventId,
      eventType: payment.eventType,
      status: 'processed',
      recovered: true,
      processedAt: receivedAt.toISOString()
    }), { expirationTtl: STRIPE_EVENT_TTL });
    return { duplicate: true, recovered: true, eventId: payment.eventId };
  }

  validatePaymentExpectation(order, payment);
  const transition = transitionFor(order, payment);
  const normalizedMarker = {
    schemaVersion: 1,
    staging: true,
    provider: 'stripe',
    eventId: payment.eventId,
    eventType: payment.eventType,
    eventCreated: payment.eventCreated,
    objectId: payment.objectId,
    orderId: payment.orderId,
    productKey: payment.productKey,
    priceId: payment.priceId,
    amountTotal: payment.amountTotal,
    currency: payment.currency,
    mode: payment.mode,
    status: 'processing',
    receivedAt: receivedAt.toISOString()
  };
  await env.ORDER_STATUS.put(markerKey, JSON.stringify(normalizedMarker), { expirationTtl: STRIPE_EVENT_TTL });

  await appendAuditEvent(env, {
    eventId: `stripe-${payment.eventId}`,
    orderId: payment.orderId,
    actor: 'provider:stripe',
    action: transition.action,
    fromStatus: transition.fromStatus,
    toStatus: transition.toStatus,
    reason: payment.eventType,
    source: 'stripe_webhook',
    occurredAt: receivedAt,
    metadata: {
      providerEventId: payment.eventId,
      providerObjectId: payment.objectId,
      productKey: payment.productKey,
      priceId: payment.priceId,
      amountTotal: payment.amountTotal,
      currency: payment.currency,
      mode: payment.mode
    }
  }, { expirationTtl: STAGING_ORDER_TTL });

  const updatedOrder = {
    ...order,
    orderStatus: transition.toStatus,
    paymentConfirmedAt: transition.action === 'payment_confirmed'
      ? receivedAt.toISOString()
      : order.paymentConfirmedAt,
    paymentRenewedAt: transition.action === 'subscription_payment_confirmed'
      ? receivedAt.toISOString()
      : order.paymentRenewedAt,
    updatedAt: receivedAt.toISOString(),
    payment: {
      provider: 'stripe',
      providerEventId: payment.eventId,
      providerObjectId: payment.objectId,
      checkoutSessionId: payment.eventType === 'invoice.paid'
        ? clean(order.paymentExpectation.checkoutSessionId, 160) || null
        : payment.objectId,
      subscriptionId: payment.subscriptionId,
      productKey: payment.productKey,
      priceId: payment.priceId,
      amountTotal: payment.amountTotal,
      currency: payment.currency,
      mode: payment.mode
    }
  };
  await env.ORDER_STATUS.put(orderKey, JSON.stringify(updatedOrder), { expirationTtl: STAGING_ORDER_TTL });
  await env.ORDER_STATUS.put(markerKey, JSON.stringify({
    ...normalizedMarker,
    status: 'processed',
    processedAt: receivedAt.toISOString()
  }), { expirationTtl: STRIPE_EVENT_TTL });

  return {
    processed: true,
    eventId: payment.eventId,
    orderId: payment.orderId,
    orderStatus: transition.toStatus,
    action: transition.action
  };
}

export async function handleStripeWebhook(request, env, { receivedAt = new Date() } = {}) {
  if (request.method !== 'POST') return responseJson({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  const secret = clean(env?.STRIPE_WEBHOOK_SECRET, 1000);
  if (!secret) return responseJson({ ok: false, error: 'STRIPE_WEBHOOK_NOT_CONFIGURED' }, 503);

  try {
    const rawBody = await readBodyBounded(request);
    await verifyStripeSignature({
      rawBody,
      signatureHeader: request.headers.get('Stripe-Signature'),
      secret,
      receivedAt
    });

    let event;
    try {
      event = JSON.parse(decoder.decode(rawBody));
    } catch {
      throw new WebhookError('STRIPE_EVENT_JSON_INVALID');
    }
    const result = await processStripeEvent(env, event, receivedAt);
    return responseJson({ ok: true, ...result }, 200);
  } catch (error) {
    const code = error instanceof WebhookError ? error.code : 'STRIPE_WEBHOOK_PROCESSING_FAILED';
    const status = error instanceof WebhookError ? error.status : 503;
    console.error(JSON.stringify({
      message: 'staging Stripe webhook rejected',
      error: code,
      status
    }));
    return responseJson({ ok: false, error: code }, status);
  }
}
