import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {newFaqDraft,persistedFaqDraft,faqFingerprint} from '../cms-faq-workflow.js';

const source=readFileSync(new URL('../faq-admin-safe.js',import.meta.url),'utf8');
const startup='// Build synchronously: the presentation module runs after this module loads.';
assert(source.includes(startup),'Identify startup before evaluating the controller in isolation.');
const runtime=source.slice(0,source.indexOf(startup)).replace(/^import[^\n]+\n/,'');
const listenerStart="document.addEventListener('fde:cms-faq-read'";
const listeners=source.slice(source.indexOf(listenerStart),source.lastIndexOf('safe(refreshDraftList)();'));
assert(listeners.startsWith(listenerStart),'Use the real connection and unload event handlers.');
const locales=['ja','en','zh-CN'],suffixes={ja:'Ja',en:'En','zh-CN':'Zh'};
const clone=value=>structuredClone(value),plain=value=>JSON.parse(JSON.stringify(value));
const gate=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
class SyntheticError extends Error{constructor(code){super(code);this.code=code;}}
const record=id=>({id,category:'product',subcategory:'license',highFrequency:false,translationStatus:'reviewed',
 question:Object.fromEntries(locales.map(locale=>[locale,`Synthetic question ${id} ${locale}`])),
 answer:Object.fromEntries(locales.map(locale=>[locale,`Synthetic answer ${id} ${locale}`])),
 keywords:Object.fromEntries(locales.map(locale=>[locale,[`keyword-${id}-${locale}`]])),
 synonyms:Object.fromEntries(locales.map(locale=>[locale,[`synonym-${id}-${locale}`]]))});
const snapshot=()=>({sha:'a'.repeat(40),contentSha:'b'.repeat(40),policySha:'c'.repeat(40),
 content:{version:3,locales,categories:{product:{order:1,label:{ja:'製品',en:'Product'}}},subcategories:{license:{category:'product',label:{ja:'ライセンス',en:'License'}}},faq:[record('a'),record('b')]},
 policy:{faq:[record('policy-only')]}});

