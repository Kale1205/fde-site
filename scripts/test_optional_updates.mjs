import {applyCmsMemoryKey} from './cms_config_test_helpers.mjs';
import {applyApprovedGoalsAutoplay} from './goals_autoplay_test_helpers.mjs';
import {applyReviewedZhSearchMetadata} from './zh_search_metadata_test_helpers.mjs';
import {withoutW05BookCoverEditor} from "./w05_cover_editor_test_helpers.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applyApprovedOptionalUpdates, optionalUpdatesCopy, updatesNewsNotes} from './optional_updates_copy.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {applyApprovedInitialReleaseScope} from './initial_release_copy.mjs';
import {applyApprovedMultilingualContent} from './multilingual_content_copy.mjs';
import {applyW02PurchaseCta} from './w02_purchase_cta.mjs';
import {applyW01ProductCta} from './w01_product_cta_test_helpers.mjs';
import {applyW04LayeredMotion} from './w04_layered_motion.mjs';
import {applyW05BookNews} from './w05_book_news_test_helpers.mjs';
import {readFaqMigrationFixture} from './faq_content_test_helpers.mjs';
import {applyApprovedContinuingUsePolicy,continuingUseCopy,continuingUseFaqAnswers} from './updates_continuing_use_copy.mjs';

const root = new URL('../', import.meta.url);
const baseline = 'ccc17a1f85ef079d82d4a8e616df78b8b457fccb';
const read = file => withoutW05BookCoverEditor(file,readFileSync(new URL(file,root),'utf8'));
const before = file => { const old=applyW02PurchaseCta(file,execFileSync('git', ['show', baseline + ':' + file], {cwd:root, encoding:'utf8'})); return file==='contact-config.js'?applyCmsMemoryKey(old):applyReviewedZhSearchMetadata(file,/^(?:ja\/|zh\/)?goals\.html$/.test(file)?applyW04LayeredMotion(old):applyW05BookNews(file,old)); };
const pages = ['', 'ja/', 'zh/'].flatMap(prefix =>
  ['index','license','order','contact','demo','goals','news','customer','quiet-form'].map(page => prefix + page + '.html')
).concat(['overview.html','products.html']); // CMS has its own draft/PR behavior suite.
const normalize = source => normalizeAssetBuildKeys(source.trimEnd());
const prices = source => source.match(/(?:¥|\$)\s?\d[\d,.]*/g) || [];
const outsideFaq = source => source.replace(/<div id="cmsFaqList">[\s\S]*?<\/div><div id="faqEmpty"/, '<div id="faqEmpty"');

for (const file of pages) {
  test(file + ': only the approved Updates copy changes; metadata, prices and controls are preserved', () => {
    const source = read(file);
    assert.equal(normalize(source), normalize(applyApprovedContinuingUsePolicy(file,applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file, applyApprovedOptionalUpdates(file, before(file)))))));
    assert.equal(applyApprovedOptionalUpdates(file, source), source, 'copy migration is idempotent');
    assert.deepEqual(prices(outsideFaq(source)), prices(outsideFaq(before(file))), 'no JPY or candidate USD price changes outside the expanded FAQ');
    assert.equal(normalize(source.match(/<head>[\s\S]*?<\/head>/)?.[0] || ''),
      normalize(applyApprovedMultilingualContent(file,before(file)).match(/<head>[\s\S]*?<\/head>/)?.[0] || ''));
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
    for(const text of Object.values(continuingUseCopy[locale]))assert.ok(terms.includes(text),'current approved continuing-use policy is visible in the terms');
  });
}

test('historical FAQ migration changes four answers, without changing IDs or prices', () => {
  const ids = new Set(['updates-term','license-updates-entitlement','cancel-updates-after-license','cancel-updates-only']);
  for (const file of ['content/faq-content.json','content/faq-policy-additions.json']) {
    const fixture=applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file,readFaqMigrationFixture(file)));
    const now = JSON.parse(fixture), old = JSON.parse(applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file, before(file))));
    assert.equal(fixture, applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file, applyApprovedOptionalUpdates(file, before(file)))));
    if(file==='content/faq-policy-additions.json')assert.equal(read(file),applyApprovedContinuingUsePolicy(file,fixture),'policy additions only receive the separately approved continuing-use policy');
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
    const live=JSON.parse(read(file));
    const approvedNow=JSON.parse(applyApprovedContinuingUsePolicy(file,fixture));
    for(const expected of approvedNow.faq.filter(item=>ids.has(item.id))){
      const item=live.faq.find(entry=>entry.id===expected.id);
      assert.ok(item,`protected Updates FAQ is missing: ${expected.id}`);
      for(const locale of ['ja','en','zh-CN'])assert.equal(item.answer[locale],expected.answer[locale],`${expected.id}/${locale}: Updates terms require separate approval`);
      assert.deepEqual(prices(JSON.stringify(item)),prices(JSON.stringify(expected)),'Updates prices require separate approval');
    }
  }
});

