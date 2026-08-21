export const AUDIT_SCHEMA_VERSION = 1;

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);

function iso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_AUDIT_TIME');
  return date.toISOString();
}

export function buildAuditEvent({
  eventId = crypto.randomUUID(),
  orderId,
  actor,
  action,
  fromStatus = null,
  toStatus = null,
  reason,
  source,
  occurredAt = new Date(),
  metadata = {}
} = {}) {
  const normalized = {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    staging: true,
    eventId: clean(eventId, 120),
    orderId: clean(orderId, 120),
    actor: clean(actor, 120),
    action: clean(action, 120),
    fromStatus: fromStatus == null ? null : clean(fromStatus, 80),
    toStatus: toStatus == null ? null : clean(toStatus, 80),
    reason: clean(reason, 500),
    source: clean(source, 120),
    occurredAt: iso(occurredAt),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
  };

  for (const field of ['eventId', 'orderId', 'actor', 'action', 'reason', 'source']) {
    if (!normalized[field]) throw new Error(`INVALID_AUDIT_${field.toUpperCase()}`);
  }
  return normalized;
}

export function auditKey(event) {
  if (!event?.orderId || !event?.eventId || !event?.occurredAt) throw new Error('INVALID_AUDIT_EVENT');
  const time = new Date(event.occurredAt).getTime();
  if (!Number.isFinite(time)) throw new Error('INVALID_AUDIT_TIME');
  return `staging:audit:${event.orderId}:${time}:${event.eventId}`;
}

export async function appendAuditEvent(env, input, { expirationTtl = 30 * 24 * 60 * 60 } = {}) {
  if (!env?.ORDER_STATUS?.put) throw new Error('STAGING_KV_NOT_CONFIGURED');
  const event = buildAuditEvent(input);
  const key = auditKey(event);
  await env.ORDER_STATUS.put(key, JSON.stringify(event), { expirationTtl });
  return { key, event };
}