// The unchanged controller runs against memory-only synthetic dependencies. No
// real credential, browser, IndexedDB, network or production draft is accessed.
function fixture({connected=true}={}){
 const nodes=new Map(),events=[],timers=new Map(),journal=new Map(),documentListeners=new Map(),windowListeners=new Map();
 const counts={put:0,list:0,snapshot:0,publish:0,confirm:0,translate:0,fingerprint:0};
 const hooks={put:null,list:null,snapshot:null,publish:null,confirm:null,translate:null,fingerprint:null};
 let sequence=0,navigating=false,route={section:null,screen:'menu'};
 function element(tag='div'){
  const handlers=new Map();let id='';
  return {tagName:tag.toUpperCase(),value:'',checked:false,disabled:false,hidden:false,dataset:{},children:[],options:[],_text:'',open:false,style:{},
   get id(){return id;},set id(value){id=value;nodes.set(value,this);},
   get textContent(){return this._text+this.children.map(child=>typeof child==='string'?child:child.textContent||'').join('');},
   set textContent(value){this._text=String(value);this.children=[];},
   append(...children){this.children.push(...children);},replaceChildren(...children){this._text='';this.children=children;if(this.tagName==='SELECT'){this.options=[...children];this.value=children[0]?.value||'';}},
   add(option){this.options.push(option);},setAttribute(name,value){this[name]=String(value);},
   addEventListener(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn);},
   async emit(name,event={}){for(const fn of handlers.get(name)||[])await fn(event);},
   querySelectorAll(selector){return selector.includes('input')?controls():[];},
   focus(){this.focused=true;},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;},click(){}
  };
 }
 const node=(id,tag='div')=>{if(!nodes.has(id)){const el=element(tag);el.id=id;}return nodes.get(id);};
 const controls=()=>[...nodes.values()].filter(el=>['INPUT','TEXTAREA','SELECT','BUTTON'].includes(el.tagName));
 for(const id of ['adminTabs','faqPanel','faqDraftBar','faqStats','adminStatus','faqPreviewStatus','faqPreviewTarget','faqPreview','faqPreviewContent','faqPreviewActions','faqDraftOperation','faqPublicationResult','faqSearchTermsPreview','faqCreateCard','faqManageCard'])node(id);
 for(const id of ['token','editFaqTarget','faqLocalDrafts'])node(id,id==='token'?'input':'select');
 for(const id of ['deleteFaqBtn','cancelFaqDeleteBtn','bulkTranslateFaqBtn','closeFaqPreview','faqPreviewStep1','faqPreviewStep2','faqPreviewStep3','faqPreviewStep4'])node(id,'button');
 for(const which of ['create','edit']){
  const p=which==='create'?'faqCreate':'faqEdit';
  for(const locale of locales)for(const field of ['Q','A'])node(p+field+suffixes[locale],field==='Q'?'input':'textarea');
  for(const field of ['Category','Subcategory'])node(p+field,'select');
  for(const field of ['Frequent','Reviewed'])node(p+field,'input');
  for(const field of ['PreviewBtn','Translate','Request'])node(p+field,'button');
  node(p+'ReviewActions');
 }
 const shell=element();shell.dataset={cmsSection:'',cmsScreen:'menu'};
 const document={body:element(),getElementById:id=>nodes.get(id),createElement:element,
  querySelector:selector=>selector.includes('admin-shell')?shell:null,querySelectorAll:selector=>selector==='input,textarea,select,button'?controls():[],
  dispatchEvent:event=>{events.push(event);for(const fn of documentListeners.get(event.type)||[])fn(event);},
  addEventListener(name,fn){if(!documentListeners.has(name))documentListeners.set(name,[]);documentListeners.get(name).push(fn);}};
 class MemoryStore{
  async put(value){counts.put++;if(hooks.put)await hooks.put(value);const old=journal.get(value.id);if((old?.revision||0)!==value.revision)throw new SyntheticError('LOCAL_CONFLICT');const saved=clone({...value,revision:value.revision+1});journal.set(saved.id,saved);return saved;}
  async list(){counts.list++;if(hooks.list)return hooks.list();return clone([...journal.values()]);}
 }
 class MemoryPublisher{
  async snapshot(credential){counts.snapshot++;return hooks.snapshot?hooks.snapshot(credential):snapshot();}
  async publish(d,credential){counts.publish++;return hooks.publish?hooks.publish(d,credential):{pr:{number:123}};}
 }
 const window={FDE_CMS_LOCKED:()=>navigating,FDE_NEWS_TRANSLATE:async(...args)=>{counts.translate++;return hooks.translate?hooks.translate(...args):{title:'Synthetic translated question',body:'Synthetic translated answer'};},
  addEventListener(name,fn){if(!windowListeners.has(name))windowListeners.set(name,[]);windowListeners.get(name).push(fn);}};
 const context={document,window,newFaqDraft,persistedFaqDraft,FaqDraftStore:MemoryStore,FaqPublisher:MemoryPublisher,faqErrorText:e=>e.code||e.message,
  faqFingerprint:async d=>{counts.fingerprint++;return hooks.fingerprint?hooks.fingerprint(d):faqFingerprint(d);},
  confirm:message=>{counts.confirm++;return hooks.confirm?hooks.confirm(message):false;},
  Option:class{constructor(textContent,value){Object.assign(this,{textContent,value,dataset:{}});}},CustomEvent:class{constructor(type,options){Object.assign(this,{type},options);}},
  URL:{createObjectURL:()=>`blob:synthetic-${++sequence}`,revokeObjectURL(){}},Blob,
  setTimeout:callback=>{const id=++sequence;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);vm.runInContext(runtime+`\nglobalThis.testApi={drafts,editDrafts,previewed,unsavedDrafts,capture,fill,dirty,save,persist,preserve,prepareRoute,routeInfo,refresh,refreshDraftList,renderPreview,review,request,translate,remove,cancelDelete,validDraft,syncControls,version,safe,
 state:()=>({mode,snapshot,epoch,connectionEpoch,busy,pendingSaves,connectionState,connectionToken,refreshTask}),
 configure:values=>{if('snapshot'in values)snapshot=values.snapshot;if('connectionState'in values)connectionState=values.connectionState;if('connectionToken'in values)connectionToken=values.connectionToken;if('epoch'in values)epoch=values.epoch;if('connectionEpoch'in values)connectionEpoch=values.connectionEpoch;}};\n`+listeners,context);
 const api=context.testApi;
 api.fill('create',api.drafts.create);node('faqPanel').dataset.faqState=connected?'loaded':'idle';node('faqDraftBar').dataset.draftState='loaded';
 node('token').value=connected?'synthetic-only':'';
 api.configure({snapshot:connected?snapshot():null,connectionState:connected?'connected':'idle',connectionToken:connected?'synthetic-only':''});
 async function navigate(target){
  if(navigating||api.state().busy)return false;navigating=true;
  try{if(route.section==='faq')await api.preserve();if(target.section==='faq')await api.prepareRoute(target);route={...target};shell.dataset.cmsSection=target.section||'';shell.dataset.cmsScreen=target.screen;return true;}
  catch(error){node('adminStatus').textContent=error.code||error.message;return false;}
  finally{navigating=false;api.syncControls();}
 }
 window.FDE_CMS_NAVIGATE=navigate;
 return {api,node,nodes,shell,events,timers,journal,counts,hooks,navigate,route:()=>plain(route),
  async connection(state){for(const fn of documentListeners.get('fde:cms-connection')||[])await fn({detail:{state}});await api.state().refreshTask?.promise;},
  async tokenInput(){await node('token').emit('input');},
  unload(){const event={preventDefault(){this.prevented=true;}};for(const fn of windowListeners.get('beforeunload')||[])fn(event);return event;}};
}
const target=id=>({section:'faq',screen:'editor',articleId:id});
const actions={section:'faq',screen:'actions'},menu={section:null,screen:'menu'};
async function editing(id='a'){const f=fixture();assert.equal(await f.navigate(target(id)),true);return f;}
async function reviewed(f,which='edit'){await f.api.renderPreview(which);f.node((which==='create'?'faqCreate':'faqEdit')+'Reviewed').checked=true;await f.api.review(which);return f.api.drafts[which];}

