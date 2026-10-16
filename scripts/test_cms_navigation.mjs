import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../cms-admin.js',import.meta.url),'utf8');
assert.match(source,/\nsafe\(init\)\(\);\s*$/,'Runtime startup must be identified before loading the VM.');
const runtime=source.replace(/^import[^\n]+\n/,'').replace(/\nsafe\(init\)\(\);\s*$/,'');
assert.notEqual(runtime,source,'The test must remove module startup, never run init or a real DraftStore.');
const removeImageAction=source.match(/\$\('removeNewsImageBtn'\)\.addEventListener\('click',safe\((async\(\)=>\{[^\n]+\})\)\);/)?.[1];
const beforeUnloadAction=source.match(/window\.addEventListener\('beforeunload',(e=>\{[^\n]+\})\);/)?.[1];
assert(removeImageAction&&beforeUnloadAction,'The real image removal and unload handlers must be identified.');
const locales=['ja','en','zh-CN'],suffixes={ja:'Ja',en:'En','zh-CN':'Zh'};
const clone=value=>structuredClone(value);
const plain=value=>JSON.parse(JSON.stringify(value));
const gate=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const article=id=>({id,date:'2026-10-16',category:'Product',featured:false,image:'',link:'news.html',
 title:Object.fromEntries(locales.map(locale=>[locale,`Synthetic ${id} ${locale}`])),
 body:Object.fromEntries(locales.map(locale=>[locale,`Synthetic body ${id} ${locale}`]))});
const digest=d=>JSON.stringify({operation:d.operation,sourceId:d.sourceId,base:d.baseContentSha,record:d.record,image:d.image,removeImage:d.removeImage,mediaTarget:d.mediaTarget});
class CmsError extends Error{constructor(code){super(code);this.code=code;}}

// These tests run the unchanged runtime with synthetic dependencies. No browser,
// native IndexedDB, network request, disk draft, or real credential is used.
function fixture(){
 const nodes=new Map(),events=[],timers=new Map(),journal=new Map();
 const counts={put:0,list:0,publish:0,confirm:0,fingerprint:0};
 const hooks={put:null,inspect:null,fingerprint:null,confirm:null,publish:null};let sequence=0,timerSequence=0;
 function element(tag='div'){
  const classes=new Set();return {tagName:tag.toUpperCase(),value:'',checked:false,disabled:false,hidden:false,dataset:{},children:[],options:[],_text:'',open:false,
   get textContent(){return this._text+this.children.map(child=>typeof child==='string'?child:child.textContent||'').join('');},
   set textContent(value){this._text=String(value);this.children=[];},
   classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value),toggle(value,force){const next=force??!classes.has(value);next?classes.add(value):classes.delete(value);return next;}},
   append(...children){this.children.push(...children);},replaceChildren(...children){this._text='';this.children=children;if(this.tagName==='SELECT'){this.options=children;this.value=children[0]?.value||'';}},
   add(option){this.options.push(option);},setAttribute(name,value){this[name]=String(value);},listeners:{},addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);},dispatchEvent(event){events.push(event);},
   focus(){this.focused=true;},scrollIntoView(){this.scrollCount=(this.scrollCount||0)+1;},showModal(){this.open=true;this.openCount=(this.openCount||0)+1;},close(){this.open=false;}
  };
 }
 const node=(id,tag='div')=>{if(!nodes.has(id))nodes.set(id,element(tag));return nodes.get(id);};
 const controlIds=['token','connectBtn','editNewsTarget','localDrafts','adminTabs','newsPanel','adminStatus','previewStatus','previewTarget','newsPreview',
  'newsPreviewContent','newsPreviewActions','publicationResult','draftOperation','editCurrentImage','preview','uploaderCard'];
 for(const id of controlIds)node(id,['editNewsTarget','localDrafts'].includes(id)?'select':'div');
 for(const which of ['create','edit','media'])for(const name of ['Reviewed','Request','Preview','PreviewBtn','ReviewActions','Translate','ImageFile'])node(which+name,name==='Reviewed'?'input':'button');
 for(const which of ['create','edit']){
  for(const locale of locales)for(const field of ['Title','Body'])node(which+field+suffixes[locale],'input');
  for(const field of ['Category','Date','Featured'])node(which+field,'input');
 }
 const targets=['fallback','instagram'].map(value=>{const radio=node(value+'Target','input');radio.value=value;radio.checked=value==='fallback';return radio;});
 const shell=element(),faqTab=element('button');
 const document={getElementById:id=>nodes.get(id),createElement:element,dispatchEvent:event=>events.push(event),
  querySelector:selector=>selector.includes('admin-shell')?shell:selector==='input[name=target]:checked'?targets.find(radio=>radio.checked):faqTab,
  querySelectorAll:selector=>selector==='input[name=target]'?targets:selector==='input,textarea,select,button'?[...nodes.values()].filter(n=>['INPUT','TEXTAREA','SELECT','BUTTON'].includes(n.tagName)):[]};
 const newDraft=(record=null,baseContentSha='')=>({id:`synthetic-draft-${++sequence}`,revision:0,operation:record?'edit':'create',sourceId:record?.id||'',baseContentSha,
  record:clone(record||{date:'2026-10-16',category:'Product',featured:false,title:{ja:'',en:'','zh-CN':''},body:{ja:'',en:'','zh-CN':''},image:'',link:'news.html'}),
  image:null,removeImage:false,reviewedFingerprint:'',request:null,updatedAt:'2026-10-16T00:00:00.000Z'});
 class MemoryDraftStore{
  async put(value){counts.put++;if(hooks.put)await hooks.put(value);const saved=clone({...value,revision:value.revision+1});journal.set(saved.id,saved);return saved;}
  async list(){counts.list++;return clone([...journal.values()]);}
 }
 class SyntheticPublisher{
  async publish(d,token){counts.publish++;return hooks.publish?hooks.publish(d,token):{pr:{number:123}};}
 }
 const context={document,window:{},DraftStore:MemoryDraftStore,NewsPublisher:SyntheticPublisher,CmsError,errorText:e=>e.code||e.message,newDraft,
  persistedDraft:clone,base64:()=>'',LANGS:locales,
  fingerprint:async d=>{counts.fingerprint++;return hooks.fingerprint?hooks.fingerprint(d):digest(d);},
  inspectImage:async file=>hooks.inspect?hooks.inspect(file):{},
  confirm:message=>{counts.confirm++;return hooks.confirm?hooks.confirm(message):false;},
  Option:class{constructor(textContent,value){Object.assign(this,{textContent,value,dataset:{}});}},
  Event:class{constructor(type,options){Object.assign(this,{type},options);}},CustomEvent:class{constructor(type,options){Object.assign(this,{type},options);}},
  URL:{createObjectURL:()=>`blob:synthetic-${++sequence}`,revokeObjectURL(){}},
  setTimeout:callback=>{const id=++timerSequence;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id)
 };
 // Expose the original inline handlers in this private VM without executing init.
 vm.createContext(context);vm.runInContext(runtime+`\nglobalThis.testApi={navigate,preserveCurrent,capture,fill,dirty,chooseImage,renderPreview,review,request,connect,translate,unchanged,version,setConnectionState,showResult,
  removeImage:${removeImageAction},beforeUnload:${beforeUnloadAction},
  drafts,editDrafts,previewed,draftVersions,
  state:()=>({route,routeEpoch,navigating,busy,mode,snapshot,connectionState}),
  configure:values=>{if('snapshot'in values)snapshot=values.snapshot;if('token'in values)token=values.token;if('routeEpoch'in values)routeEpoch=values.routeEpoch;if('busy'in values)busy=values.busy;},
  newDraft};`,context);
 const api=context.testApi;
 api.fill('create',api.drafts.create);
 api.configure({snapshot:{contentSha:'synthetic-content-sha',content:{news:[article('a'),article('b')]}},token:'synthetic-only'});
 api.setConnectionState('connected');
 return {api,nodes,node,events,timers,journal,counts,hooks,window:context.window};
}
const editTarget=id=>({section:'news',screen:'editor',articleId:id});
const actions={section:'news',screen:'actions'};
async function editing(id='a'){const f=fixture();assert.equal(await f.api.navigate(editTarget(id)),true);return f;}
function approve(f){const d=f.api.drafts.edit;d.reviewedFingerprint=digest(d);f.node('editReviewed').checked=true;f.api.previewed.set('edit',d.reviewedFingerprint);return d;}

