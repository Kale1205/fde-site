import assert from 'node:assert/strict';
import {
  EXPIRY_CRON,
  applyAutoCancellation,
  buildExpiryAuditInput,
  expiryAuditEventId,
  expiryDecision,
  runExpirySweep
} from '../worker/src/staging-expiry-cron.js';

const NOW = '2026-08-28T00:00:00.000Z';
const baseOrder = (overrides = {}) => ({
  staging: true,
  dryRun: true,
  stagingOrderId: 'order-001',
  orderStatus: 'order_received',
  quoteIssuedAt: '2026-08-21T00:00:00.000Z',
  quoteExpiresAt: '2026-08-28T00:00:00.000Z',
  quoteValidityDays: 7,
  quoteState: 'valid',
  autoCancelEnabled: true,
  ...overrides
});

assert.equal(EXPIRY_CRON, '0 * * * *');
assert.deepEqual(expiryDecision(baseOrder(), '2026-08-27T23:59:59.999Z'), { eligible: false, reason: 'quote_still_valid' });
assert.equal(expiryDecision(baseOrder(), NOW).eligible, true);
assert.equal(expiryDecision(baseOrder({ orderStatus: 'awaiting_payment' }), NOW).eligible, true);
for (const status of ['payment_confirmed', 'preparing_delivery', 'delivered', 'cancelled']) {
  assert.deepEqual(expiryDecision(baseOrder({ orderStatus: status }), NOW), { eligible: false, reason: 'protected_status' });
}
assert.deepEqual(expiryDecision(baseOrder({ quoteExpiresAt: 'invalid' }), NOW), { eligible: false, reason: 'invalid_expiry' });

const auditInput = buildExpiryAuditInput(baseOrder(), NOW);
assert.equal(auditInput.eventId, expiryAuditEventId(baseOrder()));
assert.equal(auditInput.actor, 'system:cron');
assert.equal(auditInput.action, 'quote_expired');
assert.equal(auditInput.fromStatus, 'order_received');
assert.equal(auditInput.toStatus, 'cancelled');
assert.equal(auditInput.reason, 'quote_validity_elapsed');
assert.equal(auditInput.source, 'scheduled_expiry_scan');

const cancelled = applyAutoCancellation(baseOrder(), NOW, auditInput);
assert.equal(cancelled.orderStatus, 'cancelled');
assert.equal(cancelled.cancelledFrom, 'order_received');
assert.equal(cancelled.quoteState, 'expired');
assert.equal(cancelled.autoCancelled, true);
assert.equal(cancelled.cancelReason, 'quote_expired');
assert.equal(cancelled.auditPending.eventId, auditInput.eventId);

class FakeKV {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  async get(key) {
    return this.map.get(key) ?? null;
  }
  async put(key, value) {
    this.map.set(key, value);
  }
  async delete(key) {
    this.map.delete(key);
  }
  async list({ prefix = '', limit = 1000, cursor } = {}) {
    const names = [...this.map.keys()].filter(name => name.startsWith(prefix)).sort();
    const start = cursor ? Number(cursor) : 0;
    const slice = names.slice(start, start + limit);
    const next = start + slice.length;
    return {
      keys: slice.map(name => ({ name })),
      list_complete: next >= names.length,
      cursor: next >= names.length ? '' : String(next)
    };
  }
}

const kv = new FakeKV({
  'staging:order:1:expired': JSON.stringify(baseOrder({ stagingOrderId: 'expired-order' })),
  'staging:order:2:paid': JSON.stringify(baseOrder({ stagingOrderId: 'paid-order', orderStatus: 'payment_confirmed' })),
  'staging:order:3:valid': JSON.stringify(baseOrder({ stagingOrderId: 'valid-order', quoteExpiresAt: '2026-08-28T00:00:00.001Z' }))
});
const summary = await runExpirySweep({ ORDER_STATUS: kv }, NOW);
assert.equal(summary.scanned, 3);
assert.equal(summary.cancelled, 1);
assert.equal(summary.auditPending, 0);
assert.equal(summary.errors, 0);

const expiredRecord = JSON.parse(await kv.get('staging:order:1:expired'));
assert.equal(expiredRecord.orderStatus, 'cancelled');
assert.equal(expiredRecord.auditPending, undefined);
assert.equal(expiredRecord.cancelReason, 'quote_expired');
const auditKeys = [...kv.map.keys()].filter(key => key.startsWith('staging:audit:expired-order:'));
assert.equal(auditKeys.length, 1);
const auditEvent = JSON.parse(await kv.get(auditKeys[0]));
assert.equal(auditEvent.actor, 'system:cron');
assert.equal(auditEvent.fromStatus, 'order_received');
assert.equal(auditEvent.toStatus, 'cancelled');

const paidRecord = JSON.parse(await kv.get('staging:order:2:paid'));
assert.equal(paidRecord.orderStatus, 'payment_confirmed');
const validRecord = JSON.parse(await kv.get('staging:order:3:valid'));
assert.equal(validRecord.orderStatus, 'order_received');

// A pending audit is repaired idempotently on the next sweep.
const repairKv = new FakeKV();
const repairSource = baseOrder({ stagingOrderId: 'repair-order' });
const repairAudit = buildExpiryAuditInput(repairSource, NOW);
const pendingRecord = applyAutoCancellation(repairSource, NOW, repairAudit);
repairKv.map.set('staging:order:4:repair', JSON.stringify(pendingRecord));
const repairSummary = await runExpirySweep({ ORDER_STATUS: repairKv }, '2026-08-28T01:00:00.000Z');
assert.equal(repairSummary.auditRepaired, 1);
const repairedRecord = JSON.parse(await repairKv.get('staging:order:4:repair'));
assert.equal(repairedRecord.auditPending, undefined);
const repairedAuditKeys = [...repairKv.map.keys()].filter(key => key.startsWith('staging:audit:repair-order:'));
assert.equal(repairedAuditKeys.length, 1);

console.log('P2-3 expiry Cron tests passed.');