test('historical news migration prepends the policy annotation; future reviewed CMS edits are permitted', () => {
  const original = JSON.parse(before('content/site-content.json'));
  const current = JSON.parse(applyApprovedOptionalUpdates('content/site-content.json',JSON.stringify(original,null,2)+'\n'));
  const now = current.news.find(x=>x.id==='ims-license-updates-policy-20260819');
  const old = original.news.find(x=>x.id===now.id);
  for (const [locale,note] of Object.entries(updatesNewsNotes)) {
    assert.equal(now.body[locale], note + '\n\n' + old.body[locale]);
  }
  assert.deepEqual({...now,body:null},{...old,body:null});
  assert.deepEqual(current.news.filter(x=>x.id!==now.id),original.news.filter(x=>x.id!==now.id));
  assert.deepEqual({...current,news:null},{...original,news:null});
  assert.equal(applyApprovedOptionalUpdates('content/site-content.json',JSON.stringify(current,null,2)+'\n'),JSON.stringify(current,null,2)+'\n');
});

test('CSS except approved W01 CTA, runtime, authentication, payment gates, robots and native/back-end code are not changed', () => {
  for (const file of ['gallery-ui.css','quiet-form.css','quiet-pages.css','gallery-ui.js','quiet-form.js','demo-v1.js',
    'contact-config.js','contact-direct.js','quiet-customer.js','worker/src/index-v14.js','robots.txt']) {
    assert.equal(normalize(read(file)),normalize(applyApprovedGoalsAutoplay(file,applyW01ProductCta(file,before(file)))),file);
  }
});

// Keep the historical migrations above pinned. The latest approved policy is a
// separate, narrow layer over the public source before this policy change.
const continuingUseBaseline='b9395fb77aabccccc5248b46f09f82f805180cd6';
const continuingBefore=file=>execFileSync('git',['show',`${continuingUseBaseline}:${file}`],{cwd:root,encoding:'utf8'});
const policyFiles={
  'content/faq-content.json':['updates-term'],
  'content/faq-policy-additions.json':['license-updates-entitlement','cancel-updates-after-license','cancel-updates-only'],
};
const policyPages=[['license.html','en','License Updates'],['ja/license.html','ja','LicenseのUpdates'],['zh/license.html','zh','License 更新服务']];
const policyFields=['milestones','endVersion','afterEnd','noNewRights','resubscription'];
const policyPrices=item=>JSON.stringify(item).match(/(?:[¥￥$]|JPY|USD)\s*\d[\d,.]*|\d[\d,.]*\s*(?:円|日元|美元|USD|JPY)/gi)||[];
const policyRegion=(file,source)=>{
  const heading=policyPages.find(([path])=>path===file)?.[2];
  const matches=[...source.matchAll(new RegExp(`<div><h2>${heading}</h2>(?:<p>[\\s\\S]*?</p>)+</div>`,'g'))];
  assert.equal(matches.length,1,`${file}: one named Updates region`);return matches[0][0];
};

