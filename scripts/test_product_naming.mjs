import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {applyApprovedProductNaming} from './approved_product_naming.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const baseline = 'e1ebe999d2acbbf7edc211688a51894eaf7b60a6';
const previous = file => execFileSync('git', ['show', `${baseline}:${file}`], {cwd:root, encoding:'utf8'});
const pages = ['', 'ja/', 'zh/'].flatMap(prefix =>
  ['index', 'license', 'demo', 'goals', 'news', 'contact', 'order', 'customer', 'quiet-form'].map(page => `${prefix}${page}.html`)
).concat(['cms-admin.html', 'overview.html', 'products.html']);

for (const file of pages) {
  test(`${file}: only approved product/operator naming and first-use expansion change`, () => {
    const html = read(file);
    assert.equal(normalizeAssetBuildKeys(html.trimEnd()), normalizeAssetBuildKeys(applyApprovedProductNaming(previous(file)).trimEnd()));
    assert.doesNotMatch(html, /FDE IMS/);
    assert.equal(applyApprovedProductNaming(html), html);
  });
}

for (const prefix of ['', 'ja/', 'zh/']) {
  test(`${prefix || 'en/'}: distinguish the operator, product names and abbreviation`, () => {
    const home = read(prefix + 'index.html');
    const lead = home.match(/<p class="quiet-lead">([^<]+)<\/p>/)[1];
    assert.match(lead, /IMS[（ (]+Inventory Management System[）)]/);
    assert.equal((home.slice(home.indexOf('<body')).match(/Inventory Management System/g) || []).length, 1);
    assert.ok(home.indexOf(lead) < home.indexOf('<span>IMS</span>'));
    for (const plan of ['License', 'License Plus']) {
      assert.ok(home.includes(`<h2><span>IMS</span> <span>${plan}</span></h2>`));
      assert.match(read(prefix + 'order.html'), new RegExp(`<h2 id="order-product-[01]">IMS ${plan}</h2>`));
      assert.ok(read(prefix + 'contact.html').includes(`value="IMS ${plan}">IMS ${plan}</option>`));
    }
    const profile = read(prefix + 'contact.html').match(/<section class="business-profile">[\s\S]*?<\/section>/)[0];
    assert.match(profile, /class="business-profile-title">Baked Kale<\/h2>/);
    assert.equal((profile.match(/class="business-profile-item"/g) || []).length, 2);
    assert.match(profile, /FDE/); // The occupation is not a product name.
    assert.doesNotMatch(profile, /IMS|Planned products|提供予定商品|计划产品/);
    const graph = html => JSON.parse(html.match(/application\/ld\+json">\s*([\s\S]*?)<\/script>/)[1])['@graph'];
    assert.equal(graph(home).find(node => node['@type'] === 'Organization').name, 'Baked Kale');
    assert.equal(graph(home).find(node => node['@type'] === 'SoftwareApplication').name, 'IMS');
    assert.deepEqual(graph(home).map(node => node['@id']), graph(previous(prefix + 'index.html')).map(node => node['@id']));
    const goals = read(prefix + 'goals.html');
    assert.ok(goals.includes('Forward Deployed Engineer'), 'Keep the existing FDE occupation explanation');
  });
}

test('CMS hydration and Chinese dictionary contain the same approved names', () => {
  for (const file of ['content/site-content.json', 'content/faq-content.json', 'content/zh-translations.json']) {
    assert.equal(read(file), applyApprovedProductNaming(previous(file)));
    assert.doesNotMatch(read(file), /FDE IMS/);
    JSON.parse(read(file));
  }
});

test('naming does not change routing, privacy, commerce keys or operation code', () => {
  for (const file of ['robots.txt', 'contact-direct.js', 'contact-config.js', 'gallery-ui.js', 'demo-v1.js', 'quiet-form.js', 'worker/src/index-v14.js']) {
    assert.equal(read(file), previous(file), file);
  }
});
