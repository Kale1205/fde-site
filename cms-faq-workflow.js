import {CmsError,NewsPublisher,sha256,errorText} from './cms-news-workflow.js?v=20261016-232449';
import {renderFaqPage} from './faq-renderer.js?v=20261016-232449';

export {CmsError};

export const FAQ_SOURCE='content/faq-content.json',FAQ_POLICY='content/faq-policy-additions.json';
const LANGS=['ja','en','zh-CN'],PAGES=[['contact.html','en'],['ja/contact.html','ja'],['zh/contact.html','zh-CN']];
const FILES=new Set([FAQ_SOURCE,...PAGES.map(([path])=>path),'sitemap-lastmod.json','sitemap.xml']);
const RECORD_FIELDS=['id','category','subcategory','highFrequency','translationStatus'];
const REQUEST_FIELDS=['fingerprint','baseSha','baseContentSha','basePolicySha','createdAt','branch','actor','commitSha','branchReady','prNumber','prUrl'];
const copy=value=>structuredClone(value),json=value=>JSON.stringify(value,null,2)+'\n';
const isSha=value=>/^[a-f0-9]{40}$/.test(value||''),isDigest=value=>/^[a-f0-9]{64}$/.test(value||'');
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fail=code=>{throw new CmsError(code);};
const normalizeCache=text=>text.replace(/(\.(?:js|css)\?v=)\d{8}-\d{6}/g,'$1BUILD');

export function faqErrorText(error){
 const messages={INCOMPLETE:'日英中すべての質問・回答と、正しいカテゴリ・検索語を確認してください。',INVALID:'FAQデータを検証できません。公開依頼を停止しました。入力は保持しています。',CONFLICT:'FAQ本体または参照ポリシーが更新されています。上書きしていません。下書きを保持し、最新内容と比較してください。',NO_CHANGES:'公開内容との差分がありません。公開依頼は作成していません。'};
 return messages[error?.code]?`${error?.status?`HTTP ${error.status}：`:''}${messages[error.code]}`:errorText(error);
}

export function newFaqDraft(record=null,baseContentSha='',basePolicySha=''){
 const id=crypto.randomUUID(),sourceId=record?.id||`cms-faq-${id}`;
 return {kind:'faq',schemaVersion:1,id,revision:0,operation:record?'edit':'create',sourceFile:FAQ_SOURCE,sourceId,baseContentSha,basePolicySha,
  record:copy(record||{id:sourceId,category:'',subcategory:'',highFrequency:false,question:{ja:'',en:'','zh-CN':''},answer:{ja:'',en:'','zh-CN':''},keywords:{ja:[],en:[],'zh-CN':[]},synonyms:{ja:[],en:[],'zh-CN':[]},translationStatus:'ja-en-zh-reviewed'}),
  updatedAt:new Date().toISOString(),reviewedFingerprint:'',request:null};
}

export function persistedFaqDraft(d){
 const out=Object.fromEntries(['kind','schemaVersion','id','revision','operation','sourceFile','sourceId','baseContentSha','basePolicySha','updatedAt','reviewedFingerprint'].filter(key=>typeof d[key]===(['schemaVersion','revision'].includes(key)?'number':'string')).map(key=>[key,d[key]]));
 const record=object(d.record)?d.record:{};
 out.record=Object.fromEntries(RECORD_FIELDS.filter(key=>typeof record[key]===(key==='highFrequency'?'boolean':'string')).map(key=>[key,record[key]]));
 for(const field of ['question','answer','keywords','synonyms'])out.record[field]=Object.fromEntries(LANGS.filter(locale=>object(record[field])&&(['question','answer'].includes(field)?typeof record[field][locale]==='string':Array.isArray(record[field][locale])&&record[field][locale].every(value=>typeof value==='string'))).map(locale=>[locale,record[field][locale]]));
 out.request=object(d.request)?Object.fromEntries(REQUEST_FIELDS.filter(key=>typeof d.request[key]===(key==='prNumber'?'number':key==='branchReady'?'boolean':'string')).map(key=>[key,d.request[key]])):null;
 return copy(out);
}

