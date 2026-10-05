import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['', 'ja/', 'zh/'].flatMap(locale =>
  ['license', 'demo', 'goals', 'news', 'contact', 'order'].map(name => `${locale}${name}.html`)
).concat(['customer.html', 'cms-admin.html']);
// Baseline for this design-only renewal; overridable for future approved copy updates.
const baseline = process.env.QUIET_PAGES_BASE || 'e13457ad75068fa753b3f6dc6705d1aa1de2a61c';
const original = name => execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, encoding: 'utf8' });

for (const name of pages) {
  test(`${name}: content, scripts, links, conditions and SEO are unchanged`, () => {
    const html = readFileSync(path.join(root, name), 'utf8');
    let stripped = html
      .replace(/^  <link rel="stylesheet" href="(?:\.\.\/)?quiet-pages\.css\?v=20260925-081759">\n/m, '')
      .replace('class="quiet-page ', 'class="')
      .replace('<body class="quiet-page">', '<body>');
    if (name === 'zh/goals.html') stripped = stripped.replace('poster="../assets/', 'poster="assets/');
    if (name === 'customer.html') stripped = stripped.replace('href="index.html" aria-label="Baked Kale FDE"', 'href="index.html"');
    assert.equal(stripped, original(name));
    assert.equal((html.match(/quiet-pages\.css/g) || []).length, 1);
  });
}

test('public homepages and SEO configuration are unchanged', () => {
  for (const name of ['index.html', 'ja/index.html', 'zh/index.html', 'robots.txt', 'content/zh-translations.json']) {
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
  assert.doesNotMatch(css, /url\(['"]?https?:/);
});
