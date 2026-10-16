import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {NewsPublisher,CmsError,newDraft,fingerprint,applyDraft,persistedDraft,inspectImage,errorText,REPO} from '../cms-news-workflow.js';
import {localNews,renderNewsPage} from '../news-renderer.js';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const hash=value=>createHash('sha1').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const content=JSON.parse(read('content/site-content.json')),main=hash('main'),contentSha=hash(read('content/site-content.json'));
const response=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
test('editorial updates cannot silently change unrelated CMS business/profile data',()=>{
 const old=JSON.parse(execFileSync('git',['show','dded9bed0abaff3a015ba0600d9031e09437d12a:content/site-content.json'],{cwd:root,encoding:'utf8'}));
 const unmanaged=value=>{const result=structuredClone(value);delete result.news;delete result.newsFallbackImage;if(result.instagram)delete result.instagram.image;return result;};
 assert.deepEqual(unmanaged(content),unmanaged(old));
 assert.equal(new Set(content.news.map(n=>n.id)).size,content.news.length);assert(content.news.length>0);
 for(const item of content.news)for(const key of ['title','body'])for(const locale of ['ja','en','zh-CN'])assert.equal(typeof item[key]?.[locale],'string');
});
function fixture(){
 const calls=[],blobs=new Map(),trees=new Map(),commits=new Map(),refs=new Map(),pulls=[],journal=new Map();let fault=null,changed=false,saveFail=false;
 const files=Object.fromEntries(['content/site-content.json','build-version.txt','news.html','ja/news.html','zh/news.html','sitemap-lastmod.json','sitemap.xml'].map(file=>[file,read(file)]));
 const fetch=async(url,options={})=>{
  const u=new URL(url),path=u.pathname.replace('/repos/'+REPO,''),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({path,method,body});
  assert.equal(u.origin,'https://api.github.com');assert(['GET','POST'].includes(method));assert(!path.includes('/merges')&&!path.includes('/reviews'));
  const attempt=fault?.(path,method,body,'before');if(attempt instanceof Response)return attempt;
  let result;
  if(path==='/user')result={login:'tester',id:123};
  else if(path==='/git/ref/heads/main')result={object:{sha:main}};
  else if(path.startsWith('/contents/')){const file=decodeURIComponent(path.slice(10));if(!(file in files))return response({},404);result={type:'file',encoding:'base64',sha:changed&&file==='content/site-content.json'?hash('changed'):hash(files[file]),content:Buffer.from(files[file]).toString('base64')};}
  else if(path==='/pulls'&&method==='GET')result=pulls;
  else if(path.startsWith('/pulls/')&&method==='GET')result=pulls[0];
  else if(path.startsWith('/commits/')&&path.endsWith('/check-runs'))result={check_runs:[{name:'validate',status:'completed',conclusion:'success'}]};
  else if(path.startsWith('/commits/')&&path.endsWith('/status'))result={statuses:[]};
  else if(path==='/git/blobs'){const sha=hash(body);blobs.set(sha,body);result={sha};}
  else if(path.startsWith('/git/commits/'))result={tree:{sha:hash('base tree')}};
  else if(path==='/git/trees'){const sha=hash(body);trees.set(sha,body);result={sha};}
  else if(path==='/git/commits'){const sha=hash(body);commits.set(sha,body);result={sha};}
  else if(path==='/git/refs'){if(refs.has(body.ref))return response({message:'Reference already exists'},422);refs.set(body.ref,body.sha);result={object:{sha:body.sha}};}
  else if(path.startsWith('/git/ref/heads/')){const sha=refs.get('refs/heads/'+path.slice(15));if(!sha)return response({},404);result={object:{sha}};}
  else if(path==='/pulls'&&method==='POST'){const sha=refs.get('refs/heads/'+body.head);result={number:101,html_url:`https://github.com/${REPO}/pull/101`,head:{ref:body.head,sha,repo:{full_name:REPO}},base:{ref:'main'},state:'open'};pulls.push(result);}
  else if(path.startsWith('/compare/'))return response({status:'diverged',files:[]});
  else throw new Error('Unexpected mock request: '+path);
  const after=fault?.(path,method,body,'after');if(after instanceof Response)return after;return response(result);
 };
 const persist=async d=>{if(saveFail)throw new CmsError('STORAGE');const revision=journal.get(d.id)?.revision||0;if(revision!==d.revision)throw new CmsError('LOCAL_CONFLICT');const saved=persistedDraft({...d,revision:revision+1});journal.set(d.id,saved);return saved;};
 const publisher=()=>new NewsPublisher({fetch,persist,now:()=> '2026-10-18T12:00:00.000Z'});
 return {publisher,calls,blobs,trees,commits,refs,pulls,journal,setFault:f=>fault=f,changeMain:()=>changed=true,failStorage:(value=true)=>saveFail=value};
}
async function draft(existing=true){const d=newDraft(existing?content.news[0]:null,contentSha);if(!existing){d.record.title={ja:'試験用ニュース',en:'Test news','zh-CN':'测试新闻'};d.record.body={ja:'試験本文',en:'Test body','zh-CN':'测试正文'};}d.record.body.ja+='\n試験用の追記';d.reviewedFingerprint=await fingerprint(d);return d;}
function finalFiles(f){const tree=[...f.trees.values()].at(-1);return Object.fromEntries(tree.tree.map(x=>[x.path,f.blobs.get(x.sha)]));}
for(const file of ['cms-faq-workflow.js','faq-admin-safe.js'])for(const tampered of [false,true])test(`FAQ asset cache follow-up ${file}: ${tampered?'code changes are rejected':'dated cache keys are accepted'}`,async()=>{
 const base='a'.repeat(40),head='b'.repeat(40),calls=[];
 const publisher=new NewsPublisher({fetch:async(url,options={})=>{const u=new URL(url);calls.push({path:u.pathname,method:options.method||'GET'});
  if(u.pathname.includes('/compare/'))return response({status:'ahead',files:[{filename:file}]});
  if(u.pathname.endsWith('/contents/'+file)){const old=u.searchParams.get('ref')===base,text=`import './cms-news-workflow.js?v=${old?'20261016-143653':'20261017-010101'}';\n${!old&&tampered?'export const unreviewed=true;\n':''}`;return response({type:'file',encoding:'base64',content:Buffer.from(text).toString('base64')});}
  throw new Error('Unexpected synthetic URL');}});
 const checking=publisher.verifyBranch({commitSha:base},head,'synthetic-token');
 if(tampered)await assert.rejects(checking,{code:'CONFLICT'});else await checking;
 assert(calls.every(call=>call.method==='GET'));
});
test('an unrelated script cannot bypass branch verification as a cache follow-up',async()=>{
 const publisher=new NewsPublisher({fetch:async()=>response({status:'ahead',files:[{filename:'faq-unreviewed.js'}]})});
 await assert.rejects(publisher.verifyBranch({commitSha:'a'.repeat(40)},'b'.repeat(40),'synthetic-token'),{code:'CONFLICT'});
});
test('article-only update: all locales preserved; static HTML and sitemap travel in the same commit; no main PUT',async()=>{
 const f=fixture(),d=await draft(),old=structuredClone(d.record);const result=await f.publisher().publish(d,'synthetic-token');assert.equal(result.pr.number,101);assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
 const files=finalFiles(f),cms=JSON.parse(files['content/site-content.json'].content),item=cms.news.find(x=>x.id===d.sourceId);assert.equal(item.body.en,old.body.en);assert.equal(item.body['zh-CN'],old.body['zh-CN']);
 for(const [file,locale]of [['news.html','en'],['ja/news.html','ja'],['zh/news.html','zh']]){
  const expected=renderNewsPage(read(file),cms,read('build-version.txt').trim());if(expected!==read(file))assert(files[file]);const generated=files[file]?.content||read(file);assert.equal(generated,expected);
  const seed=JSON.parse(generated.match(/id="book-news-data">([\s\S]*?)<\/script>/)[1]),index=generated.match(/<section\b[^>]*\bdata-news-index\b[^>]*>([\s\S]*?)<\/section>/);
  assert.deepEqual(seed.items,localNews(cms,locale),'CMS-generated seed preserves every localized article, Top selection and source metadata');
  assert(index);assert.match(index[0].split('>')[0],/\shidden(?:\s|$)/);assert.match(generated,/<section\b[^>]*\bdata-news-overview\b/);
  const rows=[...index[1].matchAll(/data-story-id="([^"]+)"/g)].map(match=>match[1]);assert.deepEqual(rows,seed.items.map(article=>article.id));assert.equal(new Set(rows).size,cms.news.length);
  for(const marker of ['data-news-view-all','data-news-back'])assert(generated.includes(marker));
  for(const article of seed.items)assert(index[1].includes(`<div class="wire-type">${article.category}</div>`));
 }
 assert.equal(JSON.parse(files['sitemap-lastmod.json']?.content||read('sitemap-lastmod.json'))['ja/news.html'],'2026-10-18');
 assert(!f.calls.some(x=>x.method==='PUT'||x.method==='PATCH'));assert(![...f.refs.keys()].includes('refs/heads/main'));assert.deepEqual(content,JSON.parse(read('content/site-content.json')));
});
test('image replacement: one ref exposes image + article together, never image-only main changes',async()=>{
 const f=fixture(),d=await draft();d.image=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10,1])],{type:'image/png'});d.reviewedFingerprint=await fingerprint(d);await f.publisher().publish(d,'synthetic-token');const files=finalFiles(f),images=Object.keys(files).filter(x=>x.startsWith('assets/cms/'));assert.equal(images.length,1);assert.equal(files[images[0]].encoding,'base64');assert.equal(JSON.parse(files['content/site-content.json'].content).news.find(x=>x.id===d.sourceId).image,images[0]);
 const refIndex=f.calls.findIndex(x=>x.path==='/git/refs');assert(f.calls.slice(0,refIndex).some(x=>x.path==='/git/commits'&&x.method==='POST'));
});
test('double click and page reload retry reuse the same article, branch and PR',async()=>{
 const f=fixture(),d=await draft(false),p=f.publisher();await Promise.all([p.publish(d,'synthetic-token'),p.publish(d,'synthetic-token')]);await f.publisher().publish(structuredClone(f.journal.get(d.id)),'synthetic-token');assert.equal(f.pulls.length,1);assert.equal(f.refs.size,1);assert.equal(f.calls.filter(x=>x.path==='/pulls'&&x.method==='POST').length,1);assert.equal(JSON.parse(finalFiles(f)['content/site-content.json'].content).news.filter(x=>x.id===`cms-${d.id}`).length,1);
});
for(const phase of ['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls'])test(`ambiguous response at ${phase}: retry is idempotent`,async()=>{
 const f=fixture(),d=await draft(false);let fired=false;f.setFault((path,method,body,when)=>{if(path===phase&&method==='POST'&&when==='after'&&!fired){fired=true;throw new Error('connection lost');}});try{await f.publisher().publish(d,'synthetic-token');}catch(e){assert.equal(e.code,'NETWORK');}assert(fired);f.setFault(null);await f.publisher().publish(structuredClone(f.journal.get(d.id)),'synthetic-token');assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
});
test('main content conflict blocks every remote write and keeps the original draft',async()=>{const f=fixture(),d=await draft();f.changeMain();await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'CONFLICT'});assert.equal(f.calls.filter(x=>x.method==='POST').length,0);assert(d.record.body.ja.includes('試験用'));});
test('retry after merge returns existing PR even though main content moved',async()=>{const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');f.pulls[0].merged_at='2026-10-16';f.changeMain();const result=await f.publisher().publish(d,'synthetic-token');assert.equal(result.pr.number,101);assert.equal(f.pulls.length,1);});
test('changed request/branch does not get overwritten or create another PR',async()=>{const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');d.record.body.en+=' other';d.reviewedFingerprint=await fingerprint(d);await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REQUEST_CHANGED'});d.record.body.en=d.record.body.en.slice(0,-6);d.reviewedFingerprint=await fingerprint(d);f.pulls[0].head.sha=hash('foreign change');await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'CONFLICT'});assert.equal(f.pulls.length,1);});
for(const [http,code] of [[401,'AUTH'],[403,'PERMISSION'],[409,'CONFLICT'],[429,'RATE_LIMIT']])test(`${http} yields actionable Japanese error and retains inputs`,async()=>{const f=fixture(),d=await draft();f.setFault((p,m,b,when)=>when==='before'&&p==='/git/blobs'?response({message:'failure'},http):null);await assert.rejects(f.publisher().publish(d,'synthetic-token'),e=>e.code===code&&/。/.test(errorText(e)));assert.equal(f.refs.size,0);assert(d.record.body.ja.includes('試験用'));});
test('PR creation 403: persist the completed branch and manual recovery, without assuming a permission cause',async()=>{
 const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>p==='/pulls'&&m==='POST'&&w==='before'?response({},403):null);
 const result=await f.publisher().publish(d,'synthetic-token');assert(result.manual);assert.equal(result.compareUrl,`https://github.com/${REPO}/compare/main...${encodeURIComponent(d.request.branch)}?expand=1`);
 const saved=structuredClone(f.journal.get(d.id));assert(saved.request.branchReady);assert.equal(saved.request.prErrorStage,'create');assert.equal(saved.request.prErrorCode,'PERMISSION');assert.equal(saved.request.prErrorStatus,403);assert.equal(f.refs.size,1);assert.equal(f.pulls.length,0);
 const postCounts=f.calls.filter(call=>call.method==='POST'&&call.path!=='/pulls').length,commit=saved.request.commitSha;f.changeMain();
 await f.publisher().publish(saved,'synthetic-token');assert.equal(f.calls.filter(call=>call.method==='POST'&&call.path!=='/pulls').length,postCounts);assert.equal(saved.request.commitSha,commit);assert.equal(f.refs.size,1);
 f.setFault(null);const completed=await f.publisher().publish(saved,'synthetic-token');assert.equal(completed.pr.number,101);assert.equal(f.pulls.length,1);
 for(const key of ['prErrorStage','prErrorCode','prErrorStatus'])assert.equal(f.journal.get(d.id).request[key],undefined);
});

