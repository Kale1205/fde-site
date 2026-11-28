import {withStandaloneDemoRetired as retired} from "./standalone_demo_retirement_test_helpers.mjs";
import {priorJapaneseUpdatesFaq,priorJapaneseUpdatesHtml} from "./jpy_updates_test_helpers.mjs";
import {approveFaqDocument,approveUsdCopy} from '../price-policy.js';
import {applyCmsMemoryKey} from './cms_config_test_helpers.mjs';
import {applyReviewedUiChanges} from './focus_test_helpers.mjs';
import {applyReviewedZhSearchMetadata} from './zh_search_metadata_test_helpers.mjs';
import {withoutW05BookCoverEditor} from "./w05_cover_editor_test_helpers.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from './reviewed_snapshot_test_helpers.mjs';
import {applyApprovedInitialReleaseScope, initialReleaseCopy, initialScopeFaqAnswers} from './initial_release_copy.mjs';
import {normalizeHistoricalPresentation as normalizeAssetBuildKeys} from './approved_motion_test_helpers.mjs';
import {applyApprovedMultilingualContent} from './multilingual_content_copy.mjs';
import {applyW02PurchaseCta} from './w02_purchase_cta.mjs';
import {applyW01ProductCta} from './w01_product_cta_test_helpers.mjs';
import {applyW04LayeredMotion} from './w04_layered_motion.mjs';
import {applyW05BookNews} from './w05_book_news_test_helpers.mjs';
import {applyApprovedContinuingUsePolicy} from './updates_continuing_use_copy.mjs';

const root = new URL('../', import.meta.url);
const baseline = 'd6ab9132810381668d72c9eff7664a87db0a9be1';
const read = file => priorJapaneseUpdatesFaq(file,withoutW05BookCoverEditor(file,readFileSync(new URL(file,root),'utf8')));
const before = file => { const old=applyW02PurchaseCta(file,execFileSync('git', ['show', baseline + ':' + file], {cwd:root, encoding:'utf8'})); return file==='contact-config.js'?applyCmsMemoryKey(old):applyReviewedZhSearchMetadata(file,/^(?:ja\/|zh\/)?goals\.html$/.test(file)?applyW04LayeredMotion(old):applyW05BookNews(file,old)); };
const normalize = source => normalizeAssetBuildKeys(source.trimEnd());
const pages = ['', 'ja/', 'zh/'].flatMap(prefix =>
  ['index','quiet-form','license','order','goals','news','contact','customer'].map(page => prefix + page + '.html')
).concat(['overview.html','products.html']); // CMS has its own draft/PR behavior suite.
const prices = source => priorJapaneseUpdatesHtml(source).match(/(?:¥|\$)\s?\d[\d,.]*/g) || [];
const controls = source => [...source.matchAll(/<(?:a|button|input|select|textarea|form)\b[^>]*>/g)].map(m=>m[0]);
const outsideFaq = source => source.replace(/<div id="cmsFaqList">[\s\S]*?<\/div><div id="faqEmpty"/, '<div id="faqEmpty"');

for (const file of pages) {
  test(file + ': only scoped public copy changes; metadata, prices, links and controls stay intact', () => {
    const current = read(file), previous = retired(file,before(file));
    assert.equal(normalize(current), normalize(applyApprovedContinuingUsePolicy(file,applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file, previous)))));
    assert.equal(applyApprovedInitialReleaseScope(file, current), current, 'idempotent migration');
    assert.equal(normalize(current.match(/<head>[\s\S]*?<\/head>/)?.[0] || ''),
      normalize(applyApprovedMultilingualContent(file,previous).match(/<head>[\s\S]*?<\/head>/)?.[0] || ''), 'metadata preserved; Chinese now uses the same FAQ script');
    assert.deepEqual(prices(outsideFaq(current)), prices(outsideFaq(previous)));
    assert.deepEqual(controls(outsideFaq(current)), controls(outsideFaq(previous)));
  });
}

