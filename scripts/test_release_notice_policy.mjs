import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {releaseCopy, applyReleaseNoticePolicy, removePurchaseStatusCopy} from './release_notice_policy.mjs';
import {applyW04LayeredMotion} from './w04_layered_motion.mjs';
import {readFaqMigrationFixture} from './faq_content_test_helpers.mjs';
import {applyApprovedContinuingUsePolicy} from './updates_continuing_use_copy.mjs';
import {applyApprovedInitialReleaseScope} from './initial_release_copy.mjs';
import {applyApprovedMultilingualContent} from './multilingual_content_copy.mjs';

const root=new URL('../',import.meta.url);
const read=file=>normalizeAssetBuildKeys(readFileSync(new URL(file,root),'utf8'));
const before=file=>{const old=execFileSync('git',['show',`d49ca55:${file}`],{cwd:root,encoding:'utf8'});return normalizeAssetBuildKeys(/^(?:ja\/|zh\/)?goals\.html$/.test(file)?applyW04LayeredMotion(old):old);};
for(const [locale,prefix] of [['en',''],['ja','ja/'],['zh','zh/']]) {
  test(`${locale}: release/purchase notice only appears on homepage, terms and W07`,()=>{
    for(const page of ['index','license','order']) {
      const html=read(`${prefix}${page}.html`),body=html.slice(html.indexOf('<body'));
      assert.ok(body.includes(releaseCopy[locale].date));
      assert.ok(body.includes(releaseCopy[locale].unavailable));
      assert.equal((body.match(new RegExp(releaseCopy[locale].unavailable.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length,1);
    }
    for(const page of ['goals','demo','news','contact']) {
      const html=read(`${prefix}${page}.html`);
      assert.ok(!html.includes(releaseCopy[locale].unavailable));
      assert.doesNotMatch(html,/data-faq-id="ims-sale-status"|Purchasing is not available|采购不可用|Formal sales are not open|正式販売は開始していません|正式销售不公开/);
    }
    for(const page of ['contact','news','license']) {
      const html=read(`${prefix}${page}.html`);
      assert.equal(applyReleaseNoticePolicy(html,page),html);
      assert.equal(html.match(/<head>[\s\S]*?<\/head>/)[0],before(`${prefix}${page}.html`).match(/<head>[\s\S]*?<\/head>/)[0],'Metadata and scripts stay intact');
    }
    assert.doesNotMatch(read(`${prefix}order.html`),/<form|fetch\(|contact-direct\.js|checkout/i);
    for(const page of ['demo','goals'])assert.equal(read(`${prefix}${page}.html`),before(`${prefix}${page}.html`),'Demo provenance and operational boundaries are unchanged');
  });
}
test('CMS hydration cannot restore purchase-unavailable FAQ or suffixes',()=>{
  const data=JSON.parse(read('content/faq-content.json'));
  assert.ok(!data.faq.some(item=>item.id==='ims-sale-status'));
  for(const item of data.faq)for(const answer of Object.values(item.answer))assert.equal(removePurchaseStatusCopy(answer),answer);
  const old=JSON.parse(before('content/faq-content.json'));
  const historical=JSON.parse(applyApprovedMultilingualContent('content/faq-content.json',applyApprovedInitialReleaseScope('content/faq-content.json',readFaqMigrationFixture('content/faq-content.json'))));
  assert.equal(historical.faq.length,old.faq.length-1,'historical notice migration removes one FAQ');
  for(const item of historical.faq){
    const expected=structuredClone(old.faq.find(entry=>entry.id===item.id));
    expected.answer=Object.fromEntries(Object.entries(expected.answer).map(([lang,text])=>[lang,removePurchaseStatusCopy(text)]));
    assert.deepEqual(item,expected,'All other FAQ questions, terms, prices and search keys are preserved');
  }
  assert.equal(read('content/faq-policy-additions.json'),applyApprovedContinuingUsePolicy('content/faq-policy-additions.json',before('content/faq-policy-additions.json')));
  for(const prefix of ['', 'ja/', 'zh/']) {
    const portal=read(`${prefix}customer.html`);
    assert.ok(portal.includes('quiet-customer.js'));
    assert.doesNotMatch(portal,/(?:src=")[^"]*(?:\/|\")customer\.js|contact-config\.js|id="statusForm"/);
  }
});
