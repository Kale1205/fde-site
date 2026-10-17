import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BatchStore,BatchPublisher,newBatch,enqueueDraft,removeQueuedDraft,batchFingerprint,persistedBatch,applyBatch} from '../cms-news-batch-workflow.js';
import {newDraft,fingerprint,REPO} from '../cms-news-workflow.js';

// Independent safety model. Every article, image, HTML shell, persistence
// database and GitHub response below is synthetic. There is no real fetch,
// browser profile, real IndexedDB, token or production-content read.
const copy=value=>structuredClone(value);
const hash=value=>createHash('sha1').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const answer=(value,status=200)=>new Response(JSON.stringify(value),{status});
const text=value=>JSON.stringify(value,null,2)+'\n';
const langs=['ja','en','zh-CN'];
const article=id=>({id,date:'2026-10-01',category:'Development',featured:true,image:`assets/${id}.png`,link:'license.html',translationStatus:'seeded',other:{keep:id},title:Object.fromEntries([...langs,'fr'].map(l=>[l,`Synthetic title ${id} ${l}`])),body:Object.fromEntries([...langs,'fr'].map(l=>[l,`Synthetic body ${id} ${l}`]))});
const initial={news:[article('safety-one'),article('safety-two')],newsFallbackImage:'assets/synthetic-fallback.png',instagram:{url:'https://example.invalid',image:'assets/synthetic-social.png'},unrelated:{preserve:['price','contract','profile']}};
const contentSha=hash(text(initial)),mainSha=hash('synthetic main commit');
const png=tag=>new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,tag])],{type:'image/png'});
const pages=['news.html','ja/news.html','zh/news.html'];
const shell=locale=>`<!doctype html><html lang="${locale}"><head></head><body><main>\n      <section class="news-library section-frame">Synthetic placeholder</section>\n    </main></body></html>\n`;
const files={
 'content/site-content.json':text(initial),'build-version.txt':'20261017-093643\n',
 'news.html':shell('en'),'ja/news.html':shell('ja'),'zh/news.html':shell('zh-CN'),
 'sitemap-lastmod.json':text(Object.fromEntries(pages.map(p=>[p,'2026-10-01']))),
 'sitemap.xml':'<urlset>'+pages.map(p=>`<url><loc>https://kale1205.github.io/fde-site/${p}</loc><lastmod>2026-10-01</lastmod></url>`).join('')+'</urlset>\n'
};
async function draft(index=0,operation='edit'){
 const d=newDraft(operation==='create'?null:initial.news[index],contentSha);d.operation=operation;
 if(operation==='create')d.record=article('synthetic-create');
 if(operation!=='delete')d.record.body.ja+='\nExplicit reviewed edit';
 d.reviewedFingerprint=await fingerprint(d);return d;
}
async function queue(...entries){const b=newBatch();for(const d of entries)await enqueueDraft(b,d);b.reviewedFingerprint=await batchFingerprint(b);return b;}

// Serial read/write transactions with snapshot isolation and abort rollback.
// Unlike a callback-only stub, overlapping transactions see committed writes.
function database(){
 let serial=Promise.resolve();const records=new Map();
 const db={transaction(_name,mode='readonly'){
  let aborted=false,complete;const finished=new Promise(resolve=>complete=resolve);
  let values;const requests=[];
  const tx={abort(){aborted=true;},objectStore(){return {
   getAll(){const r={};requests.push(()=>{r.result=[...values.values()].map(copy);r.onsuccess?.();});return r;},
   put(value){values.set(value.id,copy(value));}
  };}};
  const predecessor=serial;serial=finished;
  predecessor.then(()=>setImmediate(()=>{
   values=new Map([...records].map(([k,v])=>[k,copy(v)]));
   try{for(const run of requests){if(aborted)break;run();}
    if(aborted)tx.onabort?.();else{if(mode==='readwrite'){records.clear();for(const [k,v] of values)records.set(k,v);}tx.oncomplete?.();}
   }catch(error){tx.error=error;tx.onerror?.();}finally{complete();}
  }));return tx;
 }};
 const store=new BatchStore();store.db=db;return {store,records};
}

