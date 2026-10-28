import {applyCmsMemoryKey} from './cms_config_test_helpers.mjs';
import {applyApprovedGoalsAutoplay} from './goals_autoplay_test_helpers.mjs';
import {applyReviewedZhSearchMetadata} from './zh_search_metadata_test_helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {applyW02PurchaseCta,purchaseCtaLabels} from './w02_purchase_cta.mjs';
import {normalizeAssetBuildKeys as normalize} from './asset_build_test_helpers.mjs';
import {applyW04LayeredMotion} from './w04_layered_motion.mjs';
import {applyW05BookNews} from './w05_book_news_test_helpers.mjs';
import {renderCurrentFaqFixture,readFaqMigrationFixture} from './faq_content_test_helpers.mjs';
import {applyApprovedContinuingUsePolicy} from './updates_continuing_use_copy.mjs';
import {applyApprovedInitialReleaseScope} from './initial_release_copy.mjs';
import {applyApprovedMultilingualContent} from './multilingual_content_copy.mjs';

const root=new URL('../',import.meta.url);
const baseline='d1302742d66acd427dbe7aea64bd5fe1dee861fa';
const read=file=>readFileSync(new URL(file,root),'utf8');
const before=file=>{const old=execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'});return file==='contact-config.js'?applyCmsMemoryKey(old):applyReviewedZhSearchMetadata(file,/^(?:ja\/|zh\/)?goals\.html$/.test(file)?applyW04LayeredMotion(old):applyW05BookNews(file,old)); };
for(const [locale,prefix] of [['en',''],['ja','ja/'],['zh-CN','zh/']]) {
  test(locale+': consultation CTA becomes one genuinely disabled purchase button, with no order destination',()=>{
    const file=prefix+'license.html',html=read(file),old=before(file);
    const scoped=applyApprovedInitialReleaseScope(file,old);
    assert.equal(normalize(html),normalize(applyApprovedContinuingUsePolicy(file,applyW02PurchaseCta(file,scoped))));
    assert.equal(applyW02PurchaseCta(file,html),html);
    const button=html.match(/<button[^>]*data-license-purchase[^>]*>[\s\S]*?<\/button>/g);
    assert.equal(button.length,1);assert.match(button[0],/type="button"/);
    assert.match(button[0],/\sdisabled\s/);assert.match(button[0],/aria-disabled="true"/);
    assert.ok(button[0].includes(purchaseCtaLabels[locale]));
    assert.doesNotMatch(button[0],/href=|form=|onclick=|data-buy|data-order|data-pay/);
    assert.doesNotMatch(html,/Ask about these terms|この条件について相談|咨询这些条件|<form|order\.js|stripe\.com|data-buy/);
    const head=s=>s.match(/<head>[\s\S]*?<\/head>/)[0];
    assert.equal(normalize(head(html)),normalize(head(old)));
    assert.equal(html.match(/<p class="license-note"[\s\S]*?<\/p>/)[0],scoped.match(/<p class="license-note"[\s\S]*?<\/p>/)[0]);
    assert.deepEqual(html.match(/(?:¥|\$)\s?\d[\d,.]*|\d[\d,]*円/g),old.match(/(?:¥|\$)\s?\d[\d,.]*|\d[\d,]*円/g));
    assert.equal((html.match(/data-license-plan=/g)||[]).length,2);
  });
}
test('Chinese dictionary adds exactly the purchase-label translation; no other copy/URLs change',()=>{
  const file='content/zh-translations.json',expected=applyApprovedInitialReleaseScope(file,applyW02PurchaseCta(file,before(file)));
  assert.deepEqual(JSON.parse(read(file)),JSON.parse(expected));
  const now=JSON.parse(read(file)),old=JSON.parse(expected);assert.equal(now[purchaseCtaLabels.en],old[purchaseCtaLabels.en]);
});
test('no runtime, API, CSS, commerce, auth or unrelated pages change',()=>{
  for(const file of ['gallery-ui.js','gallery-ui.css','quiet-pages.css','license.css','contact-direct.js','contact-config.js','quiet-form.js',
    'worker/src/index-v14.js','robots.txt','content/faq-content.json','content/faq-policy-additions.json',
    ...['','ja/','zh/'].flatMap(p=>['index','contact','demo','goals','news','order','customer'].map(n=>p+n+'.html'))]){
    const current=read(file);
    const source=file==='content/faq-content.json'?readFaqMigrationFixture(file):before(file);
    const expected=renderCurrentFaqFixture(file,applyApprovedMultilingualContent(file,applyApprovedInitialReleaseScope(file,source)));
    assert.equal(normalize(current),normalize(applyApprovedGoalsAutoplay(file,applyApprovedContinuingUsePolicy(file,expected))),file);
  }
  assert.match(read('quiet-pages.css'),/\.quiet-page :is\(button,\[type=submit\]\):disabled \{ transform: none; opacity: \.55; cursor: not-allowed; \}/);
  assert.doesNotMatch(read('gallery-ui.js'),/data-license-purchase/);
});
