import {newFaqDraft,persistedFaqDraft,faqFingerprint,FaqDraftStore,FaqPublisher,faqErrorText} from './cms-faq-workflow.js?v=20261017-121639';

// FAQ state is independent of News state. Only an explicit reviewed request
// passes a draft to the protected-branch publisher.
const $=id=>document.getElementById(id);
const LANGS=['ja','en','zh-CN'],SUFFIX={ja:'Ja',en:'En','zh-CN':'Zh'};
const make=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
const fail=code=>Object.assign(new Error(code),{code});
const store=new FaqDraftStore(),drafts={create:newFaqDraft(),edit:null},editDrafts=new Map(),versions=new WeakMap(),previewed=new Map(),unsavedDrafts=new Set();
let mode='create',snapshot=null,connectionState=$('adminTabs')?.dataset.connectionState||'idle';
let busy=false,epoch=0,connectionEpoch=0,saveQueue=Promise.resolve(),timer=null,pendingSaves=0,refreshTask=null,connectionToken='';
const token=()=>($('token')?.value||'').trim();
const connected=()=>connectionState==='connected'&&!!token()&&token()===connectionToken;
const locked=()=>busy||!!window.FDE_CMS_LOCKED?.();
const prefix=which=>which==='create'?'faqCreate':'faqEdit';
const card=which=>$(which==='create'?'faqCreateCard':'faqManageCard');
const version=d=>versions.get(d)||0;
const current=(which,d,stamp,revision)=>drafts[which]===d&&epoch===stamp&&version(d)===revision;
const activeEditor=which=>which===mode&&document.querySelector('.admin-main > .admin-shell')?.dataset.cmsSection==='faq'&&document.querySelector('.admin-main > .admin-shell')?.dataset.cmsScreen==='editor';
const routeInfo=()=>{const d=drafts[mode];return {mode,title:d?.record.question?.ja||'新規作成',operation:d?.operation||'create'};};
const publisher=new FaqPublisher({persist:async d=>persist(d)});

