import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CmsError,newDraft,persistedDraft,fingerprint,LANGS} from '../cms-news-workflow.js';
import {newBatch,enqueueDraft,removeQueuedDraft,batchFingerprint,persistedBatch} from '../cms-news-batch-workflow.js';

const source=readFileSync(new URL('../cms-admin.js',import.meta.url),'utf8');
const runtime=source.replace(/^import[^\n]+\n/gm,'').replace(/\nsafe\(init\)\(\);\s*$/,'');
const clone=value=>structuredClone(value);
const article=id=>({id,date:'2026-10-17',category:'Product',featured:false,image:'',link:'license.html',translationStatus:'seeded',title:{ja:`合成 ${id}`,en:`Synthetic ${id}`,'zh-CN':`合成中文 ${id}`},body:{ja:`合成本文 ${id}`,en:`Synthetic body ${id}`,'zh-CN':`合成中文正文 ${id}`}});
const gate=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

// The real UI functions run with isolated, synthetic memory stores and no init.
// This file never opens native IndexedDB, a profile, a network or a real draft.
function fixture(){
 const nodes=new Map(),draftJournal=new Map(),batchJournal=new Map(),events=[],timers=new Map();let timerId=0;
 const counts={singlePublish:0,batchPublish:0,confirm:0};const hooks={draftPut:null,batchPut:null,publish:null,confirm:()=>false};
 function element(tag='div'){
  const classes=new Set(),node={tagName:tag.toUpperCase(),value:'',checked:false,disabled:false,hidden:false,dataset:{},children:[],options:[],_text:'',open:false,listeners:{},
   get textContent(){return this._text+this.children.map(child=>typeof child==='string'?child:child.textContent||'').join('');},set textContent(value){this._text=String(value);this.children=[];},
   classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),toggle(value,force){const next=force??!classes.has(value);next?classes.add(value):classes.delete(value);return next;}},
   append(...children){this.children.push(...children);},replaceChildren(...children){this._text='';this.children=children;if(this.tagName==='SELECT'){this.options=children;this.value=children[0]?.value||'';}},
   add(option){this.options.push(option);},setAttribute(name,value){this[name]=String(value);},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},
   focus(){this.focused=true;},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;}
  };
  let id='';Object.defineProperty(node,'id',{get:()=>id,set:value=>{id=value;nodes.set(value,node);}});return node;
 }
 const node=(id,tag='div')=>{if(!nodes.has(id)){const value=element(tag);value.id=id;}return nodes.get(id);};
 for(const id of ['token','connectBtn','editNewsTarget','localDrafts','adminTabs','newsPanel','adminStatus','previewStatus','previewTarget','newsPreview','newsPreviewContent','newsPreviewActions','publicationResult','draftOperation','editCurrentImage','preview','uploaderCard','pendingBatches','pendingRows','pendingCount','pendingHint','batchPublicationResult','batchPreviewBtn','batchRequest','batchPreview','batchReviewed','batchPreviewContent','batchPreviewStatus','batchPreviewCount'])node(id,['editNewsTarget','localDrafts','pendingBatches'].includes(id)?'select':id==='batchReviewed'?'input':'div');
 for(const which of ['create','edit','media'])for(const suffix of ['Reviewed','Request','Preview','PreviewBtn','ReviewActions','ImageFile','TranslationNote','ReviewHint'])node(which+suffix,suffix==='Reviewed'?'input':'button');
 for(const which of ['create','edit']){for(const locale of ['Ja','En','Zh'])for(const field of ['Title','Body'])node(which+field+locale,'input');for(const suffix of ['Category','Date','Featured'])node(which+suffix,'input');}
 const shell=element(),faqTab=element('button');
 const document={getElementById:id=>nodes.get(id),createElement:element,dispatchEvent:event=>events.push(event),querySelector:selector=>selector.includes('admin-shell')?shell:faqTab,querySelectorAll:selector=>selector==='input,textarea,select,button'?[...nodes.values()].filter(value=>['INPUT','TEXTAREA','SELECT','BUTTON'].includes(value.tagName)):selector==='[data-cms-batch-action]'?[...nodes.values()].filter(value=>value.dataset.cmsBatchAction):[]};
 class MemoryDraftStore{
  async list(){return clone([...draftJournal.values()]);}
  async put(d){if(hooks.draftPut)await hooks.draftPut(d);const saved=persistedDraft(d);saved.revision++;draftJournal.set(saved.id,saved);return clone(saved);}
 }
 class MemoryBatchStore{
  async list(){return clone([...batchJournal.values()]);}
  async put(value){if(hooks.batchPut)await hooks.batchPut(value);const saved=persistedBatch(value);if((batchJournal.get(saved.id)?.revision||0)!==saved.revision)throw new CmsError('LOCAL_CONFLICT');saved.revision++;batchJournal.set(saved.id,saved);return clone(saved);}
  async enqueue(value,d){if([...batchJournal.values()].some(b=>b.request&&(b.request.snapshot||b.entries).some(item=>item.id===d.id)))throw new CmsError('REQUEST_CHANGED');const next=clone(value);await enqueueDraft(next,d);return this.put(next);}
 }
 class SyntheticPublisher{async publish(){counts.singlePublish++;return {pr:{number:991}};}}
 class SyntheticBatchPublisher{constructor({persist}){this.persist=persist;}async publish(value){counts.batchPublish++;if(hooks.publish)return hooks.publish(value,this);return {pr:{number:992}};}}
 const context={document,window:{},structuredClone,DraftStore:MemoryDraftStore,BatchStore:MemoryBatchStore,NewsPublisher:SyntheticPublisher,BatchPublisher:SyntheticBatchPublisher,CmsError,errorText:e=>e.code||e.message,newDraft,persistedDraft,fingerprint,LANGS,newBatch,batchFingerprint,removeQueuedDraft,
  inspectImage:async()=>({}),base64:()=>'',confirm:message=>{counts.confirm++;return hooks.confirm(message);},Option:class{constructor(textContent,value){Object.assign(this,{textContent,value,dataset:{}});}},CustomEvent:class{constructor(type,options){Object.assign(this,{type},options);}},
  URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)
 };
 vm.createContext(context);vm.runInContext(runtime+`\nglobalThis.api={navigate,capture,fill,dirty,renderPreview,review,request,enqueueCurrent,refreshBatch,previewBatch,reviewBatch,requestBatch,saveBatch,setConnectionState,drafts,previewed,state:()=>({batch,busy,route,connectionState}),configure:value=>{if(value.batch)batch=value.batch;if('token'in value)token=value.token;if(value.snapshot)snapshot=value.snapshot;}}`,context);
 const api=context.api,d=newDraft(article('a'),'a'.repeat(40));api.fill('edit',d);api.configure({snapshot:{contentSha:'a'.repeat(40),content:{news:[article('a'),article('b')]}},token:'synthetic-placeholder'});api.setConnectionState('connected');
 return {api,node,nodes,draftJournal,batchJournal,counts,hooks,events,timers};
}
async function approve(f){await f.api.renderPreview('edit');f.node('editReviewed').checked=true;await f.api.review('edit');return f.api.drafts.edit;}

