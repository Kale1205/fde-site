import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import test from 'node:test';
import {renderQuietLicense} from './build_quiet_license.mjs';

for (const locale of ['', 'ja/', 'zh/']) {
  const file = `${locale}license.html`;
  const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  test(`${file}: selected option-two architecture and semantic comparison`, () => {
    assert.match(html, /license-page license-renewal/);
    assert(html.indexOf('license-intro') < html.indexOf('license-spotlight-art'));
    assert(html.indexOf('license-spotlight-art') < html.indexOf('license-matrix-region'));
    assert(html.indexOf('license-details') < html.indexOf('license-callout'));
    assert.doesNotMatch(html, /<aside class="license-index"/);
    assert.equal((html.match(/data-license-plan=/g) || []).length, 2);
    assert.equal((html.match(/data-license-art=/g) || []).length, 2);
    assert.equal((html.match(/scope="col"/g) || []).length, 3);
    assert.equal((html.match(/scope="row"/g) || []).length, 5);
    assert.match(html, /<caption id="license-matrix-[a-z]+">/);
    assert.doesNotMatch(html, /<h3>/);
    assert.match(html, /<div><h2>License<\/h2>/);
    assert.match(html, /role="region" aria-labelledby="license-matrix-[a-z]+" tabindex="0"/);
    for (const id of ['deliverables', 'internal-use', 'updates', 'conditions']) assert(html.includes(`id="${id}"`));
    assert(html.includes(`src="${locale ? '../' : ''}assets/ims-license-update.webp"`));
    assert(html.includes(`src="${locale ? '../' : ''}assets/ims-license-plus-customize.webp"`));
  });
  test(`${file}: recomposition is idempotent and accepts the original three-locale markup`, () => {
    const original = execFileSync('git', ['show', `e13457ad75068fa753b3f6dc6705d1aa1de2a61c:${file}`], {encoding: 'utf8'});
    const once = renderQuietLicense(original, locale ? '../' : '');
    assert.equal(renderQuietLicense(once, locale ? '../' : ''), once);
    assert.equal(renderQuietLicense(html, locale ? '../' : ''), html);
  });
}

test('mobile selected table column is visible and its row headings have an opaque sticky surface', () => {
  const js = readFileSync(new URL('../gallery-ui.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../quiet-pages.css', import.meta.url), 'utf8');
  assert.match(js, /classList\.contains\("license-renewal"\)/);
  assert.match(js, /region\.scrollLeft = key === "plus" \? region\.scrollWidth - region\.clientWidth : 0/);
  assert.match(css, /license-renewal\[data-selected-plan\] \.license-matrix tr > :first-child \{[^}]*position: sticky[^}]*background: var\(--paper\)/);
  assert.match(css, /license-renewal\[data-selected-plan\] \.license-matrix tr > :nth-child\(3\) \{ display: table-cell; \}/);
});
