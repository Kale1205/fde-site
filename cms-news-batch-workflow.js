import {NewsPublisher,CmsError,REPO,persistedDraft,fingerprint,sha256,inspectImage,base64,applyDraft,updateSitemap} from './cms-news-workflow.js?v=20261017-121639';
import {renderNewsPage} from './news-renderer.js?v=20261017-121639';

const CONTENT='content/site-content.json',NEWS=['news.html','ja/news.html','zh/news.html'];
const clone=value=>structuredClone(value),json=value=>JSON.stringify(value,null,2)+'\n';
const isId=value=>/^[a-f0-9-]{36}$/.test(value||''),isSha=value=>/^[a-f0-9]{40}$/.test(value||'');
const isDigest=value=>/^[a-f0-9]{64}$/.test(value||'');
const isPrError=value=>typeof value==='string'&&(/^(?:AUTH|PERMISSION|NETWORK|RATE_LIMIT|CONFLICT|INVALID|REQUEST_CHANGED)$/.test(value)||/^HTTP_[45]\d{2}$/.test(value));
const finished=tx=>['closed','merged'].includes(tx?.prState);
const articleKeys=entries=>new Set(entries.filter(d=>d.operation!=='create').map(d=>d.sourceId));
const cleanError=tx=>{for(const key of ['prErrorStage','prErrorCode','prErrorStatus'])delete tx[key];};
const fail=code=>{throw new CmsError(code);};
const entryKey=d=>d.operation==='create'?`create:${d.id}`:`article:${d.sourceId}`;

export function newBatch(){return {id:crypto.randomUUID(),revision:0,entries:[],reviewedFingerprint:'',request:null,updatedAt:new Date().toISOString()};}

function entriesValid(entries,{reviewed=false}={}){
 if(!Array.isArray(entries))fail('INVALID');
 const ids=new Set(),articles=new Set(),bases=new Set();
 for(const d of entries){
  if(!d||!isId(d.id)||ids.has(d.id)||!['create','edit','delete'].includes(d.operation)||d.request||!d.record||!Number.isInteger(d.revision)||d.revision<0)fail('INVALID');
  if(d.operation!=='create'&&(typeof d.sourceId!=='string'||!d.sourceId))fail('INVALID');
  if(d.baseContentSha&&!isSha(d.baseContentSha))fail('INVALID');
  if(d.operation!=='create'&&!d.baseContentSha)fail('CONFLICT');
  if(reviewed&&!isDigest(d.reviewedFingerprint))fail('REVIEW');
  const key=entryKey(d);if(articles.has(key))fail('BATCH_CONFLICT');
  ids.add(d.id);articles.add(key);if(d.baseContentSha)bases.add(d.baseContentSha);
 }
 if(bases.size>1)fail('BATCH_CONFLICT');
}

// Draft objects, their Blob images, and all original locale strings are copied.
// Removing or replacing a queue entry never mutates the original DraftStore.
export function persistedBatch(value){
 const b=Object.fromEntries(['id','revision','reviewedFingerprint','updatedAt'].filter(k=>k in value).map(k=>[k,value[k]]));
 b.entries=(value.entries||[]).map(persistedDraft);
 b.request=null;
 if(value.request){
  b.request=Object.fromEntries(['fingerprint','baseSha','baseContentSha','createdAt','branch','actor','commitSha','prUrl'].filter(k=>typeof value.request[k]==='string').map(k=>[k,value.request[k]]));
  if(typeof value.request.branchReady==='boolean')b.request.branchReady=value.request.branchReady;
  if(Number.isSafeInteger(value.request.prNumber)&&value.request.prNumber>0)b.request.prNumber=value.request.prNumber;
  if(['open','closed','merged'].includes(value.request.prState))b.request.prState=value.request.prState;
  if(['create','lookup','branch'].includes(value.request.prErrorStage))b.request.prErrorStage=value.request.prErrorStage;
  if(isPrError(value.request.prErrorCode))b.request.prErrorCode=value.request.prErrorCode;
  if(Number.isInteger(value.request.prErrorStatus)&&value.request.prErrorStatus>=400&&value.request.prErrorStatus<=599)b.request.prErrorStatus=value.request.prErrorStatus;
  b.request.snapshot=(value.request.snapshot||[]).map(persistedDraft);
 }
 return clone(b);
}