test('News has no automatic translation button or API call, while FAQ shared hook remains',()=>{
 assert.doesNotMatch(source,/FDE_NEWS_TRANSLATE|which\+'Translate'|async function translate\(/);
 const view=readFileSync(new URL('../cms-admin-view.js',import.meta.url),'utf8');assert.match(view,/faq'\+cap\+'Translate'/);assert.match(view,/visible\(translationSettings,editor&&faq&&faqSafe\)/);
 const html=readFileSync(new URL('../cms-admin.html',import.meta.url),'utf8');assert.match(html,/news-translation-hook\.js/);assert.match(html,/faq-admin-safe\.js/);
});

test('Japanese change preserves English and Chinese, flags a review and invalidates prior confirmation',async()=>{
 const f=fixture(),d=await approve(f),en=d.record.body.en,zh=d.record.body['zh-CN'];f.node('editBodyJa').value='合成日本語の更新';f.api.dirty('edit',true);
 assert.equal(d.record.body.en,en);assert.equal(d.record.body['zh-CN'],zh);assert.equal(d.translationReviewRequired,true);assert.equal(d.reviewedFingerprint,'');assert.equal(f.node('editReviewed').checked,false);assert.match(f.node('editTranslationNote').textContent,/英語・中国語も見直し/);
 await f.api.renderPreview('edit');f.node('editReviewed').checked=true;await f.api.review('edit');assert.equal(d.translationReviewRequired,false);assert.equal(f.draftJournal.get(d.id).record.body.en,en);
});

test('an offline confirmed article enters local queue without a confirmation prompt or publication',async()=>{
 const f=fixture(),d=await approve(f);f.api.setConnectionState('idle');f.api.configure({token:''});await f.api.request('edit');
 assert.equal(f.api.state().batch.entries.length,1);assert.equal(f.api.state().batch.entries[0].id,d.id);assert.equal(f.api.state().route.screen,'pending');assert.equal(f.counts.confirm,0);assert.equal(f.counts.singlePublish,0);assert.equal(f.counts.batchPublish,0);assert.equal(f.node('pendingCount').textContent,'1件');
});

test('editing an original after queueing keeps the queued snapshot until an explicit reviewed update',async()=>{
 const f=fixture(),d=await approve(f);await f.api.enqueueCurrent('edit');const before=clone(f.api.state().batch.entries[0]);f.node('editBodyEn').value='Synthetic newer English';f.api.dirty('edit');await f.api.navigate({section:'news',screen:'pending'});
 assert.equal(f.api.state().batch.entries[0].record.body.en,before.record.body.en);assert.equal(d.reviewedFingerprint,'');assert.match(f.node('pendingRows').textContent,/未追加の変更/);
 await approve(f);await f.api.enqueueCurrent('edit');assert.equal(f.api.state().batch.entries.length,1);assert.equal(f.api.state().batch.entries[0].record.body.en,'Synthetic newer English');assert.equal(f.api.state().batch.reviewedFingerprint,'');
});

test('removing a queued item retains the original draft and invalidates batch confirmation',async()=>{
 const f=fixture(),d=await approve(f);await f.api.enqueueCurrent('edit');const batch=f.api.state().batch;batch.reviewedFingerprint=await batchFingerprint(batch);await f.api.saveBatch();await f.api.refreshBatch();
 await f.node(`pendingRemove-${d.id}`).listeners.click[0]();assert.equal(f.api.state().batch.entries.length,0);assert.equal(f.api.state().batch.reviewedFingerprint,'');assert(f.draftJournal.has(d.id));assert.equal(f.draftJournal.get(d.id).record.body.en,d.record.body.en);assert.equal(f.counts.batchPublish,0);
});

test('removing one of two queued articles releases the remaining edit and removal buttons',async()=>{
 const f=fixture(),first=await approve(f);await f.api.enqueueCurrent('edit');const second=newDraft(article('b'),'a'.repeat(40));f.api.fill('edit',second);await approve(f);await f.api.enqueueCurrent('edit');assert.equal(f.api.state().batch.entries.length,2);
 await f.node(`pendingRemove-${first.id}`).listeners.click[0]();assert.equal(f.api.state().batch.entries.length,1);assert.equal(f.node(`pendingEdit-${second.id}`).disabled,false);assert.equal(f.node(`pendingRemove-${second.id}`).disabled,false);assert(f.draftJournal.has(first.id));
});

test('the batch preview contains every queued locale and preserves the original image Blob',async()=>{
 const f=fixture(),d=f.api.drafts.edit;d.image=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])],{type:'image/png'});await approve(f);await f.api.enqueueCurrent('edit');await f.api.previewBatch();
 const text=f.node('batchPreviewContent').textContent;for(const locale of LANGS)assert(text.includes(d.record.title[locale])&&text.includes(d.record.body[locale]));assert.equal(f.node('batchPreview').open,true);assert.equal(f.api.state().batch.entries[0].image.size,d.image.size);assert.equal(f.node('batchPreviewCount').textContent,'1件の日英中・画像');
});

