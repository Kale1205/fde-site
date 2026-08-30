import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  STRIPE_WEBHOOK_PATH,
  handleStripeWebhook,
  stagingOrderIndexKey,
  stripeEventKey
} from '../worker/src/staging-stripe-webhook.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const RECEIVED_AT = new Date('2026-08-25T00:00:00.000Z');
const TIMESTAMP = Math.floor(RECEIVED_AT.getTime() / 1000);
const SECRET = 'unit-test-signing-secret';
const ORDER_ID = 'stg-order-payment-001';
const ORDER_KEY = `staging:order:${TIMESTAMP}:payment-001`;

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
}

const baseOrder = (overrides = {}) => ({
  staging: true,
  dryRun: true,
  stagingOrderId: ORDER_ID,
  orderStatus: 'awaiting_payment',
  paymentExpectation: {
    provider: 'stripe',
    checkoutSessionId: 'cs_test_payment_001',
    subscriptionId: null,
    mode: 'payment',
    productKey: 'fde-ims-license',
    priceId: 'price_test_license_usd',
    amountTotal: 34900,
    currency: 'usd'
  },
  ...overrides
});

const checkoutEvent = (overrides = {}) => ({
  id: 'evt_test_checkout_001',
  object: 'event',
  created: TIMESTAMP,
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_payment_001',
      object: 'checkout.session',
      client_reference_id: ORDER_ID,
      mode: 'payment',
      payment_status: 'paid',
      amount_total: 34900,
      currency: 'usd',
      metadata: {
        baked_kale_order_id: ORDER_ID,
        product_key: 'fde-ims-license',
        price_id: 'price_test_license_usd'
      },
      ...overrides
    }
  }
});

function seededKv(order = baseOrder()) {
  return new FakeKV({
    [ORDER_KEY]: JSON.stringify(order),
    [stagingOrderIndexKey(ORDER_ID)]: ORDER_KEY
  });
}

async function signatureHeader(body, timestamp = TIMESTAMP, secret = SECRET) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)));
  const hex = [...signature].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