test('preserveCurrent clears pending autosave and persists the current three-language inputs',async()=>{
 const f=await editing();f.node('editBodyZh').value='Unsaved synthetic Chinese body';f.api.dirty('edit');assert.equal(f.timers.size,1);
 await f.api.preserveCurrent();assert.equal(f.timers.size,0);assert.equal(f.counts.put,1);
 assert.equal(f.journal.get(f.api.drafts.edit.id).record.body['zh-CN'],'Unsaved synthetic Chinese body');
});

for(const code of ['STORAGE','LOCAL_CONFLICT'])test(`${code} keeps the route and input when navigation preservation fails`,async()=>{
 const f=await editing(),route=plain(f.api.state().route),draft=f.api.drafts.edit;
 f.node('editBodyEn').value='Unstored synthetic English body';f.hooks.put=async()=>{throw new CmsError(code);};
 await assert.rejects(f.api.preserveCurrent(),{code});
 assert.equal(await f.api.navigate(actions),false);assert.deepEqual(plain(f.api.state().route),route);
 assert.equal(f.api.drafts.edit,draft);assert.equal(f.node('editBodyEn').value,'Unstored synthetic English body');
 assert.equal(f.api.state().navigating,false);assert.equal(f.node('adminStatus').textContent,code);
});

test('A to B to A reuses the same cached draft and restores all languages, settings and image',async()=>{
 const f=await editing(),a=f.api.drafts.edit;
 for(const locale of locales)for(const field of ['Title','Body'])f.node('edit'+field+suffixes[locale]).value=`Edited A ${field} ${locale}`;
 f.node('editCategory').value='Social';f.node('editDate').value='2026-10-17';f.node('editFeatured').checked=true;
 a.image={name:'synthetic-a.png'};a.imageName='synthetic-a.png';
 assert.equal(await f.api.navigate(editTarget('b')),true);const b=f.api.drafts.edit;
 f.node('editTitleJa').value='Edited B title';assert.equal(await f.api.navigate(editTarget('a')),true);
 assert.equal(f.api.drafts.edit,a);assert.equal(f.api.editDrafts.get('a'),a);assert.equal(f.api.editDrafts.get('b'),b);
 for(const locale of locales)for(const field of ['Title','Body']){
  assert.equal(f.node('edit'+field+suffixes[locale]).value,`Edited A ${field} ${locale}`);
  assert.equal(a.record[field.toLowerCase()][locale],`Edited A ${field} ${locale}`);
 }
 assert.equal(a.record.category,'Social');assert.equal(a.record.date,'2026-10-17');assert.equal(a.record.featured,true);
 assert.equal(a.image.name,'synthetic-a.png');assert.equal(f.node('editNewsTarget').value,'a');
 assert.equal(f.journal.get(b.id).record.title.ja,'Edited B title');assert.equal(f.counts.publish,0);
});

