import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BatchPublisher,BatchStore,newBatch,enqueueDraft,removeQueuedDraft,batchFingerprint,persistedBatch,applyBatch} from '../cms-news-batch-workflow.js';
import {CmsError,REPO,newDraft,fingerprint,applyDraft} from '../cms-news-workflow.js';
import {renderNewsPage} from '../news-renderer.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const hash=value=>createHash('sha1').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const article=id=>({id,date:'2026-10-01',category:'Product',featured:id==='fixture-a',image:`assets/${id}.png`,link:'license.html',translationStatus:'seeded',custom:{preserve:true},title:{ja:`合成 ${id}`,en:`Synthetic ${id}`,'zh-CN':`合成 ${id}`,fr:`Titre ${id}`},body:{ja:`合成本文 ${id}`,en:`Synthetic body ${id}`,'zh-CN':`合成正文 ${id}`,fr:`Texte ${id}`}});
const original={news:[article('fixture-a'),article('fixture-b'),article('fixture-c')],newsFallbackImage:'assets/fallback.png',instagram:{url:'https://example.invalid/',image:'assets/social.png'},business:{keep:'untouched'}};
const contentText=JSON.stringify(original,null,2)+'\n',contentSha=hash(contentText),main=hash('synthetic-main');
const syntheticPng=()=>new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3])],{type:'image/png'});
async function reviewed(index=0,operation='edit'){
 const d=newDraft(operation==='create'?null:original.news[index],contentSha);d.operation=operation;
 if(operation==='create')d.record=article('created');
 if(operation!=='delete')d.record.body.ja+=' — queued';
 d.reviewedFingerprint=await fingerprint(d);return d;
}
async function batch(...drafts){const b=newBatch();for(const d of drafts)await enqueueDraft(b,d);b.reviewedFingerprint=await batchFingerprint(b);return b;}
function fixture(){
 const calls=[],blobs=new Map(),trees=new Map(),commits=new Map(),refs=new Map(),pulls=[],journal=new Map();let fault=null,changed=false,failStorage=false;
 const files=Object.fromEntries(['build-version.txt','news.html','ja/news.html','zh/news.html','sitemap-lastmod.json','sitemap.xml'].map(file=>[file,read(file)]));files['content/site-content.json']=contentText;
 const fetch=async(url,options={})=>{
  const u=new URL(url),path=u.pathname.replace('/repos/'+REPO,''),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
  assert.equal(u.origin,'https://api.github.com');assert(['GET','POST'].includes(method));assert(!/merges|reviews|permissions|translate/.test(path));
  calls.push({path,method,body});const before=fault?.(path,method,body,'before');if(before instanceof Response)return before;
  let result;
  if(path==='/user')result={login:'fixture-owner',id:123};
  else if(path==='/git/ref/heads/main')result={object:{sha:main}};
  else if(path.startsWith('/contents/')){const file=decodeURIComponent(path.slice(10));if(!(file in files))return response({},404);result={type:'file',encoding:'base64',sha:changed&&file==='content/site-content.json'?hash('changed'):hash(files[file]),content:Buffer.from(files[file]).toString('base64')};}
  else if(path==='/pulls'&&method==='GET')result=pulls;
  else if(path.startsWith('/pulls/')&&method==='GET')result=pulls.find(p=>String(p.number)===path.slice(7));
  else if(path==='/git/blobs'){const sha=hash(body);blobs.set(sha,body);result={sha};}
  else if(path.startsWith('/git/commits/'))result={tree:{sha:hash('synthetic-base-tree')}};
  else if(path==='/git/trees'){const sha=hash(body);trees.set(sha,body);result={sha};}
  else if(path==='/git/commits'){const sha=hash(body);commits.set(sha,body);result={sha};}
  else if(path==='/git/refs'){if(refs.has(body.ref))return response({},422);refs.set(body.ref,body.sha);result={object:{sha:body.sha}};}
  else if(path.startsWith('/git/ref/heads/')){const sha=refs.get('refs/heads/'+path.slice(15));if(!sha)return response({},404);result={object:{sha}};}
  else if(path==='/pulls'&&method==='POST'){result={number:201+pulls.length,head:{ref:body.head,sha:refs.get('refs/heads/'+body.head),repo:{full_name:REPO}},base:{ref:'main'},state:'open'};pulls.push(result);}
  else if(path.startsWith('/compare/'))return response({status:'diverged',files:[]});
  else throw Error('Unexpected synthetic request '+path);
  const after=fault?.(path,method,body,'after');return after instanceof Response?after:response(result);
 };
 const persist=async b=>{if(failStorage)throw new CmsError('STORAGE');const revision=journal.get(b.id)?.revision||0;if(revision!==b.revision)throw new CmsError('LOCAL_CONFLICT');const saved=persistedBatch({...b,revision:revision+1});journal.set(b.id,saved);return saved;};
 return {calls,blobs,trees,commits,refs,pulls,journal,publisher:()=>new BatchPublisher({fetch,persist,now:()=> '2026-10-20T12:00:00.000Z'}),fault:value=>fault=value,changeMain:()=>changed=true,storage:value=>failStorage=value};
}
const posts=f=>f.calls.filter(c=>c.method==='POST');
const finalFiles=f=>Object.fromEntries([...f.trees.values()].at(-1).tree.map(file=>[file.path,f.blobs.get(file.sha)]));