for (const [locale,prefix] of [['en',''],['ja','ja/'],['zh','zh/']]) {
  const copy = initialReleaseCopy[locale];
  test(locale + ': January 1, 2027 is a target on the purchase surfaces, not a fixed promise', () => {
    for (const page of ['index','license','order','quiet-form']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(copy.date));
      assert.doesNotMatch(html, /November 1, 2026|2026年11月1日|2026年11月1日/);
    }
    for (const page of ['goals','news','contact','customer']) {
      assert.ok(!read(prefix + page + '.html').includes(copy.date), 'no extra release notices');
    }
  });
  test(locale + ': visible terms and order copy explain Windows-only launch support, later iOS/iPadOS plans, unsupported macOS and restore gate', () => {
    for (const page of ['license','order']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(`<span data-initial-release-scope>${copy.scope}</span>`));
      assert.ok(html.includes(`<span data-restore-release-gate>${copy.restore}</span>`));
      assert.equal((html.match(/data-initial-release-scope/g)||[]).length, 1);
      assert.equal((html.match(/data-restore-release-gate/g)||[]).length, 1);
      assert.match(copy.scope,/Windows/);
      assert.match(copy.scope,/iOS/);
      assert.match(copy.scope,/iPadOS/);
      assert.match(copy.scope,/macOS/);
      assert.doesNotMatch(html, /<form|data-buy|stripe\.com|order\.js/);
    }
  });
  test(locale + ': embedded simulations distinguish simulation evidence from native availability', () => {
    for (const page of ['index','quiet-form']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(`<strong>${copy.nativeTitle}</strong>`));
      assert.ok(html.includes(`<p>${copy.nativeScope}</p>`));
      assert.ok(html.includes(`<p class="demo-note">${copy.preview}</p>`));
      assert.doesNotMatch(html, /Only available in the real product|実製品だけに含まれること|仅供实际产品使用|signed Local\/LAN|署名付きLocal\/LAN/);
    }
  });
}

test('historical FAQ migration changes only three answers; keep legal permissions separate from technical support', () => {
  const previousSource=applyApprovedMultilingualContent('content/faq-content.json',before('content/faq-content.json'));
  const fixture=applyApprovedMultilingualContent('content/faq-content.json',applyApprovedInitialReleaseScope('content/faq-content.json', before('content/faq-content.json')));
  const current = JSON.parse(fixture), previous = JSON.parse(previousSource);
  assert.deepEqual({...current,faq:null},{...previous,faq:null});
  assert.deepEqual(current.faq.map(item=>item.id),previous.faq.map(item=>item.id));
  for (const item of current.faq) {
    const old = previous.faq.find(x=>x.id===item.id);
    if (initialScopeFaqAnswers[item.id]) {
      assert.deepEqual({...item,answer:null,keywords:null,synonyms:null},{...old,answer:null,keywords:null,synonyms:null});
      for(const [locale,answer] of Object.entries(initialScopeFaqAnswers[item.id]))assert.equal(item.answer[locale],answer);
    } else assert.deepEqual(item, old);
  }
  // These existing product-scope facts remain protected even as ordinary FAQ
  // records are added, edited or deleted through reviewed CMS pull requests.
  const live=JSON.parse(read('content/faq-content.json'));
  assert.deepEqual({...live,faq:null},{...current,faq:null},'FAQ editing does not change taxonomy or schema metadata');
  for(const [id,answers] of Object.entries(initialScopeFaqAnswers)){
    const item=live.faq.find(entry=>entry.id===id);
    assert.ok(item,`protected product-scope FAQ is missing: ${id}`);
    for(const [locale,answer] of Object.entries(answers))assert.equal(item.answer[locale],answer,`${id}/${locale}: product scope requires separate approval`);
  }
  assert.equal(read('content/faq-policy-additions.json'),approveFaqDocument('content/faq-policy-additions.json',applyApprovedContinuingUsePolicy('content/faq-policy-additions.json',applyApprovedMultilingualContent('content/faq-policy-additions.json',before('content/faq-policy-additions.json')))));
});

test('Chinese dictionary translates the complete public scope and does not restore retired demo capability claims', () => {
  const dictionary = JSON.parse(read('content/zh-translations.json'));
  const expected=JSON.parse(retired('content/zh-translations.json',applyApprovedMultilingualContent('content/zh-translations.json',applyApprovedInitialReleaseScope('content/zh-translations.json', before('content/zh-translations.json')))));
  assert.deepEqual(dictionary,expected);
  for (const key of ['scope','restore','nativeTitle','nativeScope','preview']) assert.equal(dictionary[initialReleaseCopy.en[key]],initialReleaseCopy.zh[key]);
  assert.ok(!dictionary['Only available in the real product']);
});

test('retiring the standalone demo leaves no launcher, demand collection or tracking', () => {
  const source = read('site.js');
  assert.equal(source, retired('site.js',before('site.js')));
  assert.doesNotMatch(source,/demo\.html|addDemoDemandCallout|source=web-demo|navigator\.(?:userAgent|platform)|deviceMemory|fetch\(|localStorage|sessionStorage|WebSocket/);
});
test('visual styles except approved W01 CTA, demo operations, authentication, commerce gates, news and robots remain unchanged', () => {
  for (const file of ['gallery-pages.css','quiet-form.css','quiet-pages.css','license.css','styles.css','responsive.css',
    'demo-v1.js','quiet-form.js','contact-config.js','contact-direct.js','quiet-customer.js',
    'worker/src/index-v14.js','robots.txt']) {
    assert.equal(normalize(read(file)),normalize(applyReviewedUiChanges(file,applyW01ProductCta(file,before(file)))),file);
  }
});
