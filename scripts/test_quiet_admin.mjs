import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';

const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');

test('A01 presentation is Japanese-only and keeps the existing protected runtime order',()=>{
  const html=read('cms-admin.html');
  assert.match(html,/<html lang="ja">/);
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(html,/<body class="quiet-page admin-renewal">/);
  assert.deepEqual(JSON.parse(html.match(/id="cmsRuntimeManifest">([^<]+)/)[1]),['cms-admin.js','news-translation-hook.js','faq-admin-v3.js','cms-admin-view.js']);
  for(const id of ['token','connectBtn','newsCreateCard','newsManageCard','editNewsTarget','createNewsBtn','saveNewsBtn','deleteNewsBtn','uploaderCard','faqPanel','faqAdminKey','createFaqBtn','saveFaqBtn','deleteFaqBtn'])
    assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.match(html,/id="token" type="password"/);
  assert.match(html,/id="createTitleJa" type="text" maxlength="120"/);
  assert.match(html,/8MB以下/);
});

test('authentication, translation, CMS writes and staging lock remain unchanged apart from automatic asset cache keys',()=>{
  for(const file of ['cms-admin.js','news-translation-hook.js','faq-admin-v3.js','contact-config.js','cms-admin-loader.js'])
    assert.equal(normalizeAssetBuildKeys(read(file)),normalizeAssetBuildKeys(execFileSync('git',['show',`e45a1b2:${file}`],{cwd:root,encoding:'utf8'})));
});

test('asset normalization ignores only dated JS/CSS cache keys, not content, routes or conditions',()=>{
  assert.equal(normalizeAssetBuildKeys('contact-config.js?v=20261007-224522'), 'contact-config.js?v=BUILD');
  for (const input of ['2026/11/01', '49,800円', 'contact.html?v=20261007-224522', 'contact-config.js?v=unexpected', 'turnstile-protection.js?mode=20261007-224522']) assert.equal(normalizeAssetBuildKeys(input), input);
});

test('presentation adapter preserves nodes/listeners and delegates selection to the original selector',()=>{
  const js=read('cms-admin-view.js');
  assert.match(js,/stage\.append\(createCard,editCard\)/);
  assert.match(js,/append\(tabs,locked\)/);
  assert.match(js,/select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
  assert.match(js,/selectField\.hidden=true;select\.tabIndex=-1/);
  assert.match(js,/row\.setAttribute\('aria-pressed'/);
  assert.match(js,/target\.focus\(\)/);
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML|cloneNode/);
});

test('native mobile dialog, responsive layouts and existing brand tokens are retained',()=>{
  const js=read('cms-admin-view.js'),css=read('quiet-pages.css');
  assert.match(js,/make\('dialog','admin-menu-sheet'\)/);
  assert.match(js,/sheet\.showModal\(\)/);
  assert.match(js,/sheet\.close\(\)/);
  assert.match(js,/media\.addEventListener\('change',placeNavigation\)/);
  assert.match(js,/mark\.src='assets\/baked-kale-mark\.svg'/);
  assert.match(css,/\.admin-renewal \.admin-news-workspace \{ display: grid/);
  assert.match(css,/\.quiet-page\.admin-renewal \.admin-form-grid \.field textarea \{ min-height: 260px/);
  assert.match(css,/\.admin-renewal \.admin-menu-sheet\[open\]/);
  assert.match(css,/\.admin-renewal \.admin-menu-sheet::backdrop/);
});
