import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  STRIPE_CHECKOUT_PATH,
  handleStripeCheckout,
  resolveStripePrice
} from '../worker/src/staging-stripe-checkout.js';
import { stagingOrderIndexKey } from '../worker/src/staging-stripe-webhook.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const NOW = new Date('2026-08-25T01:00:00.000Z');
const ORDER_ID = 'stg-order-checkout-001';
const ORDER_KEY = 'staging:order:1787616000000:checkout-001';
const SETUP_KEY = 'unit-test-operator-key-with-enough-entropy';

class FakeKV {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
  async get(key) { return this.map.get(key) ?? null; }
  async put(key, value) { this.map.set(key, value); }
  async delete(key) { this.map.delete(key); }
}

const baseOrder = (overrides = {}) => ({
  staging: true,
  dryRun: true,
  stagingOrderId: ORDER_ID,
  orderStatus: 'billing_preparation',
  email: 'buyer@example.test',
  quoteExpiresAt: '2026-09-01T00:00:00.000Z',
  eulaAcceptance: {
    version: 'fde-ims-eula-2026-08-25',
    acceptedAt: '2026-08-25T00:30:00.000Z'
  },
  ...overrides
});

const environment = (kv, overrides = {}) => ({
  ORDER_STATUS: kv,
  STAGING_CHECKOUT_ENABLED: 'true',
  STAGING_CHECKOUT_SETUP_KEY: SETUP_KEY,
  STRIPE_SECRET_KEY: 'rk_test_unit_test_secret',
  STRIPE_PRICE_LICENSE_USD: 'price_test_license_usd',
  STRIPE_PRICE_LICENSE_JPY: 'price_test_license_jpy',
  STRIPE_PRICE_LICENSE_PLUS_USD: 'price_test_license_plus_usd',
  STRIPE_PRICE_LICENSE_PLUS_JPY: 'price_test_license_plus_jpy',
  STAGING_CHECKOUT_SUCCESS_URL: 'https://kales-fde-staging.pages.dev/fde-site/order.html?checkout=success',
  STAGING_CHECKOUT_CANCEL_URL: 'https://kales-fde-staging.pages.dev/fde-site/order.html?checkout=cancelled',
  ...overrides
});

const seededKv = (order = baseOrder()) => new FakeKV({
  [ORDER_KEY]: JSON.stringify(order),
  [stagingOrderIndexKey(ORDER_ID)]: ORDER_KEY
});

