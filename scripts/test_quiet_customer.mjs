import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';
import {renderQuietCustomer,customerCopy} from './build_quiet_customer.mjs';
import {validatePortalInput,initPortal} from '../quiet-customer.js';

const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');
for(const locale of ['en','ja','zh'])test(`${locale}: selected W08 composition, language routes, labels and noindex`,()=>{
  const prefix=locale==='en'?'':locale+'/',html=read(prefix+'customer.html');
  assert.equal(html,renderQuietCustomer(locale,read(prefix+'index.html')));
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.equal((html.match(/<h1 /g)||[]).length,1);
  assert.equal((html.match(/<input /g)||[]).length,2);
  assert.equal((html.match(/rel="alternate"/g)||[]).length,4);
  for(const field of ['order','email'])assert.ok(html.includes(`for="portal-${field}"`));
  for(const text of [customerCopy[locale].privacy,customerCopy[locale].reviewNote])assert.ok(html.includes(text));
  for(const language of ['en','ja','zh-CN'])assert.ok(html.includes(`hreflang="${language}"`));
  assert.doesNotMatch(html,/not available yet|IN DEVELOPMENT|PRE-RELEASE|まだ使用できません|尚不可使用|contact-config\.js|src="(?:\.\.\/)?customer\.js/);
});
test('input normalization and invalid cases',()=>{
  assert.deepEqual(validatePortalInput(' bk-20261101-1234abcd ',' person@example.com '),{order:'BK-20261101-1234ABCD',email:'person@example.com',orderValid:true,emailValid:true});
  for(const order of ['', 'BK-1234', '<img src=x onerror=alert(1)>','BK-20261101-1234ABCDx'])assert.equal(validatePortalInput(order,'person@example.com').orderValid,false);
  for(const email of ['', 'missing-at', 'a@b', 'a b@example.com', 'x'.repeat(255)+'@example.com'])assert.equal(validatePortalInput('BK-20261101-1234ABCD',email).emailValid,false);
});
test('local form validation, safe confirmation and keyboard focus restoration',()=>{
  const elements=new Map(),make=id=>{
    const e={id,value:'',hidden:false,textContent:id,validity:{valid:true},attributes:{},listeners:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){this.listeners[k]=fn;},focus(){document.activeElement=this;}};
    elements.set(id,e);return e;
  };
  const document={getElementById:id=>elements.get(id)};
  for(const id of ['portal-form','portal-order','portal-email','portal-review','portal-announcement','portal-order-error','portal-email-error','portal-review-order','portal-review-email','portal-review-title','portal-edit'])make(id);
  const get=id=>elements.get('portal-'+id),submit=()=>get('form').listeners.submit({preventDefault(){}});
  get('review').hidden=true;initPortal(document);submit();
  assert.equal(document.activeElement,get('order'));assert.equal(get('order').attributes['aria-invalid'],'true');
  get('order').value='bk-20261101-1234abcd';get('email').value='person@example.com';submit();
  assert.equal(get('form').hidden,true);assert.equal(get('review').hidden,false);assert.equal(document.activeElement,get('review'));
  assert.equal(get('review-order').textContent,'BK-20261101-1234ABCD');assert.equal(get('review-email').textContent,'person@example.com');
  get('edit').listeners.click();assert.equal(get('form').hidden,false);assert.equal(document.activeElement,get('order'));assert.equal(get('email').value,'person@example.com');
  get('email').listeners.input();assert.equal(get('email-error').hidden,true);assert.equal(get('email').attributes['aria-describedby'],undefined);
});
test('no real commerce, external transmission, persistent data or HTML injection',()=>{
  assert.doesNotMatch(read('quiet-customer.js'),/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML|status_lookup|FDE_CONTACT_API/);
  assert.equal(read('worker/src/index-v14.js'),execFileSync('git',['show','f95aa4d:worker/src/index-v14.js'],{cwd:root,encoding:'utf8'}));
  // A01 now has an approved presentation layer; its authentication and writes stay unchanged.
  for(const file of ['cms-admin.js','news-translation-hook.js','faq-admin-v3.js','contact-config.js','cms-admin-loader.js'])
    assert.equal(normalizeAssetBuildKeys(read(file)),normalizeAssetBuildKeys(execFileSync('git',['show',`f95aa4d:${file}`],{cwd:root,encoding:'utf8'})));
});
