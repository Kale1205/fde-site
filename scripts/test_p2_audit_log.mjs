import assert from 'node:assert/strict';
import { AUDIT_SCHEMA_VERSION, auditKey, buildAuditEvent } from '../worker/src/staging-audit-log.js';

const event = buildAuditEvent({
  eventId: 'evt-001',
  orderId: 'stg-order-001',
  actor: 'system:staging-worker',
  action: 'quote_issued',
  fromStatus: null,
  toStatus: 'order_received',
  reason: 'staging_order_created',
  source: 'order_submission',
  occurredAt: '2026-08-21T00:00:00.000Z',
  metadata: {
    quoteIssuedAt: '2026-08-21T00:00:00.000Z',
    quoteExpiresAt: '2026-08-28T00:00:00.000Z',
    quoteValidityDays: 7
  }
});

assert.equal(AUDIT_SCHEMA_VERSION, 1);
assert.equal(event.schemaVersion, 1);
assert.equal(event.staging, true);
assert.equal(event.eventId, 'evt-001');
assert.equal(event.orderId, 'stg-order-001');
assert.equal(event.actor, 'system:staging-worker');
assert.equal(event.action, 'quote_issued');
assert.equal(event.fromStatus, null);
assert.equal(event.toStatus, 'order_received');
assert.equal(event.reason, 'staging_order_created');
assert.equal(event.source, 'order_submission');
assert.equal(event.occurredAt, '2026-08-21T00:00:00.000Z');
assert.equal(event.metadata.quoteValidityDays, 7);
assert.equal(auditKey(event), 'staging:audit:stg-order-001:1787270400000:evt-001');

assert.throws(() => buildAuditEvent({
  eventId: 'evt-002',
  orderId: 'stg-order-002',
  actor: '',
  action: 'quote_issued',
  reason: 'test',
  source: 'test',
  occurredAt: '2026-08-21T00:00:00.000Z'
}), /INVALID_AUDIT_ACTOR/);
assert.throws(() => buildAuditEvent({
  eventId: 'evt-003',
  orderId: 'stg-order-003',
  actor: 'system',
  action: 'quote_issued',
  reason: 'test',
  source: 'test',
  occurredAt: 'invalid'
}), /INVALID_AUDIT_TIME/);

console.log('P2-2 audit log tests passed.');
