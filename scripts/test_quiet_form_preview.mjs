import {priceBook,money} from '../price-policy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const locale of ['', 'ja/', 'zh/']) {
  test(`${locale || 'en/'} preview is semantic, local and explicitly unindexed`, async () => {
    const html = await readFile(path.join(root, locale, 'quiet-form.html'), 'utf8');
    assert.match(html, /name="robots" content="noindex,nofollow"/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/class="quiet-comparison"/g) || []).length, 1);
    assert.equal((html.match(/<th scope="col"><div class="plan-top"/g) || []).length, 1);
    assert.match(html, /<th scope="col" id="license-plus"/);
    for(const amount of (locale==='ja/'?['¥49,800','¥99,800','¥4,900','¥9,800']:['$349','$699','$31','$62']))assert(html.includes(amount));
    assert.match(html, /2026/);
    assert.match(html, /demo-v1\.js/);
    assert.equal((html.match(/<link rel="alternate" hreflang=/g) || []).length, 3);
    assert.equal((html.match(/<a class="locale-button" data-locale-link/g) || []).length, 2);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
    for (const id of ['imsDemoRoot', 'demoQuantity', 'demoReset', 'demoOperationForm', 'inventoryBody', 'demoHistoryBody']) assert(ids.includes(id));
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      assert(!/^https?:/.test(url), 'no third-party links or image requests in this preview');
      const [resource, fragment] = url.split('#');
      const file = resource.split('?')[0];
      if (!file) { assert(ids.includes(fragment), `Missing local anchor ${fragment}`); continue; }
      let target = path.resolve(root, locale, file);
      assert(target.startsWith(root + path.sep));
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      const contents = await readFile(target);
      if (fragment) assert.match(contents.toString(), new RegExp(`id="${fragment}"`));
    }
  });
}
test('the embedded demo is manual and retains its stock reflection and reset', async () => {
  const script = await readFile(path.join(root, 'quiet-form.js'), 'utf8');
  assert.match(script, /function updateMobile/);assert.match(script, /reset.addEventListener\('click'/);
  assert.doesNotMatch(script, /requestSubmit|IntersectionObserver|function tick|function start|motion-toggle|setInterval\(|localStorage|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  for(const prefix of['','ja/','zh/'])for(const file of['index.html','quiet-form.html'])assert.doesNotMatch(await readFile(path.join(root,prefix,file),'utf8'),/motion-toggle|motion-announcement/);
});
