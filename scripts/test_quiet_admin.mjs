import {applyCmsMemoryKey} from './cms_config_test_helpers.mjs';
import {withoutW05BookCoverEditor} from "./w05_cover_editor_test_helpers.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execApprovedNamingBaseline as execFileSync} from './approved_product_naming.mjs';
import {normalizeAssetBuildKeys} from './asset_build_test_helpers.mjs';

const root=new URL('../',import.meta.url),read=name=>withoutW05BookCoverEditor(name,readFileSync(new URL(name,root),'utf8'));

test('A01 presentation is Japanese-only and keeps the existing protected runtime order',()=>{
  const html=read('cms-admin.html');
  assert.match(html,/<html lang="ja">/);
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(html,/<body class="quiet-page admin-renewal">/);
  assert.deepEqual(JSON.parse(html.match(/id="cmsRuntimeManifest">([^<]+)/)[1]),['cms-admin.js','news-translation-hook.js','faq-admin-safe.js','cms-admin-view.js']);
  for(const id of ['token','connectBtn','newsCreateCard','newsManageCard','editNewsTarget','createNewsBtn','saveNewsBtn','deleteNewsBtn','uploaderCard','faqPanel','faqAdminKey','createFaqBtn','saveFaqBtn','deleteFaqBtn'])
    assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
  assert.match(html,/id="token" type="password"/);
  assert.match(html,/id="createTitleJa" type="text" maxlength="120"/);
  assert.match(html,/8MB以下/);
});

test('backend configuration is unchanged; the legacy FAQ writer stays disabled and CMS uses protected PR workflows',()=>{
  for(const file of ['contact-config.js'])
    assert.equal(normalizeAssetBuildKeys(read(file)),normalizeAssetBuildKeys(file==='contact-config.js'?applyCmsMemoryKey(execFileSync('git',['show',`e45a1b2:${file}`],{cwd:root,encoding:'utf8'})):execFileSync('git',['show',`e45a1b2:${file}`],{cwd:root,encoding:'utf8'})));
  assert.match(read('cms-admin.js'),/publisher\.publish\(d,token\)/);
  assert.match(read('cms-admin.js'),/new DraftStore/);
  assert.match(read('faq-admin-v3.js'),/FAQ_READ_ONLY=true/);
  assert.doesNotMatch(read('cms-admin.js'),/method:'PUT'|method:'PATCH'|localStorage|sessionStorage/);
  assert.match(read('cms-admin-loader.js'),/FDE_RUNTIME_ENV==='staging'/);
  assert.match(read('cms-admin-loader.js'),/script.type='module'/);
  assert.match(read('cms-admin-loader.js'),/paths.every\(\(path,index\)=>path===RUNTIMES\[index\]\)/);
});

test('asset normalization ignores only dated JS/CSS cache keys, not content, routes or conditions',()=>{
  assert.equal(normalizeAssetBuildKeys('contact-config.js?v=20261007-224522'), 'contact-config.js?v=BUILD');
  for (const input of ['2026/11/01', '49,800円', 'contact.html?v=20261007-224522', 'contact-config.js?v=unexpected', 'turnstile-protection.js?mode=20261007-224522']) assert.equal(normalizeAssetBuildKeys(input), input);
});

test('presentation adapter preserves controls and delegates routes to the draft-preserving runtime',()=>{
  const js=read('cms-admin-view.js');
  assert.match(js,/stage\.append\(createCard,editCard\)/);
  assert.match(js,/FDE_CMS_NAVIGATE/);
  assert.match(js,/draftSelect\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
  assert.match(js,/originalSelectField\.hidden=true/);
  assert.match(js,/row\.setAttribute\('aria-pressed'/);
  assert.match(js,/title\.focus/);
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|innerHTML|cloneNode/);
});

test('menu, breadcrumbs, language switching and native review retain the approved brand styles',()=>{
  const js=read('cms-admin-view.js'),css=read('quiet-pages.css'),core=read('cms-admin.js');
  for(const name of ['cmsMenuScreen','cmsActionsScreen','cmsBreadcrumbs'])assert.match(js,new RegExp(name));
  assert.match(core,/dialog\.showModal\(\)/);
  assert.match(core,/dialog\.close\(\)/);
  assert.match(js,/ArrowRight/);
  assert.match(js,/aria-selected/);
  assert.match(read('cms-admin.html'),/assets\/baked-kale-mark\.svg/);
  assert.match(css,/\.admin-renewal \.admin-news-workspace \{ display: grid/);
  assert.match(css,/\.quiet-page\.admin-renewal \.admin-form-grid \.field textarea \{ min-height: 260px/);
  assert.match(read('cms-admin.css'),/cms-menu-layout/);
});