// A Git object graph records what a remote visitor can actually reach.
// Blob/tree/commit uploads alone are deliberately not considered publication.
function remote(store=database().store){
 const calls=[],blobs=new Map(),trees=new Map(),commits=new Map(),refs=new Map(),pulls=[];
 let activeFiles=copy(files),activeMain=mainSha,fault=null,storageFailure=false;
 const baseTree=hash('synthetic base tree');
 const fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET',route=u.pathname.replace(`/repos/${REPO}`,'');
  assert.equal(u.origin,'https://api.github.com');assert(['GET','POST'].includes(method));
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
  assert(!/permissions|translate|\/merges|\/reviews/.test(route));
  const body=options.body?JSON.parse(options.body):null,call={route,method,body};calls.push(call);
  let override=await fault?.(call,'before');if(override instanceof Response)return override;
  let result;
  if(route==='/user')result={login:'synthetic-owner',id:987};
  else if(route==='/git/ref/heads/main')result={object:{sha:activeMain}};
  else if(route.startsWith('/contents/')){
   const p=decodeURIComponent(route.slice(10)),from=u.searchParams.get('ref')===activeMain?activeFiles:files;
   if(!(p in from))return answer({},404);
   result={type:'file',encoding:'base64',sha:hash(from[p]),content:Buffer.from(from[p]).toString('base64')};
  }else if(route==='/pulls'&&method==='GET')result=pulls.filter(p=>!u.searchParams.get('head')||u.searchParams.get('head')===`Kale1205:${p.head.ref}`);
  else if(route.startsWith('/pulls/')&&method==='GET')result=pulls.find(p=>p.number===Number(route.slice(7)));
  else if(route.startsWith('/commits/')&&route.endsWith('/check-runs'))result={check_runs:[{name:'validate',status:'completed',conclusion:'success'}]};
  else if(route.startsWith('/commits/')&&route.endsWith('/status'))result={statuses:[]};
  else if(route==='/actions/runs')result={workflow_runs:[]};
  else if(route==='/git/blobs'&&method==='POST'){const sha=hash(body);blobs.set(sha,copy(body));result={sha};}
  else if(route.startsWith('/git/commits/')&&method==='GET')result={tree:{sha:baseTree}};
  else if(route==='/git/trees'&&method==='POST'){
   assert.equal(body.base_tree,baseTree);for(const entry of body.tree)assert(blobs.has(entry.sha),'tree references an uploaded blob');
   const sha=hash(body);trees.set(sha,copy(body));result={sha};
  }else if(route==='/git/commits'&&method==='POST'){
   assert(trees.has(body.tree),'commit references one complete tree');assert.deepEqual(body.parents,[mainSha]);
   const sha=hash(body);commits.set(sha,copy(body));result={sha};
  }else if(route==='/git/refs'&&method==='POST'){
   assert.match(body.ref,/^refs\/heads\/cms\/news-batch-/);assert(commits.has(body.sha),'ref references complete commit');
   if(refs.has(body.ref))return answer({},422);refs.set(body.ref,body.sha);result={object:{sha:body.sha}};
  }else if(route.startsWith('/git/ref/heads/')&&method==='GET'){
   const sha=refs.get('refs/heads/'+route.slice(15));if(!sha)return answer({},404);result={object:{sha}};
  }else if(route==='/pulls'&&method==='POST'){
   const sha=refs.get('refs/heads/'+body.head);assert(sha,'PR cannot reference incomplete branch');assert.equal(body.base,'main');
   if(pulls.some(p=>p.head.ref===body.head))return answer({},422);
   result={number:701+pulls.length,state:'open',head:{ref:body.head,sha,repo:{full_name:REPO}},base:{ref:'main'}};pulls.push(result);
  }else if(route.startsWith('/compare/'))return answer({status:'diverged',files:[]});
  else throw Error(`Unexpected synthetic request ${method} ${route}`);
  override=await fault?.(call,'after');return override instanceof Response?override:answer(result);
 };
 const persist=async b=>{if(storageFailure){const e=Error('STORAGE');e.code='STORAGE';throw e;}return store.put(b);};
 return {store,calls,blobs,trees,commits,refs,pulls,setFault:value=>fault=value,failStorage:value=>storageFailure=value,
  changeMain(){activeMain=hash('synthetic newer main');activeFiles=copy(files);activeFiles['content/site-content.json']=text({...initial,unrelated:{preserve:['newer main']}});},
  publisher:()=>new BatchPublisher({fetch,persist,now:()=> '2026-10-21T10:00:00.000Z'}),
  visible(ref=[...refs.keys()][0]){if(!ref)return {};const commit=commits.get(refs.get(ref)),tree=trees.get(commit.tree);return Object.fromEntries(tree.tree.map(e=>{const b=blobs.get(e.sha);return [e.path,b.encoding==='base64'?Buffer.from(b.content,'base64'):b.content];}));}
 };
}
const posts=r=>r.calls.filter(c=>c.method==='POST');
const codeIn=(...codes)=>e=>codes.includes(e.code);