test('three-language edits and search metadata survive A to B to A in the same cached draft',async()=>{
 const f=await editing(),a=f.api.drafts.edit,search=clone({keywords:a.record.keywords,synonyms:a.record.synonyms});
 for(const locale of locales)for(const field of ['Q','A'])f.node('faqEdit'+field+suffixes[locale]).value=`Edited A ${field} ${locale}`;
 f.node('faqEditFrequent').checked=true;f.api.dirty('edit');assert.equal(await f.navigate(target('b')),true);const b=f.api.drafts.edit;
 f.node('faqEditQJa').value='Edited B question';assert.equal(await f.navigate(target('a')),true);
 assert.equal(f.api.drafts.edit,a);assert.equal(f.api.editDrafts.get('a'),a);assert.equal(f.api.editDrafts.get('b'),b);
 for(const locale of locales)for(const field of ['Q','A'])assert.equal(f.node('faqEdit'+field+suffixes[locale]).value,`Edited A ${field} ${locale}`);
 assert.equal(a.record.highFrequency,true);assert.deepEqual(plain({keywords:a.record.keywords,synonyms:a.record.synonyms}),plain(search));
 assert.equal(f.journal.get(b.id).record.question.ja,'Edited B question');assert.equal(f.counts.publish,0);
});

for(const [field,value] of [['Category','product'],['Subcategory','license'],['Frequent',true]])test(`${field}-only new draft survives immediate navigation and a fresh draft`,async()=>{
 const f=fixture({connected:false});await f.navigate({section:'faq',screen:'editor',mode:'create'});const d=f.api.drafts.create;
 if(field==='Frequent')f.node('faqCreate'+field).checked=value;else f.node('faqCreate'+field).value=value;
 f.api.dirty('create');assert.equal(f.timers.size,1);assert.equal(await f.navigate(actions),true);assert.equal(f.timers.size,0);
 assert.equal(f.journal.get(d.id).record[field==='Frequent'?'highFrequency':field.toLowerCase()],value);
 await f.navigate({section:'faq',screen:'editor',mode:'create',fresh:true});assert.notEqual(f.api.drafts.create.id,d.id);await f.navigate(menu);assert.equal(f.journal.size,1);
});

test('untouched new drafts do not accumulate local drafts',async()=>{
 const f=fixture({connected:false});for(let i=0;i<3;i++){assert.equal(await f.navigate({section:'faq',screen:'editor',mode:'create',fresh:true}),true);assert.equal(await f.navigate(menu),true);}
 assert.equal(f.journal.size,0);assert.equal(f.counts.put,0);
});