test('opening and leaving empty new drafts does not create persisted blank drafts',async()=>{
 const f=fixture();for(let i=0;i<3;i++){
  assert.equal(await f.api.navigate({section:'news',screen:'editor',mode:'create',fresh:true}),true);
  assert.equal(await f.api.navigate({section:null,screen:'menu'}),true);
 }
 assert.equal(f.journal.size,0);assert.equal(f.counts.put,0);
});

for(const [field,value] of [['Category','Social'],['Date','2026-10-18'],['Featured',true]])test(`a ${field}-only change survives immediate navigation and a fresh draft`,async()=>{
 const f=fixture(),d=f.api.drafts.create;
 if(field==='Featured')f.node('createFeatured').checked=value;else f.node('create'+field).value=value;
 f.api.dirty('create');assert.equal(f.timers.size,1);assert.equal(f.journal.size,0);
 assert.equal(await f.api.navigate(actions),true);assert.equal(f.timers.size,0);
 assert.equal(f.journal.get(d.id).record[field.toLowerCase()],value);
 assert.equal(await f.api.navigate({section:'news',screen:'editor',mode:'create',fresh:true}),true);
 assert.notEqual(f.api.drafts.create.id,d.id);assert.equal(f.journal.get(d.id).record[field.toLowerCase()],value);
 assert.equal(await f.api.navigate(actions),true);assert.equal(f.journal.size,1,'the untouched fresh draft must stay unpersisted');
});

test('Top News choices for separate articles are restored independently through local saves',async()=>{
 const f=await editing(),a=f.api.drafts.edit;f.api.state().snapshot.content.news.find(item=>item.id==='b').featured=true;
 f.node('editFeatured').checked=true;f.api.dirty('edit');assert.equal(await f.api.navigate(editTarget('b')),true);const b=f.api.drafts.edit;
 assert.equal(f.node('editFeatured').checked,true);assert.equal(b.record.featured,true);assert.equal(f.journal.get(a.id).record.featured,true);
 assert.equal(await f.api.navigate(editTarget('a')),true);assert.equal(f.node('editFeatured').checked,true);
 f.node('editFeatured').checked=false;f.api.dirty('edit');assert.equal(await f.api.navigate(editTarget('b')),true);
 assert.equal(f.node('editFeatured').checked,true);assert.equal(f.journal.get(a.id).record.featured,false);assert.equal(b.record.featured,true);assert.equal(f.counts.publish,0);
});

test('restoring a local edit selects its source and caches that restored draft for later article switches',async()=>{
 const f=await editing(),saved=f.api.newDraft(article('b'),'synthetic-content-sha');saved.record.body.en='Restored synthetic English body';
 f.journal.set(saved.id,clone(saved));assert.equal(await f.api.navigate({section:'news',screen:'editor',draftId:saved.id}),true);
 const restored=f.api.drafts.edit;assert.equal(restored.id,saved.id);assert.equal(f.node('editNewsTarget').value,'b');assert.equal(f.api.editDrafts.get('b'),restored);
 assert.equal(await f.api.navigate(editTarget('a')),true);assert.equal(await f.api.navigate(editTarget('b')),true);
 assert.equal(f.api.drafts.edit,restored);assert.equal(f.node('editBodyEn').value,'Restored synthetic English body');
});

test('opening common media without a draft clears the previous article publication and deletion display',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request={branch:'synthetic/article-a',branchReady:true};f.api.fill('edit',d);
 f.node('draftOperation').textContent='Synthetic article deletion warning';assert(f.node('publicationResult').textContent.includes('synthetic/article-a'));
 assert.equal(await f.api.navigate({section:'news',screen:'media'}),true);
 assert.equal(f.node('draftOperation').textContent,'');assert.equal(f.node('publicationResult').textContent,'');
});

test('restoring common media shows its own publication state and restores its image target radio',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request={branch:'synthetic/article-a',branchReady:true};f.api.fill('edit',d);
 f.node('draftOperation').textContent='Synthetic article deletion warning';
 const media=f.api.newDraft(null,'synthetic-content-sha');media.operation='media';media.mediaTarget='instagram';media.image={name:'synthetic-instagram.png'};media.request={branch:'synthetic/media-only',branchReady:true};
 f.journal.set(media.id,clone(media));assert.equal(await f.api.navigate({section:'news',screen:'editor',draftId:media.id}),true);
 assert.equal(f.api.state().route.screen,'media');assert.equal(f.api.state().mode,'media');assert.equal(f.api.drafts.media.id,media.id);
 assert.equal(f.node('instagramTarget').checked,true);assert.equal(f.node('fallbackTarget').checked,false);assert.equal(f.node('draftOperation').textContent,'');
 assert(f.node('publicationResult').textContent.includes('synthetic/media-only'));assert(!f.node('publicationResult').textContent.includes('synthetic/article-a'));
});