for(const [failure,code,status]of [['network','NETWORK',undefined],['server','HTTP_503',503],['permission','PERMISSION',403]])test(`PR POST failure followed by ${failure} lookup failure stays unconfirmed and persists the lookup stage`,async()=>{
 const f=fixture(),d=await draft();let attempted=false;
 f.setFault((p,m,b,w)=>{if(w!=='before'||p!=='/pulls')return null;if(m==='POST'){attempted=true;return response({},403);}if(attempted){if(failure==='network')throw Error('synthetic-sensitive-detail');return response({message:'synthetic-sensitive-detail'},status);}return null;});
 await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code});const tx=f.journal.get(d.id).request;
 assert.equal(tx.prErrorStage,'lookup');assert.equal(tx.prErrorCode,code);assert.equal(tx.prErrorStatus,status);assert(tx.branchReady);assert.equal(f.calls.filter(call=>call.path==='/pulls'&&call.method==='POST').length,1);assert.equal(f.pulls.length,0);assert(!JSON.stringify(tx).includes('synthetic-sensitive-detail'));
});

for(const [http,headers]of [[403,{'x-ratelimit-remaining':'0'}],[429,{}]])test(`PR rate limit ${http} is recorded without manual-success classification`,async()=>{
 const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>p==='/pulls'&&m==='POST'&&w==='before'?response({},http,headers):null);
 await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'RATE_LIMIT'});const tx=f.journal.get(d.id).request;assert.equal(tx.prErrorStage,'create');assert.equal(tx.prErrorCode,'RATE_LIMIT');assert.equal(tx.prErrorStatus,http);assert(tx.branchReady);assert.equal(f.pulls.length,0);
});