test('a created FAQ is locally saved with the same ID and all languages before any publication',async()=>{
 const f=fixture({connected:false});await f.navigate({section:'faq',screen:'editor',mode:'create'});const d=f.api.drafts.create;
 for(const locale of locales)for(const field of ['Q','A'])f.node('faqCreate'+field+suffixes[locale]).value=`New ${field} ${locale}`;
 f.api.dirty('create');await f.api.save('create');assert.equal(f.journal.get(d.id).sourceId,`cms-faq-${d.id}`);
 assert.equal(f.journal.get(d.id).kind,'faq');assert.equal(f.journal.get(d.id).sourceFile,'content/faq-content.json');assert.equal(f.journal.get(d.id).operation,'create');
 for(const locale of locales){assert.equal(f.journal.get(d.id).record.question[locale],`New Q ${locale}`);assert.equal(f.journal.get(d.id).record.answer[locale],`New A ${locale}`);}
 assert.equal(f.counts.publish,0);assert.equal(f.counts.confirm,0);
});

test('connecting binds an offline create draft without replacing its input or identity',async()=>{
 const f=fixture({connected:false});await f.navigate({section:'faq',screen:'editor',mode:'create'});const d=f.api.drafts.create;f.node('faqCreateQJa').value='Offline synthetic question';f.api.dirty('create');await f.api.save('create');
 f.node('token').value='synthetic-only';await f.connection('connected');assert.equal(f.api.drafts.create,d);assert.equal(f.node('faqCreateQJa').value,'Offline synthetic question');assert.equal(d.baseContentSha,'b'.repeat(40));assert.equal(d.basePolicySha,'c'.repeat(40));assert.equal(f.journal.get(d.id).record.question.ja,'Offline synthetic question');assert.equal(f.counts.publish,0);
});

for(const code of ['STORAGE','LOCAL_CONFLICT'])test(`${code} keeps the current route, input and unsaved marker when preservation fails`,async()=>{
 const f=await editing(),route=f.route(),d=f.api.drafts.edit;f.node('faqEditAEn').value='Unsaved synthetic English answer';f.api.dirty('edit');f.hooks.put=async()=>{throw new SyntheticError(code);};
 assert.equal(await f.navigate(target('b')),false);assert.deepEqual(f.route(),route);assert.equal(f.api.drafts.edit,d);assert.equal(f.node('faqEditAEn').value,'Unsaved synthetic English answer');
 assert.equal(f.api.state().pendingSaves,0);assert.equal(f.node('faqEditAEn').disabled,false);assert.equal(f.unload().prevented,true);assert.equal(f.counts.publish,0);
});

test('a restored edit retains the source selector, record cache and publication journal',async()=>{
 const f=await editing(),saved=newFaqDraft(record('b'),'b'.repeat(40),'c'.repeat(40));saved.record.answer.en='Restored synthetic answer';saved.request={branch:'cms/synthetic-restored',branchReady:true};f.journal.set(saved.id,clone(saved));
 assert.equal(await f.navigate({section:'faq',screen:'editor',draftId:saved.id}),true);const d=f.api.drafts.edit;assert.equal(d.id,saved.id);assert.equal(f.node('editFaqTarget').value,'b');assert.equal(f.api.editDrafts.get('b'),d);
 assert.equal(await f.navigate(target('a')),true);assert.equal(await f.navigate(target('b')),true);assert.equal(f.api.drafts.edit,d);assert.equal(f.node('faqEditAEn').value,'Restored synthetic answer');assert(f.node('faqPublicationResult').textContent.includes('cms/synthetic-restored'));
});

test('a separately managed policy FAQ cannot be opened for editing through its ID',async()=>{
 const f=await editing(),d=f.api.drafts.edit;assert.equal(await f.navigate(target('policy-only')),false);assert.equal(f.api.drafts.edit,d);assert.equal(f.node('adminStatus').textContent,'CONFLICT');assert.equal(f.counts.publish,0);
});

for(const mutate of [d=>{d.kind='news';},d=>{d.sourceFile='content/site-content.json';},d=>{d.record.id='other';},d=>{delete d.record.answer.en;},d=>{d.record.keywords.en=[42];},d=>{d.basePolicySha='';}])test('foreign or malformed stored drafts cannot enter the FAQ editor: '+mutate.toString(),async()=>{
 const f=await editing(),d=newFaqDraft(record('b'),'b'.repeat(40),'c'.repeat(40));mutate(d);f.journal.set(d.id,clone(d));const before=f.api.drafts.edit;
 assert.equal(await f.navigate({section:'faq',screen:'editor',draftId:d.id}),false);assert.equal(f.api.drafts.edit,before);assert.equal(f.node('adminStatus').textContent,'INVALID');assert.equal(f.counts.publish,0);
});