async function deliver(event, kv, { timestamp = TIMESTAMP, secret = SECRET, signatureSecret = SECRET } = {}) {
  const body = JSON.stringify(event);
  const request = new Request(`https://staging.example${STRIPE_WEBHOOK_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': await signatureHeader(body, timestamp, signatureSecret)
    },
    body
  });
  const response = await handleStripeWebhook(request, {
    ORDER_STATUS: kv,
    STRIPE_WEBHOOK_SECRET: secret
  }, { receivedAt: RECEIVED_AT });
  return { response, json: await response.json() };
}

// Valid Checkout payment changes only payment state and records deterministic audit/event markers.
const kv = seededKv();
const accepted = await deliver(checkoutEvent(), kv);
assert.equal(accepted.response.status, 200);
assert.equal(accepted.json.processed, true);
assert.equal(accepted.json.orderStatus, 'payment_confirmed');
const paidOrder = JSON.parse(await kv.get(ORDER_KEY));
assert.equal(paidOrder.orderStatus, 'payment_confirmed');
assert.equal(paidOrder.payment.provider, 'stripe');
assert.equal(paidOrder.payment.providerEventId, 'evt_test_checkout_001');
assert.equal(paidOrder.payment.amountTotal, 34900);
assert.equal(paidOrder.deliveredAt, undefined);
assert.equal(JSON.parse(await kv.get(stripeEventKey('evt_test_checkout_001'))).status, 'processed');
const auditKeys = [...kv.map.keys()].filter(key => key.includes(':stripe-evt_test_checkout_001'));
assert.equal(auditKeys.length, 1);
const paymentAudit = JSON.parse(await kv.get(auditKeys[0]));
assert.equal(paymentAudit.action, 'payment_confirmed');
assert.equal(paymentAudit.fromStatus, 'awaiting_payment');
assert.equal(paymentAudit.toStatus, 'payment_confirmed');

// Stripe retries are acknowledged without another state transition or audit event.
const duplicate = await deliver(checkoutEvent(), kv);
assert.equal(duplicate.response.status, 200);
assert.equal(duplicate.json.duplicate, true);
assert.equal([...kv.map.keys()].filter(key => key.includes(':stripe-evt_test_checkout_001')).length, 1);

// Signature and replay checks fail before any order mutation.
const badSignatureKv = seededKv();
const badSignature = await deliver(checkoutEvent(), badSignatureKv, { signatureSecret: 'wrong-signing-secret' });
assert.equal(badSignature.response.status, 400);
assert.equal(badSignature.json.error, 'STRIPE_SIGNATURE_INVALID');
assert.equal(JSON.parse(await badSignatureKv.get(ORDER_KEY)).orderStatus, 'awaiting_payment');

const replayKv = seededKv();
const replay = await deliver(checkoutEvent(), replayKv, { timestamp: TIMESTAMP - 301 });
assert.equal(replay.response.status, 400);
assert.equal(replay.json.error, 'STRIPE_SIGNATURE_TIMESTAMP_OUTSIDE_TOLERANCE');

// Server-side expectation is authoritative for amount, currency, product, Session, and state.
for (const [field, value, code] of [
  ['amount_total', 34899, 'STRIPE_AMOUNT_MISMATCH'],
  ['currency', 'jpy', 'STRIPE_CURRENCY_MISMATCH'],
  ['id', 'cs_test_wrong', 'STRIPE_SESSION_MISMATCH']
]) {
  const mismatch = await deliver(checkoutEvent({ [field]: value }), seededKv());
  assert.equal(mismatch.response.status, 400);
  assert.equal(mismatch.json.error, code);
}

const productMismatch = checkoutEvent();
productMismatch.data.object.metadata.product_key = 'fde-ims-license-plus';
const rejectedProduct = await deliver(productMismatch, seededKv());
assert.equal(rejectedProduct.response.status, 400);
assert.equal(rejectedProduct.json.error, 'STRIPE_PRODUCT_MISMATCH');

const priceMismatch = checkoutEvent();
priceMismatch.data.object.metadata.price_id = 'price_test_wrong';
const rejectedPrice = await deliver(priceMismatch, seededKv());
assert.equal(rejectedPrice.response.status, 400);
assert.equal(rejectedPrice.json.error, 'STRIPE_PRICE_MISMATCH');

const cancelled = await deliver(checkoutEvent(), seededKv(baseOrder({ orderStatus: 'cancelled' })));
assert.equal(cancelled.response.status, 409);
assert.equal(cancelled.json.error, 'STRIPE_ORDER_STATE_NOT_ELIGIBLE');

// Subscription renewal keeps delivery state while adding a renewal audit event.
const subscriptionOrder = baseOrder({
  orderStatus: 'delivered',
  paymentExpectation: {
    provider: 'stripe',
    checkoutSessionId: 'cs_test_subscription_001',
    subscriptionId: 'sub_test_001',
    mode: 'subscription',
    productKey: 'fde-ims-license-updates-addon',
    priceId: 'price_test_license_updates_addon_usd',
    amountTotal: 6200,
    currency: 'usd'
  }
});
const invoiceEvent = {
  id: 'evt_test_invoice_001',
  object: 'event',
  created: TIMESTAMP,
  type: 'invoice.paid',
  data: {
    object: {
      id: 'in_test_001',
      object: 'invoice',
      paid: true,
      status: 'paid',
      amount_paid: 6200,
      currency: 'usd',
      parent: {
        subscription_details: {
          subscription: 'sub_test_001',
          metadata: {
            baked_kale_order_id: ORDER_ID,
            product_key: 'fde-ims-license-updates-addon',
            price_id: 'price_test_license_updates_addon_usd'
          }
        }
      },
      lines: { data: [{ pricing: { price_details: { price: 'price_test_license_updates_addon_usd' } } }] }
    }
  }
};
const renewalKv = seededKv(subscriptionOrder);
const renewal = await deliver(invoiceEvent, renewalKv);
assert.equal(renewal.response.status, 200);
assert.equal(renewal.json.action, 'subscription_payment_confirmed');
const renewedOrder = JSON.parse(await renewalKv.get(ORDER_KEY));
assert.equal(renewedOrder.orderStatus, 'delivered');
assert.equal(renewedOrder.payment.subscriptionId, 'sub_test_001');
assert.equal(typeof renewedOrder.paymentRenewedAt, 'string');

// The deployed endpoint stays fail-closed until the staging signing secret exists.
const noSecretRequest = new Request(`https://staging.example${STRIPE_WEBHOOK_PATH}`, { method: 'POST', body: '{}' });
const noSecret = await handleStripeWebhook(noSecretRequest, { ORDER_STATUS: seededKv() }, { receivedAt: RECEIVED_AT });
assert.equal(noSecret.status, 503);
assert.equal((await noSecret.json()).error, 'STRIPE_WEBHOOK_NOT_CONFIGURED');

console.log('P2-5 Stripe webhook tests passed.');