test('a saved legacy branch resumes after code upgrade and main changes without rebuilding its article or commit',async()=>{
 const f=fixture(),d=await draft();d.record.link='license.html';d.record.translationStatus='seeded';d.reviewedFingerprint=await fingerprint(d);
 const branch=`cms/news-${d.id}-${d.reviewedFingerprint.slice(0,12)}`,commitSha=hash('synthetic-legacy-commit');
 const legacyContent=structuredClone(content),legacyRecord=legacyContent.news.find(item=>item.id===d.sourceId);Object.assign(legacyRecord,d.record,{link:'news.html',translationStatus:'ja-en-zh-reviewed',image:'assets/cms/synthetic-existing.png'});
 f.blobs.set(hash('synthetic-legacy-blob'),{content:JSON.stringify(legacyContent),encoding:'utf-8'});f.commits.set(commitSha,{tree:hash('synthetic-legacy-tree')});f.refs.set('refs/heads/'+branch,commitSha);
 d.request={fingerprint:d.reviewedFingerprint,baseSha:main,baseContentSha:contentSha,createdAt:'2026-10-18T12:00:00.000Z',branch,actor:'tester',commitSha,branchReady:true};f.journal.set(d.id,persistedDraft(d));f.changeMain();
 const remoteBefore=structuredClone([...f.blobs]),result=await f.publisher().publish(structuredClone(f.journal.get(d.id)),'synthetic-token');assert.equal(result.pr.number,101);
 assert.deepEqual([...f.blobs],remoteBefore);assert.equal(f.refs.get('refs/heads/'+branch),commitSha);assert.equal(f.journal.get(d.id).request.commitSha,commitSha);
 assert.deepEqual(f.calls.filter(call=>call.method==='POST').map(call=>call.path),['/pulls']);assert(!f.calls.some(call=>call.path.startsWith('/contents/')));
});