function validateDraft(d){
 if(d.kind!=='faq'||d.schemaVersion!==1||!/^[a-f0-9-]{36}$/.test(d.id||'')||!Number.isInteger(d.revision)||d.revision<0||d.sourceFile!==FAQ_SOURCE||!['create','edit','delete'].includes(d.operation)||d.record?.id!==d.sourceId||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(d.sourceId||''))fail('INVALID');
 if(d.operation==='create'&&d.sourceId!==`cms-faq-${d.id}`)fail('INVALID');
}

export class FaqDraftStore {
 constructor(indexedDB=globalThis.indexedDB){this.factory=indexedDB;this.db=null;}
 async open(){
  if(this.db)return this.db;if(!this.factory)fail('STORAGE');
  this.db=await new Promise((resolve,reject)=>{const r=this.factory.open('baked-kale-cms-faq-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new CmsError('STORAGE'));r.onblocked=()=>reject(new CmsError('STORAGE'));}).catch(()=>fail('STORAGE'));return this.db;
 }
 async list(){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))));r.onerror=()=>reject(new CmsError('STORAGE'));}).catch(()=>fail('STORAGE'));}
 async put(value){
  const d=persistedFaqDraft(value);validateDraft(d);const db=await this.open();let failure=null;
  return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(d.id);r.onsuccess=()=>{if((r.result?.revision||0)!==d.revision){failure=new CmsError('LOCAL_CONFLICT');tx.abort();return;}d.revision++;store.put(d);};tx.oncomplete=()=>resolve(d);tx.onerror=()=>reject(failure||new CmsError('STORAGE'));tx.onabort=()=>reject(failure||new CmsError('STORAGE'));}).catch(e=>{throw e instanceof CmsError?e:new CmsError('STORAGE');});
 }
}

function fingerprintText(d){
 const value=persistedFaqDraft(d);
 return JSON.stringify({kind:value.kind,schemaVersion:value.schemaVersion,id:value.id,operation:value.operation,sourceFile:value.sourceFile,sourceId:value.sourceId,baseContentSha:value.baseContentSha,basePolicySha:value.basePolicySha,record:value.record});
}
export async function faqFingerprint(d){return sha256(fingerprintText(d));}

function validateRecord(record,content){
 if(!object(record)||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(record.id||'')||typeof record.highFrequency!=='boolean'||!content.categories?.[record.category]||content.subcategories?.[record.subcategory]?.category!==record.category)fail('INCOMPLETE');
 for(const locale of LANGS){
  for(const [field,max] of [['question',1200],['answer',7000]])if(typeof record[field]?.[locale]!=='string'||!record[field][locale].trim()||record[field][locale].length>max)fail('INCOMPLETE');
  for(const field of ['keywords','synonyms'])if(!Array.isArray(record[field]?.[locale])||record[field][locale].some(value=>typeof value!=='string'))fail('INCOMPLETE');
 }
}

function validateSources(content,policy){
 if(!object(content)||content.version!==3||!Array.isArray(content.locales)||LANGS.some(locale=>!content.locales.includes(locale))||!object(content.categories)||!object(content.subcategories)||!Array.isArray(content.faq)||!object(policy)||!Array.isArray(policy.faq))fail('INVALID');
 const ids=new Set();for(const record of [...content.faq,...policy.faq]){try{validateRecord(record,content);}catch{fail('INVALID');}if(ids.has(record.id))fail('INVALID');ids.add(record.id);}
}

export function applyFaqDraft(content,policy,d){
 validateDraft(d);validateSources(content,policy);
 const result=copy(content),index=result.faq.findIndex(record=>record.id===d.sourceId);
 if(policy.faq.some(record=>record.id===d.sourceId))fail('CONFLICT');
 if(d.operation==='create'&&index>=0||d.operation!=='create'&&index<0)fail('CONFLICT');
 validateRecord(persistedFaqDraft(d).record,result);
 if(d.operation==='delete'){result.faq.splice(index,1);return result;}
 const safe=persistedFaqDraft(d).record,old=index>=0?result.faq[index]:{},record={...old,...safe};
 for(const field of ['question','answer','keywords','synonyms'])record[field]={...old[field],...safe[field]};
 validateRecord(record,result);
 if(d.operation==='create')result.faq.push(record);else result.faq[index]=record;
 validateSources(result,policy);return result;
}