test('invalid local drafts are omitted from the chooser without discarding valid FAQ drafts',async()=>{
 const f=fixture(),good=newFaqDraft(record('a'),'b'.repeat(40),'c'.repeat(40)),bad={...clone(good),id:'invalid',kind:'news'};f.journal.set(good.id,good);f.journal.set(bad.id,bad);await f.api.refreshDraftList();
 assert.deepEqual(f.node('faqLocalDrafts').options.map(option=>option.value),['',good.id]);assert.equal(f.node('faqLocalDrafts').dataset.draftState,'loaded');
});

for(const badDate of [undefined,42,'invalid','2026-02-30T00:00:00.000Z','2026-10-16T00:00:00Z'])test(`one malformed updatedAt (${badDate}) cannot hide a valid local draft`,async()=>{
 const f=fixture(),good=newFaqDraft(record('a'),'b'.repeat(40),'c'.repeat(40)),bad=newFaqDraft(record('b'),'b'.repeat(40),'c'.repeat(40));
 if(badDate===undefined)delete bad.updatedAt;else bad.updatedAt=badDate;
 f.journal.set(good.id,good);f.journal.set(bad.id,bad);await f.api.refreshDraftList();
 assert.deepEqual(f.node('faqLocalDrafts').options.map(option=>option.value),['',good.id]);assert.equal(f.node('faqLocalDrafts').dataset.draftState,'loaded');assert.equal(f.journal.size,2,'malformed data must not be repaired or deleted');
});

test('preview shows all three languages and search terms without publishing or checking review',async()=>{
 const f=await editing();await f.api.renderPreview('edit');const text=f.node('faqPreviewContent').textContent;
 assert(text.includes('カテゴリ：製品 / ライセンス'));assert(!text.includes('カテゴリ：product'));assert(!text.includes(' / license'));assert(text.includes('対象ID：a'));
 for(const locale of locales){assert(text.includes(`Synthetic question a ${locale}`));assert(text.includes(`Synthetic answer a ${locale}`));assert(text.includes(`keyword-a-${locale}`));assert(text.includes(`synonym-a-${locale}`));}
 assert.equal(f.node('faqPreview').open,true);assert.equal(f.node('faqEditReviewed').checked,false);assert.equal(f.counts.publish,0);
});

test('named delete confirmation creates only a local reversible delete draft',async()=>{
 const f=await editing(),d=f.api.drafts.edit;let prompt='';f.hooks.confirm=message=>{prompt=message;return false;};await f.api.remove();assert.equal(d.operation,'edit');assert.equal(f.counts.put,0);
 f.hooks.confirm=message=>{prompt=message;return true;};await f.api.remove();assert(prompt.includes(d.record.question.ja));assert(prompt.includes(d.sourceId));assert.equal(d.operation,'delete');assert.equal(f.journal.get(d.id).operation,'delete');assert.equal(f.counts.publish,0);
 await f.api.renderPreview('edit');assert(f.node('faqPreviewContent').textContent.includes('削除対象'));await f.api.cancelDelete();assert.equal(d.operation,'edit');assert.equal(f.journal.get(d.id).operation,'edit');assert.equal(f.counts.publish,0);
});

for(const blank of ['question','answer','both'])test(`translation fills only blank English ${blank}, preserving Chinese and all search terms`,async()=>{
 const f=await editing(),d=f.api.drafts.edit;if(blank!=='answer')f.node('faqEditQEn').value='';if(blank!=='question')f.node('faqEditAEn').value='';
 const before=clone(d.record);await f.api.translate('edit');
 assert.equal(d.record.question.en,blank==='answer'?before.question.en:'Synthetic translated question');assert.equal(d.record.answer.en,blank==='question'?before.answer.en:'Synthetic translated answer');
 assert.equal(d.record.question['zh-CN'],before.question['zh-CN']);assert.equal(d.record.answer['zh-CN'],before.answer['zh-CN']);assert.deepEqual(plain(d.record.keywords),plain(before.keywords));assert.deepEqual(plain(d.record.synonyms),plain(before.synonyms));assert.equal(f.counts.translate,1);assert.equal(f.counts.publish,0);
});