test('a successful ref with an unsaved ready flag resumes from its saved commit without rebuilding',async()=>{
 const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>{if(p==='/git/refs'&&m==='POST'&&w==='after')f.failStorage();return null;});
 await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'STORAGE'});const saved=structuredClone(f.journal.get(d.id));assert(saved.request.commitSha);assert(!saved.request.branchReady);assert.equal(f.refs.size,1);
 const postCounts=f.calls.filter(call=>call.method==='POST').length;f.failStorage(false);f.setFault(null);await f.publisher().publish(saved,'synthetic-token');
 assert.deepEqual(f.calls.filter(call=>call.method==='POST').slice(postCounts).map(call=>call.path),['/pulls']);assert.equal(saved.request.commitSha,f.journal.get(d.id).request.commitSha);assert.equal(f.refs.size,1);
});

for(const failure of ['missing','network','foreign'])test(`saved branch ${failure} stops recovery before all remote writes`,async()=>{
 const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>p==='/pulls'&&m==='POST'&&w==='before'?response({},403):null);await f.publisher().publish(d,'synthetic-token');
 const saved=structuredClone(f.journal.get(d.id)),postCounts=f.calls.filter(call=>call.method==='POST').length;
 if(failure==='missing')f.refs.delete('refs/heads/'+saved.request.branch);if(failure==='foreign')f.refs.set('refs/heads/'+saved.request.branch,hash('synthetic-foreign-head'));
 f.setFault((p,m,b,w)=>{if(failure==='network'&&p==='/git/ref/heads/'+saved.request.branch&&w==='before')throw Error('synthetic-network');return null;});
 await assert.rejects(f.publisher().publish(saved,'synthetic-token'),{code:failure==='network'?'NETWORK':'CONFLICT'});assert.equal(f.calls.filter(call=>call.method==='POST').length,postCounts);assert.equal(f.journal.get(d.id).request.prErrorStage,'branch');assert.equal(f.pulls.length,0);
});

