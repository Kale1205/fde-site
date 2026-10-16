import {applyCmsMemoryKey} from './cms_config_test_helpers.mjs';
import {applyReviewedZhSearchMetadata} from './zh_search_metadata_test_helpers.mjs';
import {withoutW05BookCoverEditor} from "./w05_cover_editor_test_helpers.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {applyApprovedInitialReleaseScope, initialReleaseCopy, initialScopeFaqAnswers} from './initial_release_copy.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {applyApprovedMultilingualContent} from './multilingual_content_copy.mjs';
import {applyW02PurchaseCta} from './w02_purchase_cta.mjs';
import {applyW01ProductCta} from './w01_product_cta_test_helpers.mjs';
import {applyW04LayeredMotion} from './w04_layered_motion.mjs';
import {applyW05BookNews} from './w05_book_news_test_helpers.mjs';
import {readFaqMigrationFixture} from './faq_content_test_helpers.mjs';

const root = new URL('../', import.meta.url);
const baseline = 'd6ab9132810381668d72c9eff7664a87db0a9be1';
const read = file => withoutW05BookCoverEditor(file,readFileSync(new URL(file,root),'utf8'));
const before = file => { const old=applyW02PurchaseCta(file,execFileSync('git', ['show', baseline + ':' + file], {cwd:root, encoding:'utf8'})); return file==='contact-config.js'?applyCmsMemoryKey(old):applyReviewedZhSearchMetadata(file,/^(?:ja\/|zh\/)?goals\.html$/.test(file)?applyW04LayeredMotion(old):applyW05BookNews(file,old)); };
const normalize = source => normalizeAssetBuildKeys(source.trimEnd());
const pages = ['', 'ja/', 'zh/'].flatMap(prefix =>
  ['index','quiet-form','license','order','demo','goals','news','contact','customer'].map(page => prefix + page + '.html')
).concat(['overview.html','products.html']); // CMS has its own draft/PR behavior suite.
const prices = source => source.match(/(?:¥|\$)\s?\d[\d,.]*/g) || [];
const controls = source => [...source.matchAll(/<(?:a|button|input|select|textarea|form)\b[^>]*>/g)].map(m=>m[0]);
const outsideFaq = source => source.replace(/<div id="cmsFaqList">[\s\S]*?<\/div><div id="faqEmpty"/, '<div id="faqEmpty"');

for (const file of pages) {
  test(file + ': only scoped public copy changes; metadata, prices, links and controls stay intact', () => {
    const current = read(file), previous = before(file);
    assert.equal(normalize(current), normalize(applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file, previous))));
    assert.equal(applyApprovedInitialReleaseScope(file, current), current, 'idempotent migration');
    assert.equal(normalize(current.match(/<head>[\s\S]*?<\/head>/)?.[0] || ''),
      normalize(applyApprovedMultilingualContent(file,previous).match(/<head>[\s\S]*?<\/head>/)?.[0] || ''), 'metadata preserved; Chinese now uses the same FAQ script');
    assert.deepEqual(prices(outsideFaq(current)), prices(outsideFaq(previous)));
    assert.deepEqual(controls(outsideFaq(current)), controls(outsideFaq(previous)));
  });
}

for (const [locale,prefix] of [['en',''],['ja','ja/'],['zh','zh/']]) {
  const copy = initialReleaseCopy[locale];
  test(locale + ': November 1 is a target on the three purchase surfaces, not a fixed promise', () => {
    for (const page of ['index','license','order','quiet-form']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(copy.date));
      assert.doesNotMatch(html, /Releases November 1, 2026|2026年11月1日リリース|>2026年11月1日发布/);
    }
    for (const page of ['goals','demo','news','contact','customer']) {
      assert.ok(!read(prefix + page + '.html').includes(copy.date), 'no extra release notices');
    }
  });
  test(locale + ': visible terms and order copy explain same-Mac scope, pending model testing, app languages and restore gate in HTML', () => {
    for (const page of ['license','order']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(`<span data-initial-release-scope>${copy.scope}</span>`));
      assert.ok(html.includes(`<span data-restore-release-gate>${copy.restore}</span>`));
      assert.equal((html.match(/data-initial-release-scope/g)||[]).length, 1);
      assert.equal((html.match(/data-restore-release-gate/g)||[]).length, 1);
      assert.doesNotMatch(html, /<form|data-buy|stripe\.com|order\.js/);
    }
  });
  test(locale + ': full and embedded demos distinguish simulation evidence from native availability', () => {
    for (const page of ['demo','index','quiet-form']) {
      const html = read(prefix + page + '.html');
      assert.ok(html.includes(`<strong>${copy.nativeTitle}</strong>`));
      assert.ok(html.includes(`<p>${copy.nativeScope}</p>`));
      assert.ok(html.includes(`<p class="demo-note">${copy.preview}</p>`));
      assert.doesNotMatch(html, /Only available in the real product|実製品だけに含まれること|仅供实际产品使用|signed Local\/LAN|署名付きLocal\/LAN/);
    }
  });
}

