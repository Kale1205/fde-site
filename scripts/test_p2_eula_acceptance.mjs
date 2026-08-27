import assert from 'node:assert/strict';
import {
  P2_7_QA_PATH,
  P2_7_ORDER_PATH,
  P2_7_EULA_PATH,
  P2_7_STATUS_PATH,
  P2_7_EULA_VERSION,
  handleP27Qa
} from '../worker/src/staging-p2-7-qa.js';
import { stagingOrderIndexKey } from '../worker/src/staging-stripe-webhook.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async get(key) { return this.map.has(key) ? this.map.get(key) : null; }
  async put(key, value) { this.map.set(key, String(value)); }
  async delete(key) { this.map.delete(key); }
}

const setupKey = 'p2-7-test-operator-key';
const env = { ORDER_STATUS: new MemoryKV(), STAGING_CHECKOUT_SETUP_KEY: setupKey };
const origin = 'https://kales-fde-contact-staging.example';
const fixedNow = new Date('2026-08-27T00:30:00.000Z');

function request(path, body, key = setupKey, method = 'POST') {
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['X-FDE-Staging-Checkout-Key'] = key;
  return new Request(`${origin}${path}`, {
    method,
    headers,
    ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {})
  });
}

async function json(response) {
  const data = await response.json();
  return { response, data };
}

{
  const response = await handleP27Qa(new Request(`${origin}${P2_7_QA_PATH}`), env, { now: fixedNow });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type') || '', /text\/html/);
  assert.match(await response.text(), /P2-7 Stripe Sandbox QA/);
}

{
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_ORDER_PATH, { productKey: 'fde-ims-license', currency: 'jpy' }, 'wrong-key'),
    env,
    { now: fixedNow }
  ));
  assert.equal(response.status, 403);
  assert.equal(data.error, 'P2_7_AUTH_FAILED');
}

const created = await json(await handleP27Qa(
  request(P2_7_ORDER_PATH, { productKey: 'fde-ims-license', currency: 'jpy', lang: 'ja' }),
  env,
  { now: fixedNow }
));
assert.equal(created.response.status, 200);
assert.equal(created.data.ok, true);
assert.equal(created.data.liveMode, false);
assert.equal(created.data.eulaVersion, P2_7_EULA_VERSION);
assert.equal(created.data.productKey, 'fde-ims-license');
assert.equal(created.data.currency, 'jpy');
assert.ok(created.data.orderId);
const orderId = created.data.orderId;
const orderKey = await env.ORDER_STATUS.get(stagingOrderIndexKey(orderId));
assert.ok(orderKey);
let stored = JSON.parse(await env.ORDER_STATUS.get(orderKey));
assert.equal(stored.orderStatus, 'order_received');
assert.equal(stored.eulaAcceptance, undefined);
assert.equal(stored.p27Qa, true);

{
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_EULA_PATH, { orderId, accepted: true, version: 'wrong-version' }),
    env,
    { now: fixedNow }
  ));
  assert.equal(response.status, 409);
  assert.equal(data.error, 'P2_7_EULA_VERSION_MISMATCH');
}

{
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_EULA_PATH, { orderId, accepted: false, version: P2_7_EULA_VERSION }),
    env,
    { now: fixedNow }
  ));
  assert.equal(response.status, 400);
  assert.equal(data.error, 'P2_7_EULA_ACCEPTANCE_REQUIRED');
}

const accepted = await json(await handleP27Qa(
  request(P2_7_EULA_PATH, { orderId, accepted: true, version: P2_7_EULA_VERSION }),
  env,
  { now: fixedNow }
));
assert.equal(accepted.response.status, 200);
assert.equal(accepted.data.reused, false);
assert.equal(accepted.data.eulaAcceptance.version, P2_7_EULA_VERSION);
assert.equal(accepted.data.eulaAcceptance.acceptedAt, fixedNow.toISOString());
assert.equal(accepted.data.eulaAcceptance.legalEffect, 'staging_test_only');
stored = JSON.parse(await env.ORDER_STATUS.get(orderKey));
assert.equal(stored.eulaAcceptance.version, P2_7_EULA_VERSION);
assert.equal(stored.eulaAcceptance.acceptedAt, fixedNow.toISOString());
assert.ok([...env.ORDER_STATUS.map.keys()].some(key => key.startsWith(`staging:audit:${orderId}:`) && key.includes('p2-7-eula-')));

{
  const later = new Date('2026-08-27T00:40:00.000Z');
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_EULA_PATH, { orderId, accepted: true, version: P2_7_EULA_VERSION }),
    env,
    { now: later }
  ));
  assert.equal(response.status, 200);
  assert.equal(data.reused, true);
  assert.equal(data.eulaAcceptance.acceptedAt, fixedNow.toISOString());
}

{
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_STATUS_PATH, { orderId }),
    env,
    { now: fixedNow }
  ));
  assert.equal(response.status, 200);
  assert.equal(data.orderStatus, 'order_received');
  assert.equal(data.webhookConfirmed, false);
  assert.equal(data.eulaAcceptance.version, P2_7_EULA_VERSION);
}

stored = JSON.parse(await env.ORDER_STATUS.get(orderKey));
await env.ORDER_STATUS.put(orderKey, JSON.stringify({
  ...stored,
  orderStatus: 'payment_confirmed',
  paymentConfirmedAt: '2026-08-27T00:45:00.000Z',
  paymentExpectation: { checkoutSessionId: 'cs_test_p27' }
}));
{
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_STATUS_PATH, { orderId }),
    env,
    { now: fixedNow }
  ));
  assert.equal(response.status, 200);
  assert.equal(data.webhookConfirmed, true);
  assert.equal(data.paymentConfirmedAt, '2026-08-27T00:45:00.000Z');
  assert.equal(data.checkoutSessionId, 'cs_test_p27');
}

{
  const { response, data } = await json(await handleP27Qa(
    request(P2_7_EULA_PATH, null, setupKey, 'GET'),
    env,
    { now: fixedNow }
  ));
  assert.equal(response.status, 405);
  assert.equal(data.error, 'METHOD_NOT_ALLOWED');
}

console.log('P2-7 EULA acceptance QA tests passed.');