test('a cache-only follow-up on a saved branch preserves the original commit and creates only its PR',async()=>{
 const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>p==='/pulls'&&m==='POST'&&w==='before'?response({},403):null);await f.publisher().publish(d,'synthetic-token');
 const saved=structuredClone(f.journal.get(d.id)),original=saved.request.commitSha,newHead=hash('synthetic-cache-head'),postCounts=f.calls.filter(call=>call.method==='POST').length;let reads=0;f.refs.set('refs/heads/'+saved.request.branch,newHead);
 f.setFault((p,m,b,w)=>{if(w!=='before')return null;if(p.startsWith('/compare/'))return response({status:'ahead',files:[{filename:'cms-admin.js'}]});if(p==='/contents/cms-admin.js')return response({type:'file',encoding:'base64',content:Buffer.from(`import './cms-news-workflow.js?v=${reads++%2?'20261019-010101':'20261018-010101'}';`).toString('base64')});return null;});
 await f.publisher().publish(saved,'synthetic-token');assert.equal(saved.request.commitSha,original);assert.equal(f.refs.get('refs/heads/'+saved.request.branch),newHead);assert.deepEqual(f.calls.filter(call=>call.method==='POST').slice(postCounts).map(call=>call.path),['/pulls']);
});

for(const state of ['open','closed','merged'])test(`recover an existing ${state} PR and clear stale diagnostics without creating another`,async()=>{
 const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');d.request.prErrorStage='create';d.request.prErrorCode='PERMISSION';d.request.prErrorStatus=403;f.pulls[0].state=state==='open'?'open':'closed';if(state==='merged')f.pulls[0].merged_at='2026-10-18';
 f.changeMain();const posts=f.calls.filter(call=>call.method==='POST').length,result=await f.publisher().publish(d,'synthetic-token');assert.equal(result.pr.number,101);assert.equal(f.calls.filter(call=>call.method==='POST').length,posts);assert.equal(f.pulls.length,1);assert.equal(f.journal.get(d.id).request.prErrorCode,undefined);
});

