import assert from 'node:assert/strict';
import {
  QUOTE_VALIDITY_DAYS,
  QUOTE_VALIDITY_MS,
  createQuoteWindow,
  getQuoteState
} from '../worker/src/staging-quote-policy.js';

const issuedAt = '2026-08-21T00:00:00.000Z';
const quote = createQuoteWindow(issuedAt);

assert.equal(QUOTE_VALIDITY_DAYS, 7);
assert.equal(QUOTE_VALIDITY_MS, 604800000);
assert.deepEqual(quote, {
  quoteValidityDays: 7,
  quoteIssuedAt: '2026-08-21T00:00:00.000Z',
  quoteExpiresAt: '2026-08-28T00:00:00.000Z',
  quoteState: 'valid'
});

assert.equal(getQuoteState(quote.quoteExpiresAt, '2026-08-27T23:59:59.999Z'), 'valid');
assert.equal(getQuoteState(quote.quoteExpiresAt, '2026-08-28T00:00:00.000Z'), 'expired');
assert.equal(getQuoteState(quote.quoteExpiresAt, '2026-08-29T00:00:00.000Z'), 'expired');
assert.throws(() => createQuoteWindow('not-a-date'), /INVALID_QUOTE_ISSUED_AT/);
assert.throws(() => getQuoteState('not-a-date', issuedAt), /INVALID_QUOTE_EXPIRES_AT/);
assert.throws(() => getQuoteState(quote.quoteExpiresAt, 'not-a-date'), /INVALID_QUOTE_NOW/);

console.log('P2-1 quote policy tests passed.');