export async function batchFingerprint(batch){
 entriesValid(batch.entries);
 return sha256(JSON.stringify(await Promise.all(batch.entries.map(async d=>({id:d.id,fingerprint:await fingerprint(d)})))));
}

export async function enqueueDraft(batch,value){
 if(batch.request||value.request)fail('REQUEST_CHANGED');
 entriesValid(batch.entries);
 const d=persistedDraft(value);
 entriesValid([d],{reviewed:true});
 if(d.reviewedFingerprint!==await fingerprint(d))fail('REVIEW');
 if(d.operation!=='delete')applyDraft({news:d.operation==='create'?[]:[{...d.record,id:d.sourceId}]},d,'',{allowEmpty:true});
 const next=batch.entries.map(persistedDraft),index=next.findIndex(item=>entryKey(item)===entryKey(d));
 if(index>=0&&next[index].operation!==d.operation)fail('BATCH_CONFLICT');
 if(index>=0)next[index]=d;else next.push(d);
 entriesValid(next,{reviewed:true});
 const before=await batchFingerprint(batch),after=await batchFingerprint({entries:next});
 batch.entries=next;if(before!==after)batch.reviewedFingerprint='';batch.updatedAt=new Date().toISOString();
 return batch;
}

export function removeQueuedDraft(batch,draftId){
 if(batch.request)fail('REQUEST_CHANGED');
 const index=batch.entries.findIndex(d=>d.id===draftId);
 if(index>=0){batch.entries.splice(index,1);batch.reviewedFingerprint='';batch.updatedAt=new Date().toISOString();}
 return batch;
}

export function applyBatch(content,batch,imagePaths={}){
 const entries=batch.request?.snapshot||batch.entries;entriesValid(entries);
 let result=clone(content);
 for(const d of entries)result=applyDraft(result,d,imagePaths[d.id]||'',{allowEmpty:true});
 return result;
}

