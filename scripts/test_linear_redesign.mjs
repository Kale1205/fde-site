import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(path.join(root, p), 'utf8');
for (const prefix of ['', 'ja/']) {
  const home = read(prefix + 'index.html');
  assert.match(home, /class="button button-primary" href="#license-plus"/);
  assert.match(home, /class="button button-secondary" href="(?:\.\.\/)?demo.html" data-demo-open/);
  assert.doesNotMatch(home, /href="#preview-panel"/);
  assert.doesNotMatch(home, /gallery-pages\.css\?v=/);
  assert.equal(home.match(/<img alt="Baked Kale FDE" src="(?:\.\.\/)?assets\/baked-kale-logo\.svg" width="980" height="240">/g)?.length, 2);
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
  assert.match(goals, /<meta property="og:image" content="https:\/\/kale1205\.github\.io\/fde-site\/assets\/warehouse-operations\.webp">/);
  assert.ok(goals.includes('License Plus'));

  const license = read(prefix + 'license.html');
  assert.match(license, /class="license-document"/);
  assert.match(license, /class="license-matrix"/);
  assert.match(license, /data-license-plan="license"/);
  assert.match(license, /data-license-plan="plus"/);
  assert.match(license, /data-selected-plan="plus"/);
  assert.match(license, /class="matrix-symbol positive" aria-hidden="true">✓</);
  assert.match(license, /class="matrix-symbol" aria-hidden="true">—</);
  assert.match(license, /data-license-summary/);
}
assert.ok(statSync(path.join(root, 'assets/night-lab-20260915.webp')).size < 70000);
assert.ok(read('index.html').includes('Your company’s system.'));
assert.ok(read('ja/index.html').includes('自社で使うシステムを、'));
assert.ok(read('ja/index.html').includes('自社で育てていく。'));
assert.match(read('gallery-ui.css'), /prefers-reduced-motion:\s*reduce/);
assert.match(read('gallery-ui.js'), /reducedMotion\.addEventListener\("change", \(\) =>/);
assert.match(read('gallery-ui.js'), /updateRow|stockButtons/);
assert.match(read('gallery-ui.js'), /mobile-nav-shortcuts/);
assert.match(read('gallery-ui.js'), /mobile-nav-backdrop/);
assert.match(read('gallery-ui.js'), /document\.body\.append\(backdrop, mobileNav\)/);
assert.match(read('gallery-ui.js'), /setTimeout\(\(\) => setMenu\(false\), 0\)/);
assert.match(read('gallery-ui.js'), /data-license-plan/);
assert.match(read('gallery-ui.js'), /document\.body\.dataset\.selectedPlan = key/);
assert.match(read('gallery-ui.css'), /\.mobile-sheet/);
assert.match(read('gallery-ui.css'), /\.mobile-nav-backdrop\s*\{[\s\S]*?z-index:\s*1000/);
assert.match(read('gallery-ui.css'), /\.mobile-nav\.mobile-sheet\s*\{[\s\S]*?z-index:\s*1010/);
assert.match(read('license.css'), /\.license-plan-switcher/);
assert.match(read('license.css'), /\.license-plan-switcher\s*\{[^}]*display:\s*grid/);
assert.doesNotMatch(read('license.css'), /\.license-plan-switcher\s*\{[^}]*position:\s*sticky/);
const localizedPages = [
  'index.html', 'one-time-purchase-inventory-software.html',
  'inventory-software-with-source-code.html',
  'self-hosted-inventory-management-software.html',
  'small-business-inventory-management-software.html', 'license.html',
  'demo.html', 'goals.html', 'contact.html', 'news.html', 'order.html',
];
const comparisonExpectations = [
  ['index.html', 'Excel, SaaS, or a system you can shape?', 'Typical cloud inventory SaaS'],
  ['ja/index.html', 'Excel・SaaS・FDE IMSの違い', '一般的なクラウド型在庫管理SaaS'],
  ['zh/index.html', 'Excel、SaaS，还是可以自行调整的系统？', '一般的云端库存管理 SaaS'],
];
for (const [name, heading, cloudLabel] of comparisonExpectations) {
  const html = read(name);
  const comparisonStart = html.indexOf('<section class="operating-comparison');
  const plansStart = html.indexOf('<section class="offers');
  const guidesStart = html.indexOf('<nav class="source-guides');
  assert.ok(comparisonStart > html.indexOf('<section class="story-section'), `${name}: comparison must follow the starting-point story`);
  assert.ok(comparisonStart < plansStart, `${name}: comparison must replace the development-notes position before plans`);
  const comparison = html.slice(comparisonStart, plansStart);
  assert.ok(comparison.includes(heading));
  assert.ok(comparison.includes(cloudLabel));
  assert.doesNotMatch(html, /class="workflow-band|class="research-sheet|class="comparison-guides/);
  assert.match(comparison, /<table class="comparison-table">[\s\S]*?<caption>[^<]+<\/caption>[\s\S]*?<thead>[\s\S]*?<tbody>/);
  assert.equal(comparison.match(/<th scope="col"/g)?.length, 4);
  assert.equal(comparison.match(/<th scope="row"/g)?.length, 6);
  assert.equal(comparison.match(/class="comparison-symbol/g)?.length, 18);
  assert.match(comparison, /role="region" aria-labelledby="operating-model-title" tabindex="0"/);
  const guides = html.slice(guidesStart, html.indexOf('</nav>', guidesStart));
  for (const href of [
    'one-time-purchase-inventory-software.html',
    'inventory-software-with-source-code.html',
    'self-hosted-inventory-management-software.html',
    'small-business-inventory-management-software.html',
  ]) assert.match(guides, new RegExp(`href="${href}"`));
}
for (const name of localizedPages) {
  const html = read(`zh/${name}`);
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="ja"/);
  assert.match(html, /hreflang="zh-CN"/);
}
const zhLicense = read('zh/license.html');
assert.match(zhLicense, /<html lang="zh-CN">/);
assert.ok(zhLicense.includes('您想从哪一种方案开始？'));
assert.ok(zhLicense.includes('内部使用 ≠ 转售或再分发'));
assert.match(zhLicense, /hreflang="en"/);
assert.match(zhLicense, /hreflang="ja"/);
assert.match(zhLicense, /hreflang="zh-CN"/);
assert.doesNotMatch(read('gallery-ui.js'), /localStorage|fetch\(/);
console.log('Source-led redesign copy, static preview, locale and motion contracts passed.');