test('recovery lookup failure and changed approval stop before any new POST',async()=>{
 const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>p==='/pulls'&&m==='POST'&&w==='before'?response({},403):null);await f.publisher().publish(d,'synthetic-token');const posts=f.calls.filter(call=>call.method==='POST').length;
 f.setFault((p,m,b,w)=>p==='/pulls'&&m==='GET'&&w==='before'?response({},503):null);await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'HTTP_503'});assert.equal(d.request.prErrorStage,'lookup');assert.equal(f.calls.filter(call=>call.method==='POST').length,posts);
 f.setFault(null);d.record.body.en+=' synthetic change';d.reviewedFingerprint=await fingerprint(d);await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REQUEST_CHANGED'});assert.equal(d.request.prErrorStage,'branch');assert.equal(d.request.prErrorCode,'REQUEST_CHANGED');assert.equal(f.calls.filter(call=>call.method==='POST').length,posts);
});

test('recovery diagnostics use only allowed scalar fields and a storage failure cannot report manual success',async()=>{
 const d=await draft();d.request={prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403,body:'synthetic-private-detail',headers:{Authorization:'synthetic-private-detail'}};
 assert.deepEqual(persistedDraft(d).request,{prErrorStage:'create',prErrorCode:'PERMISSION',prErrorStatus:403});
 d.request={prErrorStage:{token:'synthetic-private-detail'},prErrorCode:'synthetic-private-detail',prErrorStatus:{token:'synthetic-private-detail'}};assert.deepEqual(persistedDraft(d).request,{});
 const f=fixture(),saved=await draft();f.setFault((p,m,b,w)=>{if(p==='/pulls'&&m==='POST'&&w==='before'){f.failStorage();return response({},403);}return null;});await assert.rejects(f.publisher().publish(saved,'synthetic-token'),{code:'STORAGE'});assert.equal(f.refs.size,1);assert.equal(f.pulls.length,0);
});

test('a draft changed during preparation cannot reach a remote write',async()=>{
 const f=fixture(),d=await draft();let changed=false;f.setFault((p,m,b,w)=>{if(!changed&&w==='before'&&p==='/contents/news.html'){changed=true;d.record.body.en+=' synthetic unreviewed change';}return null;});
 await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REQUEST_CHANGED'});assert.equal(f.calls.filter(call=>call.method==='POST').length,0);
});