const savedRequest=(d,extra={})=>({fingerprint:digest(d),branch:'cms/news-synthetic-a-a1b2c3',branchReady:true,commitSha:'synthetic-commit',...extra});
const resultChild=(f,id)=>f.node('publicationResult').children.find(child=>child.id===id);
test('a restored PR creation denial recreates the safe manual link from its saved branch only',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403,compareUrl:'https://untrusted.invalid',prUrl:'javascript:invalid'});
 f.api.fill('edit',clone(d));await f.api.showResult(f.api.drafts.edit);const box=f.node('publicationResult'),link=resultChild(f,'manualPublication');
 assert.match(box.textContent,/保存済み.*この操作ではサイトに反映していません/s);assert.match(box.textContent,/PR作成.*GitHubに拒否.*HTTP 403/s);
 assert.equal(link.href,'https://github.com/Kale1205/fde-site/compare/main...cms%2Fnews-synthetic-a-a1b2c3?expand=1');
 assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.match(link.textContent,/既存PRを確認/);
 await f.api.showResult(f.api.drafts.edit);assert.equal(box.children.filter(child=>child.id==='manualPublication').length,1,'redraw restores one link without transient append state');
 assert.equal(f.counts.publish,0);assert.equal(f.counts.confirm,0);
});

for(const metadata of [{},{prErrorStage:'lookup',prErrorCode:'NETWORK'},{prErrorStage:'lookup',prErrorCode:'PERMISSION',prErrorStatus:403}])test(`a saved branch with ${metadata.prErrorStage||'legacy'} metadata does not claim a PR creation denial or absence`,async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,metadata);f.api.fill('edit',d);await f.api.showResult(d);const box=f.node('publicationResult');
 assert.match(box.textContent,/PR.*未確認/);assert.doesNotMatch(box.textContent,/PR作成.*権限不足|既存PRの確認では見つかりません/);
 assert.equal(resultChild(f,'manualPublication').textContent,'保存済みブランチ・PRをGitHubで確認');
 assert.doesNotMatch(box.textContent,/必要な場合だけPRを作成/);assert(resultChild(f,'retryPublication'));
});

test('branch conflicts offer comparison and backup without manual PR creation or retry',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{prErrorStage:'branch',prErrorCode:'CONFLICT',prErrorStatus:409});f.api.fill('edit',d);await f.api.showResult(d);
 const box=f.node('publicationResult');assert.match(box.textContent,/別の変更.*停止.*上書きしていません.*バックアップ/s);
 assert(resultChild(f,'manualPublication'));assert.equal(resultChild(f,'retryPublication'),undefined);assert.doesNotMatch(box.textContent,/必要な場合だけPRを作成/);
});

test('a saved PR number takes precedence over stale error metadata and untrusted persisted URLs',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{prNumber:321,prUrl:'javascript:invalid',prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403});f.api.fill('edit',d);await f.api.showResult(d);
 const box=f.node('publicationResult'),link=box.children.find(child=>child.tagName==='A');assert.equal(link.href,'https://github.com/Kale1205/fde-site/pull/321');
 assert.equal(box.dataset.recovery,'false');assert.equal(resultChild(f,'manualPublication'),undefined);assert.equal(resultChild(f,'retryPublication'),undefined);assert.doesNotMatch(box.textContent,/権限不足/);
});

test('an incomplete branch journal does not offer a manual PR creation link',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{branchReady:false});f.api.fill('edit',d);
 assert.equal(resultChild(f,'manualPublication'),undefined);assert.equal(f.node('publicationResult').dataset.recovery,'false');assert.match(f.node('publicationResult').textContent,/未完了/);
});

test('manual recovery stays visible after the request and reopens review without automatically publishing again',async()=>{
 const f=await editing(),d=approve(f);f.hooks.confirm=()=>true;f.hooks.publish=async draft=>{draft.request=savedRequest(draft,{prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403});return {manual:true,compareUrl:'https://untrusted.invalid'};};
 f.node('newsPreview').open=true;await f.api.request('edit');assert.equal(f.counts.publish,1);assert.equal(f.node('newsPreview').open,false);assert.equal(f.node('publicationResult').scrollCount,1);
 assert.match(f.node('adminStatus').textContent,/PR作成.*GitHubに拒否.*HTTP 403.*サイトには未反映.*公開依頼の状況/s);assert.doesNotMatch(f.node('adminStatus').textContent,/上のリンク/);
 assert(resultChild(f,'manualPublication'));f.api.fill('edit',d);await f.api.showResult(d);const retry=resultChild(f,'retryPublication');await retry.listeners.click[0]();
 assert.equal(f.node('newsPreview').open,true);assert.equal(f.node('editReviewed').focused,true);assert.equal(f.counts.publish,1);assert.equal(f.counts.confirm,1,'retry only reopens the existing review and confirmation flow');
});

test('an uncertain PR lookup after branch saving closes the preview and reveals persisted recovery details',async()=>{
 const f=await editing();approve(f);f.hooks.confirm=()=>true;f.hooks.publish=async draft=>{draft.request=savedRequest(draft,{prErrorStage:'lookup',prErrorCode:'NETWORK'});throw new CmsError('NETWORK');};
 f.node('newsPreview').open=true;await assert.rejects(f.api.request('edit'),{code:'NETWORK'});
 assert.equal(f.node('newsPreview').open,false);assert.equal(f.node('publicationResult').scrollCount,1);assert.match(f.node('publicationResult').textContent,/既存PR.*確認を完了できません.*PRの有無は未確認/s);
 assert(resultChild(f,'manualPublication'));assert.equal(f.api.state().busy,false);assert.equal(f.counts.publish,1);
});