test('batch storage failure retains the original three-language draft and does not send',async()=>{
 const f=fixture(),d=await approve(f);f.hooks.batchPut=()=>{throw new CmsError('STORAGE');};await assert.rejects(f.api.enqueueCurrent('edit'),{code:'STORAGE'});
 assert(f.draftJournal.has(d.id));assert.equal(f.node('editBodyEn').value,d.record.body.en);assert.equal(f.node('editBodyZh').value,d.record.body['zh-CN']);assert.equal(f.api.state().busy,false);assert.equal(f.counts.batchPublish,0);
});

test('batch send requires preview and checked review; cancel creates no publication',async()=>{
 const f=fixture();await approve(f);await f.api.enqueueCurrent('edit');await assert.rejects(f.api.requestBatch(),{code:'REVIEW'});await f.api.previewBatch();f.node('batchReviewed').checked=true;await f.api.reviewBatch();await f.api.requestBatch();assert.equal(f.counts.confirm,1);assert.equal(f.counts.batchPublish,0);
});

test('a pending queue save disables inputs and blocks a second enqueue',async()=>{
 const f=fixture();await approve(f);const saved=gate(),entered=gate();f.hooks.batchPut=()=>{entered.resolve();return saved.promise;};const first=f.api.enqueueCurrent('edit');await entered.promise;assert.equal(f.api.state().busy,true);assert.equal(f.node('editBodyJa').disabled,true);await f.api.enqueueCurrent('edit');saved.resolve();await first;assert.equal(f.api.state().batch.entries.length,1);assert.equal(f.node('editBodyJa').disabled,false);
});

test('batch failure retains a frozen request, entered content and retry status',async()=>{
 const f=fixture();const d=await approve(f);await f.api.enqueueCurrent('edit');await f.api.previewBatch();f.node('batchReviewed').checked=true;await f.api.reviewBatch();f.hooks.confirm=()=>true;
 f.hooks.publish=async (value,publisher)=>{value.request={fingerprint:await batchFingerprint(value),branch:'cms/news-batch-synthetic',snapshot:clone(value.entries),branchReady:true};const saved=await publisher.persist(value);value.revision=saved.revision;throw new CmsError('NETWORK');};
 await assert.rejects(f.api.requestBatch(),{code:'NETWORK'});assert.equal(f.counts.batchPublish,1);assert.equal(f.node('editBodyEn').value,d.record.body.en);assert.equal(f.api.state().batch.request.snapshot.length,1);assert.match(f.node('batchPublicationResult').textContent,/同じ内容で再開/);assert.equal(f.node(`pendingRemove-${d.id}`).disabled,true);assert.equal(f.api.state().busy,false);
});
