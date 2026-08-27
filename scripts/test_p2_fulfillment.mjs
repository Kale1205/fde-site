import assert from 'node:assert/strict';
import {
  P2_8_PREPARE_PATH,
  P2_8_SIMULATE_DELIVERY_PATH,
  P2_8_STATUS_PATH,
  handleP28Qa
} from '../worker/src/staging-p2-8-fulfillment.js';

class MemoryKv {
  constructor() { this.map = new Map(); }
  async get(key) { return this.map.get(key) ?? null; }
  async put(key, value) { this.map.set(key, String(value)); }
  async delete(key) { this.map.delete(key); }
}

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_KEY = `staging:order:1787800000000:${ORDER_ID}`;
const SETUP_KEY = 'staging-operator-test-key';

function paidOrder(overrides = {}) {
  return {
    staging: true,
    dryRun: true,
    p27Qa: true,
    stagingOrderId: ORDER_ID,
    orderStatus: 'payment_confirmed',
    product: 'fde-ims-license',
    paymentConfirmedAt: '2026-08-27T04:40:00.000Z',
    eulaAcceptance: {
      accepted: true,
      acceptedAt: '2026-08-27T04:35:00.000Z',
      version: 'FDE-IMS-STAGING-EULA-2026-08-27',
      legalEffect: 'staging_test_only'
    },
    paymentExpectation: {
      provider: 'stripe',
      productKey: 'fde-ims-license',
      priceId: 'price_sandbox_reference',
      amountTotal: 49800,
      currency: 'jpy',
      mode: 'payment',
      checkoutSessionId: 'cs_sandbox_reference'
    },
    payment: {
      provider: 'stripe',
      providerEventId: 'evt_sandbox_reference',
      providerObjectId: 'cs_sandbox_reference'
    },
    ...overrides
  };
}

async function envWith(order) {
  const kv = new MemoryKv();
  await kv.put(`staging:order-id:${ORDER_ID}`, ORDER_KEY);
  await kv.put(ORDER_KEY, JSON.stringify(order));
  return { ORDER_STATUS: kv, STAGING_CHECKOUT_SETUP_KEY: SETUP_KEY };
}

async function post(env, path, body, key = SETUP_KEY, now = new Date('2026-08-27T05:00:00.000Z')) {
  const request = new Request(`https://staging.example${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FDE-Staging-Checkout-Key': key
    },
    body: JSON.stringify(body)
  });
  const response = await handleP28Qa(request, env, { now });
  const json = await response.json();
  return { response, json };
}

{
  const env = await envWith(paidOrder());
  const prepared = await post(env, P2_8_PREPARE_PATH, { orderId: ORDER_ID });
  assert.equal(prepared.response.status, 200);
  assert.equal(prepared.json.orderStatus, 'preparing_delivery');
  assert.equal(prepared.json.liveMode, false);
  assert.equal(prepared.json.productionDeliveryEnabled, false);
  assert.equal(prepared.json.fulfillment.manifest.mode, 'staging_simulation_only');
  assert.equal(prepared.json.fulfillment.manifest.artifacts.installer.status, 'withheld_product_not_released');
  assert.equal(prepared.json.fulfillment.manifest.customerMailSent, false);

  const reused = await post(env, P2_8_PREPARE_PATH, { orderId: ORDER_ID });
  assert.equal(reused.response.status, 200);
  assert.equal(reused.json.reused, true);

  const missingConfirmation = await post(env, P2_8_SIMULATE_DELIVERY_PATH, { orderId: ORDER_ID });
  assert.equal(missingConfirmation.response.status, 400);
  assert.equal(missingConfirmation.json.error, 'P2_8_SIMULATION_CONFIRMATION_REQUIRED');

  const delivered = await post(env, P2_8_SIMULATE_DELIVERY_PATH, {
    orderId: ORDER_ID,
    confirmSimulation: true
  }, SETUP_KEY, new Date('2026-08-27T05:05:00.000Z'));
  assert.equal(delivered.response.status, 200);
  assert.equal(delivered.json.orderStatus, 'delivered');
  assert.equal(delivered.json.fulfillment.simulation.completed, true);
  assert.equal(delivered.json.fulfillment.simulation.installerReleased, false);
  assert.equal(delivered.json.fulfillment.simulation.customerMailSent, false);

  const status = await post(env, P2_8_STATUS_PATH, { orderId: ORDER_ID });
  assert.equal(status.response.status, 200);
  assert.equal(status.json.webhookConfirmed, true);
  assert.equal(status.json.simulationOnly, true);
  assert.equal(status.json.installerReleased, false);
  assert.equal(status.json.customerMailSent, false);

  const auditKeys = [...env.ORDER_STATUS.map.keys()].filter(key => key.startsWith(`staging:audit:${ORDER_ID}:`));
  assert.equal(auditKeys.length, 2);
}

{
  const env = await envWith(paidOrder({
    orderStatus: 'awaiting_payment',
    paymentConfirmedAt: null,
    payment: null
  }));
  const result = await post(env, P2_8_PREPARE_PATH, { orderId: ORDER_ID });
  assert.equal(result.response.status, 409);
  assert.equal(result.json.error, 'P2_8_STRIPE_PAYMENT_REQUIRED');
}

{
  const env = await envWith(paidOrder({ staging: false, dryRun: false }));
  const result = await post(env, P2_8_PREPARE_PATH, { orderId: ORDER_ID });
  assert.equal(result.response.status, 409);
  assert.equal(result.json.error, 'P2_8_STAGING_ORDER_REQUIRED');
}

{
  const env = await envWith(paidOrder());
  const result = await post(env, P2_8_PREPARE_PATH, { orderId: ORDER_ID }, 'wrong-key');
  assert.equal(result.response.status, 403);
  assert.equal(result.json.error, 'P2_8_AUTH_FAILED');
}

console.log('P2-8 staging fulfillment tests passed.');