test('editing or restoring changed content removes manual creation and retry while preserving comparison and input',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403});await f.api.showResult(d);
 assert(resultChild(f,'retryPublication'));assert.match(resultChild(f,'manualPublication').textContent,/PRを作成/);
 f.node('editBodyEn').value='Synthetic change after the saved publication request';f.api.dirty('edit');
 assert.equal(resultChild(f,'retryPublication'),undefined,'dirty must synchronously remove the old retry action');assert.doesNotMatch(resultChild(f,'manualPublication').textContent,/PRを作成/);
 await f.api.showResult(d);assert.match(f.node('publicationResult').textContent,/現在の下書きの変更はそのブランチへ保存していません/);
 assert.doesNotMatch(f.node('publicationResult').textContent,/必要な場合だけPRを作成/);assert.equal(f.node('editBodyEn').value,d.record.body.en);assert.equal(f.counts.publish,0);
 f.api.fill('edit',clone(d));await f.api.showResult(f.api.drafts.edit);
 assert.equal(resultChild(f,'retryPublication'),undefined);assert.doesNotMatch(resultChild(f,'manualPublication').textContent,/PRを作成/);assert.match(f.node('publicationResult').textContent,/バックアップ/);
});

test('an obsolete result fingerprint cannot restore recovery actions for a different draft',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403});const hashed=gate();f.hooks.fingerprint=()=>hashed.promise;
 const pending=f.api.showResult(d);assert.equal(resultChild(f,'retryPublication'),undefined);assert.doesNotMatch(resultChild(f,'manualPublication').textContent,/PRを作成/);
 f.api.fill('edit',f.api.newDraft(article('b'),'synthetic-content-sha'));hashed.resolve(digest(d));await pending;
 assert.equal(f.node('publicationResult').textContent,'');assert.equal(resultChild(f,'retryPublication'),undefined);assert.equal(f.api.drafts.edit.sourceId,'b');assert.equal(f.counts.publish,0);
});

test('failure to compare the local fingerprint keeps the saved branch link without manual creation',async()=>{
 const f=await editing(),d=f.api.drafts.edit;d.request=savedRequest(d,{prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403});f.hooks.fingerprint=()=>{throw new Error('synthetic hash failure');};await f.api.showResult(d);
 assert.match(f.node('publicationResult').textContent,/一致を確認できません.*バックアップ/s);assert(resultChild(f,'manualPublication'));assert.doesNotMatch(resultChild(f,'manualPublication').textContent,/PRを作成/);assert.equal(resultChild(f,'retryPublication'),undefined);assert.equal(f.counts.publish,0);
});

test('switching from an unsaved create draft to an existing article preserves and resumes the create draft',async()=>{
 const f=fixture(),d=f.api.drafts.create;
 for(const locale of locales)for(const field of ['Title','Body'])f.node('create'+field+suffixes[locale]).value=`Synthetic new ${field} ${locale}`;
 assert.equal(await f.api.navigate(editTarget('a')),true);
 for(const locale of locales)for(const field of ['title','body'])assert.equal(f.journal.get(d.id).record[field][locale],`Synthetic new ${field==='title'?'Title':'Body'} ${locale}`);
 assert.equal(await f.api.navigate({section:'news',screen:'editor',mode:'create'}),true);assert.equal(f.api.drafts.create,d);
 for(const locale of locales)for(const field of ['Title','Body'])assert.equal(f.node('create'+field+suffixes[locale]).value,`Synthetic new ${field} ${locale}`);
});

test('an additional navigation is rejected while the first save is pending',async()=>{
 const f=await editing(),saved=gate();f.node('editBodyJa').value='Synthetic pending input';f.hooks.put=()=>saved.promise;
 const first=f.api.navigate(actions),epoch=f.api.state().routeEpoch;
 assert.equal(f.api.state().navigating,true);assert.equal(await f.api.navigate({section:null,screen:'menu'}),false);
 assert.equal(f.api.state().routeEpoch,epoch);saved.resolve();assert.equal(await first,true);
 assert.equal(f.api.state().route.section,'news');assert.equal(f.api.state().route.screen,'actions');
 assert.equal(f.journal.get(f.api.drafts.edit.id).record.body.ja,'Synthetic pending input');
});

test('navigation waits for the selected image to be saved before allowing an article switch',async()=>{
 const f=await editing(),validated=gate(),a=f.api.drafts.edit,route=plain(f.api.state().route),epoch=f.api.state().routeEpoch;f.hooks.inspect=()=>validated.promise;
 const pending=f.api.chooseImage('edit',{name:'late-synthetic.png'});
 assert.equal(await f.api.navigate(editTarget('b')),false);assert.equal(f.api.drafts.edit,a);
 assert.deepEqual(plain(f.api.state().route),route);assert.equal(f.api.state().routeEpoch,epoch);assert.equal(f.api.state().navigating,false);
 assert.match(f.node('adminStatus').textContent,/画像.*確認中.*完了後/);assert.equal(f.counts.put,0);
 validated.resolve();await pending;assert.equal(a.image.name,'late-synthetic.png');assert.equal(f.journal.get(a.id).image.name,'late-synthetic.png');
 assert.equal(await f.api.navigate(editTarget('b')),true);const b=f.api.drafts.edit;
 assert.equal(b.sourceId,'b');assert.equal(b.image,null);assert.equal(f.api.editDrafts.get('a'),a);assert.equal(a.image.name,'late-synthetic.png');assert.equal(f.counts.publish,0);
});

