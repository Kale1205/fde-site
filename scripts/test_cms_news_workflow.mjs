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
import {renderNewsPage} from '../news-renderer.js';
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
 return {publisher,calls,blobs,trees,commits,refs,pulls,journal,setFault:f=>fault=f,changeMain:()=>changed=true,failStorage:()=>saveFail=true};
}
async function draft(existing=true){const d=newDraft(existing?content.news[0]:null,contentSha);if(!existing){d.record.title={ja:'試験用ニュース',en:'Test news','zh-CN':'测试新闻'};d.record.body={ja:'試験本文',en:'Test body','zh-CN':'测试正文'};}d.record.body.ja+='\n試験用の追記';d.reviewedFingerprint=await fingerprint(d);return d;}
function finalFiles(f){const tree=[...f.trees.values()].at(-1);return Object.fromEntries(tree.tree.map(x=>[x.path,f.blobs.get(x.sha)]));}
test('article-only update: all locales preserved; static HTML and sitemap travel in the same commit; no main PUT',async()=>{
 const f=fixture(),d=await draft(),old=structuredClone(d.record);const result=await f.publisher().publish(d,'synthetic-token');assert.equal(result.pr.number,101);assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
 const files=finalFiles(f),cms=JSON.parse(files['content/site-content.json'].content),item=cms.news.find(x=>x.id===d.sourceId);assert.equal(item.body.en,old.body.en);assert.equal(item.body['zh-CN'],old.body['zh-CN']);
 for(const file of ['news.html','ja/news.html','zh/news.html']){assert(files[file]);assert.equal(files[file].content,renderNewsPage(read(file),cms,read('build-version.txt').trim()));}
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
test('Contents-only token: completed branch + manual PR link, no permission expansion',async()=>{const f=fixture(),d=await draft();f.setFault((p,m,b,w)=>p==='/pulls'&&m==='POST'&&w==='before'?response({},403):null);const result=await f.publisher().publish(d,'synthetic-token');assert(result.manual);assert(result.compareUrl.startsWith(`https://github.com/${REPO}/compare/main...`));assert.equal(f.refs.size,1);assert.equal(f.pulls.length,0);});
test('storage failure/review missing prevent remote writes; persisted drafts exclude credentials',async()=>{const f=fixture(),d=await draft();f.failStorage();await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'STORAGE'});assert.equal(f.calls.filter(x=>x.method==='POST').length,0);d.reviewedFingerprint='';await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REVIEW'});d.token='secret';d.adminKey='secret';d.record.token='secret';d.request={token:'secret'};assert(!JSON.stringify(persistedDraft(d)).includes('secret'));});
test('safe image validation rejects SVG, disguised and oversized files',async()=>{for(const blob of [new Blob(['<svg/>'],{type:'image/svg+xml'}),new Blob(['not png'],{type:'image/png'}),new Blob([new Uint8Array(8*1024*1024+1)],{type:'image/png'})])await assert.rejects(inspectImage(blob),{code:'IMAGE'});});
test('deletion and media changes preserve unrelated data and translations',async()=>{const d=await draft();d.operation='delete';const next=applyDraft(content,d);assert.equal(next.news.length,content.news.length-1);assert.deepEqual({...next,news:null},{...content,news:null});d.operation='media';d.mediaTarget='fallback';d.removeImage=false;const media=applyDraft(content,d,'assets/cms/test.png');assert.equal(media.newsFallbackImage,'assets/cms/test.png');assert.deepEqual(media.news,content.news);});
test('translation failure leaves values untouched and never replays save/publication clicks',async()=>{let calls=0;const window={FDE_CONTACT_API:'https://example.invalid'},context={window,document:{getElementById:()=>({value:'synthetic-key'})},fetch:async()=>{calls++;return response({},503);},AbortController,setTimeout,clearTimeout};vm.runInNewContext(read('news-translation-hook.js'),context);await assert.rejects(window.FDE_NEWS_TRANSLATE('見出し','本文'),e=>e.code==='TRANSLATION');assert.equal(calls,1);assert(!read('news-translation-hook.js').includes('btn.click'));assert(!read('news-translation-hook.js').includes('addEventListener'));});
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
  run('git',['config','user.name','CMS integration test']);run('git',['config','user.email','cms-test@example.invalid']);run('git',['add','.']);run('git',['commit','-m','Local implementation fixture']);
  const f=fixture(),d=await draft();d.operation='delete';d.sourceId='ims-license-updates-policy-20260819';d.reviewedFingerprint=await fingerprint(d);await f.publisher().publish(d,'synthetic-token');
  for(const [file,data] of Object.entries(finalFiles(f))){mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});writeFileSync(path.join(repo,file),data.encoding==='base64'?Buffer.from(data.content,'base64'):data.content);}
  run('git',['add','.']);run('git',['commit','-m','Synthetic news deletion'],{GIT_AUTHOR_DATE:'2026-10-18T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-18T12:00:00Z'});
  run('npm',['run','sitemap']);try{run('git',['diff','--exit-code','--','sitemap-lastmod.json','sitemap.xml']);}catch(e){throw new Error(String(e.stdout));}run('npm',['run','validate']);
  run('node',['scripts/build_quiet_news.mjs','--check']);run('node',['scripts/generate_zh_locale.mjs','--check']);
  const tests=execFileSync('git',['ls-files','scripts/test_*.mjs'],{cwd:repo,encoding:'utf8'}).trim().split('\n');run('node',['--test','--test-reporter=tap',...tests]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