test('complete English avoids a translation call',async()=>{const f=await editing();await f.api.translate('edit');assert.equal(f.counts.translate,0);assert.equal(f.counts.put,0);});

test('a changed input during translation prevents stale translated text from overwriting it',async()=>{
 const f=await editing(),g=gate();f.node('faqEditQEn').value='';f.hooks.translate=()=>g.promise;const work=f.api.translate('edit');assert.equal(f.api.state().busy,true);f.node('faqEditQEn').value='New manually typed synthetic English';g.resolve({title:'Old translated question',body:'Old translated answer'});await work;
 assert.equal(f.node('faqEditQEn').value,'New manually typed synthetic English');assert.equal(f.api.state().busy,false);assert.equal(f.counts.put,0);assert.equal(f.counts.publish,0);
});

test('a translation failure keeps input and a pending draft available to navigation',async()=>{
 const f=await editing();f.node('faqEditQEn').value='';f.node('faqEditAJa').value='Synthetic answer before translation failure';f.api.dirty('edit');f.hooks.translate=()=>{throw new SyntheticError('TRANSLATION');};
 assert.equal(await f.api.safe(()=>f.api.translate('edit'))(),false);assert.equal(f.node('faqEditQEn').value,'');assert.equal(f.node('faqEditAJa').value,'Synthetic answer before translation failure');assert.equal(f.api.state().busy,false);assert.equal(f.unload().prevented,true);
 assert.equal(await f.navigate(menu),true);assert.equal(f.journal.get(f.api.drafts.edit.id).record.answer.ja,'Synthetic answer before translation failure');assert.equal(f.counts.publish,0);
});

test('checking review stores the exact preview fingerprint and typing invalidates it immediately',async()=>{
 const f=await editing(),d=await reviewed(f);assert.equal(d.reviewedFingerprint,await faqFingerprint(d));f.node('faqEditQJa').value='Changed after review';f.api.dirty('edit');assert.equal(d.reviewedFingerprint,'');assert.equal(f.node('faqEditReviewed').checked,false);assert.equal(f.api.previewed.has('edit'),false);assert.equal(f.counts.publish,0);
});

test('unchecking review invalidates approval before an asynchronous local save finishes',async()=>{
 const f=await editing(),d=await reviewed(f),g=gate();f.hooks.put=()=>g.promise;f.node('faqEditReviewed').checked=false;const work=f.api.review('edit');assert.equal(d.reviewedFingerprint,'');f.hooks.confirm=()=>true;
 await assert.rejects(f.api.request('edit'),{code:'REVIEW'});assert.equal(f.counts.publish,0);g.resolve();await work;
});

test('editing during fingerprint calculation cannot approve a stale preview',async()=>{
 const f=await editing();await f.api.renderPreview('edit');const g=gate();f.hooks.fingerprint=async d=>{const digest=await faqFingerprint(d);await g.promise;return digest;};f.node('faqEditReviewed').checked=true;const work=f.api.review('edit');f.node('faqEditAJa').value='Changed during fingerprint';f.api.dirty('edit');g.resolve();await work;
 assert.equal(f.api.drafts.edit.reviewedFingerprint,'');assert.equal(f.node('faqEditReviewed').checked,false);assert.equal(f.counts.publish,0);
});

test('navigation advances the epoch and prevents an old preview from opening over another FAQ',async()=>{
 const f=await editing(),g=gate();f.hooks.fingerprint=async d=>{const digest=await faqFingerprint(d);await g.promise;return digest;};const work=f.api.renderPreview('edit');assert.equal(await f.navigate(target('b')),true);g.resolve();await work;
 assert.equal(f.api.drafts.edit.sourceId,'b');assert.equal(f.node('faqPreview').open,false);assert.equal(f.api.previewed.has('edit'),false);
});

test('even failed navigation invalidates an older asynchronous preview without losing current input',async()=>{
 const f=await editing(),d=f.api.drafts.edit,g=gate();f.node('faqEditAJa').value='Retained despite failed navigation';f.hooks.fingerprint=async value=>{const digest=await faqFingerprint(value);await g.promise;return digest;};const work=f.api.renderPreview('edit');f.hooks.put=()=>{throw new SyntheticError('STORAGE');};
 assert.equal(await f.navigate(target('b')),false);g.resolve();await work;assert.equal(f.api.drafts.edit,d);assert.equal(f.node('faqEditAJa').value,'Retained despite failed navigation');assert.equal(f.node('faqPreview').open,false);assert.equal(f.counts.publish,0);
});

