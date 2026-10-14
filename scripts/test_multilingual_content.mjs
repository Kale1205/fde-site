import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {applyApprovedMultilingualContent as apply,mergedFaqData,zhFaqCopy,demoLanguageNotes,redistributionAnswer,zhInventoryCopy} from './multilingual_content_copy.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';

const root=new URL('../',import.meta.url);
const baseline='b714f3d7e3cf2444effb6ca6b0d303c3036857f4';
const read=file=>readFileSync(new URL(file,root),'utf8');
const before=file=>execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'});
const normalized=value=>normalizeAssetBuildKeys(value.trimEnd());
const prefixes=['','ja/','zh/'];
const names=['index','license','demo','goals','news','contact','order','customer','quiet-form'];
const outsideFaq=value=>value.replace(/<div id="cmsFaqList">[\s\S]*?<\/div><div id="faqEmpty"/,'<div id="faqEmpty"');
const meta=value=>value.match(/<(?:meta|link)\b[^>]*>/g);

for(const prefix of prefixes)for(const page of names){
  const file=prefix+page+'.html';
  test(file+': only reviewed translations and static FAQ change; pricing, metadata and routes stay intact',()=>{
    const current=read(file),old=before(file);
    assert.equal(normalized(current),normalized(apply(file,old)),file);
    assert.equal(apply(file,current),current,'idempotent');
    assert.deepEqual(meta(current),meta(apply(file,old)),'only the pinned Chinese demo description translation changes');
    assert.deepEqual(current.match(/<link rel="(?:canonical|alternate)"[^>]*>|<meta name="robots"[^>]*>/g),old.match(/<link rel="(?:canonical|alternate)"[^>]*>|<meta name="robots"[^>]*>/g),'canonical/hreflang/robots remain exact');
    assert.deepEqual(current.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g),old.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g));
    assert.deepEqual(outsideFaq(current).match(/(?:¥|\$)\s?\d[\d,.]*/g),outsideFaq(old).match(/(?:¥|\$)\s?\d[\d,.]*/g));
    assert.deepEqual(current.match(/<a\b[^>]*>/g),old.match(/<a\b[^>]*>/g),'no new routes or links');
    assert.deepEqual(current.match(/<form\b[\s\S]*?<\/form>/g),apply(file,old).match(/<form\b[\s\S]*?<\/form>/g),'only pinned demo helper text changes within forms');
    const controls=value=>outsideFaq(value).match(/<(?:form|input|select|textarea|button|option)\b[^>]*>/g);
    assert.deepEqual(controls(current),controls(old),'control attributes, validation, disabled flags and option values unchanged');
  });
}
const data=mergedFaqData();
test('same 37 existing IDs, no new FAQ or sales activation; all three locales complete',()=>{
  const old=[...JSON.parse(before('content/faq-content.json')).faq,...JSON.parse(before('content/faq-policy-additions.json')).faq];
  assert.equal(data.faq.length,37);assert.deepEqual(data.faq.map(x=>x.id),old.map(x=>x.id));
  assert.equal(new Set(data.faq.map(x=>x.id)).size,37);assert.equal(Object.keys(zhFaqCopy).length,37);
  for(const item of data.faq)for(const locale of ['ja','en','zh-CN'])for(const field of ['question','answer','keywords','synonyms'])assert.ok(item[field][locale]?.length,item.id+' '+locale+' '+field);
});
for(const file of ['content/faq-content.json','content/faq-policy-additions.json'])test(file+': only Chinese translation, label definitions, and two scoped answer clarifications',()=>{
  const current=JSON.parse(read(file)),old=JSON.parse(before(file));
  assert.equal(read(file),apply(file,before(file)));
  for(const item of current.faq){
    const original=old.faq.find(x=>x.id===item.id);
    assert.deepEqual({...item,question:null,answer:null,keywords:null,synonyms:null},{...original,question:null,answer:null,keywords:null,synonyms:null});
    for(const locale of ['ja','en'])for(const field of ['question','answer','keywords','synonyms']){
      let expected=original[field][locale];
      if(field==='answer'&&item.id==='no-redistribution'&&locale==='en')expected=redistributionAnswer;
      if(field==='answer'&&item.id==='demo-not-product-version')expected+=demoLanguageNotes[locale];
      assert.deepEqual(item[field][locale],expected,item.id+' '+field+' '+locale);
    }
  }
});
for(const [locale,prefix] of [['en',''],['ja','ja/'],['zh-CN','zh/']])test(locale+': every FAQ lives in semantic HTML, with named controls and localized taxonomy',()=>{
  const html=read(prefix+'contact.html');
  assert.equal((html.match(/class="faq-item"/g)||[]).length,37);
  for(const item of data.faq){
    assert.ok(html.includes('data-faq-id="'+item.id+'"'));
    const answerId='faq-answer-'+item.id;
    assert.ok(html.includes('aria-controls="'+answerId+'"'));assert.ok(html.includes('id="'+answerId+'"'));
    assert.ok(data.categories[item.category].label[locale]);assert.ok(data.subcategories[item.subcategory].label[locale]);
  }
  assert.match(html,/<noscript><style>\.faq-a\{display:block\}/);
  assert.match(html,/faq-cms\.js/);
  assert.doesNotMatch(html,/<span>product<\/span>|<span>adoption<\/span>/);
});
test('Chinese stock terms agree with the running demo and do not imply real server/backup support',()=>{
  const dict=JSON.parse(read('content/zh-translations.json'));
  assert.equal(read('content/zh-translations.json'),apply('content/zh-translations.json',before('content/zh-translations.json')));
  for(const [key,value] of Object.entries(zhInventoryCopy))assert.equal(dict[key],value);
  for(const prefix of ['zh/'])for(const page of ['index','demo','quiet-form']){
    const html=read(prefix+page+'.html');
    assert.doesNotMatch(html,/船舶|飞船|股票|卫生和历史|备份\/备份/);
    assert.match(html,/入库、调拨、盘点、出库/);
    assert.match(html,/合成示例数据/);
  }
  for(const id of ['updates-term','license-updates-entitlement','cancel-updates-after-license','cancel-updates-only']){
    assert.match(data.faq.find(x=>x.id===id).answer['zh-CN'],/购买时的版本/);
    assert.match(data.faq.find(x=>x.id===id).answer['zh-CN'],/订阅结束后的使用条件.*最终许可条款/);
  }
  assert.match(data.faq.find(x=>x.id==='license-devices').answer['zh-CN'],/单台 Mac.*同一台 Mac/);
  assert.match(data.faq.find(x=>x.id==='demo-not-product-version').answer['zh-CN'],/不代表原生应用支持中文/);
});
for(const prefix of prefixes)test((prefix||'en/') + ': internal links resolve locally; deleted Decision Guides stay deleted',()=>{
  for(const page of names.filter(x=>x!=='quiet-form')){
    const file=prefix+page+'.html',html=read(file);
    for(const [,href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)){
      if(/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(href))continue;
      const target=new URL(href.replaceAll('&amp;','&'),new URL(file,root));target.search='';target.hash='';
      if(target.pathname.endsWith('/'))target.pathname+='index.html';
      assert.ok(existsSync(target),file+' → '+href);
      assert.doesNotMatch(href,/one-time-purchase-inventory-software|inventory-software-with-source-code|self-hosted-inventory-management-software|small-business-inventory-management-software/);
    }
  }
});
for(const [path,prefix] of [['/contact.html',''],['/ja/contact.html','../'],['/zh/contact.html','../']])test(path+': policy merge loads the locale-correct file and preserves duplicate precedence',async()=>{
  const calls=[],base={faq:[{id:'same',answer:'base'}]},extra={faq:[{id:'same',answer:'extra'},{id:'new'}]};
  const window={fetch:async url=>{calls.push(url);return new Response(JSON.stringify(calls.length===1?base:extra));}};
  runInNewContext(read('faq-policy-merge.js'),{window,location:{pathname:path},Response,JSON,Date,Set,console});
  const response=await window.fetch(prefix+'content/faq-content.json');
  assert.ok(calls[1].startsWith(prefix+'content/faq-policy-additions.json?'));
  assert.deepEqual((await response.json()).faq,[{id:'same',answer:'base'},{id:'new'}]);
});
test('shared FAQ renderer retains static content on fetch failure/incomplete Chinese translations; no new endpoint, tracking or persistence',()=>{
  const js=read('faq-cms.js');
  assert.match(js,/readPublishedContent\(\);renderCategories\(\);filter\(\)/);
  assert.match(js,/published content retained/);assert.match(js,/LANG==='zh-CN'&&next.faq.some/);
  assert.match(js,/if\(changed\)/);assert.match(js,/aria-pressed/);assert.match(js,/CSS.escape/);
  assert.doesNotMatch(js,/https?:\/\/|method:\s*['"]POST|navigator\.|localStorage|sessionStorage|sendBeacon|XMLHttpRequest/);
});
test('visual design, native demo operations, CMS editing/auth, contact submission and commerce boundaries are byte-preserved',()=>{
  for(const file of ['gallery-ui.css','gallery-pages.css','quiet-form.css','quiet-pages.css','license.css','faq-v38.css',
    'gallery-ui.js','demo-v1.js','quiet-form.js','site.js','contact-direct.js','contact-config.js','quiet-customer.js',
    'cms-admin.html','faq-admin-v3.js','cms-admin-view.js','cms-content.js','cms-content-ja.js','content/site-content.json',
    'worker/src/index-v14.js','robots.txt'])assert.equal(normalized(read(file)),normalized(before(file)),file);
});