function request(body, { key = SETUP_KEY } = {}) {
  return new Request(`https://staging.example${STRIPE_CHECKOUT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FDE-Staging-Checkout-Key': key
    },
    body: JSON.stringify(body)
  });
}

const checkoutInput = { orderId: ORDER_ID, productKey: 'fde-ims-license', currency: 'usd' };
const stripeSession = (overrides = {}) => ({
  id: 'cs_test_checkout_001',
  object: 'checkout.session',
  livemode: false,
  mode: 'payment',
  currency: 'usd',
  amount_total: 34900,
  status: 'open',
  url: 'https://checkout.stripe.com/c/pay/cs_test_checkout_001',
  expires_at: Math.floor(new Date('2026-08-25T02:00:00.000Z').getTime() / 1000),
  ...overrides
});

const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  return new Response(JSON.stringify(stripeSession()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// The server-side catalog owns amount, currency, mode, and the configured Stripe Price ID.
assert.deepEqual(resolveStripePrice(environment(seededKv()), 'fde-ims-license', 'usd'), {
  productKey: 'fde-ims-license', currency: 'usd', mode: 'payment', amountTotal: 34900,
  priceBinding: 'STRIPE_PRICE_LICENSE_USD', priceId: 'price_test_license_usd'
});
assert.equal(resolveStripePrice(environment(seededKv()), 'fde-ims-license', 'jpy').amountTotal, 49800);
assert.equal(resolveStripePrice(environment(seededKv()), 'fde-ims-license-plus', 'usd').amountTotal, 69900);
assert.equal(resolveStripePrice(environment(seededKv()), 'fde-ims-license-plus', 'jpy').amountTotal, 99800);
assert.throws(() => resolveStripePrice(environment(seededKv()), 'fde-ims-updates', 'jpy'), /CHECKOUT_PRICE_NOT_ALLOWED/);

// A valid operator-only request creates one sandbox Session, expectation, and audit event.
const kv = seededKv();
const acceptedResponse = await handleStripeCheckout(request(checkoutInput), environment(kv), { now: NOW });
const accepted = await acceptedResponse.json();
assert.equal(acceptedResponse.status, 200);
assert.equal(accepted.liveMode, false);
assert.equal(accepted.checkoutSessionId, 'cs_test_checkout_001');
assert.equal(accepted.reused, false);
assert.equal(calls.length, 1);
assert.equal(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions');
assert.equal(calls[0].init.headers.Authorization, 'Bearer rk_test_unit_test_secret');
assert.equal(calls[0].init.headers['Idempotency-Key'], `fde-staging-checkout-${ORDER_ID}-fde-ims-license-usd`);
const stripeBody = new URLSearchParams(calls[0].init.body);
assert.equal(stripeBody.get('mode'), 'payment');
assert.equal(stripeBody.get('line_items[0][price]'), 'price_test_license_usd');
assert.equal(stripeBody.get('client_reference_id'), ORDER_ID);
assert.equal(stripeBody.get('metadata[baked_kale_order_id]'), ORDER_ID);
assert.equal(stripeBody.get('customer_email'), 'buyer@example.test');
assert.equal(JSON.stringify(accepted).includes('rk_test_'), false);
assert.equal(JSON.stringify(accepted).includes(SETUP_KEY), false);

const storedOrder = JSON.parse(await kv.get(ORDER_KEY));
assert.equal(storedOrder.orderStatus, 'awaiting_payment');
assert.deepEqual(storedOrder.paymentExpectation, {
  provider: 'stripe',
  checkoutSessionId: 'cs_test_checkout_001',
  subscriptionId: null,
  mode: 'payment',
  productKey: 'fde-ims-license',
  priceId: 'price_test_license_usd',
  amountTotal: 34900,
  currency: 'usd'
});
const auditKeys = [...kv.map.keys()].filter(key => key.includes(':stripe-checkout-cs_test_checkout_001'));
assert.equal(auditKeys.length, 1);
assert.equal(JSON.parse(await kv.get(auditKeys[0])).action, 'checkout_session_created');

// Repeating the same request returns the stored unexpired Session without another Stripe call.
const repeatedResponse = await handleStripeCheckout(request(checkoutInput), environment(kv), { now: NOW });
const repeated = await repeatedResponse.json();
assert.equal(repeatedResponse.status, 200);
assert.equal(repeated.reused, true);
assert.equal(calls.length, 1);

// Authentication and activation fail closed before reading the order or calling Stripe.
const unauthorizedResponse = await handleStripeCheckout(request(checkoutInput, { key: 'wrong' }), environment(seededKv()), { now: NOW });
assert.equal(unauthorizedResponse.status, 403);
assert.equal((await unauthorizedResponse.json()).error, 'CHECKOUT_AUTH_FAILED');

const disabledResponse = await handleStripeCheckout(request(checkoutInput), environment(seededKv(), { STAGING_CHECKOUT_ENABLED: 'false' }), { now: NOW });
assert.equal(disabledResponse.status, 503);
assert.equal((await disabledResponse.json()).error, 'STRIPE_CHECKOUT_DISABLED');

// Missing configuration, expired quotes, absent EULA acceptance, and unknown catalog rows are rejected.
const missingSecretResponse = await handleStripeCheckout(request(checkoutInput), environment(seededKv(), { STRIPE_SECRET_KEY: '' }), { now: NOW });
assert.equal(missingSecretResponse.status, 503);
assert.equal((await missingSecretResponse.json()).error, 'STRIPE_API_NOT_CONFIGURED');

const expiredKv = seededKv(baseOrder({ quoteExpiresAt: '2026-08-25T00:59:59.000Z' }));
const expiredResponse = await handleStripeCheckout(request(checkoutInput), environment(expiredKv), { now: NOW });
assert.equal(expiredResponse.status, 409);
assert.equal((await expiredResponse.json()).error, 'CHECKOUT_QUOTE_EXPIRED');

const noEulaKv = seededKv(baseOrder({ eulaAcceptance: null }));
const noEulaResponse = await handleStripeCheckout(request(checkoutInput), environment(noEulaKv), { now: NOW });
assert.equal(noEulaResponse.status, 409);
assert.equal((await noEulaResponse.json()).error, 'CHECKOUT_EULA_ACCEPTANCE_REQUIRED');

const unknownPriceResponse = await handleStripeCheckout(
  request({ ...checkoutInput, productKey: 'not-allowlisted' }), environment(seededKv()), { now: NOW }
);
assert.equal(unknownPriceResponse.status, 400);
assert.equal((await unknownPriceResponse.json()).error, 'CHECKOUT_PRICE_NOT_ALLOWED');

// A live-mode or amount-mismatched provider response can never become the order expectation.
globalThis.fetch = async () => new Response(JSON.stringify(stripeSession({ livemode: true })), { status: 200 });
const liveModeKv = seededKv();
const liveModeResponse = await handleStripeCheckout(request(checkoutInput), environment(liveModeKv), { now: NOW });
assert.equal(liveModeResponse.status, 502);
assert.equal((await liveModeResponse.json()).error, 'STRIPE_SESSION_RESPONSE_MISMATCH');
assert.equal(JSON.parse(await liveModeKv.get(ORDER_KEY)).orderStatus, 'billing_preparation');

console.log('P2-6 Stripe Checkout tests passed.');