export class BatchStore {
 constructor(indexedDB=globalThis.indexedDB){this.factory=indexedDB;this.db=null;}
 async open(){
  if(this.db)return this.db;if(!this.factory)fail('STORAGE');
  this.db=await new Promise((resolve,reject)=>{const r=this.factory.open('baked-kale-cms-news-batches',1);r.onupgradeneeded=()=>r.result.createObjectStore('batches',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new CmsError('STORAGE'));r.onblocked=()=>reject(new CmsError('STORAGE'));}).catch(()=>{throw new CmsError('STORAGE');});
  return this.db;
 }
 async list(){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('batches').objectStore('batches').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));r.onerror=()=>reject(new CmsError('STORAGE'));}).catch(()=>{throw new CmsError('STORAGE');});}
 async put(value){
  const b=persistedBatch(value),db=await this.open();let failure;
  if(!isId(b.id)||!Number.isInteger(b.revision)||b.revision<0)fail('INVALID');entriesValid(b.entries);
  if(b.request){
   if(!isDigest(b.request.fingerprint)||b.request.fingerprint!==await batchFingerprint(b)||b.request.fingerprint!==await batchFingerprint({entries:b.request.snapshot}))fail('REQUEST_CHANGED');
  }
  return new Promise((resolve,reject)=>{const tx=db.transaction('batches','readwrite'),store=tx.objectStore('batches'),r=store.getAll();r.onsuccess=()=>{
   const stored=r.result.find(item=>item.id===b.id);
   if((stored?.revision||0)!==b.revision){failure=new CmsError('LOCAL_CONFLICT');tx.abort();return;}
   if(stored?.request&&(!b.request||['fingerprint','baseSha','baseContentSha','createdAt','branch','actor'].some(key=>stored.request[key]!==b.request[key])||['commitSha','prNumber','prUrl'].some(key=>stored.request[key]&&stored.request[key]!==b.request[key])||stored.request.branchReady&&!b.request.branchReady)){
    failure=new CmsError('REQUEST_CHANGED');tx.abort();return;
   }
   if(b.request){
    const claimed=new Set(b.request.snapshot.map(d=>d.id)),articles=articleKeys(b.request.snapshot);
    if(r.result.some(item=>item.id!==b.id&&item.request&&(item.request.snapshot||item.entries).some(d=>claimed.has(d.id)))){failure=new CmsError('REQUEST_CHANGED');tx.abort();return;}
    if(!finished(b.request)&&r.result.some(item=>item.id!==b.id&&item.request&&!finished(item.request)&&(item.request.snapshot||item.entries).some(d=>d.operation!=='create'&&articles.has(d.sourceId)))){failure=new CmsError('BATCH_CONFLICT');tx.abort();return;}
   }
   b.revision++;store.put(b);
  };tx.oncomplete=()=>resolve(b);tx.onerror=()=>reject(failure||new CmsError('STORAGE'));tx.onabort=()=>reject(failure||new CmsError('STORAGE'));}).catch(e=>{throw e instanceof CmsError?e:new CmsError('STORAGE');});
 }
 async enqueue(batch,draft){
  const history=await this.list();
  if(history.some(b=>b.request&&(b.request.snapshot||b.entries).some(d=>d.id===draft.id)))fail('REQUEST_CHANGED');
  if(draft.operation!=='create'&&history.some(b=>b.id!==batch.id&&b.request&&!finished(b.request)&&(b.request.snapshot||b.entries).some(d=>d.operation!=='create'&&d.sourceId===draft.sourceId)))fail('BATCH_CONFLICT');
  const next=clone(batch);await enqueueDraft(next,draft);return this.put(next);
 }
}