test('image-only editing preserves source links, translation status, unknown metadata and extra locales',()=>{
 const source=structuredClone(content),old=source.news[0];old.link='license.html';old.translationStatus='seeded';old.unknown={preserve:true};old.title.fr='Synthetic title';old.body.fr='Synthetic body';
 const d=newDraft(old,contentSha);d.record.link='news.html';d.record.translationStatus='ja-en-zh-reviewed';d.record.unknown={preserve:false};d.image=new Blob(['synthetic']);
 const next=applyDraft(source,d,'assets/cms/synthetic.png');assert.deepEqual(next.news[0],{...old,image:'assets/cms/synthetic.png'});assert.deepEqual(next.news.slice(1),source.news.slice(1));assert.deepEqual({...next,news:null},{...source,news:null});
 delete old.link;delete old.translationStatus;const missing=newDraft(old,contentSha);missing.record.link='news.html';missing.record.translationStatus='ja-en-zh-reviewed';assert(!Object.hasOwn(applyDraft(source,missing).news[0],'link'));assert(!Object.hasOwn(applyDraft(source,missing).news[0],'translationStatus'));
 const created=newDraft();created.record={...structuredClone(old),title:{ja:'合成新規',en:'Synthetic new','zh-CN':'合成新增'},body:{ja:'合成本文',en:'Synthetic body','zh-CN':'合成正文'}};const added=applyDraft(source,created).news.at(-1);assert.equal(added.link,'news.html');assert.equal(added.translationStatus,'ja-en-zh-reviewed');
});

for(const count of [0,1,10,11])test(`saving with ${count} explicit Top News selections preserves every other selection without imposing a cap`,()=>{
 const source={news:Array.from({length:count+2},(_,i)=>({...structuredClone(content.news[0]),id:`synthetic-${i}`,featured:i<count}))},last=source.news.at(-1),image=newDraft(last,contentSha);image.image=new Blob(['synthetic']);
 const replaced=applyDraft(source,image,'assets/cms/synthetic.png');assert.deepEqual(replaced.news.map(item=>item.featured),source.news.map(item=>item.featured));
 const editing=newDraft(last,contentSha);editing.record.featured=true;const edited=applyDraft(source,editing);assert.deepEqual(edited.news.slice(0,-1),source.news.slice(0,-1));assert.equal(edited.news.filter(item=>item.featured).length,count+1);
 const restored=persistedDraft(editing);assert.equal(applyDraft(source,restored).news.at(-1).featured,true);assert.equal(newDraft(edited.news.at(-1),contentSha).record.featured,true,'Top News selection survives saving and reopening');
 const creating=newDraft();creating.record={...structuredClone(last),featured:true};const added=applyDraft(source,creating);assert.deepEqual(added.news.slice(0,-1),source.news);assert.equal(added.news.filter(item=>item.featured).length,count+1);
});