test('restoring a previously reviewed draft requires a fresh preview and checkbox approval',async()=>{
 const f=await editing(),d=await reviewed(f);assert.equal(await f.navigate(menu),true);assert.equal(await f.navigate({section:'faq',screen:'editor',draftId:d.id}),true);
 assert.equal(f.api.drafts.edit.reviewedFingerprint,'');assert.equal(f.node('faqEditReviewed').checked,false);assert.equal(f.api.previewed.has('edit'),false);await f.api.renderPreview('edit');await assert.rejects(f.api.request('edit'),{code:'REVIEW'});assert.equal(f.counts.publish,0);
});

test('dismissing final confirmation sends no request and leaves the reviewed draft local',async()=>{
 const f=await editing(),d=await reviewed(f),puts=f.counts.put;await f.api.request('edit');assert.equal(f.counts.confirm,1);assert.equal(f.counts.publish,0);assert.equal(f.counts.put,puts);assert.equal(f.node('faqPreview').open,true);assert.equal(d.reviewedFingerprint,await faqFingerprint(d));
});

for(const missing of ['checkbox','reviewed-fingerprint','current-preview','changed-record'])test(`missing exact ${missing} evidence prevents request confirmation`,async()=>{
 const f=await editing(),d=await reviewed(f);f.hooks.confirm=()=>true;
 if(missing==='checkbox')f.node('faqEditReviewed').checked=false;
 if(missing==='reviewed-fingerprint')d.reviewedFingerprint='';
 if(missing==='current-preview')f.api.previewed.delete('edit');
 if(missing==='changed-record')f.node('faqEditAEn').value='Programmatically changed after review';
 await assert.rejects(f.api.request('edit'),{code:'REVIEW'});assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);
});

test('one explicit reviewed confirmation passes exactly the active FAQ draft to the publisher',async()=>{
 const f=await editing(),d=await reviewed(f);let sent;f.hooks.confirm=()=>true;f.hooks.publish=(value,credential)=>{sent={value,credential};return {pr:{number:123}};};await f.api.request('edit');
 assert.equal(sent.value,d);assert.equal(sent.credential,'synthetic-only');assert.equal(f.counts.publish,1);assert.equal(f.counts.confirm,1);assert.equal(f.node('faqPreview').open,false);assert.equal(f.api.state().busy,false);assert.equal(f.node('faqEditQJa').disabled,false);
});

test('a second request while publishing cannot create a duplicate controller call',async()=>{
 const f=await editing();await reviewed(f);const g=gate(),started=gate();f.hooks.confirm=()=>true;f.hooks.publish=()=>{started.resolve();return g.promise;};const work=f.api.request('edit');await started.promise;await f.api.request('edit');assert.equal(f.counts.publish,1);assert.equal(f.counts.confirm,1);g.resolve({pr:{number:123}});await work;
});

test('a publisher failure restores controls and retains the same reviewed draft for retry',async()=>{
 const f=await editing(),d=await reviewed(f);f.hooks.confirm=()=>true;f.hooks.publish=()=>{throw new SyntheticError('NETWORK');};await assert.rejects(f.api.request('edit'),{code:'NETWORK'});assert.equal(f.api.drafts.edit,d);assert.equal(f.node('faqPreview').open,true);assert.equal(f.api.state().busy,false);assert.equal(f.node('faqEditQJa').disabled,false);assert.equal(f.journal.get(d.id).reviewedFingerprint,await faqFingerprint(d));
});

test('safe request error status is visible inside the still-open confirmation dialog',async()=>{
 const f=await editing();await reviewed(f);f.hooks.confirm=()=>true;f.hooks.publish=()=>{throw new SyntheticError('NETWORK');};assert.equal(await f.api.safe(()=>f.api.request('edit'))(),false);
 assert.equal(f.node('faqPreview').open,true);assert.equal(f.node('adminStatus').hidden,false);assert.equal(f.node('faqPreviewStatus').hidden,false);assert.equal(f.node('faqPreviewStatus').textContent,'NETWORK');
});