test('starting image validation immediately clears approval and blocks preview and publication',async()=>{
 const f=await editing(),d=approve(f),validated=gate();f.hooks.inspect=()=>validated.promise;
 const pending=f.api.chooseImage('edit',{name:'pending-synthetic.png'});
 assert.equal(d.reviewedFingerprint,'');assert.equal(f.node('editReviewed').checked,false);
 assert.equal(f.node('editPreviewBtn').disabled,true);assert.equal(f.node('editRequest').disabled,true);
 await f.api.renderPreview('edit');await f.api.request('edit');
 assert.equal(f.node('newsPreview').open,false);assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);assert.equal(f.counts.fingerprint,0);
 validated.resolve();await pending;assert.equal(d.image.name,'pending-synthetic.png');
 assert.equal(f.node('editPreviewBtn').disabled,false);assert.equal(f.node('editRequest').disabled,false);assert.equal(d.reviewedFingerprint,'');
});

test('explicit image removal cancels old validation without restoring its image or unlocking a newer selection',async()=>{
 const f=await editing(),a=f.api.drafts.edit,old=gate(),latest=gate();f.hooks.inspect=file=>file.name==='old-a.png'?old.promise:latest.promise;
 a.image={name:'prior-a.png'};a.imageName='prior-a.png';f.node('editImageFile').value='synthetic-old-a-file';
 const previous=f.api.chooseImage('edit',{name:'old-a.png'});assert.equal(await f.api.navigate(editTarget('b')),false);
 await f.api.removeImage();assert.equal(a.image,null);assert.equal(a.imageName,'');assert.equal(a.removeImage,true);assert.equal(f.node('editImageFile').value,'');
 assert.equal(f.journal.get(a.id).removeImage,true);assert.equal(await f.api.navigate(editTarget('b')),true);const b=f.api.drafts.edit;
 assert.equal(f.node('editPreviewBtn').disabled,false);
 const current=f.api.chooseImage('edit',{name:'new-b.png'});old.resolve();await previous;
 assert.equal(a.image,null);assert.equal(a.removeImage,true);assert.equal(b.image,null);assert.equal(f.node('editPreviewBtn').disabled,true);assert.equal(f.node('editRequest').disabled,true);
 await f.api.request('edit');assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);
 latest.resolve();await current;assert.equal(b.image.name,'new-b.png');assert.equal(f.node('editPreviewBtn').disabled,false);assert.equal(f.node('editRequest').disabled,false);
});

test('typing during image validation preserves both the selected file and the edited body',async()=>{
 const f=await editing(),d=f.api.drafts.edit,validated=gate();f.hooks.inspect=()=>validated.promise;
 const pending=f.api.chooseImage('edit',{name:'synthetic-with-body.png'});
 f.node('editBodyEn').value='Synthetic English edit during image validation';f.api.dirty('edit');
 validated.resolve();await pending;
 assert.equal(d.image.name,'synthetic-with-body.png');assert.equal(d.record.body.en,'Synthetic English edit during image validation');
 const saved=f.journal.get(d.id);assert.equal(saved.image.name,'synthetic-with-body.png');assert.equal(saved.record.body.en,'Synthetic English edit during image validation');
 assert.equal(d.reviewedFingerprint,'');assert.equal(f.node('editReviewed').checked,false);assert.equal(f.counts.publish,0);
});

test('a failed image validation releases navigation for an explicit retry without changing another article',async()=>{
 const f=await editing(),a=f.api.drafts.edit,validated=gate(),epoch=f.api.state().routeEpoch;f.hooks.inspect=()=>validated.promise;
 f.node('editImageFile').value='synthetic-invalid-file';const pending=f.api.chooseImage('edit',{name:'invalid.png'});
 assert.equal(await f.api.navigate(editTarget('b')),false);assert.equal(f.api.state().routeEpoch,epoch);
 validated.reject(new CmsError('IMAGE'));await assert.rejects(pending,{code:'IMAGE'});
 assert.equal(f.node('editImageFile').value,'');assert.equal(a.image,null);assert.equal(f.node('editPreviewBtn').disabled,false);
 assert.equal(await f.api.navigate(editTarget('b')),true);assert.equal(f.api.drafts.edit.sourceId,'b');assert.equal(f.api.drafts.edit.image,null);assert.equal(f.counts.publish,0);
});

test('pending image validation alone guards page unload until the draft is durably saved',async()=>{
 const f=await editing(),validated=gate();f.hooks.inspect=()=>validated.promise;
 const pending=f.api.chooseImage('edit',{name:'synthetic-before-unload.png'});let prevented=false;
 const event={preventDefault(){prevented=true;}};f.api.beforeUnload(event);assert.equal(prevented,true);assert.equal(event.returnValue,'');
 validated.resolve();await pending;await f.api.preserveCurrent();prevented=false;
 f.api.beforeUnload({preventDefault(){prevented=true;}});assert.equal(prevented,false);
});

test('the newest image selection wins when image validations finish out of order',async()=>{
 const f=await editing(),old=gate(),latest=gate();approve(f);f.hooks.inspect=file=>file.name==='old.png'?old.promise:latest.promise;
 const older=f.api.chooseImage('edit',{name:'old.png'}),newer=f.api.chooseImage('edit',{name:'new.png'});
 latest.resolve();await newer;old.resolve();await older;
 assert.equal(f.api.drafts.edit.image.name,'new.png');assert.equal(f.api.drafts.edit.imageName,'new.png');
 assert.equal(f.api.drafts.edit.reviewedFingerprint,'');assert.equal(f.node('editReviewed').checked,false);
 assert.equal(f.counts.put,1);assert.equal(f.journal.get(f.api.drafts.edit.id).image.name,'new.png');
});

