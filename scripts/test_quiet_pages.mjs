import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { renderQuietLicense } from './build_quiet_license.mjs';
import { renderQuietDemo } from './build_quiet_demo.mjs';
import { renderQuietGoals } from './build_quiet_goals.mjs';
import { renderQuietNews } from './build_quiet_news.mjs';
import { renderQuietContact } from './build_quiet_contact.mjs';
import { renderQuietOrder } from './build_quiet_order.mjs';
import { renderQuietCustomer } from './build_quiet_customer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['', 'ja/', 'zh/'].flatMap(locale =>
  ['license', 'demo', 'goals', 'news', 'contact', 'order', 'customer'].map(name => `${locale}${name}.html`)
).concat(['cms-admin.html']);
// Baseline for this design-only renewal; overridable for future approved copy updates.
const baseline = process.env.QUIET_PAGES_BASE || 'e13457ad75068fa753b3f6dc6705d1aa1de2a61c';
const original = name => execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, encoding: 'utf8' });

for (const name of pages) {
  test(`${name}: content, scripts, links, conditions and SEO are unchanged`, () => {
    const html = readFileSync(path.join(root, name), 'utf8');
    let stripped = html
      .replace(/^  <link rel="stylesheet" href="(?:\.\.\/)?quiet-pages\.css\?v=[0-9A-Za-z._-]+">\n/m, '')
      .replace(/^  <script defer src="(?:\.\.\/)?quiet-contact\.js\?v=[0-9A-Za-z._-]+"><\/script>\n/m, '')
      .replace('class="quiet-page ', 'class="')
      .replace('<body class="quiet-page">', '<body>');
    if (name === 'zh/goals.html') stripped = stripped.replace('poster="../assets/', 'poster="assets/');
    if (name === 'customer.html') stripped = stripped.replace('href="index.html" aria-label="Baked Kale FDE"', 'href="index.html"');
    // Only the approved A01 class and presentation adapter differ from its original HTML.
    if (name === 'cms-admin.html') stripped = stripped
      .replace('<body class="admin-renewal">','<body>')
      .replace(',"cms-admin-view.js"','');
    const normalizeBuildKeys = source => source.replace(/([?&]v=)[0-9A-Za-z._-]+/g, '$1BUILD');
    const expected = name.endsWith('license.html')
      ? renderQuietLicense(original(name), name.includes('/') ? '../' : '')
      : name.endsWith('demo.html')
        ? renderQuietDemo(original(name), name.startsWith('ja/') ? 'ja' : name.startsWith('zh/') ? 'zh' : 'en')
        : name.endsWith('goals.html') ? renderQuietGoals(original(name))
        : name.endsWith('news.html') ? renderQuietNews(original(name))
        : name.endsWith('contact.html') ? renderQuietContact(original(name))
        : name.endsWith('order.html') ? renderQuietOrder(original(name),readFileSync(path.join(root,name.replace('order.html','index.html')),'utf8')).replace(/^  <link rel="stylesheet" href="(?:\.\.\/)?quiet-pages\.css\?v=[0-9A-Za-z._-]+">\n/m,'').replace('class="quiet-page ','class="')
        : name.endsWith('customer.html') ? renderQuietCustomer(name.startsWith('ja/')?'ja':name.startsWith('zh/')?'zh':'en',readFileSync(path.join(root,name.replace('customer.html','index.html')),'utf8')).replace(/^  <link rel="stylesheet" href="(?:\.\.\/)?quiet-pages\.css\?v=[0-9A-Za-z._-]+">\n/m,'').replace('class="quiet-page ','class="') : original(name);
    assert.equal(normalizeBuildKeys(stripped), normalizeBuildKeys(expected));
    assert.equal((html.match(/quiet-pages\.css/g) || []).length, 1);
  });
}

test('SEO configuration and route inventory are unchanged', () => {
  for (const name of ['robots.txt', 'content/zh-translations.json']) {
    assert.equal(readFileSync(path.join(root, name), 'utf8'), original(name), name);
  }
  // The repository requires commit-derived lastmods for modified HTML.
  const withoutDates = xml => xml.replace(/<lastmod>[^<]+<\/lastmod>/g, '<lastmod></lastmod>');
  assert.equal(withoutDates(readFileSync(path.join(root, 'sitemap.xml'), 'utf8')), withoutDates(original('sitemap.xml')));
});

test('shared theme stays scoped and keeps selection stationary', () => {
  const css = readFileSync(path.join(root, 'quiet-pages.css'), 'utf8');
  assert.match(css, /\.quiet-page \.license-plan-switcher \{ position: static/);
  assert.match(css, /\.quiet-page \.license-decision \{ position: static/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /data-selected-plan=plus\] \.license-matrix tr > :nth-child\(2\)/);
  assert.match(css, /data-selected-plan=license\] \.license-matrix tr > :nth-child\(3\)/);
  assert.doesNotMatch(css, /url\(['"]?https?:/);
});

test('language picker accessible name contains its visible language', () => {
  const runtime = readFileSync(path.join(root, 'gallery-ui.js'), 'utf8');
  assert(runtime.includes('summary.setAttribute("aria-label", `${text.chooseLanguage}: ${localeNames[localeKey]}`)'));
});

test('mobile shortcuts never select a language alternate as the local contact destination', () => {
  const runtime = readFileSync(path.join(root, 'gallery-ui.js'), 'utf8');
  const definition = runtime.match(/const byHref = ([^\n]+);/)[1];
  for (const locale of ['en', 'ja', 'zh']) {
    const link = (href, alternate = false) => ({ getAttribute: name => name === 'href' ? href : null, hasAttribute: name => name === 'hreflang' && alternate });
    const localContact = link('contact.html');
    const originalLinks = [link('index.html'), link('../contact.html', true), link('../zh/contact.html', true), localContact];
    const find = Function('originalLinks', `return ${definition}`)(originalLinks);
    assert.equal(find('contact.html'), localContact, locale);
  }
});
