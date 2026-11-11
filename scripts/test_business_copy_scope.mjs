import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyReviewedBusinessCopy} from './business_copy_test_helpers.mjs';

test('business copy accommodation cannot hide unrelated links, prices, addresses or article copy',()=>{
 const source='<aside>Our Goals</aside><a href="unexpected.html">製品</a><p>Price: 999円; Address: invented</p>';
 for(const file of ['ja/index.html','ja/contact.html','zh/goals.html','contact.html','unknown.html'])assert.equal(applyReviewedBusinessCopy(file,source),source);
 const dictionary=JSON.stringify({'Our Goals':'unapproved wording','Price':'999円','Address':'invented'},null,2)+'\n';
 const changed=JSON.parse(applyReviewedBusinessCopy('content/zh-translations.json',dictionary));
 assert.equal(changed['Our Goals'],'unapproved wording');assert.equal(changed.Price,'999円');assert.equal(changed.Address,'invented');
});

test('reviewed business copy is idempotent and retains unrelated appended content',()=>{
 for(const file of ['ja/index.html','ja/contact.html','ja/goals.html','zh/goals.html','contact.html','content/zh-translations.json']){
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.equal(applyReviewedBusinessCopy(file,source),source);
  if(!file.endsWith('.json')){const extra=source+'\n<p>Unrelated 999円</p>\n';assert.equal(applyReviewedBusinessCopy(file,extra),extra);}
 }
});