test('approved continuing-use copy defines the excluded first six months and six-month milestones in every locale',()=>{
  assert.deepEqual(Object.keys(continuingUseCopy),['ja','en','zh']);
  // Pin the reviewed wording independently of the migration helper, so adding a
  // conflicting clause cannot pass by retaining the expected phrases below.
  const approvedPolicyHashes={
    ja:'e08f143df360b9ecd72ddd112699969a44c2d6bc5e9c33d59f01003f78ce37e7',
    en:'14ae38e5d5a19947f0954bd6661505e74142728c5eea6867417e8e3d392815cb',
    zh:'2bdd4a2794de2878e9de2c2bdc0eda1c49d70abb075dbc0249621651f3736cdb',
  };
  const facts={
    ja:{
      milestones:['購入後最初の6か月（無料の3か月と半額の3か月）','期間に算入しません','中断なく連続6か月継続するごとに','各到達時点の版','購入後12か月、18か月、24か月'],
      endVersion:['契約終了時点の最新版','自動的に継続利用権が更新されることはありません'],
      afterEnd:['購入時の版と','到達時点で継続利用権を取得した版'],
      noNewRights:['その期間で新たな継続利用権を取得していない場合','購入時の版と','それまでに継続利用権を取得した版のみ'],
      resubscription:['購入後6か月以降に契約を終了し、再契約','再契約から新たに連続6か月継続するごとに','以前の契約期間とは合算せず','それまでに取得した継続利用権は保持'],
    },
    en:{
      milestones:['first six months after purchase (three free months and three months at half price)','are excluded','every six consecutive months of an uninterrupted Updates subscription','version at that milestone','12, 18, 24 months after purchase'],
      endVersion:['does not automatically extend','latest version at the end of the subscription'],
      afterEnd:['version purchased and the versions','obtained continuing-use rights at these milestones'],
      noNewRights:['before you earn new continuing-use rights for that period','only the version purchased and versions','previously earned continuing-use rights'],
      resubscription:['at or after the six-month point following purchase and then subscribe again','each new milestone of six consecutive months from resubscribing','Time from previous subscriptions is not added','retain the continuing-use rights you previously earned'],
    },
    zh:{
      milestones:['最初6个月（免费3个月及半价3个月）不计入','每连续订阅 Updates 满6个月且不中断','该节点版本','购买后12个月、18个月、24个月'],
      endVersion:['不会自动延伸','订阅结束时的最新版本'],
      afterEnd:['购买时的版本','在这些节点已取得持续使用权的版本'],
      noNewRights:['该期间尚未取得新的持续使用权','只能使用购买时的版本','此前已取得持续使用权的版本'],
      resubscription:['购买满6个月时或之后结束订阅并重新订阅','从重新订阅起每连续满6个月','不与此前的订阅期间合并计算','此前已取得的持续使用权予以保留'],
    },
  };
  for(const [locale,copy]of Object.entries(continuingUseCopy)){
    assert.deepEqual(Object.keys(copy),policyFields);
    assert.equal(createHash('sha256').update(JSON.stringify(copy)).digest('hex'),approvedPolicyHashes[locale],`${locale}: approved policy wording requires separate approval`);
    for(const field of policyFields)for(const fact of facts[locale][field])assert.ok(copy[field].includes(fact),`${locale}/${field}: ${fact}`);
  }
});

for(const [file,locale]of policyPages)test(`${file}: only approved Updates paragraphs change, with exact locale copy and unchanged prices`,()=>{
  const historical=continuingBefore(file),previous=applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file,historical));
  const current=read(file),expected=applyApprovedContinuingUsePolicy(file,previous);
  assert.equal(normalize(current),normalize(expected));
  assert.equal(applyApprovedContinuingUsePolicy(file,current),current,'current output is byte-idempotent');
  assert.equal(normalize(current.replace(policyRegion(file,current),'UPDATES_POLICY')),normalize(previous.replace(policyRegion(file,previous),'UPDATES_POLICY')),'all markup outside the Updates region stays exact except asset build keys');
  for(const text of Object.values(continuingUseCopy[locale]))assert.ok(policyRegion(file,current).includes(text));
  assert.deepEqual(policyPrices(current),policyPrices(previous),'public prices are unchanged');
});

for(const [file,ids]of Object.entries(policyFiles))test(`${file}: exactly the approved FAQ answers change; other records, locale data and prices stay intact`,()=>{
  const previousSource=applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file,continuingBefore(file)));
  const previous=JSON.parse(previousSource),current=JSON.parse(read(file));
  assert.equal(read(file),applyApprovedContinuingUsePolicy(file,previousSource));
  assert.equal(applyApprovedContinuingUsePolicy(file,read(file)),read(file),'current JSON is byte-idempotent');
  assert.deepEqual({...current,faq:null},{...previous,faq:null});
  assert.deepEqual(current.faq.map(item=>item.id),previous.faq.map(item=>item.id));
  for(const item of current.faq){
    const old=previous.faq.find(entry=>entry.id===item.id);
    if(!ids.includes(item.id)){assert.deepEqual(item,old);continue;}
    assert.deepEqual({...item,answer:null},{...old,answer:null});
    assert.deepEqual(item.answer,continuingUseFaqAnswers[item.id]);
    assert.deepEqual(policyPrices(item),policyPrices(old),'FAQ prices are unchanged');
    for(const locale of ['ja','en','zh-CN'])for(const text of Object.values(continuingUseCopy[locale==='zh-CN'?'zh':locale]))assert.ok(item.answer[locale].includes(text),`${item.id}/${locale}: the License-page policy is complete`);
  }
});

