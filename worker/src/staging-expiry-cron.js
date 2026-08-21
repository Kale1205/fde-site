import { appendAuditEvent } from './staging-audit-log.js';
import { getQuoteState } from './staging-quote-policy.js';

export const EXPIRY_CRON = '0 * * * *';
export const STAGING_ORDER_TTL = 30 * 24 * 60 * 60;
export const EXPIRY_ELIGIBLE_STATUSES = new Set([
  'order_received',
  'billing_preparation',
  'awaiting_payment'
]);
export const EXPIRY_PROTECTED_STATUSES = new Set([
  'payment_confirmed',
  'preparing_delivery',
  'delivered',
  'cancelled'
]);

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);

function epoch(value) {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function expiryDecision(order, now = new Date()) {
  if (!order || typeof order !== 'object') return { eligible: false, reason: 'invalid_order' };
  const status = clean(order.orderStatus, 80);
  if (EXPIRY_PROTECTED_STATUSES.has(status)) return { eligible: false, reason: 'protected_status' };
  if (!EXPIRY_ELIGIBLE_STATUSES.has(status)) return { eligible: false, reason: 'status_not_eligible' };
  const expiresMs = epoch(order.quoteExpiresAt);
  const nowMs = epoch(now);
  if (expiresMs === null || nowMs === null) return { eligible: false, reason: 'invalid_expiry' };
  let quoteState;
  try {
    quoteState = getQuoteState(order.quoteExpiresAt, new Date(nowMs));
  } catch {
    return { eligible: false, reason: 'invalid_expiry' };
  }
  if (quoteState !== 'expired') return { eligible: false, reason: 'quote_still_valid' };
  return { eligible: true, reason: 'quote_expired', status, expiresMs, nowMs };
}

export function expiryAuditEventId(order) {
  const orderId = clean(order?.stagingOrderId, 120);
  const expiresMs = epoch(order?.quoteExpiresAt);
  if (!orderId || expiresMs === null) throw new Error('INVALID_EXPIRY_AUDIT_ID');
  return `quote-expiry-${orderId}-${expiresMs}`;
}

export function buildExpiryAuditInput(order, occurredAt = new Date()) {
  const orderId = clean(order?.stagingOrderId, 120);
  const fromStatus = clean(order?.orderStatus, 80);
  if (!orderId || !EXPIRY_ELIGIBLE_STATUSES.has(fromStatus)) throw new Error('INVALID_EXPIRY_AUDIT_ORDER');
  return {
    eventId: expiryAuditEventId(order),
    orderId,
    actor: 'system:cron',
    action: 'quote_expired',
    fromStatus,
    toStatus: 'cancelled',
    reason: 'quote_validity_elapsed',
    source: 'scheduled_expiry_scan',
    occurredAt,
    metadata: {
      quoteIssuedAt: clean(order.quoteIssuedAt, 80),
      quoteExpiresAt: clean(order.quoteExpiresAt, 80),
      quoteValidityDays: Number(order.quoteValidityDays || 0) || 7
    }
  };
}

export function applyAutoCancellation(order, occurredAt = new Date(), auditInput = null) {
  const time = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  if (!Number.isFinite(time.getTime())) throw new Error('INVALID_CANCELLATION_TIME');
  const input = auditInput || buildExpiryAuditInput(order, time);
  return {
    ...order,
    quoteState: 'expired',
    cancelledFrom: clean(order.orderStatus, 80),
    orderStatus: 'cancelled',
    cancelledAt: time.toISOString(),
    cancelReason: 'quote_expired',
    autoCancelled: true,
    autoCancelEnabled: true,
    updatedAt: time.toISOString(),
    auditPending: input
  };
}

async function repairPendingAudit(env, key, order) {
  const pending = order?.auditPending;
  if (!pending || pending.action !== 'quote_expired') return false;
  await appendAuditEvent(env, pending, { expirationTtl: STAGING_ORDER_TTL });
  const repaired = { ...order };
  delete repaired.auditPending;
  await env.ORDER_STATUS.put(key, JSON.stringify(repaired), { expirationTtl: STAGING_ORDER_TTL });
  return true;
}

async function processOrderKey(env, key, now) {
  const raw = await env.ORDER_STATUS.get(key);
  if (!raw) return { outcome: 'missing' };
  let order;
  try {
    order = JSON.parse(raw);
  } catch {
    return { outcome: 'invalid_json' };
  }

  if (order?.orderStatus === 'cancelled' && order?.auditPending?.action === 'quote_expired') {
    await repairPendingAudit(env, key, order);
    return { outcome: 'audit_repaired' };
  }

  const decision = expiryDecision(order, now);
  if (!decision.eligible) return { outcome: 'skipped', reason: decision.reason };

  const auditInput = buildExpiryAuditInput(order, now);
  const cancelled = applyAutoCancellation(order, now, auditInput);
  await env.ORDER_STATUS.put(key, JSON.stringify(cancelled), { expirationTtl: STAGING_ORDER_TTL });

  try {
    await appendAuditEvent(env, auditInput, { expirationTtl: STAGING_ORDER_TTL });
    const finalRecord = { ...cancelled };
    delete finalRecord.auditPending;
    await env.ORDER_STATUS.put(key, JSON.stringify(finalRecord), { expirationTtl: STAGING_ORDER_TTL });
    return { outcome: 'cancelled', orderId: finalRecord.stagingOrderId };
  } catch (error) {
    console.error('Staging expiry audit append failed; auditPending retained', error);
    return { outcome: 'cancelled_audit_pending', orderId: cancelled.stagingOrderId };
  }
}

export async function runExpirySweep(env, now = new Date()) {
  if (!env?.ORDER_STATUS?.list || !env.ORDER_STATUS?.get || !env.ORDER_STATUS?.put) {
    throw new Error('STAGING_KV_NOT_CONFIGURED');
  }
  const scheduledAt = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(scheduledAt.getTime())) throw new Error('INVALID_EXPIRY_SWEEP_TIME');

  const summary = {
    scanned: 0,
    cancelled: 0,
    auditPending: 0,
    auditRepaired: 0,
    skipped: 0,
    invalid: 0,
    errors: 0
  };

  let cursor;
  do {
    const options = { prefix: 'staging:order:', limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await env.ORDER_STATUS.list(options);
    for (const item of page.keys || []) {
      summary.scanned += 1;
      try {
        const result = await processOrderKey(env, item.name, scheduledAt);
        if (result.outcome === 'cancelled') summary.cancelled += 1;
        else if (result.outcome === 'cancelled_audit_pending') summary.auditPending += 1;
        else if (result.outcome === 'audit_repaired') summary.auditRepaired += 1;
        else if (result.outcome === 'invalid_json') summary.invalid += 1;
        else summary.skipped += 1;
      } catch (error) {
        summary.errors += 1;
        console.error('Staging expiry scan failed for key', item.name, error);
      }
    }
    if (page.list_complete) break;
    cursor = page.cursor;
    if (!cursor) throw new Error('STAGING_KV_CURSOR_MISSING');
  } while (true);

  return summary;
}
