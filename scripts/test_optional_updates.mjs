import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {applyApprovedOptionalUpdates, optionalUpdatesCopy, updatesNewsNotes} from './optional_updates_copy.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {applyApprovedInitialReleaseScope} from './initial_release_copy.mjs';

const root = new URL('../', import.meta.url);
const baseline = 'ccc17a1f85ef079d82d4a8e616df78b8b457fccb';
const read = file => readFileSync(new URL(file, root), 'utf8');
const before = file => execFileSync('git', ['show', baseline + ':' + file], {cwd:root, encoding:'utf8'});
const pages = ['', 'ja/', 'zh/'].flatMap(prefix =>
  ['index','license','order','contact','demo','goals','news','customer','quiet-form'].map(page => prefix + page + '.html')
).concat(['cms-admin.html','overview.html','products.html']);
const normalize = source => normalizeAssetBuildKeys(source.trimEnd());
const prices = source => source.match(/(?:¥|\$)\s?\d[\d,.]*/g) || [];

for (const file of pages) {
  test(file + ': only the approved Updates copy changes; metadata, prices and controls are preserved', () => {
    const source = read(file);
    assert.equal(normalize(source), normalize(applyApprovedInitialReleaseScope(file, applyApprovedOptionalUpdates(file, before(file)))));
    assert.equal(applyApprovedOptionalUpdates(file, source), source, 'copy migration is idempotent');
    assert.deepEqual(prices(source), prices(before(file)), 'no JPY or candidate USD price changes');
    assert.equal(normalize(source.match(/<head>[\s\S]*?<\/head>/)?.[0] || ''),
      normalize(before(file).match(/<head>[\s\S]*?<\/head>/)?.[0] || ''));
  });
}

for (const [locale,prefix] of [['en',''],['ja','ja/'],['zh','zh/']]) {
  test(locale + ': optional Updates and purchased-version use are clear on both purchase surfaces', () => {
    for (const page of ['index','quiet-form','order']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(optionalUpdatesCopy[locale].summary));
      assert.doesNotMatch(html, /Monthly subscription required|Monthly subscription to our Updates required|月額契約必須|月額契約が必須|须订阅(?:官方 Updates|月度服务)/);
      for (const price of ['¥49,800','¥99,800','¥4,900','¥9,800']) assert.ok(html.includes(price));
    }
    assert.ok(read(prefix + 'index.html').includes(optionalUpdatesCopy[locale].label));
    assert.ok(read(prefix + 'order.html').includes(optionalUpdatesCopy[locale].purchaseFact));
    assert.ok(read(prefix + 'order.html').includes('class="order-notice"'));
    assert.doesNotMatch(read(prefix + 'order.html'), /<form|data-buy|order\.js|stripe\.com/);
    const terms = read(prefix + 'license.html');
    assert.match(terms, /Updates契約期間中|FDE during Updates|Updates 订阅期内/);
    assert.match(terms, /最終利用条件|final license terms|最终许可条款/);
  });
}

test('FAQ updates are limited to four answers, without adding questions, changing IDs, or altering prices', () => {
  const ids = new Set(['updates-term','license-updates-entitlement','cancel-updates-after-license','cancel-updates-only']);
  for (const file of ['content/faq-content.json','content/faq-policy-additions.json']) {
    const now = JSON.parse(read(file)), old = JSON.parse(applyApprovedInitialReleaseScope(file, before(file)));
    assert.equal(read(file), applyApprovedInitialReleaseScope(file, applyApprovedOptionalUpdates(file, before(file))));
    assert.deepEqual(now.faq.map(x=>x.id), old.faq.map(x=>x.id));
    for (const item of now.faq) {
      const previous = old.faq.find(x=>x.id===item.id);
      if (!ids.has(item.id)) { assert.deepEqual(item,previous); continue; }
      assert.deepEqual({...item,answer:null},{...previous,answer:null});
      assert.match(item.answer.ja, /購入時のバージョン/);
      assert.match(item.answer.en, /version purchased/);
      assert.match(item.answer.ja, /契約終了後の扱い.*最終利用条件/);
      assert.match(item.answer.en, /after cancellation.*final license terms/);
      assert.doesNotMatch(item.answer.ja, /その時点までに取得したバージョンの永続利用権/);
      assert.doesNotMatch(item.answer.en, /perpetual right to use the version obtained/);
      assert.deepEqual(prices(JSON.stringify(item)),prices(JSON.stringify(previous)));
    }
  }
});

test('news keeps the dated article intact and shows the latest policy annotation before it', () => {
  const current = JSON.parse(read('content/site-content.json')), original = JSON.parse(before('content/site-content.json'));
  const now = current.news.find(x=>x.id==='ims-license-updates-policy-20260819');
  const old = original.news.find(x=>x.id===now.id);
  for (const [locale,note] of Object.entries(updatesNewsNotes)) {
    assert.equal(now.body[locale], note + '\n\n' + old.body[locale]);
  }
  assert.deepEqual({...now,body:null},{...old,body:null});
  assert.deepEqual(current.news.filter(x=>x.id!==now.id),original.news.filter(x=>x.id!==now.id));
  assert.deepEqual({...current,news:null},{...original,news:null});
  assert.equal(applyApprovedOptionalUpdates('content/site-content.json',read('content/site-content.json')),read('content/site-content.json'));
});

test('CSS, runtime, authentication, payment gates, robots and native/back-end code are not changed', () => {
  for (const file of ['gallery-ui.css','quiet-form.css','quiet-pages.css','gallery-ui.js','quiet-form.js','demo-v1.js',
    'contact-config.js','contact-direct.js','quiet-customer.js','worker/src/index-v14.js','robots.txt']) {
    assert.equal(normalize(read(file)),normalize(before(file)),file);
  }
});
