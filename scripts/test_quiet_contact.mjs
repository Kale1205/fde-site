import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {renderQuietContact} from './build_quiet_contact.mjs';
import {applyReleaseNoticePolicy} from './release_notice_policy.mjs';

const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const original=name=>execFileSync('git',['show',`2903e6d:${name}`],{cwd:root,encoding:'utf8'});
for(const prefix of ['', 'ja/', 'zh/']){
  test(`${prefix}contact: approved FAQ-first composition preserves content and functionality`,()=>{
    const name=`${prefix}contact.html`,before=original(name),html=read(name);
    assert.equal(renderQuietContact(before),html);
    assert.equal(renderQuietContact(html),html);
    assert.ok(html.indexOf('contact-faq-section')<html.indexOf('contact-form-section'));
    assert.match(html,/<p>01 \/ FAQ<\/p>/);
    assert.match(html,/<p>02 \/ (?:CONTACT FORM|お問い合わせフォーム|咨询表单)<\/p>/);
    assert.match(html,/contact-hero-mark[^>]+baked-kale-mark\.svg[^>]+alt="" aria-hidden="true"/);
    for(const id of ['contactForm','inquiryConfirm','inquiryComplete','confirmSummary','confirmBack','confirmSend','faqSearch','cmsFaqList','faqEmpty']){
      assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
    }
    const form=s=>s.match(/<form id="contactForm"[\s\S]*?<\/form>/)[0];
    assert.equal(form(html),form(before),'Fields, validation, options and button copy are preserved');
    assert.equal((form(html).match(/ required/g)||[]).length,6);
    const approvedCopy=applyReleaseNoticePolicy(before,'contact');
    for(const article of approvedCopy.match(/<article class="faq-item"[\s\S]*?<\/article>/g))assert.ok(html.includes(article),'Other static localized FAQs are unchanged');
    for(const state of before.match(/<section id="inquiry(?:Confirm|Complete)"[\s\S]*?<\/section>/g))assert.ok(html.includes(state),'Confirm/complete contract is unchanged');
    const head=s=>s.match(/<head>[\s\S]*?<\/head>/)[0];
    assert.equal(head(html).replace(/\n  <script defer src="(?:\.\.\/)?quiet-contact\.js[^>]*><\/script>/,''),head(before),'SEO and existing scripts are unchanged');
    assert.equal(html.match(/<header[\s\S]*?<\/header>/)[0],before.match(/<header[\s\S]*?<\/header>/)[0]);
    assert.equal(html.match(/<footer[\s\S]*?<\/footer>/)[0],approvedCopy.match(/<footer[\s\S]*?<\/footer>/)[0]);
  });
}
test('Contact interaction shim has no external requests, persistence or copy replacement',()=>{
  const js=read('quiet-contact.js');
  assert.match(js,/classList.contains\('contact-renewal'\)/);
  assert.match(js,/lang.startsWith\('zh'\)/);
  assert.match(js,/aria-controls/);
  assert.match(js,/aria-expanded/);
  assert.match(js,/empty.hidden = count > 0/);
  assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|innerHTML|\.textContent\s*=/);
  assert.equal(read('contact-direct.js'),original('contact-direct.js'));
  assert.equal(read('contact-config.js'),original('contact-config.js'));
});
test('Contact materials are scoped and reuse supplied logo and library icon',()=>{
  const css=read('quiet-pages.css');
  assert.match(css,/contact-renewal.contact-page \.contact-form \{ grid-template-columns: 1fr/);
  assert.match(css,/contact-renewal \.contact-hero-mark[^}]+opacity: \.065/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(read('assets/phosphor-icons-LICENSE.txt'),/Copyright \(c\) 2023 Phosphor Icons/);
});
