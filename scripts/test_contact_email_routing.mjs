import assert from 'node:assert/strict';
import worker from '../worker/src/index-v14.js';

const brevoRequests = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, init = {}) => {
  if (String(url) !== 'https://api.brevo.com/v3/smtp/email') {
    throw new Error(`Unexpected outbound request: ${url}`);
  }
  brevoRequests.push(JSON.parse(String(init.body || '{}')));
  return new Response(JSON.stringify({ messageId: `test-${brevoRequests.length}` }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};

try {
  const request = new Request('https://kales-fde-contact.example.test/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://kale1205.github.io'
    },
    body: JSON.stringify({
      type: 'inquiry',
      name: 'Test User',
      company: 'Example Co.',
      country: 'Japan',
      email: 'customer@example.com',
      product: 'FDE IMS License',
      message: 'Routing test',
      lang: 'en'
    })
  });

  const response = await worker.fetch(request, {
    ALLOWED_ORIGIN: 'https://kale1205.github.io',
    BREVO_API_KEY: 'test-only-key',
    FROM_EMAIL: 'verified-sender@example.com',
    FROM_NAME: 'Kale’s FDE'
  }, {});

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(brevoRequests.length, 2);
  assert.equal(brevoRequests[0].to[0].email, 'bakedkale1205@gmail.com');
  assert.equal(brevoRequests[0].replyTo.email, 'customer@example.com');
  assert.equal(brevoRequests[1].to[0].email, 'customer@example.com');
  assert.equal(brevoRequests[0].sender.email, 'verified-sender@example.com');
  assert.equal(brevoRequests[1].sender.email, 'verified-sender@example.com');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Contact email routing tests passed.');