test('queue is local copied content: review/add/change/remove never fetch or discard the original draft',async()=>{
 const d=await reviewed(),b=await batch(d),before=structuredClone(d),digest=await batchFingerprint(b);assert.equal(b.entries.length,1);
 d.record.body.en+=' original later edit';assert.equal(await batchFingerprint(b),digest);assert.equal(b.entries[0].record.body.en,before.record.body.en);
 removeQueuedDraft(b,d.id);assert.equal(b.entries.length,0);assert.equal(b.reviewedFingerprint,'');assert.deepEqual(d.record.body.en,before.record.body.en+' original later edit');
});
test('same article latest edit deduplicates, changed content invalidates review, edit/delete conflict leaves queue intact',async()=>{
 const a=await reviewed(),b=await batch(a),same=structuredClone(a);await enqueueDraft(b,same);assert.equal(b.reviewedFingerprint,await batchFingerprint(b));
 const other=await reviewed();other.record.body.en+=' latest';other.reviewedFingerprint=await fingerprint(other);await enqueueDraft(b,other);assert.equal(b.entries.length,1);assert.equal(b.entries[0].id,other.id);assert.equal(b.reviewedFingerprint,'');
 const before=structuredClone(b);await assert.rejects(enqueueDraft(b,await reviewed(0,'delete')),{code:'BATCH_CONFLICT'});assert.deepEqual(b,before);
});
test('single-PR drafts and mixed content bases cannot enter the queue',async()=>{
 const d=await reviewed(),b=newBatch();d.request={prNumber:99};await assert.rejects(enqueueDraft(b,d),{code:'REQUEST_CHANGED'});assert.equal(b.entries.length,0);
 delete d.request;await enqueueDraft(b,d);const other=await reviewed(1);other.baseContentSha=hash('different');other.reviewedFingerprint=await fingerprint(other);await assert.rejects(enqueueDraft(b,other),{code:'BATCH_CONFLICT'});assert.equal(b.entries.length,1);
});
test('mixed create/edit/delete and multiple images publish via one complete tree, branch and PR preserving translations/links/settings',async()=>{
 const f=fixture(),a=await reviewed(),c=await reviewed(0,'create');a.image=syntheticPng();c.image=new Blob([await syntheticPng().arrayBuffer(),Uint8Array.of(4)],{type:'image/png'});a.reviewedFingerprint=await fingerprint(a);c.reviewedFingerprint=await fingerprint(c);const b=await batch(a,c,await reviewed(1,'delete'));
 await f.publisher().publish(b,'synthetic-token');const files=finalFiles(f),data=JSON.parse(files['content/site-content.json'].content);
 assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);assert.equal(f.commits.size,1);assert.equal(f.trees.size,1);assert.equal(Object.keys(files).filter(p=>p.startsWith('assets/cms/')).length,2);
 const edited=data.news.find(n=>n.id===a.sourceId);assert.equal(edited.link,'license.html');assert.equal(edited.translationStatus,'seeded');assert.deepEqual(edited.custom,{preserve:true});assert.equal(edited.body.en,a.record.body.en);assert.equal(edited.body['zh-CN'],a.record.body['zh-CN']);assert.equal(edited.body.fr,a.record.body.fr);
 assert(!data.news.find(n=>n.id==='fixture-b'));assert(data.news.find(n=>n.id==='cms-'+c.id));assert.deepEqual(data.business,original.business);assert.deepEqual(data.instagram,original.instagram);assert.equal(data.newsFallbackImage,original.newsFallbackImage);
 for(const page of ['news.html','ja/news.html','zh/news.html'])assert.equal(files[page].content,renderNewsPage(read(page),data,read('build-version.txt').trim()));
 assert(!f.calls.some(c=>c.method==='PUT'||c.method==='PATCH'));assert(!f.refs.has('refs/heads/main'));assert(b.request.snapshot.every(d=>!d.request));
});
test('delete all can publish zero News and explicit empty states in all languages without changing single deletion behavior',async()=>{
 const f=fixture(),b=await batch(...await Promise.all(original.news.map((_,i)=>reviewed(i,'delete'))));await f.publisher().publish(b,'synthetic-token');const files=finalFiles(f),data=JSON.parse(files['content/site-content.json'].content);assert.deepEqual(data.news,[]);
 for(const page of ['news.html','ja/news.html','zh/news.html']){const html=files[page].content;assert.match(html,/data-news-list-empty>/);assert.match(html,/data-top-news-empty>/);assert(!html.includes('data-story-id="fixture-'));}
 const d=await reviewed(0,'delete');assert.throws(()=>applyDraft({news:[article('fixture-a')]},d),{code:'LAST_ARTICLE'});assert.deepEqual(applyBatch({news:[article('fixture-a')]},{entries:[d]}).news,[]);
});
test('unconfirmed queue, changed confirmation and empty queue stop before remote writes',async()=>{
 const f=fixture(),b=await batch(await reviewed());b.reviewedFingerprint='';await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'REVIEW'});assert.equal(f.calls.length,0);
 b.reviewedFingerprint=await batchFingerprint(b);b.entries[0].record.body.ja+=' changed';await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'REVIEW'});assert.equal(f.calls.length,0);
 await assert.rejects(f.publisher().publish(newBatch(),'synthetic-token'),{code:'BATCH_EMPTY'});assert.equal(posts(f).length,0);
});
test('main content change blocks all remote writes and retains original queue',async()=>{
 const f=fixture(),b=await batch(await reviewed()),before=structuredClone(b);f.changeMain();await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'CONFLICT'});assert.equal(posts(f).length,0);assert.deepEqual(b,before);
});
test('incomplete fields and missing source articles fail before freezing a request so the local draft can be corrected',async()=>{
 const incomplete=await reviewed();incomplete.record.body.en='';incomplete.reviewedFingerprint=await fingerprint(incomplete);await assert.rejects(enqueueDraft(newBatch(),incomplete),{code:'INCOMPLETE'});
 const f=fixture(),b=await batch(await reviewed());b.entries[0].sourceId='missing-synthetic-article';b.entries[0].reviewedFingerprint=await fingerprint(b.entries[0]);b.reviewedFingerprint=await batchFingerprint(b);await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'CONFLICT'});assert.equal(b.request,null);assert.equal(posts(f).length,0);
});
for(const endpoint of ['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls'])test(`ambiguous ${endpoint} response reloads journal and resumes one branch/PR`,async()=>{
 const f=fixture(),d=await reviewed();d.image=syntheticPng();d.reviewedFingerprint=await fingerprint(d);const b=await batch(d,await reviewed(1));let failed=false;
 f.fault((p,m,body,stage)=>{if(p===endpoint&&m==='POST'&&stage==='after'&&!failed){failed=true;throw Error('synthetic lost reply');}});
 try{await f.publisher().publish(b,'synthetic-token');}catch(e){assert.equal(e.code,'NETWORK');}
 f.fault(null);const reload=structuredClone(f.journal.get(b.id));assert(reload.request);await f.publisher().publish(reload,'synthetic-token');assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);assert.equal(f.commits.size,1);assert.equal(f.trees.size,1);
 assert.deepEqual(reload.request.snapshot.map(d=>d.id),[d.id,b.entries[1].id]);assert.equal(reload.request.prNumber,201);
});
test('double click uses one pending run; reload returns same closed/merged PR without post or main rollback',async()=>{
 const f=fixture(),b=await batch(await reviewed()),p=f.publisher();const one=p.publish(b,'synthetic-token'),two=p.publish(b,'synthetic-token');assert.equal(one,two);await one;assert.equal(f.pulls.length,1);
 f.pulls[0].state='closed';f.pulls[0].merged_at='2026-10-20T13:00:00Z';f.changeMain();const count=posts(f).length;const result=await f.publisher().publish(structuredClone(f.journal.get(b.id)),'synthetic-token');assert.equal(result.pr.number,201);assert.equal(posts(f).length,count);
});
test('PR403 retains completed branch and same snapshot, retry only creates the missing PR',async()=>{
 const f=fixture(),b=await batch(await reviewed());f.fault((p,m,body,s)=>p==='/pulls'&&m==='POST'&&s==='before'?response({},403):null);const result=await f.publisher().publish(b,'synthetic-token');assert(result.manual);assert.equal(b.request.prErrorCode,'PERMISSION');assert.equal(f.refs.size,1);assert.equal(f.pulls.length,0);
 const count=posts(f).length;f.changeMain();f.fault(null);await f.publisher().publish(structuredClone(f.journal.get(b.id)),'synthetic-token');assert.deepEqual(posts(f).slice(count).map(c=>c.path),['/pulls']);assert.equal(f.pulls.length,1);
});
test('partial image write creates no branch or PR and failure preserves all inputs and translation values',async()=>{
 const f=fixture(),d=await reviewed();d.image=syntheticPng();d.reviewedFingerprint=await fingerprint(d);const b=await batch(d,await reviewed(1)),before=structuredClone(b.entries);let count=0;
 f.fault((p,m,body,s)=>p==='/git/blobs'&&m==='POST'&&s==='before'&&++count===2?response({},503):null);await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'HTTP_503'});assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);assert.deepEqual(b.entries,before);assert.deepEqual(b.request.snapshot,before);
});
test('queued copies and frozen request exclude later original-draft editing and new queue operations',async()=>{
 const f=fixture(),d=await reviewed(),b=await batch(d),queued=d.record.body.en;f.fault((p,m,body,s)=>{if(p==='/git/blobs'&&m==='POST'&&s==='after')d.record.body.en='later original edit';});await f.publisher().publish(b,'synthetic-token');
 assert.equal(JSON.parse(finalFiles(f)['content/site-content.json'].content).news[0].body.en,queued);assert.equal(b.request.snapshot[0].record.body.en,queued);await assert.rejects(enqueueDraft(b,await reviewed(1)),{code:'REQUEST_CHANGED'});assert.throws(()=>removeQueuedDraft(b,d.id),{code:'REQUEST_CHANGED'});
});
test('tampered fixed snapshot or queue cannot make further writes, even with newly computed individual approval',async()=>{
 const f=fixture(),b=await batch(await reviewed());f.fault((p,m,body,s)=>p==='/pulls'&&m==='POST'&&s==='before'?response({},403):null);await f.publisher().publish(b,'synthetic-token');const count=posts(f).length;
 const reload=structuredClone(f.journal.get(b.id));reload.request.snapshot[0].record.body.en+=' tampered';reload.request.snapshot[0].reviewedFingerprint=await fingerprint(reload.request.snapshot[0]);await assert.rejects(f.publisher().publish(reload,'synthetic-token'),{code:'REQUEST_CHANGED'});assert.equal(posts(f).length,count);
});
test('a stale browser tab cannot overwrite request progress or publish a second request',async()=>{
 const f=fixture(),b=await batch(await reviewed()),stale=structuredClone(b);await f.publisher().publish(b,'synthetic-token');const count=posts(f).length;await assert.rejects(f.publisher().publish(stale,'synthetic-token'),{code:'LOCAL_CONFLICT'});assert.equal(posts(f).length,count);assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
});
test('storage failure occurs before any public write and leaves queue entries intact',async()=>{
 const f=fixture(),b=await batch(await reviewed()),before=structuredClone(b.entries);f.storage(true);await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'STORAGE'});assert.equal(posts(f).length,0);assert.deepEqual(b.entries,before);
});
test('a main update during preparation prevents attaching the built image/content tree',async()=>{
 const f=fixture(),b=await batch(await reviewed());f.fault((p,m,body,s)=>{if(p==='/git/commits'&&m==='POST'&&s==='after')f.changeMain();});await assert.rejects(f.publisher().publish(b,'synthetic-token'),{code:'CONFLICT'});assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);assert(b.request.commitSha);
});
test('persisted batch excludes arbitrary credential fields at batch, journal and draft levels while retaining Blobs/locales/review flag',async()=>{
 const d=await reviewed();d.image=syntheticPng();d.translationReviewRequired=true;d.token='private';d.record.adminKey='private';d.reviewedFingerprint=await fingerprint(d);const b=await batch(d);b.token='private';b.request={fingerprint:await batchFingerprint(b),snapshot:b.entries,token:'private'};
 const saved=persistedBatch(b);assert(!JSON.stringify(saved).includes('private'));assert(saved.entries[0].image instanceof Blob);assert.equal(saved.entries[0].translationReviewRequired,true);assert.equal(saved.request.snapshot[0].record.body.fr,d.record.body.fr);
});

