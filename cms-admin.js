import {DraftStore,NewsPublisher,CmsError,errorText,newDraft,persistedDraft,fingerprint,inspectImage,base64,LANGS} from './cms-news-workflow.js?v=20261016-133303';

// News drafts never leave this browser until an explicit publication request.
const $=id=>document.getElementById(id),make=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
const store=new DraftStore(),drafts={create:newDraft(),edit:null,media:null};
let token='',snapshot=null,busy=false,mode='create',saveQueue=Promise.resolve(),timer,unsaved=false;
const previewed=new Map();
const publisher=new NewsPublisher({persist:async d=>{await saveQueue;return store.put(d);}});
const status=(text,type='')=>{const el=$('adminStatus');el.dataset.cmsPersistent='true';el.textContent=text;el.className=`status ${type}`;el.hidden=false;};
const safe=fn=>async(...args)=>{try{await fn(...args);}catch(e){status(errorText(e),'error');}};
const suffixes={ja:'Ja',en:'En','zh-CN':'Zh'};
function button(id,text,action,parent,secondary=true){const b=make('button',text,`admin-button${secondary?' secondary':''}`);b.id=id;b.type='button';b.addEventListener('click',safe(action));parent.append(b);return b;}
function showPanel(name){document.querySelectorAll('[data-admin-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.adminPanel!==name));document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===name));}
function showEditor(next){mode=next;document.dispatchEvent(new CustomEvent('fde:cms-show-editor',{detail:next}));}
function capture(which){
 const d=drafts[which];if(!d||which==='media')return d;
 for(const locale of LANGS){d.record.title[locale]=$(which+'Title'+suffixes[locale]).value;d.record.body[locale]=$(which+'Body'+suffixes[locale]).value;}
 d.record.date=$(which+'Date').value;d.record.category=$(which+'Category').value;d.record.featured=$(which+'Featured').checked;return d;
}
async function save(which=mode){
 const d=capture(which);if(!d)return;
 // Serialize all IndexedDB revisions, including autosave and request journals.
 unsaved=true;
 const task=saveQueue.catch(()=>{}).then(async()=>{d.updatedAt=new Date().toISOString();const saved=await store.put(d);d.revision=saved.revision;await refreshDraftList();unsaved=false;return saved;});saveQueue=task;return task;
}
function dirty(which){if(busy)return;mode=which;const d=capture(which);if(!d)return;d.reviewedFingerprint='';const check=$(which+'Reviewed');if(check)check.checked=false;clearTimeout(timer);timer=setTimeout(()=>safe(async()=>{timer=null;await save(which);status('下書きをこのブラウザに保存しました。GitHubへは送信していません。','success');})(),700);}
async function refreshDraftList(){const list=await store.list(),sel=$('localDrafts'),current=sel.value;sel.replaceChildren(new Option('端末内の下書きを選択',''));for(const d of list)sel.add(new Option(`${d.updatedAt.slice(0,16).replace('T',' ')} — ${d.operation==='media'?'共通画像':d.record.title?.ja||'無題'}${d.request?'［公開依頼あり］':''}`,d.id));sel.value=current;}
function drawImage(box,blob,source=''){
 const previous=box.dataset.objectUrl;if(previous)URL.revokeObjectURL(previous);delete box.dataset.objectUrl;box.replaceChildren();
 let url='';if(blob){url=URL.createObjectURL(blob);box.dataset.objectUrl=url;}
 else{const match=String(source).match(/^(?:https:\/\/raw\.githubusercontent\.com\/Kale1205\/fde-site\/main\/|https:\/\/kale1205\.github\.io\/fde-site\/)?(assets\/[A-Za-z0-9_/-]+\.(?:png|jpe?g|webp|gif|svg))$/);if(match)url=`https://raw.githubusercontent.com/Kale1205/fde-site/main/${match[1].split('/').map(encodeURIComponent).join('/')}`;}
 if(url){const img=make('img');img.src=encodeURI(url);img.alt='記事画像プレビュー';box.append(img);}else box.append(make('p','画像未設定','preview-placeholder'));
}
function fill(which,d){
 drafts[which]=d;
 if(which==='media'){drawImage($('preview'),d.image);return;}
 for(const locale of LANGS){$(which+'Title'+suffixes[locale]).value=d.record.title?.[locale]||'';$(which+'Body'+suffixes[locale]).value=d.record.body?.[locale]||'';}
 for(const key of ['Category','Date'])$(which+key).value=d.record[key.toLowerCase()]||'';
 $(which+'Featured').checked=!!d.record.featured;$(which+'ImageFile').value='';$(which+'Reviewed').checked=false;
 drawImage($(which+'Preview'),d.image);if(which==='edit')drawImage($('editCurrentImage'),null,d.removeImage?'':d.record.image);
 $('draftOperation').textContent=d.operation==='delete'?'この記事の削除依頼を準備しています。公開依頼までは公開データを変更しません。':'';
 showEditor(which);showResult(d);
}
async function connect(){
 if(busy)return;const value=$('token').value.trim();if(!value)throw new CmsError('AUTH');$('connectBtn').disabled=true;
 try{const user=await publisher.api('/user',value),next=await publisher.snapshot(value);token=value;snapshot=next;const sel=$('editNewsTarget');sel.replaceChildren();
 for(const item of [...next.content.news].sort((a,b)=>b.date.localeCompare(a.date)))sel.add(new Option(`${item.date} — ${item.title.ja}${item.featured?' [TOP]':''}`,item.id));
 document.querySelector('[data-admin-tab="faq"]').disabled=false;
 if(next.content.news.length&&!drafts.edit)fill('edit',newDraft(next.content.news.find(n=>n.id===sel.value),next.contentSha));
 status(`${user.login} として接続しました。公開依頼は別操作です。mainへ直接保存しません。`,'success');
 }catch(e){token='';throw e;}finally{$('connectBtn').disabled=false;}
}
async function renderPreview(which){
 const d=capture(which);if(!d)throw new CmsError('INCOMPLETE');const content=$('newsPreviewContent');content.replaceChildren();
 if(d.operation==='delete')content.append(make('p','削除対象の記事です。公開依頼後も、承認・マージまでは公開ページに残ります。','admin-warning'));
 if(which==='media'){content.append(make('h3',d.mediaTarget==='fallback'?'News デフォルト画像':'Instagram紹介画像'));const box=make('div','','preview-box');content.append(box);drawImage(box,d.image);if(d.removeImage)content.append(make('p','画像指定を解除します。既存ファイル自体は削除しません。'));}
 else{const box=make('div','','preview-box compact');content.append(box);drawImage(box,d.image,d.removeImage?'':d.record.image);for(const [locale,label] of [['ja','日本語'],['en','English'],['zh-CN','简体中文']]){const section=make('section','','cms-language-preview');section.lang=locale;section.append(make('h3',label),make('h4',d.record.title[locale]||'（未入力）'),make('p',d.record.body[locale]||'（未入力）'));content.append(section);}}
 previewed.set(which,await fingerprint(d));$('newsPreview').showModal();
}
async function review(which){const d=capture(which);if(!d)return;const digest=await fingerprint(d);if($(which+'Reviewed').checked&&previewed.get(which)!==digest){$(which+'Reviewed').checked=false;throw new CmsError('REVIEW');}d.reviewedFingerprint=$(which+'Reviewed').checked?digest:'';await save(which);}
function showResult(d){
 const box=$('publicationResult');box.replaceChildren();if(!d?.request)return;
 box.append(make('p',`公開依頼ブランチ：${d.request.branch}`));
 const number=d.request.prNumber;if(Number.isSafeInteger(number)&&number>0){const a=make('a',`PR #${number} を確認`);a.href=`https://github.com/Kale1205/fde-site/pull/${number}`;a.target='_blank';a.rel='noopener noreferrer';box.append(a);button('refreshPublication','検査・公開状況を確認',async()=>{const result=await publisher.status(number);$('publicationState').textContent=`${result.label}${result.head?` / ${result.head.slice(0,12)}`:''}`;},box);}
 const p=make('p',d.request.branchReady?'GitHubブランチは公開されています。サイトの公開にはPRの検査・承認・マージが必要です。':'公開依頼は未完了です。同じ下書きから再試行できます。');p.id='publicationState';box.append(p);
}
async function request(which){
 if(busy)return;const d=capture(which);if(!d)throw new CmsError('INCOMPLETE');
 if(!token)throw new CmsError('AUTH');if(!d.reviewedFingerprint||d.reviewedFingerprint!==await fingerprint(d))throw new CmsError('REVIEW');
 if(busy)return;
 if(!confirm('公開依頼を作成します。原稿と画像は公開GitHubブランチ・PRへ送信され、誰でも閲覧可能になります。サイトへの反映は検査通過・承認・マージ後です。続けますか？'))return;
 busy=true;const controls=[...document.querySelectorAll('input,textarea,select,button')].filter(x=>!x.disabled);controls.forEach(x=>x.disabled=true);clearTimeout(timer);timer=null;
 try{await save(which);status('公開依頼を準備しています。入力は端末内に保持しています…');const result=await publisher.publish(d,token);showResult(d);
  if(result.manual){const a=make('a','GitHubで既存ブランチからPRを作成');a.href=result.compareUrl;a.target='_blank';a.rel='noopener noreferrer';$('publicationResult').append(a);status('記事・画像の一括保存は完了しましたが、現在のトークンではPRを作成できません。権限は変更していません。上のリンクから本人のGitHub画面で公開依頼を作成できます。','error');}
  else status(`PR #${result.pr.number} を確認しました。サイトにはまだ公開していません。本人承認後にGitHubでマージしてください。`,'success');
 }catch(e){showResult(d);throw e;}finally{busy=false;controls.forEach(x=>x.disabled=false);await refreshDraftList();}
}
async function translate(which){
 const d=capture(which),before=JSON.stringify(d.record);if(!d.record.title.ja.trim()||!d.record.body.ja.trim())throw new CmsError('INCOMPLETE');
 if(d.record.title.en&&d.record.body.en){status('英語版は入力済みです。既存の翻訳は変更していません。修正が必要な部分を直接編集してください。');return;}
 const btn=$(which+'Translate');btn.disabled=true;
 try{const en=await window.FDE_NEWS_TRANSLATE(d.record.title.ja,d.record.body.ja);if(drafts[which]!==d||JSON.stringify(capture(which).record)!==before){status('翻訳中に原稿が変わったため、翻訳結果は適用していません。再度翻訳してください。','error');return;}
  if(!d.record.title.en)$(which+'TitleEn').value=en.title;if(!d.record.body.en)$(which+'BodyEn').value=en.body;dirty(which);await save(which);status('空欄の英語版に翻訳案を入れました。中国語は直接入力し、3言語をプレビューで確認してください。','success');
 }finally{btn.disabled=false;}
}
async function chooseImage(which,file){try{if(file)await inspectImage(file);}catch(e){$(which+'ImageFile').value='';throw e;}const d=capture(which);d.image=file||null;d.imageName=file?.name||'';d.removeImage=false;drawImage($(which+'Preview'),file);dirty(which);await save(which);}
async function backup(){
 const d=capture(mode);if(!d)return;const value=persistedDraft(d);if(value.image){value.imageBase64=base64(new Uint8Array(await value.image.arrayBuffer()));value.imageType=value.image.type;delete value.image;}
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,draft:value},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download=`news-draft-${d.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('下書きバックアップを保存しました。個人情報を含む場合は安全に保管してください。');
}
function buildEditor(which){
 const card=$(which==='create'?'newsCreateCard':'newsManageCard');card.querySelector('h2').textContent=which==='create'?'新しい記事の下書き':'記事を編集';card.querySelector('p').textContent='保存は端末内のみ。翻訳・プレビューで日英中を確認してから、別操作で公開依頼を作成します。';
 const anchor=$(which+'BodyJa').closest('.field');let after=anchor;
 for(const [locale,label] of [['en','English'],['zh-CN','简体中文']])for(const [field,tag] of [['Title','input'],['Body','textarea']]){
  const id=which+field+suffixes[locale];let input=$(id);if(!input){input=make(tag);input.id=id;}
  input.removeAttribute('hidden');input.removeAttribute('data-internal-hidden');if(tag==='input'){input.type='text';input.maxLength=120;}else input.maxLength=20000;
  input.lang=locale;
  const wrap=make('div','','field field-full cms-translation-field'),labelNode=make('label',`${field==='Title'?'タイトル':'本文'}（${label}）`);labelNode.htmlFor=id;wrap.append(labelNode,input);after.after(wrap);after=wrap;
 }
 const actions=$(which==='create'?'createNewsBtn':'saveNewsBtn').parentElement;$(which==='create'?'createNewsBtn':'saveNewsBtn').textContent='1. 下書き保存';
 button(which+'Translate','2. 英語の空欄を翻訳',()=>translate(which),actions);
 button(which+'PreviewBtn','3. 日英中をプレビュー',()=>renderPreview(which),actions);
 const reviewLabel=make('label','','check-row cms-review-check'),check=make('input');check.type='checkbox';check.id=which+'Reviewed';check.addEventListener('change',safe(()=>review(which)));reviewLabel.append(check,document.createTextNode('プレビューで日英中と画像を確認しました'));actions.after(reviewLabel);
 const requestActions=make('div','','actions');reviewLabel.after(requestActions);button(which+'Request','4. 公開依頼（PR）',()=>request(which),requestActions,false);
 card.querySelectorAll('input:not([type=file]):not([type=checkbox]),textarea,select').forEach(el=>el.addEventListener('input',()=>dirty(which)));
 $(which+'Featured').addEventListener('change',()=>dirty(which));$(which+'ImageFile').addEventListener('change',safe(e=>chooseImage(which,e.target.files[0])));
}
async function init(){
 for(const which of ['create','edit'])buildEditor(which);
 const bar=make('section','','admin-card cms-draft-bar');bar.append(make('h2','端末内の下書き'),make('p','このブラウザだけに保存します。別端末には共有されず、ブラウザのデータ削除・プライベートブラウズ等で消える場合があります。重要な原稿はバックアップしてください。'));
 const field=make('div','','field'),label=make('label','保存済みの下書き');label.htmlFor='localDrafts';const sel=make('select');sel.id='localDrafts';field.append(label,sel);bar.append(field);const actions=make('div','','actions');bar.append(actions);button('backupDraft','現在の下書きをバックアップ',backup,actions);const op=make('p');op.id='draftOperation';bar.append(op);const result=make('div','','cms-publication-result');result.id='publicationResult';result.setAttribute('aria-live','polite');bar.append(result);$('newsPanel').prepend(bar);bar.append($('adminStatus'));
 const dialog=make('dialog','','cms-news-preview');dialog.id='newsPreview';dialog.setAttribute('aria-labelledby','previewHeading');const heading=make('h2','公開前プレビュー');heading.id='previewHeading';dialog.append(heading,make('p','公開ページとは表示幅が異なります。本文と画像を確認し、閉じた後に確認チェックを入れてください。'));const content=make('div');content.id='newsPreviewContent';dialog.append(content);button('closeNewsPreview','閉じる',()=>dialog.close(),dialog);document.body.append(dialog);
 const key=$('adminKey')||make('input'),adminKey=key.closest('.field')||make('div','','field');adminKey.replaceChildren();const keyLabel=make('label','翻訳用 Admin fulfillment key（英訳時のみ）');keyLabel.htmlFor='adminKey';key.id='adminKey';key.type='password';key.autocomplete='off';adminKey.append(keyLabel,key);bar.append(adminKey);
 $('adminTabs').classList.remove('hidden');showPanel('news');document.querySelector('[data-admin-tab="faq"]').disabled=true;document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.adminTab)));
 $('connectBtn').addEventListener('click',safe(connect));
 $('createNewsBtn').addEventListener('click',safe(async()=>{await save('create');status('下書きを端末内に保存しました。公開依頼は作成していません。','success');}));
 $('saveNewsBtn').addEventListener('click',safe(async()=>{await save('edit');status('下書きを端末内に保存しました。公開依頼は作成していません。','success');}));
 sel.addEventListener('change',safe(async()=>{const id=sel.value;if(!id)return;await save(mode);const item=(await store.list()).find(d=>d.id===id);if(!item)return;const which=item.operation==='media'?'media':item.operation==='create'?'create':'edit';fill(which,item);if(which==='media'){$('uploaderCard').closest('details').open=true;mode='media';}status('端末内の下書きを復元しました。GitHubへは送信していません。');}));
 $('editNewsTarget').addEventListener('change',safe(async()=>{await save('edit');const record=snapshot?.content.news.find(n=>n.id===$('editNewsTarget').value);if(record)fill('edit',newDraft(record,snapshot.contentSha));}));
 document.addEventListener('fde:cms-new-draft',safe(async()=>{await save(mode);fill('create',newDraft(null,snapshot?.contentSha||''));}));
 $('removeNewsImageBtn').addEventListener('click',safe(async()=>{const d=capture('edit');if(!d)return;d.image=null;d.removeImage=true;drawImage($('editPreview'));drawImage($('editCurrentImage'));dirty('edit');await save('edit');status('画像指定の解除を下書きに保存しました。公開データは未変更です。');}));
 $('deleteNewsBtn').textContent='削除を下書きに設定';$('deleteNewsBtn').addEventListener('click',safe(async()=>{const d=capture('edit');if(!d)return;if(!confirm('削除依頼用の下書きに変更しますか？ 公開依頼までは送信しません。'))return;d.operation='delete';dirty('edit');await save('edit');$('draftOperation').textContent='削除依頼の下書きです。プレビュー・確認後に公開依頼してください。';}));
 $('uploadBtn').textContent='共通画像を下書き保存';$('removeBtn').textContent='画像解除を下書き保存';
 async function mediaDraft(remove=false){const target=document.querySelector('input[name=target]:checked').value,file=$('imageFile').files[0];if(!remove&&!file)throw new CmsError('IMAGE');if(file)await inspectImage(file);if(!snapshot)throw new CmsError('AUTH');let d=drafts.media;if(!d||d.mediaTarget!==target){d=newDraft(null,snapshot.contentSha);d.operation='media';d.mediaTarget=target;}d.image=remove?null:file;d.removeImage=remove;d.reviewedFingerprint='';drafts.media=d;mode='media';$('mediaReviewed').checked=false;await save('media');drawImage($('preview'),d.image);status('共通画像の変更を下書き保存しました。公開依頼は別操作です。');}
 $('uploadBtn').addEventListener('click',safe(()=>mediaDraft()));$('removeBtn').addEventListener('click',safe(()=>mediaDraft(true)));
 const mediaActions=$('uploadBtn').parentElement;button('mediaPreviewBtn','共通画像をプレビュー',()=>renderPreview('media'),mediaActions);const mediaLabel=make('label','','check-row'),mediaCheck=make('input');mediaCheck.type='checkbox';mediaCheck.id='mediaReviewed';mediaCheck.addEventListener('change',safe(()=>review('media')));mediaLabel.append(mediaCheck,document.createTextNode('変更画像・対象を確認しました'));mediaActions.after(mediaLabel);button('mediaRequest','共通画像の公開依頼（PR）',()=>request('media'),mediaActions);
 fill('create',drafts.create);await refreshDraftList();status('下書きはGitHubへ接続せずに作成できます。保存済み原稿は上の一覧から復元できます。');
 window.addEventListener('beforeunload',e=>{if(busy||timer||unsaved){e.preventDefault();e.returnValue='';}});
}
safe(init)();
