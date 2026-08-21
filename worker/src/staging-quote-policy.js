export const QUOTE_VALIDITY_DAYS = 7;
export const QUOTE_VALIDITY_MS = QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

function epoch(value, label) {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(ms)) throw new Error(`INVALID_${label}`);
  return ms;
}

export function createQuoteWindow(issuedAt = new Date()) {
  const issuedMs = epoch(issuedAt, 'QUOTE_ISSUED_AT');
  const expiresMs = issuedMs + QUOTE_VALIDITY_MS;
  return {
    quoteValidityDays: QUOTE_VALIDITY_DAYS,
    quoteIssuedAt: new Date(issuedMs).toISOString(),
    quoteExpiresAt: new Date(expiresMs).toISOString(),
    quoteState: 'valid'
  };
}

export function getQuoteState(quoteExpiresAt, now = new Date()) {
  const expiresMs = epoch(quoteExpiresAt, 'QUOTE_EXPIRES_AT');
  const nowMs = epoch(now, 'QUOTE_NOW');
  return nowMs >= expiresMs ? 'expired' : 'valid';
}