test('deleting the last selected Top News does not select a replacement and still protects the last article',()=>{
 const source={news:[{...structuredClone(content.news[0]),id:'synthetic-top',featured:true},{...structuredClone(content.news[0]),id:'synthetic-other',featured:false}]},d=newDraft(source.news[0],contentSha);d.operation='delete';
 assert.deepEqual(applyDraft(source,d).news,[source.news[1]]);assert.throws(()=>applyDraft({news:[source.news[0]]},d),{code:'LAST_ARTICLE'});
});
test('storage failure/review missing prevent remote writes; persisted drafts exclude credentials',async()=>{const f=fixture(),d=await draft();f.failStorage();await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'STORAGE'});assert.equal(f.calls.filter(x=>x.method==='POST').length,0);d.reviewedFingerprint='';await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REVIEW'});d.token='secret';d.adminKey='secret';d.record.token='secret';d.request={token:'secret'};assert(!JSON.stringify(persistedDraft(d)).includes('secret'));});
test('safe image validation rejects SVG, disguised and oversized files',async()=>{for(const blob of [new Blob(['<svg/>'],{type:'image/svg+xml'}),new Blob(['not png'],{type:'image/png'}),new Blob([new Uint8Array(8*1024*1024+1)],{type:'image/png'})])await assert.rejects(inspectImage(blob),{code:'IMAGE'});});
test('deletion and media changes preserve unrelated data and translations',async()=>{const d=await draft();d.operation='delete';const next=applyDraft(content,d);assert.equal(next.news.length,content.news.length-1);assert.deepEqual({...next,news:null},{...content,news:null});d.operation='media';d.mediaTarget='fallback';d.removeImage=false;const media=applyDraft(content,d,'assets/cms/test.png');assert.equal(media.newsFallbackImage,'assets/cms/test.png');assert.deepEqual(media.news,content.news);});
test('translation failure leaves values untouched and never replays save/publication clicks',async()=>{let calls=0;const window={FDE_CONTACT_API:'https://example.invalid'},context={window,document:{getElementById:()=>({value:'synthetic-key'})},fetch:async()=>{calls++;return response({},503);},AbortController,setTimeout,clearTimeout};vm.runInNewContext(read('news-translation-hook.js'),context);await assert.rejects(window.FDE_NEWS_TRANSLATE('見出し','本文'),e=>e.code==='TRANSLATION');assert.equal(calls,1);assert(!read('news-translation-hook.js').includes('btn.click'));assert(!read('news-translation-hook.js').includes('addEventListener'));});
test('shared CMS key remains memory-only and News notices do not expire as transient toasts',()=>{const config=read('contact-config.js');assert.doesNotMatch(config,/sessionStorage|localStorage/);assert.match(config,/let adminSessionKey=''/);assert.match(config,/el.dataset.cmsPersistent==='true'/);assert.match(read('cms-admin.js'),/const key=\$\('adminKey'\)\|\|make\('input'\)/);});
test('exact-head check status is distinct from publication; cancelled/skipped is not PASS',async()=>{const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');assert.match((await f.publisher().status(101)).label,/本人承認待ち/);f.setFault((p,m,b,w)=>w==='before'&&p.endsWith('/check-runs')?response({check_runs:[{name:'validate',status:'completed',conclusion:'cancelled'}]}):null);assert.match((await f.publisher().status(101)).label,/検査失敗/);});

// Opt-in full pipeline rehearsal: a disposable local clone, never a remote PR.
if(process.env.CMS_GIT_INTEGRATION==='1')test('synthetic editorial deletion passes the actual repository and multilingual pipeline',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'fde-cms-integration-')),repo=path.join(dir,'repo');
 const run=(cmd,args,env={})=>execFileSync(cmd,args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,CMS_GIT_INTEGRATION:'0',SITEMAP_BASE_REF:'origin/main',...env}});
 try{
  execFileSync('git',['clone','--shared','--no-hardlinks',fileURLToPath(root),repo],{stdio:'pipe'});
  run('git',['update-ref','refs/remotes/origin/main',execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8'}).trim()]);
  const changed=execFileSync('git',['diff','--name-only','--diff-filter=ACM'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(x=>!x.startsWith('output/'));
  for(const file of [...new Set([...changed,...untracked])].filter(Boolean)){mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});copyFileSync(new URL(file,root),path.join(repo,file));}
  run('git',['config','user.name','CMS integration test']);run('git',['config','user.email','cms-test@example.invalid']);run('git',['add','.']);run('git',['commit','--allow-empty','-m','Local implementation fixture']);
  const f=fixture(),d=await draft();d.operation='delete';d.sourceId='ims-license-updates-policy-20260819';d.reviewedFingerprint=await fingerprint(d);await f.publisher().publish(d,'synthetic-token');
  for(const [file,data] of Object.entries(finalFiles(f))){mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});writeFileSync(path.join(repo,file),data.encoding==='base64'?Buffer.from(data.content,'base64'):data.content);}
  run('git',['add','.']);run('git',['commit','-m','Synthetic news deletion'],{GIT_AUTHOR_DATE:'2026-10-18T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-18T12:00:00Z'});
  run('npm',['run','sitemap']);try{run('git',['diff','--exit-code','--','sitemap-lastmod.json','sitemap.xml']);}catch(e){throw new Error(String(e.stdout));}run('npm',['run','validate']);
  run('node',['scripts/build_quiet_news.mjs','--check']);run('node',['scripts/generate_zh_locale.mjs','--check']);
  const tests=execFileSync('git',['ls-files','scripts/test_*.mjs'],{cwd:repo,encoding:'utf8'}).trim().split('\n');run('node',['--test','--test-reporter=tap',...tests]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
