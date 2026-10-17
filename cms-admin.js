import {DraftStore,NewsPublisher,CmsError,errorText,newDraft,persistedDraft,fingerprint,inspectImage,base64,LANGS} from './cms-news-workflow.js?v=20261017-101036';
import {BatchStore,BatchPublisher,newBatch,batchFingerprint,removeQueuedDraft} from './cms-news-batch-workflow.js?v=20261017-101036';

// News drafts never leave this browser until an explicit publication request.
const $=id=>document.getElementById(id),make=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
const store=new DraftStore(),drafts={create:newDraft(),edit:null,media:null};
let token='',snapshot=null,busy=false,mode='create',saveQueue=Promise.resolve(),timer,unsaved=false,connectionState='idle',navigating=false,routeEpoch=0;
let route={section:null,screen:'menu'},publicationRender=0;
const editDrafts=new Map(),draftVersions=new WeakMap(),imageChoices=new Map(),imagePending=new Set();
const previewed=new Map();
const publisher=new NewsPublisher({persist:async d=>{await saveQueue;return store.put(d);}});
const batchStore=new BatchStore();let batch=newBatch(),batchSaveQueue=Promise.resolve(),batchPreviewed='',batchRender=0,batchUnsaved=0;
const batchPublisher=new BatchPublisher({persist:async value=>{await batchSaveQueue;return batchStore.put(value);}});
const status=(text,type='')=>{const el=$('adminStatus');el.dataset.cmsPersistent='true';el.textContent=text;el.className=`status ${type}`;el.hidden=false;for(const [dialog,id]of [['newsPreview','previewStatus'],['faqPreview','faqPreviewStatus'],['batchPreview','batchPreviewStatus']]){const preview=$(id);if(preview&&$(dialog)?.open){preview.textContent=text;preview.className=`status ${type}`;preview.hidden=false;}}};
const safe=fn=>async(...args)=>{try{await fn(...args);}catch(e){status(errorText(e),'error');}};
const suffixes={ja:'Ja',en:'En','zh-CN':'Zh'};
function button(id,text,action,parent,secondary=true){const b=make('button',text,`admin-button${secondary?' secondary':''}`);b.id=id;b.type='button';b.addEventListener('click',safe(action));parent.append(b);return b;}
function showPanel(name){document.querySelectorAll('[data-admin-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.adminPanel!==name));document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===name));}
function showEditor(next){mode=next;$('newsPanel').dataset.editorMode=next;document.dispatchEvent(new CustomEvent('fde:cms-show-editor',{detail:next}));}
const version=d=>draftVersions.get(d)||0;
const unchanged=(which,d,epoch,revision)=>drafts[which]===d&&routeEpoch===epoch&&version(d)===revision;
function announceRoute(next){
 const faqInfo=next.section==='faq'?window.FDE_CMS_FAQ?.routeInfo?.():null;
 route={...next,mode:next.section==='faq'?(faqInfo?.mode||next.mode||'edit'):mode};
 const d=next.section==='faq'?null:capture(mode),title=next.section==='faq'?(faqInfo?.title||'FAQ'):d?.operation==='media'?'共通画像':d?.record.title?.ja||'新規作成';
 const shell=document.querySelector('.admin-main > .admin-shell');shell.dataset.cmsSection=route.section||'';shell.dataset.cmsScreen=route.screen;
 if(route.section)showPanel(route.section);else document.querySelectorAll('[data-admin-panel]').forEach(p=>p.classList.add('hidden'));
 document.dispatchEvent(new CustomEvent('fde:cms-route',{detail:{...route,title,operation:faqInfo?.operation||d?.operation||''}}));
 if(next.section==='news'&&next.screen==='editor')progress(mode,next.step===2?2:1);
}
function progress(which,step){const steps=document.querySelector('.cms-preview-steps');if(steps)steps.hidden=which==='media';for(const n of [1,2,3,4])$('previewStep'+n)?.setAttribute('aria-current',n===step?'step':'false');document.dispatchEvent(new CustomEvent('fde:cms-progress',{detail:{which,step,reviewed:!!drafts[which]?.reviewedFingerprint}}));}
function hasDraftContent(d){return !!d&&(version(d)>0||d.revision>0||d.sourceId||d.image||d.removeImage||LANGS.some(l=>d.record.title?.[l]?.trim()||d.record.body?.[l]?.trim()));}
async function preserveCurrent(){clearTimeout(timer);timer=null;if(hasDraftContent(capture(mode))){await save(mode);status('保存済み・端末内','success');}}
async function navigate(target){
 if(busy||navigating||window.FDE_CMS_FAQ?.isBusy?.())return false;
 if(imagePending.size){status('画像を確認中です。完了後に移動してください。');return false;}
 if(!target||!['menu','actions','list','drafts','editor','media','pending'].includes(target.screen)||target.screen!=='menu'&&!['news','faq'].includes(target.section))return false;
 if(target.section==='faq'&&['media','pending'].includes(target.screen))return false;
 navigating=true;routeEpoch++;
 const controls=[...document.querySelectorAll('input,textarea,select,button')].filter(x=>!x.disabled);controls.forEach(x=>x.disabled=true);
 const beforeSnapshot=snapshot,navigationEpoch=routeEpoch;
 try{
  if(route.section==='faq')await window.FDE_CMS_FAQ?.preserve?.();else await preserveCurrent();
  if(target.section==='news'&&target.screen==='editor'){
   if(target.draftId){
    const item=(await store.list()).find(d=>d.id===target.draftId);if(!item)throw new CmsError('INVALID');
    const which=item.operation==='media'?'media':item.operation==='create'?'create':'edit';fill(which,item);mode=which;
    if(which==='media')target={...target,screen:'media'};
   }else if(target.articleId){
    if(connectionState!=='connected'||snapshot!==beforeSnapshot)throw new CmsError('AUTH');
    const item=snapshot.content.news.find(n=>n.id===target.articleId);if(!item)throw new CmsError('CONFLICT');
    const cached=editDrafts.get(item.id),history=await batchStore.list();
    if(connectionState!=='connected'||snapshot!==beforeSnapshot)throw new CmsError('AUTH');
    if(routeEpoch!==navigationEpoch)throw new CmsError('REVIEW');
    const submitted=cached&&history.some(value=>value.request&&(value.request.snapshot||value.entries).some(entry=>entry.id===cached.id));
    const d=cached&&!submitted?cached:newDraft(item,snapshot.contentSha);fill('edit',d);$('editNewsTarget').value=item.id;
   }else if(target.mode==='create'){
    fill('create',target.fresh?newDraft(null,snapshot?.contentSha||''):drafts.create);
   }else if(target.mode==='edit'&&drafts.edit)showEditor('edit');
   else throw new CmsError('INCOMPLETE');
  }
  if(target.section==='faq'){
   const faq=window.FDE_CMS_FAQ;if(!faq?.prepareRoute)throw new CmsError('INVALID');
   await faq.prepareRoute(target);
  }
  if(target.section==='news'&&target.screen==='media'){mode='media';$('draftOperation').textContent='';showResult(drafts.media);}
  if(target.section==='news'&&target.screen==='pending')await refreshBatch();
  announceRoute(target);return true;
 }catch(e){status(errorText(e),'error');return false;}
 finally{navigating=false;controls.forEach(x=>x.disabled=false);setConnectionState(connectionState);}
}
function setConnectionState(state){
 connectionState=state;const ready=state==='connected',select=$('editNewsTarget');
 $('adminTabs').dataset.connectionState=state;select.dataset.newsState=ready?'loaded':state;select.disabled=!ready;
 document.querySelector('[data-admin-tab="faq"]').disabled=!ready;
 for(const which of ['create','edit','media']){if($(which+'Request'))$(which+'Request').disabled=!ready||busy||navigating||imagePending.has(which);if($(which+'PreviewBtn'))$(which+'PreviewBtn').disabled=busy||navigating||imagePending.has(which);}
 if($('retryPublication'))$('retryPublication').disabled=busy||navigating||imagePending.size>0;
 if($('batchPreviewBtn'))$('batchPreviewBtn').disabled=busy||navigating||imagePending.size>0||!batch.entries.length;
 if($('batchRequest'))$('batchRequest').disabled=!ready||busy||navigating||imagePending.size>0||!!batch.request?.prNumber;
 document.querySelectorAll('[data-cms-batch-action]').forEach(node=>{node.disabled=busy||navigating||node.dataset.cmsBatchAction==='remove'&&!!batch.request||node.dataset.missingDraft==='true';});
 for(const which of ['create','edit'])if($(which+'Request'))$(which+'Request').disabled=busy||navigating||imagePending.size>0;
 document.dispatchEvent(new CustomEvent('fde:cms-connection',{detail:{state}}));
}
function connectionErrorText(error){
 const messages={AUTH:'GitHubへ接続できません。トークンを確認して再接続してください。',PERMISSION:'現在の権限ではGitHubへ接続・記事一覧を取得できません。権限は変更せず、管理者へ確認してください。',RATE_LIMIT:'GitHubの利用制限中です。時間を置いて再接続してください。',NETWORK:'GitHubへ接続・記事一覧を取得できませんでした。通信環境を確認して再接続してください。',INVALID:'記事一覧の取得データを確認できませんでした。時間を置いて再接続してください。'};
 return (error?.status?`HTTP ${error.status}：`:'')+(messages[error?.code]||'GitHub接続と記事一覧の取得を完了できませんでした。時間を置いて再接続してください。')+'編集中の内容は画面に保持しています。公開依頼は開始していません。';
}
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
function invalidateReview(which,d){draftVersions.set(d,version(d)+1);d.reviewedFingerprint='';const check=$(which+'Reviewed');if(check)check.checked=false;showResult(d);document.dispatchEvent(new CustomEvent('fde:cms-dirty',{detail:{which}}));}
function translationNote(which,d){const note=$(which+'TranslationNote');if(note){note.textContent=d?.translationReviewRequired?'日本語を変更しました。英語・中国語も見直してください。':'英語・中国語は原稿を貼り付けて編集してください。';note.dataset.reviewRequired=String(!!d?.translationReviewRequired);}}
function dirty(which,japanese=false){if(busy||navigating)return;mode=which;const d=capture(which);if(!d)return;if(japanese)d.translationReviewRequired=true;translationNote(which,d);invalidateReview(which,d);clearTimeout(timer);status('保存中・端末内');timer=setTimeout(()=>safe(async()=>{timer=null;await save(which);status('保存済み・端末内','success');})(),700);}
async function refreshDraftList(){const list=await store.list(),sel=$('localDrafts'),current=sel.value;sel.replaceChildren(new Option('下書きを選択',''));for(const d of list){const option=new Option(`${d.updatedAt.slice(0,16).replace('T',' ')} — ${d.operation==='media'?'共通画像':d.record.title?.ja||'無題'}${d.request?'［依頼あり］':''}`,d.id);option.dataset.operation=d.operation;sel.add(option);}sel.value=current;sel.dataset.draftState='loaded';}
function drawImage(box,blob,source=''){
 const previous=box.dataset.objectUrl;if(previous)URL.revokeObjectURL(previous);delete box.dataset.objectUrl;box.replaceChildren();
 let url='';if(blob){url=URL.createObjectURL(blob);box.dataset.objectUrl=url;}
 else{const match=String(source).match(/^(?:https:\/\/raw\.githubusercontent\.com\/Kale1205\/fde-site\/main\/|https:\/\/kale1205\.github\.io\/fde-site\/)?(assets\/[A-Za-z0-9_/-]+\.(?:png|jpe?g|webp|gif|svg))$/);if(match)url=`https://raw.githubusercontent.com/Kale1205/fde-site/main/${match[1].split('/').map(encodeURIComponent).join('/')}`;}
 if(url){const img=make('img');img.src=encodeURI(url);img.alt='記事画像プレビュー';box.append(img);}else box.append(make('p','画像未設定','preview-placeholder'));
}
function fill(which,d){
 drafts[which]=d;
 if(which==='edit'){editDrafts.set(d.sourceId,d);$('editNewsTarget').value=d.sourceId;}
 if(which==='media'){for(const radio of document.querySelectorAll('input[name=target]'))radio.checked=radio.value===d.mediaTarget;drawImage($('preview'),d.image);$('draftOperation').textContent='';showResult(d);return;}
 for(const locale of LANGS){$(which+'Title'+suffixes[locale]).value=d.record.title?.[locale]||'';$(which+'Body'+suffixes[locale]).value=d.record.body?.[locale]||'';}
 for(const key of ['Category','Date'])$(which+key).value=d.record[key.toLowerCase()]||'';
 $(which+'Featured').checked=!!d.record.featured;$(which+'ImageFile').value='';$(which+'Reviewed').checked=false;
 $(which+'Request').textContent=d.request?'同じ公開依頼で再試行':'公開待ちに追加';
 if($(which+'ReviewHint'))$(which+'ReviewHint').textContent=d.request?'以前の公開依頼と同じ内容だけ再開します。変更分は追加しません。':'端末内の公開待ちへ追加。まとめて確認後に1つのPRで送信。';
 translationNote(which,d);
 drawImage($(which+'Preview'),d.image);if(which==='edit')drawImage($('editCurrentImage'),null,d.removeImage?'':d.record.image);
 $('draftOperation').textContent=d.operation==='delete'?'この記事の削除依頼を準備しています。公開依頼までは公開データを変更しません。':'';
 showEditor(which);showResult(d);
}
async function connect(){
 if(busy||navigating||window.FDE_CMS_FAQ?.isBusy?.()||connectionState==='loading')return;
 const value=$('token').value.trim(),sel=$('editNewsTarget'),selectedId=drafts.edit?.sourceId||sel.value;
 capture(mode);if(drafts.edit)sel.value=selectedId;token='';setConnectionState('loading');$('connectBtn').disabled=true;status('GitHubへ接続し、記事一覧を取得しています…');
 try{
 if(!value)throw new CmsError('AUTH');
 const user=await publisher.api('/user',value),next=await publisher.snapshot(value);
 const news=next.content?.news;
 if(!Array.isArray(news)||news.some(item=>!item||typeof item.id!=='string'||!item.id.trim()||typeof item.date!=='string'||typeof item.title?.ja!=='string')||new Set(news.map(item=>item.id)).size!==news.length)throw new CmsError('INVALID');
 const options=[...news].sort((a,b)=>b.date.localeCompare(a.date)).map(item=>new Option(`${item.date} — ${item.title.ja}${item.featured?' [TOP]':''}`,item.id));
 sel.replaceChildren(...options);sel.value=news.some(item=>item.id===selectedId)?selectedId:'';
 token=value;snapshot=next;setConnectionState('connected');
 status(`${user.login} として接続しました。公開依頼は別操作です。mainへ直接保存しません。`,'success');
 }catch(e){token='';setConnectionState('error');status(connectionErrorText(e),'error');}finally{$('connectBtn').disabled=false;}
}
async function renderPreview(which){
 const focusRequest=$('newsPreview').dataset.requestFocus==='true';delete $('newsPreview').dataset.requestFocus;
 if(imagePending.has(which)){status('画像を確認中です。少しお待ちください。');return;}
 if(busy||navigating)return;const d=capture(which);if(!d)throw new CmsError('INCOMPLETE');const epoch=routeEpoch,revision=version(d),digest=await fingerprint(d);
 if(!unchanged(which,d,epoch,revision))return;
 const content=$('newsPreviewContent');content.replaceChildren();
 if(d.operation==='delete')content.append(make('p','削除対象の記事です。公開依頼後も、承認・マージまでは公開ページに残ります。','admin-warning'));
 if(which==='media'){content.append(make('h3',d.mediaTarget==='fallback'?'News デフォルト画像':'Instagram紹介画像'));const box=make('div','','preview-box');content.append(box);drawImage(box,d.image);if(d.removeImage)content.append(make('p','画像指定を解除します。既存ファイル自体は削除しません。'));}
 else{const box=make('div','','preview-box compact');content.append(box);drawImage(box,d.image,d.removeImage?'':d.record.image);for(const [locale,label] of [['ja','日本語'],['en','English'],['zh-CN','简体中文']]){const section=make('section','','cms-language-preview');section.lang=locale;section.append(make('h3',label),make('h4',d.record.title[locale]||'（未入力）'),make('p',d.record.body[locale]||'（未入力）'));content.append(section);}}
 previewed.set(which,digest);const dialog=$('newsPreview');dialog.dataset.which=which;
 $(which+'Reviewed').checked=d.reviewedFingerprint===digest;
 const actions=$(which+'ReviewActions');actions.hidden=false;$('newsPreviewActions').append(actions);
 $('previewTarget').textContent=which==='media'?'共通画像':d.record.title?.ja||'新規作成';
 $('previewStatus').hidden=true;
 dialog.showModal();
 progress(which,focusRequest?4:3);
 if(focusRequest){$(which+'Reviewed').focus();actions.scrollIntoView({block:'nearest'});}
}
async function review(which){const d=capture(which);if(!d)return;const checked=$(which+'Reviewed').checked;if(!checked){d.reviewedFingerprint='';await save(which);progress(which,3);return;}const epoch=routeEpoch,revision=version(d),digest=await fingerprint(d);if(!unchanged(which,d,epoch,revision)||!$(which+'Reviewed').checked)return;if(previewed.get(which)!==digest){$(which+'Reviewed').checked=false;throw new CmsError('REVIEW');}d.reviewedFingerprint=digest;d.translationReviewRequired=false;translationNote(which,d);await save(which);progress(which,4);}
async function showResult(d){
 const render=++publicationRender,box=$('publicationResult');box.replaceChildren();box.dataset.recovery='false';if(!d?.request)return;
 const tx=d.request;box.append(make('p',`公開依頼ブランチ：${tx.branch}`));
 const number=tx.prNumber,hasPr=Number.isSafeInteger(number)&&number>0;
 if(hasPr){const a=make('a',`PR #${number} を確認`);a.href=`https://github.com/Kale1205/fde-site/pull/${number}`;a.target='_blank';a.rel='noopener noreferrer';box.append(a);button('refreshPublication','検査・公開状況を確認',async()=>{const result=await publisher.status(number);$('publicationState').textContent=`${result.label}${result.head?` / ${result.head.slice(0,12)}`:''}`;},box);}
 else if(tx.branchReady&&typeof tx.branch==='string'&&tx.branch){
  box.dataset.recovery='true';const savedState=make('p','以前の公開依頼ブランチが保存されています。現在の下書きとの一致を確認しています。この操作ではサイトに反映していません。');box.append(make('h2','公開依頼の状況'),savedState);
  const denied=tx.prErrorStage==='create'&&tx.prErrorCode==='PERMISSION'&&tx.prErrorStatus===403,conflict=tx.prErrorStage==='branch'&&['CONFLICT','INVALID'].includes(tx.prErrorCode);
  if(denied)box.append(make('p','前回のPR作成はGitHubに拒否されました（HTTP 403）。既存PRの確認では見つかりませんでした。権限は変更していません。'));
  else if(conflict)box.append(make('p',`${tx.prErrorCode==='CONFLICT'?'保存済みブランチに別の変更が見つかった':'保存済みブランチの安全性を確認できない'}ため、公開依頼を停止しています。上書きしていません。「その他」から下書きをバックアップし、GitHubで差分と既存PRを確認してください。`));
  else if(['lookup','branch'].includes(tx.prErrorStage)){const action=tx.prErrorStage==='lookup'?'既存PR':'保存済みブランチ';const http=Number.isInteger(tx.prErrorStatus)&&tx.prErrorStatus>=400&&tx.prErrorStatus<=599?`（HTTP ${tx.prErrorStatus}）`:'';box.append(make('p',`前回は${action}の確認を完了できませんでした${http}。PRの有無は未確認です。`));}
  else box.append(make('p','PRの作成状況は未確認です。リンク先で既存PRと公開状況を確認してください。'));
  const a=make('a','保存済みブランチ・PRをGitHubで確認');a.id='manualPublication';a.href=`https://github.com/Kale1205/fde-site/compare/main...${encodeURIComponent(tx.branch)}?expand=1`;a.target='_blank';a.rel='noopener noreferrer';box.append(a);
  const which=d.operation==='media'?'media':d.operation==='create'?'create':'edit',revision=version(d);
  let digest;try{digest=await fingerprint(d);}catch{if(render===publicationRender)savedState.textContent='現在の下書きと保存済みブランチの一致を確認できません。「その他」から下書きをバックアップし、GitHubで状態を確認してください。';return;}
  if(render!==publicationRender||drafts[which]!==d||d.request!==tx||version(d)!==revision)return;
  if(!tx.fingerprint||digest!==tx.fingerprint||imagePending.has(which)){savedState.textContent='以前の公開依頼ブランチは保存済みですが、現在の下書きの変更はそのブランチへ保存していません。「その他」から下書きをバックアップし、GitHubで差分と既存PRを確認してください。この操作ではサイトに反映していません。';return;}
  savedState.textContent='この下書きの公開依頼はGitHubブランチへ保存済みです。この操作ではサイトに反映していません。';
  if(denied){a.textContent='GitHubで既存PRを確認してPRを作成';box.append(make('p','リンク先で既存PRがないことを確認してから、必要な場合だけPRを作成してください。'));}
  if(!conflict){box.append(make('p','同じ下書きから再試行すると、既存ブランチ・PRを確認して再開します。重複を防ぐため、再試行用に別の下書きは作らないでください。'));
   const retry=button('retryPublication','同じ下書きで再試行',async()=>{if(drafts[which]!==d)return;$('newsPreview').dataset.requestFocus='true';await renderPreview(which);},box);retry.disabled=busy||navigating||imagePending.size>0;
  }
 }
 const p=make('p',tx.branchReady?'サイトの公開にはPRの検査・本人承認・マージが必要です。':'公開依頼は未完了です。同じ下書きから再試行できます。');p.id='publicationState';box.append(p);
}
async function request(which){
 if(which!=='media'&&!capture(which)?.request)return enqueueCurrent(which);
 if(imagePending.has(which)){status('画像を確認中です。少しお待ちください。');return;}
 if(busy||navigating||window.FDE_CMS_FAQ?.isBusy?.())return;const d=capture(which);if(!d)throw new CmsError('INCOMPLETE');const epoch=routeEpoch,revision=version(d);
 if(connectionState!=='connected'||!token)throw new CmsError('AUTH');const currentSnapshot=snapshot;
 if(['edit','delete'].includes(d.operation)&&!snapshot.content.news.some(item=>item.id===d.sourceId))throw new CmsError('CONFLICT');
 const digest=await fingerprint(d);if(connectionState!=='connected'||!token||snapshot!==currentSnapshot)throw new CmsError('AUTH');
 if(!unchanged(which,d,epoch,revision))throw new CmsError('REVIEW');
 if(!$(which+'Reviewed').checked||!d.reviewedFingerprint||d.reviewedFingerprint!==digest)throw new CmsError('REVIEW');
 if(busy)return;
 if(!confirm(`「${which==='media'?'共通画像':d.record.title?.ja||'無題'}」の${d.operation==='delete'?'削除の':''}公開依頼を作成します。\n原稿と画像は公開GitHubブランチ・PRへ送信されます。サイト反映は検査・本人承認・マージ後です。続けますか？`))return;
 busy=true;const controls=[...document.querySelectorAll('input,textarea,select,button')].filter(x=>!x.disabled);controls.forEach(x=>x.disabled=true);clearTimeout(timer);timer=null;
 try{await save(which);status('公開依頼を準備しています。入力は端末内に保持しています…');const result=await publisher.publish(d,token);await showResult(d);
  if(result.manual)status('GitHubブランチへの保存は完了しましたが、PR作成はGitHubに拒否されました（HTTP 403）。サイトには未反映です。「公開依頼の状況」のリンクから、本人のGitHub画面で状態を確認できます。権限は変更していません。','error');
  else status(`PR #${result.pr.number} を確認しました。サイトにはまだ公開していません。本人承認後にGitHubでマージしてください。`,'success');
  $('newsPreview').close();$('publicationResult').scrollIntoView({block:'start'});
 }catch(e){await showResult(d);if(d.request?.branchReady){$('newsPreview').close();$('publicationResult').scrollIntoView({block:'start'});}throw e;}finally{busy=false;controls.forEach(x=>x.disabled=false);setConnectionState(connectionState);await refreshDraftList();}
}
async function saveBatch(value=batch){
 batchUnsaved++;const task=batchSaveQueue.catch(()=>{}).then(async()=>{value.updatedAt=new Date().toISOString();const saved=await batchStore.put(value);value.revision=saved.revision;return value;}).finally(()=>{batchUnsaved--;});batchSaveQueue=task;return task;
}
async function updatePending(next,message){
 if(busy||navigating||imagePending.size)return;busy=true;const controls=[...document.querySelectorAll('input,textarea,select,button')].filter(node=>!node.disabled);controls.forEach(node=>node.disabled=true);
 try{await saveBatch(next);batch=next;batchPreviewed='';await refreshBatch();status(message,'success');}
 finally{busy=false;controls.forEach(node=>node.disabled=false);setConnectionState(connectionState);}
}
function batchEntries(value=batch){return value.request?.snapshot||value.entries;}
function appendArticlePreview(parent,d){
 const article=make('article','','cms-batch-preview-article');article.dataset.draftId=d.id;
 article.append(make('h3',`${d.operation==='delete'?'削除':d.operation==='create'?'新規':'編集'}：${d.record.title?.ja||'無題'}`));
 if(d.operation==='delete')article.append(make('p','この記事を日英中の一覧・本文から削除します。','admin-warning'));
 const image=make('div','','preview-box compact');article.append(image);drawImage(image,d.image,d.removeImage?'':d.record.image);
 for(const [locale,label]of [['ja','日本語'],['en','English'],['zh-CN','简体中文']]){const section=make('section','','cms-language-preview');section.lang=locale;section.append(make('h3',label),make('h4',d.record.title?.[locale]||'（未入力）'),make('p',d.record.body?.[locale]||'（未入力）'));article.append(section);}
 parent.append(article);
}
async function refreshBatch(){
 const render=++batchRender,list=await batchStore.list();if(render!==batchRender)return;
 const select=$('pendingBatches');select.replaceChildren();
 const values=list.some(value=>value.id===batch.id)?list:[batch,...list];
 for(const value of values){const option=new Option(`${value.request?value.request.prNumber?`PR #${value.request.prNumber}`:'送信状況の確認':`公開待ち ${value.entries.length}件`} — ${value.updatedAt.slice(0,16).replace('T',' ')}`,value.id);select.add(option);}select.value=batch.id;
 const entries=batchEntries(),frozen=!!batch.request,rows=$('pendingRows');rows.replaceChildren();
 $('pendingCount').textContent=`${entries.length}件`;$('pendingHint').textContent=frozen?'送信時の内容を保持しています。追加の変更は新しい公開待ちへ。':'このブラウザ内に保存。追加後に原稿を直した場合は、再確認して公開待ちを更新してください。';
 if(!entries.length)rows.append(make('p','公開待ちはありません。記事のプレビューで確認して追加できます。','cms-small-note'));
 const draftsById=new Map((await store.list()).map(d=>[d.id,d]));if(render!==batchRender)return;
 for(const d of entries){const row=make('article','','cms-pending-row'),heading=make('h3',`${d.operation==='delete'?'削除':d.operation==='create'?'新規':'編集'}：${d.record.title?.ja||'無題'}`),actions=make('div','','actions');row.dataset.draftId=d.id;row.append(heading,actions);
  const edit=button(`pendingEdit-${d.id}`,'原稿を編集',async()=>{await navigate({section:'news',screen:'editor',draftId:d.id});},actions);edit.dataset.cmsBatchAction='edit';edit.dataset.missingDraft=String(!draftsById.has(d.id));edit.disabled=busy||!draftsById.has(d.id);
  const remove=button(`pendingRemove-${d.id}`,'公開待ちから外す',async()=>{if(busy||navigating)return;const next=removeQueuedDraft(structuredClone(batch),d.id);await updatePending(next,'公開待ちから外しました。下書きは端末内に残しています。');},actions);remove.dataset.cmsBatchAction='remove';remove.disabled=frozen||busy;
  const current=draftsById.get(d.id);if(current&&await fingerprint(current)!==await fingerprint(d))row.append(make('p','原稿には未追加の変更があります。公開待ちは前回確認した内容です。','cms-small-note'));rows.append(row);
 }
 const result=$('batchPublicationResult');result.replaceChildren();
 if(frozen){const tx=batch.request;result.append(make('p',`公開依頼ブランチ：${tx.branch}`));
  if(Number.isSafeInteger(tx.prNumber)&&tx.prNumber>0){const link=make('a',`PR #${tx.prNumber} を確認`);link.href=`https://github.com/Kale1205/fde-site/pull/${tx.prNumber}`;link.target='_blank';link.rel='noopener noreferrer';result.append(link);button('batchPublicationStatus','検査・公開状況を確認',async()=>{const state=await batchPublisher.refresh(batch);status(`${state.label}${state.head?` / ${state.head.slice(0,12)}`:''}`);},result);}
  else{result.append(make('p',tx.branchReady?'保存済みのブランチ・PRを確認してから、同じ内容で再開します。':'送信は未完了です。同じ公開待ちから再試行してください。'));if(tx.branchReady){const link=make('a','GitHubでブランチ・既存PRを確認');link.href=`https://github.com/Kale1205/fde-site/compare/main...${encodeURIComponent(tx.branch)}?expand=1`;link.target='_blank';link.rel='noopener noreferrer';result.append(link);}}
  result.append(make('p','サイト反映は検査・本人承認・マージ後です。','cms-small-note'));
 }
 $('batchPreviewBtn').textContent=frozen&&!batch.request.prNumber?'同じ内容を確認・再試行':'まとめてプレビュー';
 document.dispatchEvent(new CustomEvent('fde:cms-batch',{detail:{count:entries.length,requested:frozen}}));setConnectionState(connectionState);
}
async function enqueueCurrent(which){
 if(busy||navigating||window.FDE_CMS_FAQ?.isBusy?.()||imagePending.size)return;
 const d=capture(which);if(!d||d.operation==='media')throw new CmsError('INVALID');
 const epoch=routeEpoch,revision=version(d),digest=await fingerprint(d);if(!unchanged(which,d,epoch,revision)||!$(which+'Reviewed').checked||d.reviewedFingerprint!==digest)throw new CmsError('REVIEW');
 if(busy||navigating||imagePending.size)return;
 busy=true;const controls=[...document.querySelectorAll('input,textarea,select,button')].filter(node=>!node.disabled);controls.forEach(node=>node.disabled=true);setConnectionState(connectionState);
 try{await save(which);const next=batch.request?newBatch():batch;await batchSaveQueue;batch=await batchStore.enqueue(next,d);batchPreviewed='';$('newsPreview').close();await refreshBatch();status('公開待ちに保存しました。GitHubへはまだ送信していません。','success');}
 finally{busy=false;controls.forEach(node=>node.disabled=false);setConnectionState(connectionState);}
 await navigate({section:'news',screen:'pending'});
}
async function previewBatch(){
 if(busy||navigating||imagePending.size)return;if(!batchEntries().length)throw new CmsError('BATCH_EMPTY');
 const current=batch,digest=await batchFingerprint(current);if(current!==batch)return;
 const content=$('batchPreviewContent');content.replaceChildren();for(const d of batchEntries())appendArticlePreview(content,d);
 batchPreviewed=digest;$('batchReviewed').checked=batch.reviewedFingerprint===digest;$('batchPreviewStatus').hidden=true;$('batchPreviewCount').textContent=`${batchEntries().length}件の日英中・画像`;
 $('batchPreview').showModal();setConnectionState(connectionState);
}
async function reviewBatch(){
 if(busy||navigating)return;const current=batch,digest=await batchFingerprint(current);
 if(current!==batch||digest!==batchPreviewed){$('batchReviewed').checked=false;throw new CmsError('REVIEW');}
 batch.reviewedFingerprint=$('batchReviewed').checked?digest:'';await saveBatch();
}
async function requestBatch(){
 if(busy||navigating||window.FDE_CMS_FAQ?.isBusy?.()||imagePending.size)return;if(connectionState!=='connected'||!token)throw new CmsError('AUTH');
 const current=batch,digest=await batchFingerprint(current);if(current!==batch||!$('batchReviewed').checked||batchPreviewed!==digest||batch.reviewedFingerprint!==digest)throw new CmsError('REVIEW');
 if(busy||navigating||imagePending.size)return;
 if(!confirm(`${batchEntries().length}件を1つの公開依頼（PR）にまとめます。\n確認した原稿と画像を公開GitHubブランチへ送信します。サイト反映は検査・本人承認・マージ後です。続けますか？`))return;
 busy=true;const controls=[...document.querySelectorAll('input,textarea,select,button')].filter(node=>!node.disabled);controls.forEach(node=>node.disabled=true);clearTimeout(timer);timer=null;
 try{await saveBatch();status('まとめて公開依頼を準備しています。入力は端末内に保持しています…');const result=await batchPublisher.publish(batch,token);await refreshBatch();
  if(result.manual)status('ブランチ保存後、PR作成がGitHubに拒否されました。権限は変更していません。同じ公開待ちの状況を確認してください。','error');
  else status(`PR #${result.pr.number} を確認しました。サイトにはまだ反映していません。`,'success');$('batchPreview').close();
 }catch(error){await refreshBatch();throw error;}
 finally{busy=false;controls.forEach(node=>node.disabled=false);await refreshBatch();setConnectionState(connectionState);}
}
async function buildBatchUI(){
 const section=make('section','','admin-card cms-pending');section.id='newsPendingCard';section.hidden=true;
 const heading=make('div','','cms-pending-heading'),count=make('span','','cms-small-note');count.id='pendingCount';heading.append(make('h2','公開待ち'),count);section.append(heading);
 const hint=make('p','','cms-small-note');hint.id='pendingHint';section.append(hint);
 const field=make('div','','field'),label=make('label','公開待ち・送信履歴');label.htmlFor='pendingBatches';const select=make('select');select.id='pendingBatches';field.append(label,select);section.append(field);
 select.addEventListener('change',safe(async()=>{if(busy||navigating)return;const selected=(await batchStore.list()).find(value=>value.id===select.value);if(selected){batch=selected;batchPreviewed='';await refreshBatch();}}));
 const rows=make('div');rows.id='pendingRows';section.append(rows);const actions=make('div','','actions');section.append(actions);button('batchNew','新しい公開待ち',()=>updatePending(newBatch(),'新しい公開待ちを用意しました。以前の内容は履歴に残しています。'),actions);button('batchPreviewBtn','まとめてプレビュー',previewBatch,actions,false);
 const result=make('div','','cms-publication-result');result.id='batchPublicationResult';result.setAttribute('aria-live','polite');section.append(result);$('newsPanel').append(section);
 const dialog=make('dialog','','cms-news-preview cms-batch-preview');dialog.id='batchPreview';dialog.setAttribute('aria-labelledby','batchPreviewHeading');const title=make('h2','公開待ちの確認');title.id='batchPreviewHeading';const summary=make('p','','cms-small-note');summary.id='batchPreviewCount';dialog.append(title,summary);
 const content=make('div');content.id='batchPreviewContent';dialog.append(content);const resultStatus=make('div','','status');resultStatus.id='batchPreviewStatus';resultStatus.hidden=true;resultStatus.setAttribute('role','status');dialog.append(resultStatus);
 const reviewLabel=make('label','','check-row cms-review-check'),check=make('input');check.id='batchReviewed';check.type='checkbox';check.addEventListener('change',safe(reviewBatch));reviewLabel.append(check,document.createTextNode('全件の日英中・画像・削除対象を確認しました'));dialog.append(reviewLabel);const buttons=make('div','','actions');dialog.append(buttons);button('batchRequest','まとめて公開依頼（PR）',requestBatch,buttons,false);button('closeBatchPreview','公開待ちへ戻る',()=>dialog.close(),dialog);document.body.append(dialog);
 const saved=await batchStore.list();batch=saved.find(value=>!value.request)||saved[0]||batch;await refreshBatch();
}
async function chooseImage(which,file){
 if(busy||navigating)return;const d=capture(which);if(!d)return;invalidateReview(which,d);
 const epoch=routeEpoch,choice=(imageChoices.get(which)||0)+1,current=()=>drafts[which]===d&&routeEpoch===epoch&&imageChoices.get(which)===choice;imageChoices.set(which,choice);imagePending.add(which);setConnectionState(connectionState);
 try{
  if(file)await inspectImage(file);if(!current())return;
  d.image=file||null;d.imageName=file?.name||'';d.removeImage=false;drawImage($(which+'Preview'),file);dirty(which);await save(which);
 }catch(e){if(current())$(which+'ImageFile').value='';throw e;}
 finally{if(imageChoices.get(which)===choice)imagePending.delete(which);setConnectionState(connectionState);}
}
async function backup(){
 const d=capture(mode);if(!d)return;const value=persistedDraft(d);if(value.image){value.imageBase64=base64(new Uint8Array(await value.image.arrayBuffer()));value.imageType=value.image.type;delete value.image;}
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,draft:value},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download=`news-draft-${d.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('下書きバックアップを保存しました。個人情報を含む場合は安全に保管してください。');
}
function buildEditor(which){
 const card=$(which==='create'?'newsCreateCard':'newsManageCard');card.querySelector('h2').textContent=which==='create'?'新規作成':'記事を編集';card.querySelector('p').textContent='端末内に保存。公開依頼は確認後。';
 const featuredNote=make('p','指定した記事は新しい順に最大10件を上部に表示します。超過分は一覧に表示します。','token-note');featuredNote.id=which+'FeaturedNote';$(which+'Featured').setAttribute('aria-describedby',featuredNote.id);$(which+'Featured').closest('.field').append(featuredNote);
 const anchor=$(which+'BodyJa').closest('.field');let after=anchor;
 for(const [locale,label] of [['en','English'],['zh-CN','简体中文']])for(const [field,tag] of [['Title','input'],['Body','textarea']]){
  const id=which+field+suffixes[locale];let input=$(id);if(!input){input=make(tag);input.id=id;}
  input.removeAttribute('hidden');input.removeAttribute('data-internal-hidden');if(tag==='input'){input.type='text';input.maxLength=120;}else input.maxLength=20000;
  input.lang=locale;
  const wrap=make('div','','field field-full cms-translation-field'),labelNode=make('label',`${field==='Title'?'タイトル':'本文'}（${label}）`);labelNode.htmlFor=id;wrap.append(labelNode,input);after.after(wrap);after=wrap;
 }
 const actions=$(which==='create'?'createNewsBtn':'saveNewsBtn').parentElement;$(which==='create'?'createNewsBtn':'saveNewsBtn').textContent='下書き保存';
 button(which+'PreviewBtn','確認',()=>renderPreview(which),actions,false);
 const reviewActions=make('div','','cms-review-actions');reviewActions.id=which+'ReviewActions';reviewActions.hidden=true;
 const reviewLabel=make('label','','check-row cms-review-check'),check=make('input');check.type='checkbox';check.id=which+'Reviewed';check.addEventListener('change',safe(()=>review(which)));reviewLabel.append(check,document.createTextNode('日英中・画像を確認しました'));reviewActions.append(reviewLabel);
 const requestActions=make('div','','actions');reviewActions.append(requestActions);button(which+'Request','公開待ちに追加',()=>request(which),requestActions,false);const reviewHint=make('p','端末内の公開待ちへ追加。まとめて確認後に1つのPRで送信。','token-note');reviewHint.id=which+'ReviewHint';reviewActions.append(reviewHint);card.append(reviewActions);
 card.querySelectorAll('input:not([type=file]):not([type=checkbox]),textarea,select').forEach(el=>el.addEventListener('input',()=>dirty(which,[which+'TitleJa',which+'BodyJa'].includes(el.id))));
 $(which+'Featured').addEventListener('change',()=>dirty(which));$(which+'ImageFile').addEventListener('change',safe(e=>chooseImage(which,e.target.files[0])));
}
async function init(){
 for(const which of ['create','edit'])buildEditor(which);
 const bar=make('section','','admin-card cms-draft-bar');bar.append(make('h2','端末内の下書き'),make('p','このブラウザだけに保存します。別端末には共有されず、ブラウザのデータ削除・プライベートブラウズ等で消える場合があります。重要な原稿はバックアップしてください。'));
 const field=make('div','','field'),label=make('label','保存済みの下書き');label.htmlFor='localDrafts';const sel=make('select');sel.id='localDrafts';field.append(label,sel);bar.append(field);const actions=make('div','','actions');bar.append(actions);button('backupDraft','現在の下書きをバックアップ',backup,actions);const op=make('p');op.id='draftOperation';bar.append(op);const result=make('div','','cms-publication-result');result.id='publicationResult';result.setAttribute('aria-live','polite');bar.append(result);$('newsPanel').prepend(bar);bar.append($('adminStatus'));
 const dialog=make('dialog','','cms-news-preview');dialog.id='newsPreview';dialog.setAttribute('aria-labelledby','previewHeading');const heading=make('h2','確認');heading.id='previewHeading';dialog.append(heading);const previewTarget=make('p');previewTarget.id='previewTarget';dialog.append(previewTarget,make('p','日英中・画像を確認。公開ページとは表示幅が異なります。','token-note'));
 const steps=make('nav','','cms-preview-steps');steps.setAttribute('aria-label','作業の進み具合');
 for(const [step,label]of [[1,'①内容'],[2,'②翻訳'],[3,'③確認'],[4,'④公開待ち']])button('previewStep'+step,label,async()=>{const which=dialog.dataset.which;if(step<3){dialog.close();if(which!=='media')await navigate({section:'news',screen:'editor',mode:which,step});}else if(step===4){$(which+'Reviewed').focus();$(which+'ReviewActions').scrollIntoView({block:'nearest'});progress(which,4);}else{$('previewHeading').focus();}},steps);
 dialog.append(steps);const content=make('div');content.id='newsPreviewContent';dialog.append(content);const previewStatus=make('div','','status');previewStatus.id='previewStatus';previewStatus.hidden=true;previewStatus.setAttribute('role','status');dialog.append(previewStatus);const previewActions=make('div');previewActions.id='newsPreviewActions';dialog.append(previewActions);button('closeNewsPreview','編集へ戻る',()=>dialog.close(),dialog);dialog.addEventListener('close',()=>{const which=dialog.dataset.which,actions=$(which+'ReviewActions');if(actions){actions.hidden=true;$(which==='media'?'uploaderCard':which==='create'?'newsCreateCard':'newsManageCard').append(actions);}if(which)progress(which,route.step===2?2:1);});document.body.append(dialog);
 const key=$('adminKey')||make('input'),adminKey=key.closest('.field')||make('div','','field');adminKey.replaceChildren();const keyLabel=make('label','翻訳用 Admin fulfillment key（英訳時のみ）');keyLabel.htmlFor='adminKey';key.id='adminKey';key.type='password';key.autocomplete='off';adminKey.append(keyLabel,key);bar.append(adminKey);
 $('adminTabs').classList.remove('hidden');showPanel('news');document.querySelector('[data-admin-tab="faq"]').disabled=true;document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.adminTab)));
 $('connectBtn').addEventListener('click',safe(connect));
 $('createNewsBtn').addEventListener('click',safe(async()=>{await save('create');status('保存済み・端末内','success');}));
 $('saveNewsBtn').addEventListener('click',safe(async()=>{await save('edit');status('保存済み・端末内','success');}));
 sel.addEventListener('change',safe(async()=>{const id=sel.value;if(id)await navigate({section:'news',screen:'editor',draftId:id});}));
 $('editNewsTarget').addEventListener('change',safe(async()=>{const id=$('editNewsTarget').value;if(id)await navigate({section:'news',screen:'editor',articleId:id});}));
 document.addEventListener('fde:cms-new-draft',safe(async()=>{await navigate({section:'news',screen:'editor',mode:'create',fresh:true});}));
 $('removeNewsImageBtn').addEventListener('click',safe(async()=>{const d=capture('edit');if(!d||busy||navigating)return;imageChoices.set('edit',(imageChoices.get('edit')||0)+1);imagePending.delete('edit');$('editImageFile').value='';d.image=null;d.imageName='';d.removeImage=true;drawImage($('editPreview'));drawImage($('editCurrentImage'));dirty('edit');await save('edit');setConnectionState(connectionState);status('画像指定の解除を下書きに保存しました。公開データは未変更です。');}));
 $('deleteNewsBtn').textContent='削除依頼を準備';$('deleteNewsBtn').addEventListener('click',safe(async()=>{const d=capture('edit');if(!d||busy||navigating)return;if(d.request&&snapshot?.content.news.length===1)throw new CmsError('LAST_ARTICLE');if(!confirm(`「${d.record.title?.ja||'無題'}」（${d.sourceId}）の削除依頼を下書きにします。\n承認・マージ後、日英中の一覧と本文から削除されます。いまはサイトを変更しません。続けますか？`))return;d.operation='delete';dirty('edit');await save('edit');$('draftOperation').textContent='削除依頼の下書き・未送信';}));
 button('cancelNewsDeleteBtn','削除依頼を取り消す',async()=>{const d=capture('edit');if(!d||d.operation!=='delete')return;d.operation='edit';dirty('edit');await save('edit');$('draftOperation').textContent='';},$('deleteNewsBtn').parentElement);
 $('uploadBtn').textContent='共通画像を下書き保存';$('removeBtn').textContent='画像解除を下書き保存';
 async function mediaDraft(remove=false){
  if(busy||navigating)return;const target=document.querySelector('input[name=target]:checked').value,file=$('imageFile').files[0],epoch=routeEpoch,choice=(imageChoices.get('media')||0)+1;
  if(!remove&&!file)throw new CmsError('IMAGE');imageChoices.set('media',choice);imagePending.add('media');if(drafts.media)invalidateReview('media',drafts.media);setConnectionState(connectionState);
  try{if(file)await inspectImage(file);if(routeEpoch!==epoch||imageChoices.get('media')!==choice)return;if(!snapshot)throw new CmsError('AUTH');let d=drafts.media;if(!d||d.mediaTarget!==target){d=newDraft(null,snapshot.contentSha);d.operation='media';d.mediaTarget=target;}d.image=remove?null:file;d.removeImage=remove;drafts.media=d;dirty('media');await save('media');drawImage($('preview'),d.image);status('保存済み・端末内','success');}
  finally{if(imageChoices.get('media')===choice)imagePending.delete('media');setConnectionState(connectionState);}
 }
 $('uploadBtn').addEventListener('click',safe(()=>mediaDraft()));$('removeBtn').addEventListener('click',safe(()=>mediaDraft(true)));
 const mediaActions=$('uploadBtn').parentElement;button('mediaPreviewBtn','確認',()=>renderPreview('media'),mediaActions);const mediaReview=make('div','','cms-review-actions');mediaReview.id='mediaReviewActions';mediaReview.hidden=true;const mediaLabel=make('label','','check-row'),mediaCheck=make('input');mediaCheck.type='checkbox';mediaCheck.id='mediaReviewed';mediaCheck.addEventListener('change',safe(()=>review('media')));mediaLabel.append(mediaCheck,document.createTextNode('変更画像・対象を確認しました'));mediaReview.append(mediaLabel);button('mediaRequest','公開依頼（PR）',()=>request('media'),mediaReview);$('uploaderCard').append(mediaReview);
 const batchReady=buildBatchUI();
 window.FDE_CMS_LOCKED=()=>busy||navigating||imagePending.size>0;
 window.FDE_CMS_NAVIGATE=navigate;setConnectionState('idle');fill('create',drafts.create);announceRoute({section:null,screen:'menu'});await refreshDraftList();await batchReady;status('下書き・公開待ちは端末内。公開依頼は別操作。');
 window.addEventListener('beforeunload',e=>{if(busy||timer||unsaved||batchUnsaved||imagePending.size){e.preventDefault();e.returnValue='';}});
}
safe(init)();