test('independent safety: copies, replacement, cancellation and conflicts preserve original drafts',async()=>{
 const d=await draft(),before=copy(d),b=await queue(d);d.record.body.en+=' later local edit';
 assert.equal(b.entries[0].record.body.en,before.record.body.en);
 const replacement=await draft();replacement.record.body.en+=' replacement';replacement.reviewedFingerprint=await fingerprint(replacement);
 await enqueueDraft(b,replacement);assert.equal(b.entries.length,1);assert.equal(b.entries[0].id,replacement.id);assert.equal(b.reviewedFingerprint,'');
 const fixed=copy(b);await assert.rejects(enqueueDraft(b,await draft(0,'delete')),{code:'BATCH_CONFLICT'});assert.deepEqual(b,fixed);
 removeQueuedDraft(b,replacement.id);assert.deepEqual(b.entries,[]);assert.equal(d.record.body.en,before.record.body.en+' later local edit');assert(replacement.record.body.en.endsWith('replacement'));
});
test('independent safety: same create ID is updated once and malformed duplicate entries cannot publish',async()=>{
 const d=await draft(0,'create'),b=await queue(d);d.record.body.en+=' updated';d.reviewedFingerprint=await fingerprint(d);await enqueueDraft(b,d);assert.equal(b.entries.length,1);
 b.entries.push(copy(b.entries[0]));const r=remote();await assert.rejects(r.publisher().publish(b,'synthetic-token'),codeIn('INVALID','BATCH_CONFLICT'));assert.equal(r.calls.length,0);
});
test('independent safety: single submitted drafts and stale review never produce remote requests',async()=>{
 const d=await draft();d.request={prNumber:12};await assert.rejects(enqueueDraft(newBatch(),d),{code:'REQUEST_CHANGED'});
 const b=await queue(await draft());b.entries[0].record.body['zh-CN']+=' unreviewed';const r=remote();await assert.rejects(r.publisher().publish(b,'synthetic-token'),{code:'REVIEW'});assert.equal(r.calls.length,0);
});
test('independent safety: confirmation expires for image, locale, Top selection and membership changes',async()=>{
 for(const mutate of [d=>d.record.body.en+=' edited',d=>d.record.featured=!d.record.featured,d=>d.image=png(3),d=>d.removeImage=true]){
  const b=await queue(await draft()),approved=b.reviewedFingerprint;mutate(b.entries[0]);assert.notEqual(await batchFingerprint(b),approved);const r=remote();await assert.rejects(r.publisher().publish(b,'synthetic-token'),{code:'REVIEW'});assert.equal(r.calls.length,0);
 }
 const b=await queue(await draft());await enqueueDraft(b,await draft(1));assert.equal(b.reviewedFingerprint,'');
});
test('independent safety: one reachable tree atomically exposes all images/locales and preserves unrelated fields',async()=>{
 const a=await draft(),b=await draft(1);a.image=png(1);b.image=png(2);for(const d of [a,b])d.reviewedFingerprint=await fingerprint(d);
 const q=await queue(a,b),r=remote();await r.publisher().publish(q,'synthetic-token');const visible=r.visible(),data=JSON.parse(visible['content/site-content.json']);
 assert.equal(r.refs.size,1);assert.equal(r.pulls.length,1);assert.equal(r.commits.size,1);assert.equal(Object.keys(visible).filter(p=>p.startsWith('assets/cms/')).length,2);
 for(const expected of [a,b]){const item=data.news.find(n=>n.id===expected.sourceId);assert(visible[item.image] instanceof Buffer);for(const lang of [...langs,'fr'])assert.equal(item.body[lang],expected.record.body[lang]);assert.equal(item.link,'license.html');assert.equal(item.translationStatus,'seeded');assert.deepEqual(item.other,initial.news.find(n=>n.id===item.id).other);}
 assert.deepEqual({...data,news:[]},{...initial,news:[]});for(const page of pages)assert(visible[page].includes('safety-one'));
});
test('independent safety: deleting every synthetic article produces legal zero-item pages in all locales',async()=>{
 const q=await queue(await draft(0,'delete'),await draft(1,'delete')),r=remote();await r.publisher().publish(q,'synthetic-token');const visible=r.visible();assert.deepEqual(JSON.parse(visible['content/site-content.json']).news,[]);
 for(const page of pages){assert.match(visible[page],/data-news-list-empty>/);assert.match(visible[page],/data-top-news-empty>/);assert(!visible[page].includes('data-story-id="safety-'));}
 assert.deepEqual(applyBatch(initial,q).news,[]);
});
test('independent safety: a changed main content base prevents all writes and preserves the queue',async()=>{
 const q=await queue(await draft()),before=copy(q),r=remote();r.changeMain();await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'CONFLICT'});assert.deepEqual(q,before);assert.equal(posts(r).length,0);
});
test('independent safety: main changes during preparation leave uploaded objects unreachable',async()=>{
 const q=await queue(await draft()),r=remote();r.setFault((c,phase)=>{if(c.route==='/git/commits'&&c.method==='POST'&&phase==='after')r.changeMain();});await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'CONFLICT'});assert(r.commits.size);assert.equal(r.refs.size,0);assert.equal(r.pulls.length,0);assert.deepEqual(r.visible(),{});
});
test('independent safety: partial image uploads retain every raw draft and no visitor can reach them',async()=>{
 const d=await draft();d.image=png(4);d.reviewedFingerprint=await fingerprint(d);const q=await queue(d),before=copy(q.entries),r=remote();let count=0;
 r.setFault((c,phase)=>c.route==='/git/blobs'&&phase==='before'&&++count===2?answer({},503):null);await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'HTTP_503'});assert.equal(r.blobs.size,1);assert.equal(r.refs.size,0);assert.equal(r.pulls.length,0);assert.deepEqual(q.entries,before);assert.deepEqual(q.request.snapshot,before);assert.deepEqual(r.visible(),{});
 r.setFault(null);await r.publisher().publish(copy((await r.store.list())[0]),'synthetic-token');assert.equal(r.refs.size,1);assert.equal(r.pulls.length,1);assert.equal(JSON.parse(r.visible()['content/site-content.json']).news[0].body.en,d.record.body.en);
});
for(const endpoint of ['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls'])test(`independent safety: lost ${endpoint} reply + page reload yields exactly one visible branch/PR`,async()=>{
 const d=await draft(0,'create');d.image=png(6);d.reviewedFingerprint=await fingerprint(d);const q=await queue(d,await draft(1)),r=remote();let lost=false;
 r.setFault((c,phase)=>{if(!lost&&c.route===endpoint&&c.method==='POST'&&phase==='after'){lost=true;throw Error('synthetic transport loss');}});
 try{await r.publisher().publish(q,'synthetic-token');}catch(e){assert.equal(e.code,'NETWORK');}assert(lost);r.setFault(null);
 const saved=copy((await r.store.list())[0]);await r.publisher().publish(saved,'synthetic-token');assert.equal(r.refs.size,1);assert.equal(r.pulls.length,1);assert.equal(r.commits.size,1);assert.equal(r.trees.size,1);
 const data=JSON.parse(r.visible()['content/site-content.json']);assert.equal(data.news.filter(n=>n.id==='cms-'+d.id).length,1);assert.equal(saved.request.prNumber,701);
});
test('independent safety: frozen snapshots exclude later source edits and reject journal/queue mutation',async()=>{
 const d=await draft(),q=await queue(d),r=remote(),expected=d.record.body.en;r.setFault((c,p)=>{if(c.route==='/git/blobs'&&p==='after')d.record.body.en='unsent later source edit';});await r.publisher().publish(q,'synthetic-token');
 assert.equal(JSON.parse(r.visible()['content/site-content.json']).news[0].body.en,expected);assert.equal(q.request.snapshot[0].record.body.en,expected);
 await assert.rejects(enqueueDraft(q,await draft(1)),{code:'REQUEST_CHANGED'});assert.throws(()=>removeQueuedDraft(q,q.entries[0].id),{code:'REQUEST_CHANGED'});
 const postsBefore=posts(r).length,changed=copy((await r.store.list())[0]);changed.request.snapshot[0].record.body.en+=' changed';changed.request.snapshot[0].reviewedFingerprint=await fingerprint(changed.request.snapshot[0]);await assert.rejects(r.publisher().publish(changed,'synthetic-token'),{code:'REQUEST_CHANGED'});assert.equal(posts(r).length,postsBefore);
});
test('independent safety: double click and two fresh publishers using the real store yield one request',async()=>{
 const q=await queue(await draft()),stale=copy(q),r=remote(),p=r.publisher();const first=p.publish(q,'synthetic-token');assert.equal(first,p.publish(q,'synthetic-token'));
 const outcomes=await Promise.allSettled([first,r.publisher().publish(stale,'synthetic-token')]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.find(x=>x.status==='rejected').reason.code,'LOCAL_CONFLICT');assert.equal(r.refs.size,1);assert.equal(r.pulls.length,1);
});
test('independent safety: stale storage revisions abort without overwriting a newer confirmation',async()=>{
 const {store}=database(),q=await queue(await draft());let saved=await store.put(q),stale=copy(saved);saved.reviewedFingerprint='';saved=await store.put(saved);await assert.rejects(store.put(stale),{code:'LOCAL_CONFLICT'});assert.deepEqual((await store.list())[0],saved);
});
test('independent safety: a persisted request cannot be cleared or substituted through an ordinary save',async()=>{
 const r=remote(),q=await queue(await draft());await r.publisher().publish(q,'synthetic-token');const saved=copy((await r.store.list())[0]);
 const cleared=copy(saved);cleared.request=null;await assert.rejects(r.store.put(cleared),codeIn('REQUEST_CHANGED','INVALID'));
 const substituted=copy(saved);substituted.request.snapshot[0].record.body.en+=' replacement';await assert.rejects(r.store.put(substituted),codeIn('REQUEST_CHANGED','INVALID'));
 assert.deepEqual((await r.store.list())[0],saved);
});
test('independent safety: same article in a second pending request is rejected atomically despite a new draft ID',async()=>{
 const {store}=database(),r=remote(store),first=await queue(await draft()),second=await queue(await draft());assert.notEqual(first.entries[0].id,second.entries[0].id);await r.publisher().publish(first,'synthetic-token');
 const before=posts(r).length;await assert.rejects(r.publisher().publish(second,'synthetic-token'),codeIn('REQUEST_CHANGED','BATCH_CONFLICT'));assert.equal(posts(r).length,before);assert.equal(r.pulls.length,1);
});
test('independent safety: one draft ID claimed by a submitted batch cannot reenter another queue',async()=>{
 const {store}=database(),r=remote(store),d=await draft(),q=await queue(d);await r.publisher().publish(q,'synthetic-token');await assert.rejects(store.enqueue(newBatch(),d),{code:'REQUEST_CHANGED'});assert.equal((await store.list()).length,1);
});
test('independent safety: storage failure before journaling keeps inputs and prevents public objects',async()=>{
 const q=await queue(await draft()),entries=copy(q.entries),r=remote();r.failStorage(true);await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'STORAGE'});assert.equal(posts(r).length,0);assert.deepEqual(q.entries,entries);assert.deepEqual(r.visible(),{});
});
test('independent safety: nested credential objects in diagnostic slots are stripped while Blobs/locales survive',async()=>{
 const d=await draft();d.image=png(8);d.reviewedFingerprint=await fingerprint(d);const q=await queue(d);q.token='synthetic-private';q.entries[0].token='synthetic-private';
 q.request={fingerprint:await batchFingerprint(q),snapshot:copy(q.entries),token:'synthetic-private',prErrorStage:{token:'synthetic-private'},prErrorCode:'synthetic-private',prErrorStatus:{token:'synthetic-private'}};
 const saved=persistedBatch(q);assert(!JSON.stringify(saved).includes('synthetic-private'));assert(saved.entries[0].image instanceof Blob);assert(saved.request.snapshot[0].image instanceof Blob);assert.equal(saved.entries[0].record.body.fr,d.record.body.fr);
});
test('independent safety: changed confirmation during asynchronous preparation cannot upload any blob',async()=>{
 const q=await queue(await draft()),r=remote();let changed=false;
 r.setFault((c,p)=>{if(!changed&&p==='before'&&c.route==='/contents/news.html'){changed=true;q.entries[0].record.body.en+=' unreviewed during preparation';}});
 await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'REQUEST_CHANGED'});assert(changed);assert.equal(posts(r).length,0);assert(q.entries[0].record.body.en.endsWith('during preparation'));
});
for(const route of ['/git/refs','/pulls'])test(`independent safety: ${route} succeeded but journal save failed; retry recovers the existing remote object`,async()=>{
 const q=await queue(await draft()),r=remote();let failed=false;
 r.setFault((c,p)=>{if(!failed&&c.route===route&&c.method==='POST'&&p==='after'){failed=true;r.failStorage(true);}});
 await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'STORAGE'});assert(failed);assert.equal(r.refs.size,1);const before=posts(r).length;
 r.failStorage(false);r.setFault(null);await r.publisher().publish(copy((await r.store.list())[0]),'synthetic-token');
 assert.equal(r.refs.size,1);assert.equal(r.pulls.length,1);assert.equal(posts(r).slice(before).filter(c=>c.route!== '/pulls').length,0);assert.equal(posts(r).filter(c=>c.route==='/pulls').length,1);
});
test('independent safety: PR creation denied then lookup unknown never claims manual success or duplicates PR POST',async()=>{
 const q=await queue(await draft()),r=remote();let attempted=false;
 r.setFault((c,p)=>{if(p!=='before'||c.route!=='/pulls')return;if(c.method==='POST'){attempted=true;return answer({},403);}if(attempted)return answer({},503);});
 await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'HTTP_503'});assert.equal(q.request.prErrorStage,'lookup');assert.equal(q.request.prErrorCode,'HTTP_503');assert(q.request.branchReady);assert.equal(r.pulls.length,0);assert.equal(posts(r).filter(c=>c.route==='/pulls').length,1);
 const saved=copy((await r.store.list())[0]);await assert.rejects(r.publisher().publish(saved,'synthetic-token'),{code:'HTTP_503'});assert.equal(posts(r).filter(c=>c.route==='/pulls').length,1);assert(saved.entries[0].record.body.en.includes('Synthetic body'));
 r.setFault(null);await r.publisher().publish(copy((await r.store.list())[0]),'synthetic-token');assert.equal(r.pulls.length,1);assert.equal(r.refs.size,1);
});
for(const state of ['closed','merged'])test(`independent safety: verified ${state} PR releases the article claim but permanently retains its draft-ID claim`,async()=>{
 const {store}=database(),r=remote(store),d=await draft(),q=await queue(d);await r.publisher().publish(q,'synthetic-token');const before=posts(r).length;
 r.pulls[0].state='closed';if(state==='merged'){r.pulls[0].merged_at='2026-10-21T11:00:00Z';r.pulls[0].merge_commit_sha=hash('synthetic merge');}
 const saved=copy((await store.list())[0]);await r.publisher().refresh(saved);assert.equal(saved.request.prState,state);assert.equal(posts(r).length,before);
 await assert.rejects(store.enqueue(newBatch(),d),{code:'REQUEST_CHANGED'});const next=await store.enqueue(newBatch(),await draft());assert.equal(next.entries.length,1);
});
test('independent safety: terminal PR with a foreign head cannot release its article claim',async()=>{
 const {store}=database(),r=remote(store),q=await queue(await draft());await r.publisher().publish(q,'synthetic-token');const before=copy((await store.list())[0]);r.pulls[0].state='closed';r.pulls[0].head.sha=hash('foreign commit');
 await assert.rejects(r.publisher().refresh(copy(before)),{code:'CONFLICT'});assert.deepEqual((await store.list())[0],before);await assert.rejects(store.enqueue(newBatch(),await draft()),{code:'BATCH_CONFLICT'});
});
test('independent safety: frozen journal commit/PR progress cannot roll back to permit a new publication',async()=>{
 const r=remote(),q=await queue(await draft());await r.publisher().publish(q,'synthetic-token');const saved=copy((await r.store.list())[0]);
 for(const key of ['commitSha','prNumber','prUrl','branchReady']){const changed=copy(saved);delete changed.request[key];await assert.rejects(r.store.put(changed),{code:'REQUEST_CHANGED'});}
 assert.deepEqual((await r.store.list())[0],saved);assert.equal(r.pulls.length,1);
});
test('independent safety: incomplete manual copy remains editable and cannot enter an otherwise valid queue',async()=>{
 const invalid=[d=>d.record.title.en='',d=>d.record.body['zh-CN']=' ',d=>d.record.date='2026-02-30',d=>d.record.category='unapproved',d=>d.record.body.ja='x'.repeat(20001)];
 for(const mutate of invalid){const q=await queue(await draft()),before=copy(q),d=await draft(1);mutate(d);d.reviewedFingerprint=await fingerprint(d);const untouched=copy(d);await assert.rejects(enqueueDraft(q,d),{code:'INCOMPLETE'});assert.deepEqual(q,before);assert.deepEqual(d,untouched);assert.equal(q.request,null);}
});
test('independent safety: a missing source article is rejected before immutable journaling or any remote write',async()=>{
 const d=await draft();d.sourceId='missing-synthetic-article';d.reviewedFingerprint=await fingerprint(d);const q=await queue(d),before=copy(q.entries),r=remote();await assert.rejects(r.publisher().publish(q,'synthetic-token'),{code:'CONFLICT'});assert.equal(q.request,null);assert.deepEqual(q.entries,before);assert.equal(posts(r).length,0);assert.equal((await r.store.list()).length,0);
});