test('a stale failed image selection does not clear the newer file input or saved image',async()=>{
 const f=await editing(),old=gate();f.hooks.inspect=file=>file.name==='old.png'?old.promise:Promise.resolve();
 const older=f.api.chooseImage('edit',{name:'old.png'});await f.api.chooseImage('edit',{name:'new.png'});
 f.node('editImageFile').value='synthetic-new-file-selection';old.reject(new CmsError('IMAGE'));
 await assert.rejects(older,{code:'IMAGE'});assert.equal(f.node('editImageFile').value,'synthetic-new-file-selection');assert.equal(f.api.drafts.edit.image.name,'new.png');
});

for(const state of ['idle','loading','error'])test(`publication is blocked while connection is ${state}`,async()=>{
 const f=await editing();approve(f);f.api.setConnectionState(state);
 await assert.rejects(f.api.request('edit'),{code:'AUTH'});assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);
});

for(const missing of ['token','checkbox','fingerprint','exact fingerprint'])test(`publication requires ${missing}`,async()=>{
 const f=await editing(),d=approve(f);
 if(missing==='token')f.api.configure({token:''});
 if(missing==='checkbox')f.node('editReviewed').checked=false;
 if(missing==='fingerprint')d.reviewedFingerprint='';
 if(missing==='exact fingerprint')d.reviewedFingerprint='different-fingerprint';
 await assert.rejects(f.api.request('edit'),{code:missing==='token'?'AUTH':'REVIEW'});
 assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);
});

for(const change of ['draft identity','route epoch','draft version','snapshot','connection'])test(`${change} changing during a request fingerprint blocks confirmation`,async()=>{
 const f=await editing(),d=approve(f),hashed=gate();f.hooks.fingerprint=()=>hashed.promise;
 const pending=f.api.request('edit');
 if(change==='draft identity')f.api.fill('edit',clone(d));
 if(change==='route epoch')f.api.configure({routeEpoch:f.api.state().routeEpoch+1});
 if(change==='draft version')f.api.draftVersions.set(d,f.api.version(d)+1);
 if(change==='snapshot')f.api.configure({snapshot:clone(f.api.state().snapshot)});
 if(change==='connection')f.api.setConnectionState('loading');
 hashed.resolve(digest(d));await assert.rejects(pending,{code:['snapshot','connection'].includes(change)?'AUTH':'REVIEW'});
 assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);assert.equal(f.counts.put,0);
});

test('canceling the target-named publication confirmation performs no save or publish',async()=>{
 const f=await editing(),d=approve(f);let prompt='';f.hooks.confirm=message=>{prompt=message;return false;};
 await f.api.request('edit');assert(prompt.includes(d.record.title.ja));assert(prompt.includes('公開GitHubブランチ'));
 assert.equal(f.counts.confirm,1);assert.equal(f.counts.put,0);assert.equal(f.counts.publish,0);
});

test('a current, checked, exact review can reach only the synthetic publisher after explicit confirmation',async()=>{
 const f=await editing();approve(f);f.hooks.confirm=()=>true;
 await f.api.request('edit');assert.equal(f.counts.confirm,1);assert.equal(f.counts.put,1);assert.equal(f.counts.publish,1);
 assert.equal(f.api.state().busy,false);assert.equal(f.node('newsPreview').open,false);
 assert.equal(f.node('editRequest').disabled,false);assert(f.node('adminStatus').textContent.includes('まだ公開していません'));
});

test('unchecking review immediately invalidates approval before a pending save finishes',async()=>{
 const f=await editing(),d=approve(f),saved=gate();f.hooks.put=()=>saved.promise;f.node('editReviewed').checked=false;
 const pending=f.api.review('edit');assert.equal(d.reviewedFingerprint,'');assert.equal(f.counts.fingerprint,0);
 saved.resolve();await pending;assert.equal(d.reviewedFingerprint,'');
});

test('an unchecked review cannot be reapproved by an older pending fingerprint',async()=>{
 const f=await editing(),d=approve(f),hashed=gate();f.hooks.fingerprint=()=>hashed.promise;
 const checking=f.api.review('edit');f.node('editReviewed').checked=false;await f.api.review('edit');
 assert.equal(d.reviewedFingerprint,'');hashed.resolve(digest(d));await checking;
 assert.equal(d.reviewedFingerprint,'');assert.equal(f.node('editReviewed').checked,false);
});

test('review rejects a fingerprint that was never shown in the preview',async()=>{
 const f=await editing(),d=approve(f);f.api.previewed.set('edit','older-preview');
 await assert.rejects(f.api.review('edit'),{code:'REVIEW'});assert.equal(f.node('editReviewed').checked,false);assert.equal(f.counts.publish,0);
});

for(const field of ['TitleJa','BodyEn','BodyZh','Category','Date','Featured'])test(`dirty ${field} invalidates the review and updates the draft version`,async()=>{
 const f=await editing(),d=approve(f),revision=f.api.version(d);
 if(field==='Featured')f.node('edit'+field).checked=true;else f.node('edit'+field).value='Synthetic changed value';
 f.api.dirty('edit');assert.equal(d.reviewedFingerprint,'');assert.equal(f.node('editReviewed').checked,false);
 assert.equal(f.api.version(d),revision+1);assert.equal(f.timers.size,1);assert.equal(f.counts.put,0);
 assert(f.events.some(event=>event.type==='fde:cms-dirty'&&event.detail.which==='edit'));
});