function status(text,type=''){
 const box=$('adminStatus');if(box){box.dataset.cmsPersistent='true';box.textContent=text;box.className=`status ${type}`.trim();box.hidden=false;}
 const preview=$('faqPreviewStatus');if(preview&&$('faqPreview')?.open){preview.textContent=text;preview.className=`status ${type}`.trim();preview.hidden=false;}
}
function errorText(error){
 const translations={TRANSLATION_KEY:'翻訳設定のAdmin fulfillment keyを入力してください。下書き保存には不要です。',TRANSLATION:'英訳を取得できませんでした。入力済みの翻訳は保持しています。手動入力するか、翻訳だけ再試行してください。'};
 return translations[error?.code]||faqErrorText(error);
}
const safe=action=>async(...args)=>{try{return await action(...args);}catch(error){status(errorText(error),'error');return false;}};
function button(id,text,action,parent,secondary=true){const node=make('button',text,`admin-button${secondary?' secondary':''}`);node.id=id;node.type='button';node.addEventListener('click',safe(action));parent.append(node);return node;}
function progress(which,step){
 for(const n of [1,2,3,4])$('faqPreviewStep'+n)?.setAttribute('aria-current',n===step?'step':'false');
 document.dispatchEvent(new CustomEvent('fde:cms-progress',{detail:{section:'faq',which,step,reviewed:!!drafts[which]?.reviewedFingerprint}}));
}
function invalidate(which,d){
 versions.set(d,version(d)+1);unsavedDrafts.add(d);d.reviewedFingerprint='';if($(prefix(which)+'Reviewed'))$(prefix(which)+'Reviewed').checked=false;
 previewed.delete(which);document.dispatchEvent(new CustomEvent('fde:cms-dirty',{detail:{section:'faq',which}}));
}
function capture(which=mode){
 const d=drafts[which];if(!d)return null;const p=prefix(which);
 for(const locale of LANGS){d.record.question[locale]=$(p+'Q'+SUFFIX[locale]).value;d.record.answer[locale]=$(p+'A'+SUFFIX[locale]).value;}
 d.record.category=$(p+'Category').value;d.record.subcategory=$(p+'Subcategory').value;d.record.highFrequency=$(p+'Frequent').checked;
 // Search metadata is deliberately preserved; translation never regenerates it.
 return d;
}
function meaningful(d){return !!d&&(version(d)>0||d.revision>0||d.operation!=='create'||LANGS.some(locale=>d.record.question?.[locale]?.trim()||d.record.answer?.[locale]?.trim()));}
function persist(d){
 pendingSaves++;unsavedDrafts.add(d);
 const task=saveQueue.catch(()=>{}).then(async()=>{const revision=version(d);d.updatedAt=new Date().toISOString();const saved=await store.put(persistedFaqDraft(d));d.revision=saved.revision;if(version(d)===revision)unsavedDrafts.delete(d);return saved;});
 saveQueue=task;return task.finally(()=>{pendingSaves--;});
}
async function save(which=mode){const d=capture(which);if(!d)return null;const result=await persist(d);await refreshDraftList();return result;}
async function preserve(){epoch++;clearTimeout(timer);timer=null;const d=capture(mode);if(meaningful(d)){await save(mode);status('保存済み・端末内','success');}if($('faqPreview')?.open)$('faqPreview').close();}
function dirty(which){
 if(locked())return;mode=which;const d=capture(which);if(!d)return;
 invalidate(which,d);clearTimeout(timer);status('保存中・端末内');
 timer=setTimeout(()=>safe(async()=>{timer=null;await save(which);status('保存済み・端末内','success');})(),700);
}
function validDraft(value){
 if(!value||value.kind!=='faq'||value.schemaVersion!==1||value.sourceFile!=='content/faq-content.json'||!['create','edit','delete'].includes(value.operation)||!Number.isInteger(value.revision)||value.revision<0||!/^[a-f0-9-]{36}$/.test(value.id||''))throw fail('INVALID');
 if(typeof value.updatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.updatedAt)||!Number.isFinite(Date.parse(value.updatedAt))||new Date(value.updatedAt).toISOString()!==value.updatedAt)throw fail('INVALID');
 if(!value.record||typeof value.sourceId!=='string'||!value.sourceId||value.record.id!==value.sourceId||value.operation==='create'&&value.sourceId!==`cms-faq-${value.id}`)throw fail('INVALID');
 if(!!value.baseContentSha!==!!value.basePolicySha)throw fail('INVALID');
 for(const key of ['category','subcategory'])if(typeof value.record[key]!=='string')throw fail('INVALID');
 if(typeof value.record.highFrequency!=='boolean')throw fail('INVALID');
 for(const locale of LANGS){
  if(typeof value.record.question?.[locale]!=='string'||typeof value.record.answer?.[locale]!=='string')throw fail('INVALID');
  for(const field of ['keywords','synonyms'])if(!Array.isArray(value.record[field]?.[locale])||value.record[field][locale].some(term=>typeof term!=='string'))throw fail('INVALID');
 }
 return persistedFaqDraft(value);
}
async function refreshDraftList(){
 const select=$('faqLocalDrafts');if(!select)return;select.dataset.draftState='loading';
 $('faqDraftBar').dataset.draftState='loading';
 try{const entries=await store.list(),chosen=select.value;select.replaceChildren(new Option('下書きを選択',''));
  for(const raw of entries){let d;try{d=validDraft(raw);}catch{continue;}const option=new Option(`${d.updatedAt.slice(0,16).replace('T',' ')} — ${d.record.question.ja||'無題'}${d.operation==='delete'?'［削除］':''}${d.request?'［依頼あり］':''}`,d.id);option.dataset.operation=d.operation;select.add(option);}
  select.value=chosen;select.dataset.draftState='loaded';$('faqDraftBar').dataset.draftState='loaded';
 }catch(error){select.dataset.draftState='error';$('faqDraftBar').dataset.draftState='error';throw error;}
}
function categoryEntries(){return Object.entries(snapshot?.content.categories||{}).sort((a,b)=>(a[1].order??99)-(b[1].order??99));}
function label(value){return value?.ja||value?.en||'';}
function options(select,entries,value=''){
 select.replaceChildren(new Option('選択してください',''));
 for(const [id,item]of entries)select.add(new Option(label(item.label)||id,id));
 if(value&&!entries.some(([id])=>id===value))select.add(new Option(`${value}（取得済み設定と要照合）`,value));select.value=value;
}
function categories(which,d){
 const p=prefix(which);options($(p+'Category'),categoryEntries(),d.record.category||'');
 options($(p+'Subcategory'),Object.entries(snapshot?.content.subcategories||{}).filter(([,item])=>item.category===d.record.category),d.record.subcategory||'');
}
function bind(d,which){
 if(!snapshot||!connected()||d.baseContentSha||d.basePolicySha)return false;
 if(d.operation!=='create')throw fail('CONFLICT');
 d.baseContentSha=snapshot.contentSha;d.basePolicySha=snapshot.policySha;invalidate(which,d);return true;
}
function searchPreview(d){
 const target=$('faqSearchTermsPreview');if(!target)return;const lines=[];
 for(const [locale,name]of [['ja','日本語'],['en','English'],['zh-CN','简体中文']]){lines.push(`${name} キーワード: ${(d.record.keywords?.[locale]||[]).join(' / ')||'なし'}`);lines.push(`${name} 同義語: ${(d.record.synonyms?.[locale]||[]).join(' / ')||'なし'}`);}
 target.textContent=lines.join('\n');target.style.whiteSpace='pre-line';
}
function fill(which,d){
 drafts[which]=d;mode=which;if(which==='edit'){editDrafts.set(d.sourceId,d);$('editFaqTarget').value=d.sourceId;}
 const p=prefix(which);for(const locale of LANGS){$(p+'Q'+SUFFIX[locale]).value=d.record.question?.[locale]||'';$(p+'A'+SUFFIX[locale]).value=d.record.answer?.[locale]||'';}
 categories(which,d);$(p+'Frequent').checked=!!d.record.highFrequency;$(p+'Reviewed').checked=false;
 d.reviewedFingerprint='';previewed.delete(which);if(which==='edit')searchPreview(d);
 $('faqDraftOperation').textContent=d.operation==='delete'?'削除依頼の下書き・未送信':'';showResult(d);syncControls();
}
function setReadState(state,message=''){
 $('faqPanel').dataset.faqState=state;if(message)$('faqStats').textContent=message;syncControls();
}
function renderOptions(){
 const select=$('editFaqTarget'),chosen=drafts.edit?.sourceId||select.value;select.replaceChildren();
 for(const item of snapshot?.content.faq||[]){const option=new Option(`${item.highFrequency?'★ ':''}${label(snapshot.content.categories?.[item.category]?.label)}｜${item.question?.ja||item.id}`,item.id);select.add(option);}
 select.value=[...select.options].some(option=>option.value===chosen)?chosen:'';
 $('faqStats').textContent=`FAQ ${(snapshot?.content.faq||[]).length}件。別管理のポリシーFAQ ${(snapshot?.policy.faq||[]).length}件は、この画面では変更しません。`;
}
async function refresh(){
 if(refreshTask)return refreshTask.promise;if(!connected()){setReadState('idle','接続するとFAQを表示します。');return false;}
 const credential=token(),generation=connectionEpoch;setReadState('loading','FAQを読み込んでいます…');
 const task={promise:null};refreshTask=task;task.promise=(async()=>{try{
  const next=await publisher.snapshot(credential);if(!connected()||connectionEpoch!==generation||token()!==credential)return false;
  if(!Array.isArray(next.content?.faq)||!Array.isArray(next.policy?.faq)||new Set(next.content.faq.map(item=>item.id)).size!==next.content.faq.length)throw fail('INVALID');
  snapshot=next;renderOptions();setReadState('loaded');
  for(const which of ['create','edit']){const d=drafts[which];if(!d)continue;capture(which);categories(which,d);if(bind(d,which)){try{await persist(d);}catch(error){status(errorText(error),'error');}}}
  return true;
 }catch(error){if(connected()&&connectionEpoch===generation&&token()===credential){setReadState('error','FAQを取得できませんでした。接続設定から再試行してください。');status(errorText(error),'error');}return false;
 }finally{if(refreshTask===task)refreshTask=null;syncControls();}})();
 return task.promise;
}
async function prepareRoute(target){
 if(busy)throw fail('INVALID');epoch++;clearTimeout(timer);timer=null;
 if(target.section!=='faq'||!['actions','list','drafts','editor'].includes(target.screen))throw fail('INVALID');
 if(['actions','list'].includes(target.screen)&&connected()&&$('faqPanel').dataset.faqState!=='loaded')await refresh();
 if(target.screen==='drafts')await refreshDraftList();
 if(target.screen==='editor'){
  if(target.draftId){const raw=(await store.list()).find(item=>item.id===target.draftId);if(!raw)throw fail('INVALID');const d=validDraft(raw),which=d.operation==='create'?'create':'edit';bind(d,which);fill(which,d);}
  else if(target.articleId){
   if(!connected())throw fail('AUTH');if(!snapshot||$('faqPanel').dataset.faqState!=='loaded')await refresh();
   if(!connected()||!snapshot||$('faqPanel').dataset.faqState!=='loaded')throw fail('AUTH');
   const record=snapshot.content.faq.find(item=>item.id===target.articleId);if(!record)throw fail('CONFLICT');
   fill('edit',editDrafts.get(record.id)||newFaqDraft(record,snapshot.contentSha,snapshot.policySha));
  }else if(target.mode==='create'){const d=target.fresh?newFaqDraft(null,snapshot?.contentSha||'',snapshot?.policySha||''):drafts.create;bind(d,'create');fill('create',d);}
  else if(target.mode==='edit'&&drafts.edit)fill('edit',drafts.edit);else throw fail('INVALID');
  progress(mode,target.step===2?2:1);
 }
 syncControls();return routeInfo();
}
function syncControls(){
 const disabled=locked(),panel=$('faqPanel');if(!panel)return;
 for(const el of panel.querySelectorAll('input,textarea,select,button'))el.disabled=disabled;
 $('editFaqTarget').disabled=disabled||!connected()||panel.dataset.faqState!=='loaded';
 for(const row of panel.querySelectorAll('#cmsFaqRows [data-faq-id]'))row.disabled=disabled||!connected()||panel.dataset.faqState!=='loaded';
 for(const row of panel.querySelectorAll('#cmsFaqDraftRows [data-draft-id]'))row.disabled=disabled||$('faqDraftBar').dataset.draftState!=='loaded';
 for(const which of ['create','edit']){
  const p=prefix(which),d=drafts[which];for(const suffix of ['PreviewBtn','Translate'])if($(p+suffix))$(p+suffix).disabled=disabled||!d;
  if($(p+'Request'))$(p+'Request').disabled=disabled||!d||!connected()||!snapshot||panel.dataset.faqState!=='loaded';
 }
 if($('deleteFaqBtn'))$('deleteFaqBtn').disabled=disabled||!drafts.edit||drafts.edit.operation==='delete';
 if($('cancelFaqDeleteBtn'))$('cancelFaqDeleteBtn').disabled=disabled||drafts.edit?.operation!=='delete';
 if($('bulkTranslateFaqBtn'))$('bulkTranslateFaqBtn').disabled=true;
 // Review controls are temporarily inside the dialog rather than the panel.
 for(const which of ['create','edit'])if($(prefix(which)+'Reviewed'))$(prefix(which)+'Reviewed').disabled=disabled||!drafts[which];
 for(const id of ['closeFaqPreview','faqPreviewStep1','faqPreviewStep2','faqPreviewStep3','faqPreviewStep4'])if($(id))$(id).disabled=disabled;
}
async function renderPreview(which){
 const dialog=$('faqPreview'),focusRequest=dialog.dataset.requestFocus==='true';delete dialog.dataset.requestFocus;
 if(locked()||!activeEditor(which))return;const d=capture(which);if(!d)throw fail('INCOMPLETE');bind(d,which);
 const stamp=epoch,revision=version(d),digest=await faqFingerprint(d);if(!current(which,d,stamp,revision))return;
 const content=$('faqPreviewContent');content.replaceChildren();
 if(d.operation==='delete')content.append(make('p','削除対象です。承認・マージ後、日英中のFAQ一覧・検索から削除されます。公開依頼までは変更しません。','admin-warning'));
 content.append(make('p',`対象ID：${d.sourceId}`),make('p',`カテゴリ：${label(snapshot?.content.categories?.[d.record.category]?.label)||(d.record.category?'要照合':'未選択')} / ${label(snapshot?.content.subcategories?.[d.record.subcategory]?.label)||(d.record.subcategory?'要照合':'未選択')}${d.record.highFrequency?' / 高頻度':''}`));
 for(const [locale,name]of [['ja','日本語'],['en','English'],['zh-CN','简体中文']]){
  const section=make('section','','cms-language-preview');section.lang=locale;section.append(make('h3',name),make('h4',d.record.question[locale]||'（質問未入力）'),make('p',d.record.answer[locale]||'（回答未入力）'));
  section.append(make('p',`検索キーワード：${(d.record.keywords?.[locale]||[]).join(' / ')||'なし'}`),make('p',`同義語：${(d.record.synonyms?.[locale]||[]).join(' / ')||'なし'}`));content.append(section);
 }
 previewed.set(which,digest);dialog.dataset.which=which;$(prefix(which)+'Reviewed').checked=d.reviewedFingerprint===digest;
 const actions=$(prefix(which)+'ReviewActions');actions.hidden=false;$('faqPreviewActions').append(actions);$('faqPreviewTarget').textContent=d.record.question.ja||'新規作成';$('faqPreviewStatus').hidden=true;
 dialog.showModal();progress(which,focusRequest?4:3);if(focusRequest){$(prefix(which)+'Reviewed').focus();actions.scrollIntoView({block:'nearest'});}syncControls();
}
async function review(which){
 if(locked()||!activeEditor(which)||!$('faqPreview').open||$('faqPreview').dataset.which!==which)return;
 const d=capture(which);if(!d)return;const check=$(prefix(which)+'Reviewed');
 if(!check.checked){d.reviewedFingerprint='';await save(which);if(!check.checked)progress(which,3);return;}
 const stamp=epoch,revision=version(d),digest=await faqFingerprint(d);
 if(!current(which,d,stamp,revision)||!check.checked)return;if(previewed.get(which)!==digest){check.checked=false;throw fail('REVIEW');}
 d.reviewedFingerprint=digest;await save(which);if(current(which,d,stamp,revision)&&check.checked&&d.reviewedFingerprint===digest)progress(which,4);
}
function showResult(d){
 const box=$('faqPublicationResult');box.replaceChildren();if(!d?.request)return;
 box.append(make('p',`公開依頼ブランチ：${d.request.branch}`));const number=d.request.prNumber;
 if(Number.isSafeInteger(number)&&number>0){const a=make('a',`PR #${number} を確認`);a.href=`https://github.com/Kale1205/fde-site/pull/${number}`;a.target='_blank';a.rel='noopener noreferrer';box.append(a);
  button('faqRefreshPublication','検査・公開状況を確認',async()=>{const identity=d,stamp=epoch,result=await publisher.status(number);if(drafts[mode]===identity&&epoch===stamp)$('faqPublicationState').textContent=`${result.label}${result.head?` / ${result.head.slice(0,12)}`:''}`;},box);
 }
 const state=make('p',d.request.branchReady?'GitHubブランチは公開されています。サイト反映はPRの検査・本人承認・マージ後です。':'公開依頼は未完了です。同じ下書きから再試行すると既存ブランチ・PRを確認します。');state.id='faqPublicationState';box.append(state);
}
async function lock(action){
 if(busy)return false;busy=true;const enabled=[...document.querySelectorAll('input,textarea,select,button')].filter(el=>!el.disabled);enabled.forEach(el=>el.disabled=true);clearTimeout(timer);timer=null;
 try{return await action();}finally{busy=false;enabled.forEach(el=>el.disabled=false);syncControls();}
}
async function request(which){
 if(locked()||!activeEditor(which)||!$('faqPreview').open||$('faqPreview').dataset.which!==which)return;
 const d=capture(which);if(!d)throw fail('INCOMPLETE');if(!connected()||!snapshot||$('faqPanel').dataset.faqState!=='loaded')throw fail('AUTH');
 const generation=connectionEpoch,credential=token(),base=snapshot,stamp=epoch,revision=version(d),digest=await faqFingerprint(d);
 if(locked()||!activeEditor(which)||!$('faqPreview').open||$('faqPreview').dataset.which!==which)return;if(!connected()||generation!==connectionEpoch||credential!==token()||snapshot!==base)throw fail('AUTH');
 if(!current(which,d,stamp,revision)||!$(prefix(which)+'Reviewed').checked||d.reviewedFingerprint!==digest||previewed.get(which)!==digest)throw fail('REVIEW');
 if(!d.baseContentSha||!d.basePolicySha)throw fail('CONFLICT');
 if(!confirm(`FAQ「${d.record.question.ja||'無題'}」（${d.sourceId}）の${d.operation==='delete'?'削除の':''}公開依頼を作成します。\n承認したこのFAQだけを公開GitHubブランチ・PRへ送信します。サイト反映は検査・本人承認・マージ後です。続けますか？`))return;
 await lock(async()=>{try{
  await save(which);if(!current(which,d,stamp,revision)||!activeEditor(which)||!$('faqPreview').open||$('faqPreview').dataset.which!==which||!$(prefix(which)+'Reviewed').checked||!connected()||generation!==connectionEpoch||credential!==token()||snapshot!==base||d.reviewedFingerprint!==digest)throw fail('REVIEW');
  const savedDigest=await faqFingerprint(d);if(savedDigest!==digest||!current(which,d,stamp,revision)||!activeEditor(which)||!$('faqPreview').open||$('faqPreview').dataset.which!==which||!$(prefix(which)+'Reviewed').checked||!connected()||generation!==connectionEpoch||credential!==token()||snapshot!==base||d.reviewedFingerprint!==digest)throw fail('REVIEW');
  status('FAQの公開依頼を準備しています。下書きは端末内に保持しています…');const result=await publisher.publish(d,credential);showResult(d);
  if(result.manual){const a=make('a','GitHubで既存ブランチからPRを作成');a.href=result.compareUrl;a.target='_blank';a.rel='noopener noreferrer';$('faqPublicationResult').append(a);status('ブランチを保存しました。現在の権限ではPRを作成できません。権限は変更していません。GitHubの比較画面から公開依頼を作成できます。','error');}
  else status(`PR #${result.pr.number} を確認しました。サイトにはまだ公開していません。本人承認後にGitHubでマージしてください。`,'success');
  $('faqPreview').close();
 }catch(error){showResult(d);throw error;}finally{try{await refreshDraftList();}catch(error){status(errorText(error),'error');}}});
}
async function translate(which){
 if(locked()||!activeEditor(which))return;const d=capture(which);if(!d?.record.question.ja.trim()||!d.record.answer.ja.trim())throw fail('INCOMPLETE');
 if(d.record.question.en.trim()&&d.record.answer.en.trim()){status('英語版は入力済みです。修正する部分を直接編集してください。');return;}
 const stamp=epoch,revision=version(d),generation=connectionEpoch,before=JSON.stringify(d.record);
 await lock(async()=>{const en=await window.FDE_NEWS_TRANSLATE(d.record.question.ja,d.record.answer.ja);
  if(!current(which,d,stamp,revision)||connectionEpoch!==generation||JSON.stringify(capture(which).record)!==before){status('原稿または接続状態が変わったため翻訳を適用していません。再試行してください。','error');return;}
  const p=prefix(which);if(!d.record.question.en.trim())$(p+'QEn').value=en.title;if(!d.record.answer.en.trim())$(p+'AEn').value=en.body;
  capture(which);invalidate(which,d);await save(which);status('空欄の英語版に翻訳案を入れました。中国語は手入力し、日英中を確認してください。検索語は保持しています。','success');
 });
}
async function remove(){
 if(locked()||!activeEditor('edit'))return;const d=capture('edit');if(!d||d.operation==='delete')return;
 if(!confirm(`FAQ「${d.record.question.ja||'無題'}」（${d.sourceId}）の削除依頼を下書きにします。\n承認・マージ後、日英中のFAQ一覧・検索から削除されます。いまは公開データを変更しません。続けますか？`))return;
 d.operation='delete';dirty('edit');$('faqDraftOperation').textContent='削除依頼の下書き・未送信';syncControls();await save('edit');
}
async function cancelDelete(){if(locked()||!activeEditor('edit'))return;const d=capture('edit');if(!d||d.operation!=='delete')return;d.operation='edit';dirty('edit');$('faqDraftOperation').textContent='';syncControls();await save('edit');}
function backup(){
 const d=capture(mode);if(!d)return;const value=persistedFaqDraft(d),url=URL.createObjectURL(new Blob([JSON.stringify({version:1,kind:'faq',draft:value},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download=`faq-draft-${d.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status('FAQ下書きのバックアップを保存しました。');
}
function buildEditor(which){
 const p=prefix(which),section=card(which);section.querySelector('h2').textContent=which==='create'?'FAQを新規作成':'FAQを編集';section.querySelector('p').textContent='端末内に下書き保存。公開依頼は確認後。';
 $(p+'QJa').maxLength=1200;$(p+'AJa').maxLength=7000;$(p+'QJa').lang='ja';$(p+'AJa').lang='ja';
 let after=$(p+'AJa').closest('.field');for(const [locale,name]of [['en','English'],['zh-CN','简体中文']])for(const [field,tag,labelText,max]of [['Q','input','質問',1200],['A','textarea','回答',7000]]){
  const input=make(tag);input.id=p+field+SUFFIX[locale];input.lang=locale;input.maxLength=max;if(tag==='input')input.type='text';const wrap=make('div','','field field-full cms-translation-field'),labelNode=make('label',`${labelText}（${name}）`);labelNode.htmlFor=input.id;wrap.append(labelNode,input);after.after(wrap);after=wrap;
 }
 const saveButton=$(which==='create'?'createFaqBtn':'saveFaqBtn');saveButton.textContent='下書き保存';saveButton.disabled=false;saveButton.addEventListener('click',safe(async()=>{if(locked()||!activeEditor(which))return;await save(which);status('保存済み・端末内','success');}));
 const actions=saveButton.parentElement;button(p+'Translate','英語の空欄を翻訳',()=>translate(which),actions);button(p+'PreviewBtn','確認',()=>renderPreview(which),actions,false);
 const reviewActions=make('div','','cms-review-actions');reviewActions.id=p+'ReviewActions';reviewActions.hidden=true;const labelNode=make('label','','check-row cms-review-check'),check=make('input');check.type='checkbox';check.id=p+'Reviewed';check.addEventListener('change',safe(()=>review(which)));labelNode.append(check,document.createTextNode('日英中・設定・検索語を確認しました'));reviewActions.append(labelNode);button(p+'Request','公開依頼（PR）',()=>request(which),reviewActions,false);reviewActions.append(make('p','公開GitHubへ送信。サイト反映は本人承認・マージ後。','token-note'));section.append(reviewActions);
 for(const el of section.querySelectorAll('input,textarea,select')){
  if(el.id==='editFaqTarget'||el.id===p+'Reviewed')continue;
  if(el.id===p+'Category')el.addEventListener('change',()=>{if(locked())return;const d=capture(which);d.record.subcategory='';options($(p+'Subcategory'),Object.entries(snapshot?.content.subcategories||{}).filter(([,item])=>item.category===d.record.category),'');dirty(which);});
  else el.addEventListener(el.type==='checkbox'||el.tagName==='SELECT'?'change':'input',()=>dirty(which));
 }
}
function buildUi(){
 for(const which of ['create','edit'])buildEditor(which);
 const info=$('faqInfoCard');if(info){info.querySelector('p').textContent='FAQ本体を編集できます。別管理のポリシーFAQは変更せず維持します。';const legacy=$('faqAdminKey')?.closest('.field');if(legacy)legacy.hidden=true;const bulk=$('bulkTranslateFaqBtn');if(bulk){bulk.disabled=true;bulk.hidden=true;}if($('faqBulkProgress'))$('faqBulkProgress').hidden=true;}
 $('deleteFaqBtn').textContent='削除依頼を準備';$('deleteFaqBtn').addEventListener('click',safe(remove));button('cancelFaqDeleteBtn','削除依頼を取り消す',cancelDelete,$('deleteFaqBtn').parentElement);
 const bar=make('section','','admin-card cms-draft-bar');bar.id='faqDraftBar';bar.append(make('h2','下書き'),make('p','このブラウザに保存されます。重要な原稿はバックアップしてください。','cms-small-note'));
 const field=make('div','','field'),labelNode=make('label','FAQの下書き');labelNode.htmlFor='faqLocalDrafts';const select=make('select');select.id='faqLocalDrafts';select.dataset.draftState='idle';select.addEventListener('change',safe(async()=>{if(select.value)await window.FDE_CMS_NAVIGATE?.({section:'faq',screen:'editor',draftId:select.value});}));field.append(labelNode,select);bar.append(field);
 button('faqBackupDraft','現在の下書きをバックアップ',backup,bar);button('faqFreshDraft','別の下書きを作る',()=>window.FDE_CMS_NAVIGATE?.({section:'faq',screen:'editor',mode:'create',fresh:true}),bar);
 const operation=make('p');operation.id='faqDraftOperation';const result=make('div','','cms-publication-result');result.id='faqPublicationResult';result.setAttribute('aria-live','polite');bar.append(operation,result);$('faqPanel').prepend(bar);
 const dialog=make('dialog','','cms-news-preview');dialog.id='faqPreview';dialog.setAttribute('aria-labelledby','faqPreviewHeading');const heading=make('h2','確認');heading.id='faqPreviewHeading';heading.tabIndex=-1;const target=make('p');target.id='faqPreviewTarget';dialog.append(heading,target,make('p','日英中・設定・検索語を確認。公開依頼までは端末内です。','token-note'));
 const steps=make('nav','','cms-preview-steps');steps.setAttribute('aria-label','FAQ作業の進み具合');for(const [step,text]of [[1,'①内容'],[2,'②翻訳'],[3,'③確認'],[4,'④公開依頼']])button('faqPreviewStep'+step,text,async()=>{if(busy)return;const which=dialog.dataset.which;if(step<3){const moved=await window.FDE_CMS_NAVIGATE?.({section:'faq',screen:'editor',mode:which,step});if(moved)dialog.close();}else if(step===4){$(prefix(which)+'Reviewed').focus();$(prefix(which)+'ReviewActions').scrollIntoView({block:'nearest'});progress(which,4);}else heading.focus();},steps);dialog.append(steps);
 const content=make('div');content.id='faqPreviewContent';const previewStatus=make('div','','status');previewStatus.id='faqPreviewStatus';previewStatus.hidden=true;previewStatus.setAttribute('role','status');const previewActions=make('div');previewActions.id='faqPreviewActions';dialog.append(content,previewStatus,previewActions);button('closeFaqPreview','編集へ戻る',()=>{if(!busy)dialog.close();},dialog);
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>{const which=dialog.dataset.which,actions=$(prefix(which)+'ReviewActions');if(actions){actions.hidden=true;card(which).append(actions);}if(which)progress(which,1);});document.body.append(dialog);
 $('editFaqTarget').addEventListener('change',safe(async()=>{const id=$('editFaqTarget').value;if(id)await window.FDE_CMS_NAVIGATE?.({section:'faq',screen:'editor',articleId:id});}));
}

// Build synchronously: the presentation module runs after this module loads.
buildUi();fill('create',drafts.create);setReadState('idle','接続するとFAQを表示します。');$('faqPanel').dataset.faqWorkflow='draft-pr';
window.FDE_CMS_FAQ={isBusy:()=>busy,preserve,prepareRoute,routeInfo,syncControls};
document.addEventListener('fde:cms-faq-read',safe(refresh));
document.addEventListener('fde:cms-connection',event=>{const next=event.detail?.state||'idle',credential=token();if(next===connectionState&&credential===connectionToken){syncControls();return;}connectionEpoch++;connectionState=next;connectionToken=credential;snapshot=null;refreshTask=null;setReadState(connectionState==='connected'?'idle':connectionState==='loading'?'loading':'idle',connectionState==='connected'?'FAQを取得できます。':'接続するとFAQを表示します。');if(connected())safe(refresh)();});
$('token')?.addEventListener('input',()=>{connectionEpoch++;connectionState='idle';connectionToken='';snapshot=null;refreshTask=null;setReadState('idle','接続するとFAQを表示します。');});
window.addEventListener('beforeunload',event=>{if(busy||timer||pendingSaves||unsavedDrafts.size){event.preventDefault();event.returnValue='';}});
safe(refreshDraftList)();
