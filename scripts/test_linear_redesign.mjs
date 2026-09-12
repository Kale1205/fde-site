import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(path.join(root, p), 'utf8');
for (const prefix of ['', 'ja/']) {
  const home = read(prefix + 'index.html');
  assert.match(home, /class="button button-primary" href="demo.html"/);
  assert.doesNotMatch(home, /href="#preview-panel"/);
  const panel = home.slice(home.indexOf('<div class="product-window"'), home.indexOf('<img class="hero-foreground"'));
  assert.match(panel, /\binert\b/);
  assert.doesNotMatch(panel, /<(button|input|a)\b/);
  assert.doesNotMatch(home, /Explore freely|触って確認|Real interface/);
  for (const name of ['index.html', 'why.html', 'goals.html', 'demo.html', 'license.html', 'contact.html']) {
    const html = read(prefix + name);
    assert.match(html, /linear-ui\.css\?v=/);
    assert.ok(html.includes(prefix ? 'Kaleのゴール' : 'Kale’s Goal'));
  }
  assert.match(read(prefix + 'why.html'), /class="principle-list"/);
  assert.match(read(prefix + 'goals.html'), /class="goal-manifesto"/);
  assert.ok(read(prefix + 'goals.html').includes('License Plus'));
}
assert.match(read('ja/index.html'), /まだ、在庫を<br class="mobile-break">確認するたびに/);
assert.ok(read('ja/index.html').includes('自社の道具は、自社で変えたい？'));
assert.match(read('linear-ui.css'), /prefers-reduced-motion:reduce/);
assert.match(read('gallery-ui.js'), /reduced\.addEventListener\("change", configure\)/);
assert.match(read('gallery-ui.js'), /passive: true/);
assert.doesNotMatch(read('gallery-ui.js'), /updateRow|stockButtons|localStorage|fetch\(/);
console.log('Linear redesign copy, static preview, locale and motion contracts passed.');