// Small asynchronous IndexedDB fixture exercises revision and cross-batch claim
// checks. No browser profile, real IndexedDB or network service is accessed.
function localStore(){
 const values=new Map(),store=new BatchStore();
 store.db={transaction(){let aborted=false;const tx={abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(){return {getAll(){const r={};queueMicrotask(()=>{r.result=[...values.values()].map(value=>structuredClone(value));r.onsuccess?.();queueMicrotask(()=>{if(!aborted)tx.oncomplete?.();});});return r;},put(value){values.set(value.id,structuredClone(value));}};}};return tx;}};
 return {store,values};
}
test('local storage enforces revisions and rejects same submitted draft ID across historical/new batches',async()=>{
 const {store}=localStore(),d=await reviewed();let b=await store.enqueue(newBatch(),d);assert.equal(b.revision,1);const stale=structuredClone(b);b=await store.put(b);await assert.rejects(store.put(stale),{code:'LOCAL_CONFLICT'});
 b.request={fingerprint:await batchFingerprint(b),snapshot:structuredClone(b.entries)};b=await store.put(b);await assert.rejects(store.enqueue(newBatch(),d),{code:'REQUEST_CHANGED'});
 const other=await batch(d);other.request={fingerprint:await batchFingerprint(other),snapshot:structuredClone(other.entries)};await assert.rejects(store.put(other),{code:'REQUEST_CHANGED'});assert.equal((await store.list()).length,1);
});
test('stored frozen journal cannot be erased or re-keyed to forget a completed public write',async()=>{
 const {store}=localStore();let b=await store.enqueue(newBatch(),await reviewed());b.request={fingerprint:await batchFingerprint(b),snapshot:structuredClone(b.entries),branch:'fixed-branch',commitSha:hash('fixed-commit')};b=await store.put(b);
 const erased=structuredClone(b);erased.request=null;await assert.rejects(store.put(erased),{code:'REQUEST_CHANGED'});
 const rekeyed=structuredClone(b);rekeyed.request.branch='another-branch';await assert.rejects(store.put(rekeyed),{code:'REQUEST_CHANGED'});
 const replaced=structuredClone(b);replaced.request.commitSha=hash('other-commit');await assert.rejects(store.put(replaced),{code:'REQUEST_CHANGED'});assert.equal((await store.list())[0].request.branch,'fixed-branch');
});
test('an unresolved request claims its source article across new draft IDs; a confirmed terminal PR releases article but keeps draft-ID claim',async()=>{
 const {store}=localStore(),d=await reviewed();let b=await store.enqueue(newBatch(),d);b.request={fingerprint:await batchFingerprint(b),snapshot:structuredClone(b.entries),prState:'open'};b=await store.put(b);
 const changed=await reviewed();await assert.rejects(store.enqueue(newBatch(),changed),{code:'BATCH_CONFLICT'});
 const bypass=await batch(changed);bypass.request={fingerprint:await batchFingerprint(bypass),snapshot:structuredClone(bypass.entries)};await assert.rejects(store.put(bypass),{code:'BATCH_CONFLICT'});
 b.request.prState='merged';b=await store.put(b);await assert.rejects(store.enqueue(newBatch(),d),{code:'REQUEST_CHANGED'});assert.equal((await store.enqueue(newBatch(),changed)).entries.length,1);
});
test('journal diagnostics persist only allowed scalar values',async()=>{
 const b=await batch(await reviewed());b.request={snapshot:b.entries,prErrorStage:{secret:'private'},prErrorCode:{secret:'private'},prErrorStatus:{secret:'private'},prNumber:{secret:'private'},branchReady:{secret:'private'}};
 const saved=persistedBatch(b);for(const key of ['prErrorStage','prErrorCode','prErrorStatus','prNumber','branchReady'])assert.equal(saved.request[key],undefined);assert(!JSON.stringify(saved).includes('private'));
});
test('a terminal request can refresh its history after a later active request claims the same article',async()=>{
 const {store}=localStore();let old=await store.enqueue(newBatch(),await reviewed());old.request={fingerprint:await batchFingerprint(old),snapshot:structuredClone(old.entries),prState:'merged'};old=await store.put(old);
 let active=await store.enqueue(newBatch(),await reviewed());active.request={fingerprint:await batchFingerprint(active),snapshot:structuredClone(active.entries),prState:'open'};active=await store.put(active);const activeBefore=structuredClone(active);
 old=await store.put(old);assert.equal(old.request.prState,'merged');assert.deepEqual((await store.list()).find(b=>b.id===active.id),activeBefore);
 await assert.rejects(store.enqueue(newBatch(),await reviewed()),{code:'BATCH_CONFLICT'});
});
test('refresh confirms terminal PR identity and saves its state through the existing status read path',async()=>{
 const f=fixture(),b=await batch(await reviewed());await f.publisher().publish(b,'synthetic-token');f.pulls[0].state='closed';f.pulls[0].merged_at='2026-10-20T13:00:00Z';const count=posts(f).length;
 const result=await f.publisher().refresh(b);assert.equal(result.pr.number,201);assert.equal(b.request.prState,'merged');assert.equal(f.journal.get(b.id).request.prState,'merged');assert.equal(posts(f).length,count);
});
test('identical images in multiple entries reference a single asset blob in the atomic tree',async()=>{
 const f=fixture(),a=await reviewed(),b=await reviewed(1);a.image=syntheticPng();b.image=syntheticPng();a.reviewedFingerprint=await fingerprint(a);b.reviewedFingerprint=await fingerprint(b);await f.publisher().publish(await batch(a,b),'synthetic-token');const files=finalFiles(f),data=JSON.parse(files['content/site-content.json'].content);assert.equal(Object.keys(files).filter(p=>p.startsWith('assets/cms/')).length,1);assert.equal(data.news[0].image,data.news[1].image);
});