for(const change of ['checkbox','record','epoch','identity','modal','mode'])test(`a ${change} change during the pre-publication save rejects the request`,async()=>{
 const f=await editing(),d=await reviewed(f),g=gate(),started=gate();f.hooks.confirm=()=>true;f.hooks.put=()=>{started.resolve();return g.promise;};const work=f.api.request('edit');await started.promise;
 if(change==='checkbox')f.node('faqEditReviewed').checked=false;
 if(change==='record'){f.node('faqEditAJa').value='Changed during save';f.api.capture('edit');f.api.dirty('edit');}
 if(change==='epoch')f.api.configure({epoch:f.api.state().epoch+1});
 if(change==='identity')f.api.drafts.edit=newFaqDraft(record('b'),'b'.repeat(40),'c'.repeat(40));
 if(change==='modal')f.node('faqPreview').close();
 if(change==='mode')f.shell.dataset.cmsSection='news';
 g.resolve();await assert.rejects(work,{code:'REVIEW'});assert.equal(f.counts.publish,0);assert.equal(f.api.state().busy,false);
});

for(const change of ['checkbox','epoch','identity','modal','mode','connection','reviewed-fingerprint'])test(`a ${change} change during the final fingerprint rejects publication`,async()=>{
 const f=await editing(),d=await reviewed(f),g=gate(),started=gate();let calls=0;f.hooks.confirm=()=>true;
 f.hooks.fingerprint=async value=>{const digest=await faqFingerprint(value);if(++calls===2){started.resolve();await g.promise;}return digest;};
 const work=f.api.request('edit');await started.promise;
 if(change==='checkbox')f.node('faqEditReviewed').checked=false;
 if(change==='epoch')f.api.configure({epoch:f.api.state().epoch+1});
 if(change==='identity')f.api.drafts.edit=newFaqDraft(record('b'),'b'.repeat(40),'c'.repeat(40));
 if(change==='modal')f.node('faqPreview').close();
 if(change==='mode')f.shell.dataset.cmsSection='news';
 if(change==='connection')f.node('token').value='changed-synthetic-only';
 if(change==='reviewed-fingerprint')d.reviewedFingerprint='';
 g.resolve();await assert.rejects(work,{code:'REVIEW'});assert.equal(f.counts.publish,0);assert.equal(f.api.state().busy,false);
});

for(const hidden of ['news','list','modal','wrong-modal'])test(`a hidden ${hidden} request is ignored before confirmation or publication`,async()=>{
 const f=await editing();await reviewed(f);f.hooks.confirm=()=>true;
 if(hidden==='news')f.shell.dataset.cmsSection='news';if(hidden==='list')f.shell.dataset.cmsScreen='list';if(hidden==='modal')f.node('faqPreview').close();if(hidden==='wrong-modal')f.node('faqPreview').dataset.which='create';
 await f.api.request('edit');assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);
});

for(const disconnect of ['state','token','snapshot','loading'])test(`missing ${disconnect} connection evidence rejects a request before confirmation`,async()=>{
 const f=await editing();await reviewed(f);f.hooks.confirm=()=>true;
 if(disconnect==='state')f.api.configure({connectionState:'error'});if(disconnect==='token')f.node('token').value='different-synthetic-only';if(disconnect==='snapshot')f.api.configure({snapshot:null});if(disconnect==='loading')f.node('faqPanel').dataset.faqState='loading';
 await assert.rejects(f.api.request('edit'),{code:'AUTH'});assert.equal(f.counts.confirm,0);assert.equal(f.counts.publish,0);
});

test('repeated same-state connection events do not refetch or discard the edited record',async()=>{
 const f=await editing(),d=f.api.drafts.edit;f.node('faqEditAJa').value='Unsaved during same connection';await f.connection('connected');await f.connection('connected');
 assert.equal(f.counts.snapshot,0);assert.equal(f.api.drafts.edit,d);assert.equal(f.node('faqEditAJa').value,'Unsaved during same connection');
});

test('a stale connection read cannot install its snapshot after token input resets the connection',async()=>{
 const f=fixture(),g=gate();f.hooks.snapshot=()=>g.promise;const work=f.api.refresh();f.node('token').value='replacement-synthetic-only';await f.tokenInput();g.resolve(snapshot());assert.equal(await work,false);assert.equal(f.api.state().snapshot,null);assert.equal(f.api.state().connectionState,'idle');assert.equal(f.node('faqPanel').dataset.faqState,'idle');
});