export class BatchPublisher extends NewsPublisher {
 async acceptPR(batch,token,pr){
  const result=await super.acceptPR(batch,token,pr);
  batch.request.prState=pr.merged_at?'merged':pr.state==='closed'?'closed':'open';await this.save(batch);return result;
 }
 async refresh(batch){
  const tx=batch.request;if(!tx?.prNumber)fail('INVALID');
  const result=await this.status(tx.prNumber),pr=result.pr;
  if(pr.number!==tx.prNumber||pr.head?.ref!==tx.branch||pr.head?.repo?.full_name!==REPO||pr.base?.ref!=='main')fail('CONFLICT');
  await this.verifyBranch(tx,pr.head?.sha,'');
  tx.prState=pr.merged_at?'merged':pr.state==='closed'?'closed':'open';await this.save(batch);return result;
 }
 async post(batch,token,path,body){
  await this.assertRequest(batch);
  // Revision checking before each write stops stale tabs before remote changes.
  await this.save(batch);
  return this.api(path,token,{method:'POST',body:JSON.stringify(body)});
 }
 async notePrError(batch,stage,error){
  const tx=batch.request;if(!tx)return;cleanError(tx);tx.prErrorStage=stage;
  if(typeof error?.code==='string'&&(/^(?:AUTH|PERMISSION|NETWORK|RATE_LIMIT|CONFLICT|INVALID|REQUEST_CHANGED)$/.test(error.code)||/^HTTP_[45]\d{2}$/.test(error.code)))tx.prErrorCode=error.code;
  if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599)tx.prErrorStatus=error.status;
  await this.save(batch);
 }
 async assertRequest(batch){
  const tx=batch.request;
  if(!tx||!isDigest(tx.fingerprint)||await batchFingerprint(batch)!==tx.fingerprint||batch.reviewedFingerprint!==tx.fingerprint||await batchFingerprint({entries:tx.snapshot})!==tx.fingerprint)fail('REQUEST_CHANGED');
  for(const d of tx.snapshot)if(d.reviewedFingerprint!==await fingerprint(d))fail('REVIEW');
 }
 async requestPR(batch,token){
  let existing=await this.existingPR(batch,token);if(existing)return existing;
  const tx=batch.request;let pr;
  try{pr=await this.post(batch,token,'/pulls',{head:tx.branch,base:'main',title:`News［一括 ${tx.snapshot.length}件］: ${tx.snapshot[0].record.title?.ja||'記事の変更'}`.slice(0,180),body:`CMS一括公開依頼 ${batch.id}\n対象：${tx.snapshot.length}件\n\n${tx.snapshot.map(d=>`- ${{create:'新規',edit:'編集',delete:'削除'}[d.operation]}：${d.record.title?.ja||d.sourceId}`).join('\n')}\n\n日英中の確認済み原稿・画像・静的HTML・sitemapを一括変更します。\nmain保護を維持し、検査通過と本人承認後にのみマージしてください。\nCMSはマージ・自動承認を行いません。`,draft:false});}
  catch(error){
   if(['REQUEST_CHANGED','STORAGE','LOCAL_CONFLICT'].includes(error.code))throw error;
   existing=await this.existingPR(batch,token);if(existing)return existing;
   await this.notePrError(batch,'create',error);
   if(error.code==='PERMISSION')return {branch:tx.branch,manual:true,compareUrl:`https://github.com/${REPO}/compare/main...${encodeURIComponent(tx.branch)}?expand=1`};
   throw error;
  }
  return this.acceptPR(batch,token,pr);
 }
 async validateJournal(batch,user){
  const tx=batch.request;
  if(tx.actor!==user.login)fail('AUTH');
  if(tx.branch!==`cms/news-batch-${batch.id}-${tx.fingerprint.slice(0,12)}`||!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(tx.createdAt)||!Number.isFinite(Date.parse(tx.createdAt))||!isSha(tx.baseSha)||!isSha(tx.baseContentSha)||tx.commitSha&&!isSha(tx.commitSha)||tx.prNumber!==undefined&&(!Number.isSafeInteger(tx.prNumber)||tx.prNumber<1)||tx.snapshot.some(d=>d.baseContentSha&&d.baseContentSha!==tx.baseContentSha))fail('INVALID');
  await this.assertRequest(batch);
 }
 async perform(batch,token){
  if(!token)fail('AUTH');
  if(!isId(batch.id)||!Number.isInteger(batch.revision)||batch.revision<0)fail('INVALID');
  entriesValid(batch.entries,{reviewed:true});if(!batch.entries.length)fail('BATCH_EMPTY');
  const digest=await batchFingerprint(batch);
  if(batch.reviewedFingerprint!==digest)fail('REVIEW');
  for(const d of batch.entries)if(d.reviewedFingerprint!==await fingerprint(d))fail('REVIEW');
  if(batch.request)await this.assertRequest(batch);
  const user=await this.api('/user',token);
  if(!/^[\w-]+$/.test(user.login||'')||!Number.isSafeInteger(user.id))fail('AUTH');
  let tx=batch.request,existing;
  if(tx){
   await this.validateJournal(batch,user);
   existing=await this.existingPR(batch,token);if(existing)return existing;
   if(tx.commitSha||tx.branchReady){
    let ref;
    try{ref=await this.api(`/git/ref/heads/${tx.branch}`,token);await this.verifyBranch(tx,ref.object?.sha,token);}
    catch(error){if(error.status!==404||tx.branchReady){if(error.status===404)error=new CmsError('CONFLICT',404);await this.notePrError(batch,'branch',error);throw error;}}
    if(ref){tx.branchReady=true;await this.save(batch);return this.requestPR(batch,token);}
   }
  }
  const snapshot=await this.snapshot(token);
  if(batch.entries.some(d=>d.baseContentSha&&d.baseContentSha!==snapshot.contentSha))fail('CONFLICT');
  if(tx&&tx.baseContentSha!==snapshot.contentSha)fail('CONFLICT');
  // Reject incomplete/missing source records before freezing a new request.
  // This is a cloned local dry-run; it sends no content or image anywhere.
  applyBatch(snapshot.content,batch);
  if(!tx){
   tx=batch.request={fingerprint:digest,baseSha:snapshot.sha,baseContentSha:snapshot.contentSha,createdAt:this.now(),branch:`cms/news-batch-${batch.id}-${digest.slice(0,12)}`,actor:user.login,snapshot:batch.entries.map(persistedDraft)};
   await this.save(batch);
  }
  await this.validateJournal(batch,user);
  existing=await this.existingPR(batch,token);if(existing)return existing;
  const original=await this.file(CONTENT,tx.baseSha,token);if(original.sha!==tx.baseContentSha)fail('CONFLICT');
  const files={},imagePaths={};
  for(const d of tx.snapshot){if(!d.image)continue;const image=await inspectImage(d.image),path=`assets/cms/${tx.createdAt.slice(0,4)}/${tx.createdAt.slice(5,7)}/${image.hash}.${image.ext}`;imagePaths[d.id]=path;files[path]={bytes:image.bytes};}
  const content=applyBatch(JSON.parse(original.text),batch,imagePaths);files[CONTENT]={text:json(content)};
  const build=(await this.file('build-version.txt',tx.baseSha,token)).text.trim(),changed=[];
  for(const path of NEWS){const current=await this.file(path,tx.baseSha,token),next=renderNewsPage(current.text,content,build);if(next!==current.text){files[path]={text:next};changed.push(path);}}
  if(changed.length){const manifest=await this.file('sitemap-lastmod.json',tx.baseSha,token),xml=await this.file('sitemap.xml',tx.baseSha,token),next=updateSitemap(xml.text,JSON.parse(manifest.text),changed,tx.createdAt.slice(0,10));if(next.manifest!==manifest.text)files['sitemap-lastmod.json']={text:next.manifest};if(next.xml!==xml.text)files['sitemap.xml']={text:next.xml};}
  // Images and all HTML are unreachable until this one completed tree is attached
  // by one branch ref. Retries use the journal's fixed actor/date/snapshot.
  const tree=[];
  for(const [path,file]of Object.entries(files)){const blob=await this.post(batch,token,'/git/blobs',file.bytes?{content:base64(file.bytes),encoding:'base64'}:{content:file.text,encoding:'utf-8'});if(!isSha(blob.sha))fail('INVALID');tree.push({path,mode:'100644',type:'blob',sha:blob.sha});}
  const parent=await this.api(`/git/commits/${tx.baseSha}`,token);if(!isSha(parent.tree?.sha))fail('INVALID');
  const built=await this.post(batch,token,'/git/trees',{base_tree:parent.tree.sha,tree});if(!isSha(built.sha))fail('INVALID');
  const identity={name:user.login,email:`${user.id}+${user.login}@users.noreply.github.com`,date:tx.createdAt};
  const commit=await this.post(batch,token,'/git/commits',{message:`CMS News batch ${batch.id} ${tx.fingerprint}`,tree:built.sha,parents:[tx.baseSha],author:identity,committer:identity});
  if(!isSha(commit.sha)||tx.commitSha&&tx.commitSha!==commit.sha)fail('CONFLICT');tx.commitSha=commit.sha;await this.save(batch);
  if((await this.snapshot(token)).contentSha!==tx.baseContentSha)fail('CONFLICT');
  try{await this.post(batch,token,'/git/refs',{ref:`refs/heads/${tx.branch}`,sha:tx.commitSha});}
  catch(error){if(['REQUEST_CHANGED','STORAGE','LOCAL_CONFLICT'].includes(error.code))throw error;const current=await this.api(`/git/ref/heads/${tx.branch}`,token).catch(()=>{throw error;});await this.verifyBranch(tx,current.object?.sha,token);}
  tx.branchReady=true;await this.save(batch);return this.requestPR(batch,token);
 }
}
