import assert from 'node:assert/strict';
import worker from '../worker/src/index-v14.js';

const blockedTypes = [
  'order',
  'fulfillment',
  'status_lookup',
  'status_update',
  'admin_orders_list',
  'admin_order_update',
  'admin_order_cancel',
  'admin_pdf'
];

for (const type of blockedTypes) {
  const request = new Request('https://kales-fde-contact.example.test/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://kale1205.github.io'
    },
    body: JSON.stringify({ type })
  });
  const response = await worker.fetch(request, {
    ALLOWED_ORIGIN: 'https://kale1205.github.io'
  }, {});
  assert.equal(response.status, 503, `${type} must stay disabled before launch`);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'FDE_COMMERCE_DISABLED_PRE_RELEASE'
  });
}

console.log('Production pre-release commerce gate tests passed.');