function updateFaqSitemap(xml,manifest,changed,date){
 if(!object(manifest))fail('INVALID');let output=xml;const next={...manifest};
 for(const path of changed){
  if(!PAGES.some(([file])=>file===path)||!(path in manifest))fail('INVALID');next[path]=date;let count=0;
  output=output.replace(/(<url>\s*<loc>)([^<]+)(<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/g,(all,a,url,b,c)=>url===`https://kale1205.github.io/fde-site/${path}`?(count++,a+url+b+date+c):all);
  if(count!==1)fail('INVALID');
 }
 return {xml:output,manifest:json(next)};
}

// Reuse the proven transport, without invoking News snapshots, stores or writes.
export class FaqPublisher {
 constructor({fetch,persist=async()=>fail('STORAGE'),now=()=>new Date().toISOString()}={}){this.transport=new NewsPublisher({fetch});this.persist=persist;this.now=now;this.pending=new Map();}
 api(...args){return this.transport.api(...args);}
 file(...args){return this.transport.file(...args);}
 findPR(...args){return this.transport.findPR(...args);}
 status(...args){return this.transport.status(...args);}
 async snapshot(token){
  const ref=await this.api('/git/ref/heads/main',token),sha=ref.object?.sha;if(!isSha(sha))fail('INVALID');
  const source=await this.file(FAQ_SOURCE,sha,token),reference=await this.file(FAQ_POLICY,sha,token);
  try{const content=JSON.parse(source.text),policy=JSON.parse(reference.text);validateSources(content,policy);if(!isSha(source.sha)||!isSha(reference.sha))fail('INVALID');return {sha,contentSha:source.sha,policySha:reference.sha,content,policy};}catch(e){throw e instanceof CmsError?e:new CmsError('INVALID');}
 }
 async guard(live,digest){const text=fingerprintText(live);if(live.reviewedFingerprint!==digest||await sha256(text)!==digest||live.reviewedFingerprint!==digest||fingerprintText(live)!==text)fail('REQUEST_CHANGED');return text;}
 async save(d,live,digest){
  await this.guard(live,digest);const nextRevision=d.revision+1,saved=await Promise.resolve().then(()=>this.persist(persistedFaqDraft(d))).catch(e=>{throw e instanceof CmsError?e:new CmsError('STORAGE');});
  if(saved?.id!==d.id||saved.revision!==nextRevision||saved.reviewedFingerprint!==digest||await faqFingerprint(saved)!==digest||JSON.stringify(saved.request)!==JSON.stringify(d.request))fail('STORAGE');
  d.revision=saved.revision;live.revision=saved.revision;live.request=copy(d.request);await this.guard(live,digest);
 }
 async publish(live,token){
  const approved=persistedFaqDraft(live);validateDraft(approved);const digest=await faqFingerprint(approved);
  if(!token)fail('AUTH');if(approved.reviewedFingerprint!==digest)fail('REVIEW');await this.guard(live,digest);
  const pending=this.pending.get(approved.id);if(pending){if(pending.digest!==digest)fail('REQUEST_CHANGED');if(pending.token!==token)fail('AUTH');return pending.promise;}
  const promise=this.perform(approved,live,token,digest).finally(()=>this.pending.delete(approved.id));this.pending.set(approved.id,{digest,token,promise});return promise;
 }
 validateRequest(d,tx,digest,user){
  if(tx.fingerprint!==digest)fail('REQUEST_CHANGED');if(tx.actor!==user.login)fail('AUTH');
  if(tx.branch!==`cms/faq-${d.id}-${digest.slice(0,12)}`||!isSha(tx.baseSha)||tx.baseContentSha!==d.baseContentSha||tx.basePolicySha!==d.basePolicySha||tx.commitSha&&!isSha(tx.commitSha)||tx.prNumber!==undefined&&(!Number.isSafeInteger(tx.prNumber)||tx.prNumber<1)||!Number.isFinite(Date.parse(tx.createdAt))||!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(tx.createdAt))fail('INVALID');
 }
 async verifyBranch(tx,head,token){
  if(head===tx.commitSha)return;if(!isSha(head)||!isSha(tx.commitSha))fail('CONFLICT');
  const comparison=await this.api(`/compare/${tx.commitSha}...${head}`,token);
  if(comparison.status!=='ahead'||!Array.isArray(comparison.files)||comparison.files.length>40)fail('CONFLICT');
  for(const file of comparison.files){
   if(!/^(?:build-version\.txt|(?:contact-config|cms-admin|cms-news-workflow|news-renderer|cms-faq-workflow|faq-admin-safe)\.js|(?:ja\/|zh\/)?(?:index|license|demo|goals|news|contact|order|customer|cms-admin)\.html)$/.test(file.filename))fail('CONFLICT');
   const a=await this.file(file.filename,tx.commitSha,token),b=await this.file(file.filename,head,token);
   if(file.filename==='build-version.txt'){if(!/^\d{8}-\d{6}\n$/.test(a.text)||!/^\d{8}-\d{6}\n$/.test(b.text))fail('CONFLICT');}
   else if(normalizeCache(a.text)!==normalizeCache(b.text))fail('CONFLICT');
  }
 }
 async existing(d,live,token,digest){
  const tx=d.request,pr=tx.prNumber?await this.api(`/pulls/${tx.prNumber}`,token):await this.findPR(tx.branch,token);if(!pr){if(tx.prNumber)fail('CONFLICT');return null;}
  if(!isSha(tx.commitSha)||pr.head?.ref!==tx.branch||pr.head?.repo?.full_name!=='Kale1205/fde-site'||pr.base?.ref!=='main'||!Number.isSafeInteger(pr.number)||pr.number<1)fail('CONFLICT');
  await this.verifyBranch(tx,pr.head.sha,token);
  await this.guard(live,digest);tx.prNumber=pr.number;tx.prUrl=`https://github.com/Kale1205/fde-site/pull/${pr.number}`;await this.save(d,live,digest);return {pr,branch:tx.branch};
 }
 async build(d,snapshot,token){
  const content=applyFaqDraft(snapshot.content,snapshot.policy,d),text=json(content);
  if(text===json(snapshot.content))fail('NO_CHANGES');
  const files={[FAQ_SOURCE]:{text}},changed=[];
  for(const [path,locale] of PAGES){
   const current=await this.file(path,snapshot.sha,token);let baseline,next;
   try{baseline=renderFaqPage(current.text,snapshot.content,snapshot.policy,locale);}catch{fail('INVALID');}
   if(baseline!==current.text)fail('CONFLICT');
   try{next=renderFaqPage(current.text,content,snapshot.policy,locale);}catch{fail('INVALID');}
   if(next!==current.text){files[path]={text:next};changed.push(path);}
  }
  if(changed.length){const manifest=await this.file('sitemap-lastmod.json',snapshot.sha,token),xml=await this.file('sitemap.xml',snapshot.sha,token);let updated;try{updated=updateFaqSitemap(xml.text,JSON.parse(manifest.text),changed,d.request.createdAt.slice(0,10));}catch(e){throw e instanceof CmsError?e:new CmsError('INVALID');}if(updated.manifest!==manifest.text)files['sitemap-lastmod.json']={text:updated.manifest};if(updated.xml!==xml.text)files['sitemap.xml']={text:updated.xml};}
  if(Object.keys(files).some(path=>!FILES.has(path)))fail('INVALID');return files;
 }
 async perform(d,live,token,digest){
  if(d.request&&d.request.fingerprint!==digest)fail('REQUEST_CHANGED');
  if(!isSha(d.baseContentSha)||!isSha(d.basePolicySha))fail('CONFLICT');
  const user=await this.api('/user',token);if(!/^[\w-]+$/.test(user.login||'')||!Number.isSafeInteger(user.id)||user.id<1)fail('AUTH');
  if(d.request){this.validateRequest(d,d.request,digest,user);const known=await this.existing(d,live,token,digest);if(known)return known;}
  const snapshot=await this.snapshot(token);if(snapshot.contentSha!==d.baseContentSha||snapshot.policySha!==d.basePolicySha)fail('CONFLICT');
  if(!d.request)d.request={fingerprint:digest,baseSha:snapshot.sha,baseContentSha:d.baseContentSha,basePolicySha:d.basePolicySha,createdAt:this.now(),branch:`cms/faq-${d.id}-${digest.slice(0,12)}`,actor:user.login};
  this.validateRequest(d,d.request,digest,user);
  // A retry always rebuilds from the journal's original parent, never a new main.
  let base=snapshot;
  if(d.request.baseSha!==snapshot.sha){const source=await this.file(FAQ_SOURCE,d.request.baseSha,token),reference=await this.file(FAQ_POLICY,d.request.baseSha,token);try{base={sha:d.request.baseSha,contentSha:source.sha,policySha:reference.sha,content:JSON.parse(source.text),policy:JSON.parse(reference.text)};}catch{fail('INVALID');}if(base.contentSha!==d.baseContentSha||base.policySha!==d.basePolicySha)fail('CONFLICT');}
  const files=await this.build(d,base,token);await this.save(d,live,digest);
  const known=await this.existing(d,live,token,digest);if(known)return known;
  const tx=d.request,post=async(path,body)=>{const checked=await this.guard(live,digest);if(live.reviewedFingerprint!==digest||fingerprintText(live)!==checked)fail('REQUEST_CHANGED');return this.api(path,token,{method:'POST',body:JSON.stringify(body)});},tree=[];
  for(const [path,file] of Object.entries(files)){const blob=await post('/git/blobs',{content:file.text,encoding:'utf-8'});if(!isSha(blob.sha))fail('INVALID');tree.push({path,mode:'100644',type:'blob',sha:blob.sha});}
  const parent=await this.api(`/git/commits/${tx.baseSha}`,token);if(!isSha(parent.tree?.sha))fail('INVALID');
  const built=await post('/git/trees',{base_tree:parent.tree.sha,tree});if(!isSha(built.sha))fail('INVALID');
  const identity={name:user.login,email:`${user.id}+${user.login}@users.noreply.github.com`,date:tx.createdAt};
  const commit=await post('/git/commits',{message:`CMS FAQ ${d.id} ${digest}`,tree:built.sha,parents:[tx.baseSha],author:identity,committer:identity});if(!isSha(commit.sha))fail('INVALID');
  if(tx.commitSha&&tx.commitSha!==commit.sha)fail('CONFLICT');tx.commitSha=commit.sha;await this.save(d,live,digest);
  try{await post('/git/refs',{ref:`refs/heads/${tx.branch}`,sha:tx.commitSha});}catch(e){if(['REQUEST_CHANGED','STORAGE','LOCAL_CONFLICT'].includes(e.code))throw e;const current=await this.api(`/git/ref/heads/${tx.branch}`,token).catch(()=>{throw e;});await this.verifyBranch(tx,current.object?.sha,token);}
  tx.branchReady=true;await this.save(d,live,digest);
  let existing=await this.existing(d,live,token,digest);if(existing)return existing;
  try{const operation={create:'新規',edit:'編集',delete:'削除'}[d.operation],pr=await post('/pulls',{head:tx.branch,base:'main',title:`FAQ［${operation}］: ${d.record.question.ja}`.slice(0,180),body:`CMS FAQ公開依頼 ${d.id}\n操作：${operation}\n対象：${d.sourceId}\n\n確認済みの1件だけを変更します。日英中の静的FAQとsitemapを同じ変更に含めます。\nmain保護を維持し、検査通過と本人承認後にのみマージしてください。CMSはマージ・自動承認を行いません。`,draft:false});if(pr.head?.sha!==tx.commitSha||pr.head?.ref!==tx.branch||pr.base?.ref!=='main'||!Number.isSafeInteger(pr.number)||pr.number<1)fail('INVALID');tx.prNumber=pr.number;tx.prUrl=`https://github.com/Kale1205/fde-site/pull/${pr.number}`;await this.save(d,live,digest);return {pr,branch:tx.branch};}
  catch(e){if(['REQUEST_CHANGED','STORAGE','LOCAL_CONFLICT'].includes(e.code))throw e;existing=await this.existing(d,live,token,digest).catch(error=>{if(error.code==='PERMISSION')return null;throw error;});if(existing)return existing;if(e.code==='PERMISSION')return {branch:tx.branch,manual:true,compareUrl:`https://github.com/Kale1205/fde-site/compare/main...${encodeURIComponent(tx.branch)}?expand=1`};throw e;}
 }
}