test('historical FAQ migration changes only three answers; keep legal permissions separate from technical support', () => {
  const fixture=readFaqMigrationFixture('content/faq-content.json');
  const current = JSON.parse(fixture), previous = JSON.parse(applyApprovedMultilingualContent('content/faq-content.json',before('content/faq-content.json')));
  assert.equal(fixture, applyApprovedMultilingualContent('content/faq-content.json',applyApprovedInitialReleaseScope('content/faq-content.json', before('content/faq-content.json'))));
  assert.deepEqual({...current,faq:null},{...previous,faq:null});
  assert.deepEqual(current.faq.map(item=>item.id),previous.faq.map(item=>item.id));
  for (const item of current.faq) {
    const old = previous.faq.find(x=>x.id===item.id);
    if (initialScopeFaqAnswers[item.id]) {
      assert.deepEqual({...item,answer:null},{...old,answer:null});
      for(const locale of ['ja','en'])assert.equal(item.answer[locale], initialScopeFaqAnswers[item.id][locale]);
      assert.equal(item.answer['zh-CN'],old.answer['zh-CN']);
    } else assert.deepEqual(item, old);
  }
  // These existing product-scope facts remain protected even as ordinary FAQ
  // records are added, edited or deleted through reviewed CMS pull requests.
  const live=JSON.parse(read('content/faq-content.json'));
  assert.deepEqual({...live,faq:null},{...current,faq:null},'FAQ editing does not change taxonomy or schema metadata');
  for(const [id,answers] of Object.entries(initialScopeFaqAnswers)){
    const item=live.faq.find(entry=>entry.id===id);
    assert.ok(item,`protected product-scope FAQ is missing: ${id}`);
    for(const locale of ['ja','en'])assert.equal(item.answer[locale],answers[locale],`${id}/${locale}: product scope requires separate approval`);
    assert.equal(item.answer['zh-CN'],current.faq.find(entry=>entry.id===id).answer['zh-CN']);
  }
  assert.equal(read('content/faq-policy-additions.json'), applyApprovedMultilingualContent('content/faq-policy-additions.json',before('content/faq-policy-additions.json')));
});

test('Chinese dictionary translates the complete public scope and does not restore retired demo capability claims', () => {
  const dictionary = JSON.parse(read('content/zh-translations.json'));
  assert.equal(read('content/zh-translations.json'), applyApprovedMultilingualContent('content/zh-translations.json',applyApprovedInitialReleaseScope('content/zh-translations.json', before('content/zh-translations.json'))));
  for (const key of ['scope','restore','nativeTitle','nativeScope','preview']) assert.equal(dictionary[initialReleaseCopy.en[key]],initialReleaseCopy.zh[key]);
  assert.ok(!dictionary['Only available in the real product']);
});

const node = () => ({children:[],textContent:'',dataset:{},append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);}});
function renderDemand(source, lang) {
  const notes = node(), intro = node();
  const document = {
    readyState:'complete', documentElement:{lang}, body:{classList:{contains:value=>value==='demo-app'}},
    querySelector:selector=>selector==='.demo-intro'?intro:selector==='[data-demo-notes]'?notes:selector==='[data-web-demo-demand]'?(notes.children[0]||null):null,
    querySelectorAll:()=>[], createElement:node, createTextNode:text=>({textContent:text}),
  };
  runInNewContext(source,{document});
  return notes.children[0];
}
for (const locale of ['en','ja','zh-CN']) {
  test(locale + ': browser callout preserves all explicit platform links and does not infer device support', () => {
    const callout = renderDemand(read('site.js'),locale), previous = renderDemand(before('site.js'),locale);
    const links = value => value.children[2].children.filter(child=>child.href).map(child=>({href:child.href,rel:child.rel}));
    assert.deepEqual(links(callout),links(previous));
    assert.equal(links(callout).length,7);
    const content = callout.children.map(child=>child.textContent).join(' ');
    assert.doesNotMatch(content,/macOS 12\+|M2以降 \/ macOS/);
    if (locale==='zh-CN') assert.match(content,/原生应用首个版本的范围/);
  });
}
test('site runtime changes are confined to the localized demand callout; no tracking, requests or native functionality added', () => {
  const withoutCallout = source => source.replace(/function addDemoDemandCallout\(\)\{[\s\S]*?\n\}\nfunction init\(\)/,'function init()');
  assert.equal(withoutCallout(read('site.js')),withoutCallout(before('site.js')));
  assert.doesNotMatch(read('site.js'), /navigator\.(?:userAgent|platform)|deviceMemory|fetch\(|localStorage|sessionStorage|WebSocket/);
});
test('visual styles except approved W01 CTA, demo operations, authentication, commerce gates, news and robots remain unchanged', () => {
  for (const file of ['gallery-ui.css','gallery-pages.css','quiet-form.css','quiet-pages.css','license.css','styles.css','responsive.css',
    'gallery-ui.js','demo-v1.js','quiet-form.js','contact-config.js','contact-direct.js','quiet-customer.js',
    'worker/src/index-v14.js','robots.txt']) {
    assert.equal(normalize(read(file)),normalize(applyW01ProductCta(file,before(file))),file);
  }
});