test('navigation during preview hashing prevents an obsolete preview opening',async()=>{
 const f=await editing(),hashed=gate();f.hooks.fingerprint=()=>hashed.promise;
 const pending=f.api.renderPreview('edit');assert.equal(await f.api.navigate(actions),true);
 hashed.resolve('synthetic-preview-digest');await pending;assert.equal(f.node('newsPreview').open,false);assert.equal(f.api.previewed.has('edit'),false);
});

function attachFaq(f){
 const calls=[],info={mode:'create',title:'Synthetic FAQ question',operation:'create'};
 const hooks={preserve:null,prepare:null,busy:false};
 f.window.FDE_CMS_FAQ={isBusy:()=>hooks.busy,routeInfo:()=>info,
  async preserve(){calls.push('preserve');if(hooks.preserve)await hooks.preserve();},
  async prepareRoute(target){calls.push(['prepare',plain(target)]);if(hooks.prepare)await hooks.prepare(target);}};
 return {calls,info,hooks};
}
const faqEditor={section:'faq',screen:'editor',mode:'create'};
test('News to FAQ persists News once and announces the FAQ mode and title',async()=>{
 const f=await editing(),faq=attachFaq(f);f.node('editBodyJa').value='Synthetic unsaved News';f.api.dirty('edit');
 const count=f.counts.put;assert.equal(await f.api.navigate(faqEditor),true);
 assert.equal(f.counts.put,count+1);assert.equal(f.journal.get(f.api.drafts.edit.id).record.body.ja,'Synthetic unsaved News');
 assert.equal(faq.calls.length,1);assert.equal(faq.calls[0][0],'prepare');
 assert.equal(f.api.state().mode,'edit');assert.equal(f.api.state().route.mode,'create');
 const event=f.events.filter(x=>x.type==='fde:cms-route').at(-1);assert.equal(event.detail.title,faq.info.title);assert.equal(event.detail.operation,'create');
});
test('leaving FAQ awaits its own durable save before opening a News editor',async()=>{
 const f=await editing(),faq=attachFaq(f);await f.api.navigate(faqEditor);faq.calls.length=0;
 const saved=gate();faq.hooks.preserve=()=>saved.promise;const count=f.counts.put;
 const pending=f.api.navigate(editTarget('b'));assert.equal(f.api.state().route.section,'faq');assert.equal(f.api.state().navigating,true);
 assert.deepEqual(faq.calls,['preserve']);assert.equal(f.counts.put,count);
 saved.resolve();assert.equal(await pending,true);assert.equal(f.api.drafts.edit.sourceId,'b');assert.equal(f.api.state().route.section,'news');
});
test('FAQ save failure blocks navigation and retains the current route',async()=>{
 const f=await editing(),faq=attachFaq(f);await f.api.navigate(faqEditor);const route=plain(f.api.state().route);
 f.node('faqPreview').open=true;f.node('faqPreviewStatus').hidden=true;
 faq.hooks.preserve=()=>{throw new CmsError('STORAGE');};assert.equal(await f.api.navigate(editTarget('b')),false);
 assert.deepEqual(plain(f.api.state().route),route);assert.equal(f.api.drafts.edit.sourceId,'a');assert.equal(f.node('adminStatus').textContent,'STORAGE');
 assert.equal(f.node('faqPreview').open,true);assert.equal(f.node('faqPreviewStatus').textContent,'STORAGE');assert.equal(f.node('faqPreviewStatus').hidden,false);
});
test('FAQ draft restoration delegates exclusively to the FAQ controller',async()=>{
 const f=await editing(),faq=attachFaq(f);const count=f.counts.list;
 const target={section:'faq',screen:'editor',draftId:'synthetic-faq-draft'};assert.equal(await f.api.navigate(target),true);
 assert.equal(faq.calls[0][1].draftId,target.draftId);assert.equal(f.counts.list,count+1,'only the preceding News save refreshes its list');
 faq.calls.length=0;const nextCount=f.counts.list;assert.equal(await f.api.navigate({section:'faq',screen:'drafts'}),true);
 assert.deepEqual(faq.calls[0],'preserve');assert.equal(faq.calls[1][1].screen,'drafts');assert.equal(f.counts.list,nextCount);
});
test('FAQ publication lock blocks navigation, News submission, translation and reconnection',async()=>{
 const f=await editing(),faq=attachFaq(f);approve(f);faq.hooks.busy=true;const epoch=f.api.state().routeEpoch;
 assert.equal(await f.api.navigate(actions),false);await f.api.request('edit');await f.api.translate('edit');await f.api.connect();
 assert.equal(f.api.state().routeEpoch,epoch);assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);assert.equal(faq.calls.length,0);
});
test('FAQ initialization failure keeps the previous editor and refuses editing',async()=>{
 const f=await editing();const draft=f.api.drafts.edit;assert.equal(await f.api.navigate(faqEditor),false);
 assert.equal(f.api.state().route.section,'news');assert.equal(f.api.drafts.edit,draft);assert.equal(f.node('adminStatus').textContent,'INVALID');
});
test('connection notifications contain state only, never the transient credential',async()=>{
 const f=fixture();f.api.configure({token:'synthetic-credential-never-persisted'});f.api.setConnectionState('error');
 const event=f.events.filter(x=>x.type==='fde:cms-connection').at(-1);assert.deepEqual(plain(event.detail),{state:'error'});
 assert(!JSON.stringify(f.events).includes('synthetic-credential-never-persisted'));
});
