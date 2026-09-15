import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(path.join(root, p), 'utf8');
for (const prefix of ['', 'ja/']) {
  const home = read(prefix + 'index.html');
  assert.match(home, /class="button button-primary" href="#license-plus"/);
  assert.match(home, /class="button button-secondary" href="(?:\.\.\/)?demo.html" data-demo-open/);
  assert.doesNotMatch(home, /href="#preview-panel"/);
  const panel = home.slice(home.indexOf('<div class="product-window"'), home.indexOf('<img class="hero-foreground"'));
  assert.match(panel, /<button class="inventory-row/);
  assert.match(panel, /<button class="ship-button" type="button">/);
  assert.doesNotMatch(home, /Explore freely|触って確認|Real interface/);
  for (const name of ['index.html', 'goals.html', 'demo.html', 'license.html', 'contact.html']) {
    const html = read(prefix + name);
    assert.match(html, /gallery-ui\.css\?v=/);
    assert.ok(html.includes('Our Goals'));
  }
  const why = read(prefix + 'why.html');
  assert.match(why, /noindex,follow/);
  assert.match(why, /goals\.html#fde/);
  const goals = read(prefix + 'goals.html');
  assert.match(goals, /class="mission-chapter\b/);
  assert.match(goals, /class="mission-code"/);
  assert.match(goals, /ims-v1-operation-(?:en|ja)\.mp4/);
  assert.ok(goals.includes('License Plus'));
}
assert.ok(read('index.html').includes('Your company’s system.'));
assert.ok(read('ja/index.html').includes('自社で使うシステムを、'));
assert.ok(read('ja/index.html').includes('自社で育てていく。'));
assert.match(read('gallery-ui.css'), /prefers-reduced-motion:\s*reduce/);
assert.match(read('gallery-ui.js'), /reducedMotion\.addEventListener\("change", \(\) =>/);
assert.match(read('gallery-ui.js'), /updateRow|stockButtons/);
assert.doesNotMatch(read('gallery-ui.js'), /localStorage|fetch\(/);
console.log('Source-led redesign copy, static preview, locale and motion contracts passed.');