test('continuing-use migration preserves unknown FAQ fields, extra locales and unrelated added records',()=>{
  for(const [file,ids]of Object.entries(policyFiles)){
    const input=JSON.parse(continuingBefore(file));input.unknownRoot={keep:['synthetic']};
    const record=input.faq.find(item=>item.id===ids[0]);record.unknownRecord={keep:true};record.answer.fr='Synthetic existing locale';
    input.faq.push({id:'synthetic-unrelated',unknown:{keep:true}});
    const output=JSON.parse(applyApprovedContinuingUsePolicy(file,JSON.stringify(input)));
    const expected=structuredClone(input);
    for(const item of expected.faq)if(ids.includes(item.id))Object.assign(item.answer,continuingUseFaqAnswers[item.id]);
    assert.deepEqual(output,expected);
    const formatted=JSON.stringify(output);assert.equal(applyApprovedContinuingUsePolicy(file,formatted),formatted,'already current input keeps its formatting');
  }
});

test('continuing-use migration is a byte identity for every path outside its explicit scope',()=>{
  const source=continuingBefore('license.html');
  for(const file of ['index.html','ja/order.html','content/site-content.json','content/zh-translations.json','worker/src/index-v14.js','other/license.html'])assert.equal(applyApprovedContinuingUsePolicy(file,source),source,file);
});

test('unknown FAQ answers and missing or duplicate target IDs stop the migration without overwriting input',()=>{
  for(const [file,ids]of Object.entries(policyFiles)){
    for(const locale of ['ja','en','zh-CN']){
      const data=JSON.parse(continuingBefore(file));data.faq.find(item=>item.id===ids[0]).answer[locale]+=' Synthetic unreviewed edit';
      const source=JSON.stringify(data);assert.throws(()=>applyApprovedContinuingUsePolicy(file,source),/unreviewed FAQ answer/);assert.equal(JSON.stringify(data),source);
    }
    const missing=JSON.parse(continuingBefore(file));missing.faq=missing.faq.filter(item=>item.id!==ids[0]);
    assert.throws(()=>applyApprovedContinuingUsePolicy(file,JSON.stringify(missing)),/expected one FAQ/);
    const duplicate=JSON.parse(continuingBefore(file));duplicate.faq.push(structuredClone(duplicate.faq.find(item=>item.id===ids[0])));
    assert.throws(()=>applyApprovedContinuingUsePolicy(file,JSON.stringify(duplicate)),/expected one FAQ/);
  }
});

test('unreviewed or ambiguous License regions stop the migration',()=>{
  for(const [file]of policyPages){
    const previous=continuingBefore(file),oldRegion=policyRegion(file,previous),current=read(file),newRegion=policyRegion(file,current);
    for(const source of [previous.replace(oldRegion,''),previous+oldRegion,current+newRegion,previous.replace(oldRegion,oldRegion.replace('<p>','<p>Synthetic unreviewed edit '))])assert.throws(()=>applyApprovedContinuingUsePolicy(file,source),/Continuing-use policy/);
  }
});

test('unreviewed milestone and version-retention changes are rejected',()=>{
  const mutations={
    ja:[['期間に算入しません','期間に算入します'],['連続6か月継続するごとに','連続12か月継続するごとに'],['自動的に継続利用権が更新されることはありません','自動的に継続利用権が更新されます']],
    en:[['are excluded','are included'],['every six consecutive months','every twelve consecutive months'],['does not automatically extend','automatically extends']],
    'zh-CN':[['不计入取得持续使用权所需的期间','计入取得持续使用权所需的期间'],['每连续订阅 Updates 满6个月','每连续订阅 Updates 满12个月'],['不会自动延伸至','自动延伸至']],
  };
  for(const [locale,changes]of Object.entries(mutations))for(const [from,to]of changes){
    const data=JSON.parse(read('content/faq-content.json')),record=data.faq.find(item=>item.id==='updates-term'),before=record.answer[locale];
    assert.ok(before.includes(from),'mutation changes the current approved answer');record.answer[locale]=before.replace(from,to);assert.notEqual(record.answer[locale],before);
    assert.throws(()=>applyApprovedContinuingUsePolicy('content/faq-content.json',JSON.stringify(data)),/unreviewed FAQ answer/);
  }
});
