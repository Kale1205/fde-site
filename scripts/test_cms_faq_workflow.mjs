import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CmsError,newFaqDraft,persistedFaqDraft,FaqDraftStore,faqFingerprint,applyFaqDraft,faqErrorText,FaqPublisher} from '../cms-faq-workflow.js';
import {DraftStore,newDraft,REPO} from '../cms-news-workflow.js';
import {renderFaqPage} from '../faq-renderer.js';

const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const CONTENT='content/faq-content.json',POLICY='content/faq-policy-additions.json';
const contacts=[['contact.html','en'],['ja/contact.html','ja'],['zh/contact.html','zh-CN']];
const locales=['ja','en','zh-CN'],date='2026-10-19T12:00:00.000Z';
const hash=value=>createHash('sha1').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const clone=value=>structuredClone(value);
const question=n=>({ja:`合成質問${n}`,en:`Synthetic question ${n}`,'zh-CN':`合成问题${n}`});
const answer=n=>({ja:`合成回答${n}`,en:`Synthetic answer ${n}`,'zh-CN':`合成回答${n}`});
const item=(id,n=1)=>({id,category:'product',subcategory:'usage',highFrequency:false,
  translationStatus:'synthetic-reviewed',question:question(n),answer:answer(n),
  keywords:{ja:[`合成語${n}`],en:[`synthetic-${n}`],'zh-CN':[`合成词${n}`]},synonyms:{ja:[],en:[],'zh-CN':[]}});
const content={version:3,locales:[...locales],categories:{
  product:{label:{ja:'合成製品',en:'Synthetic product','zh-CN':'合成产品'},order:1},
  support:{label:{ja:'合成支援',en:'Synthetic support','zh-CN':'合成支持'},order:2}
},subcategories:{
  usage:{category:'product',label:{ja:'合成利用',en:'Synthetic use','zh-CN':'合成使用'}},
  help:{category:'support',label:{ja:'合成案内',en:'Synthetic help','zh-CN':'合成帮助'}}
},unknownRoot:{keep:['synthetic','root']},faq:[{...item('synthetic-primary-one'),unknownRecord:{keep:true}},item('synthetic-primary-two',2)]};
const policy={policyRevision:'synthetic-v1',faq:[{...item('synthetic-policy-only',3),unknownPolicy:{keep:true}}]};
const contentSha=hash(json(content)),policySha=hash(json(policy)),mainSha=hash('synthetic-main-head');
async function draft(operation='edit'){
  const d=newFaqDraft(operation==='create'?null:content.faq[0],contentSha,policySha);
  if(operation==='create')Object.assign(d.record,{...item(d.sourceId,4),id:d.sourceId});
  else d.record.answer.ja+='・合成変更';
  d.operation=operation;d.reviewedFingerprint=await faqFingerprint(d);return d;
}

test('FAQ drafts have an explicit kind, schema and fixed source, with a stable new record ID',()=>{
  const d=newFaqDraft(null,contentSha,policySha);
  assert.equal(d.kind,'faq');assert.equal(d.schemaVersion,1);assert.equal(d.sourceFile,CONTENT);
  assert.match(d.id,/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  assert.equal(d.sourceId,`cms-faq-${d.id}`);assert.equal(d.record.id,d.sourceId);
  assert.equal(d.revision,0);assert.equal(d.operation,'create');assert.equal(d.baseContentSha,contentSha);assert.equal(d.basePolicySha,policySha);
  for(const locale of locales){assert.equal(typeof d.record.question[locale],'string');assert.equal(typeof d.record.answer[locale],'string');assert(Array.isArray(d.record.keywords[locale]));assert(Array.isArray(d.record.synonyms[locale]));}
  assert.equal(d.request,null);assert.equal(d.reviewedFingerprint,'');
});

test('existing FAQ drafts clone the record and retain its identity and all three languages',()=>{
  const old=clone(content.faq[0]),d=newFaqDraft(old,contentSha,policySha);
  assert.equal(d.operation,'edit');assert.equal(d.sourceId,old.id);assert.equal(d.record.id,old.id);
  for(const key of ['question','answer','keywords','synonyms'])assert.deepEqual(d.record[key],old[key]);
  d.record.question.ja='合成変更';d.record.keywords.en.push('synthetic-new');
  assert.deepEqual(old,content.faq[0]);
});

test('FAQ backups allowlist editor and journal fields, deeply copy them, and exclude credentials',async()=>{
  const d=await draft();d.token='synthetic-secret-token';d.adminKey='synthetic-secret-key';d.headers={Authorization:'synthetic-secret-header'};
  d.record.token='synthetic-secret-record';d.record.question.token='synthetic-secret-locale';
  d.record.unknownCredential='synthetic-secret-unknown';
  d.request={fingerprint:d.reviewedFingerprint,baseSha:mainSha,baseContentSha:contentSha,basePolicySha:policySha,
    createdAt:date,branch:`cms/faq-${d.id}-${d.reviewedFingerprint.slice(0,12)}`,actor:'synthetic-editor',
    commitSha:hash('synthetic-commit'),branchReady:true,prNumber:777,prUrl:`https://github.com/${REPO}/pull/777`,
    token:'synthetic-secret-request'};
  const saved=persistedFaqDraft(d);assert.doesNotMatch(JSON.stringify(saved),/synthetic-secret/);
  assert.equal(saved.kind,'faq');assert.equal(saved.schemaVersion,1);assert.equal(saved.sourceFile,CONTENT);
  assert.equal(saved.request.basePolicySha,policySha);assert.equal(saved.request.actor,'synthetic-editor');
  assert.equal(saved.request.prNumber,777);
  saved.record.question.ja='保存後の合成変更';saved.record.keywords.en.push('saved-only');
  assert.notEqual(saved.record.question.ja,d.record.question.ja);assert(!d.record.keywords.en.includes('saved-only'));
});

test('typed backup fields exclude nested arbitrary objects and nonstring search entries',async()=>{
  const d=await draft(),secret={token:'synthetic-secret-nested'};
  d.updatedAt=secret;d.record.category=secret;d.record.highFrequency=secret;d.record.translationStatus=secret;
  d.record.question.ja=secret;d.record.answer.en=secret;d.record.keywords['zh-CN']=['valid',secret];d.record.synonyms.ja=[secret];
  d.request={actor:secret,branchReady:secret,prNumber:secret,fingerprint:secret};
  const saved=persistedFaqDraft(d);assert.doesNotMatch(JSON.stringify(saved),/synthetic-secret/);
  assert.equal(saved.record.question.ja,undefined);assert.equal(saved.record.answer.en,undefined);assert.equal(saved.record.keywords['zh-CN'],undefined);
  assert.equal(saved.record.question.en,content.faq[0].question.en);assert.deepEqual(saved.record.synonyms.en,[]);
});

test('FAQ review fingerprint covers all editable locales, settings, operation and both source SHAs',async()=>{
  const d=await draft(),before=await faqFingerprint(d);
  const changes=[next=>{next.operation='delete';},next=>{next.baseContentSha=hash('different content');},next=>{next.basePolicySha=hash('different policy');},
    next=>{next.record.category='support';next.record.subcategory='help';},next=>{next.record.highFrequency=!next.record.highFrequency;}];
  for(const locale of locales)for(const key of ['question','answer','keywords','synonyms'])changes.push(next=>{
    if(Array.isArray(next.record[key][locale]))next.record[key][locale].push('synthetic-change');else next.record[key][locale]+=' synthetic-change';
  });
  for(const change of changes){const next=clone(d);change(next);assert.notEqual(await faqFingerprint(next),before);}
  const journalOnly=clone(d);journalOnly.revision++;journalOnly.updatedAt=date;journalOnly.reviewedFingerprint='';journalOnly.request={token:'synthetic-excluded'};journalOnly.token='synthetic-excluded';
  assert.equal(await faqFingerprint(journalOnly),before,'storage and request bookkeeping do not invalidate the reviewed manuscript');
});

test('editing one FAQ preserves other records, taxonomy, unknown fields, policy and untouched translations',async()=>{
  const d=await draft(),before=clone(content),policyBefore=clone(policy),next=applyFaqDraft(content,policy,d);
  assert.notEqual(next,content);assert.deepEqual(content,before);assert.deepEqual(policy,policyBefore);
  assert.deepEqual({...next,faq:null},{...before,faq:null});assert.deepEqual(next.faq[1],before.faq[1]);
  const edited=next.faq[0];assert.equal(edited.answer.ja,d.record.answer.ja);
  assert.equal(edited.answer.en,before.faq[0].answer.en);assert.equal(edited.answer['zh-CN'],before.faq[0].answer['zh-CN']);
  assert.deepEqual(edited.unknownRecord,before.faq[0].unknownRecord);
  for(const key of ['question','keywords','synonyms'])assert.deepEqual(edited[key],before.faq[0][key]);
});

test('an edit preserves additional existing locales while the backup remains limited to supported editor fields',()=>{
  const source=clone(content);for(const key of ['question','answer'])source.faq[0][key].fr='Synthetic existing French text';
  for(const key of ['keywords','synonyms'])source.faq[0][key].fr=['synthetic-existing-french'];
  const d=newFaqDraft(source.faq[0],contentSha,policySha);d.record.answer.ja+='・合成変更';
  assert.equal(persistedFaqDraft(d).record.answer.fr,undefined);
  const next=applyFaqDraft(source,policy,d);
  for(const key of ['question','answer','keywords','synonyms'])assert.deepEqual(next.faq[0][key].fr,source.faq[0][key].fr);
});

test('create and delete affect exactly one primary FAQ while all policy data remains unchanged',async()=>{
  const before=clone(content),policyBefore=clone(policy),created=await draft('create');
  const added=applyFaqDraft(content,policy,created);assert.equal(added.faq.length,content.faq.length+1);
  assert.deepEqual(added.faq.slice(0,-1),content.faq);assert.equal(added.faq.at(-1).id,created.sourceId);
  const removed=await draft('delete'),next=applyFaqDraft(content,policy,removed);
  assert.deepEqual(next.faq,[content.faq[1]]);assert.deepEqual({...next,faq:null},{...content,faq:null});
  assert.deepEqual(content,before);assert.deepEqual(policy,policyBefore);
});

test('empty search arrays are valid when all three question and answer locales are complete',async()=>{
  const d=await draft();for(const key of ['keywords','synonyms'])for(const locale of locales)d.record[key][locale]=[];
  const next=applyFaqDraft(content,policy,d);for(const key of ['keywords','synonyms'])for(const locale of locales)assert.deepEqual(next.faq[0][key][locale],[]);
});

for(const operation of ['edit','delete'])test(`policy-only FAQ ${operation} is rejected without changing either source`,()=>{
  const before=clone(content),policyBefore=clone(policy),d=newFaqDraft(policy.faq[0],contentSha,policySha);d.operation=operation;
  assert.throws(()=>applyFaqDraft(content,policy,d),error=>['INVALID','CONFLICT'].includes(error.code));
  assert.deepEqual(content,before);assert.deepEqual(policy,policyBefore);
});

test('duplicate IDs across primary and policy or a repeated create ID are rejected',async()=>{
  const d=await draft(),collision={...clone(policy),faq:[{...clone(policy.faq[0]),id:content.faq[0].id}]};
  assert.throws(()=>applyFaqDraft(content,collision,d),error=>['INVALID','CONFLICT'].includes(error.code));
  const created=await draft('create'),alreadyAdded={...clone(content),faq:[...clone(content.faq),clone(created.record)]};
  assert.throws(()=>applyFaqDraft(alreadyAdded,policy,created),{code:'CONFLICT'});
});

test('cross-kind, schema, source, identity and unsupported operations cannot be applied as FAQ changes',async()=>{
  const d=await draft();const mutations=[next=>{next.kind='news';},next=>{next.schemaVersion=2;},next=>{next.sourceFile='content/site-content.json';},
    next=>{next.sourceId='synthetic-missing';},next=>{next.record.id='synthetic-other';},next=>{next.operation='media';}];
  for(const mutate of mutations){const next=clone(d);mutate(next);assert.throws(()=>applyFaqDraft(content,policy,next),error=>['INVALID','CONFLICT'].includes(error.code));}
});

test('incomplete locales, malformed search arrays and mismatched taxonomy are rejected before application',async()=>{
  const d=await draft(),changes=[next=>{next.record.question['zh-CN']='   ';},next=>{delete next.record.answer.en;},
    next=>{next.record.keywords.ja='synthetic-invalid';},next=>{next.record.synonyms.en=[7];},
    next=>{next.record.category='synthetic-unknown';},next=>{next.record.subcategory='help';}];
  for(const mutate of changes){const next=clone(d);mutate(next);assert.throws(()=>applyFaqDraft(content,policy,next),error=>['INVALID','INCOMPLETE'].includes(error.code));}
});

test('FAQ draft storage fails closed without an IndexedDB factory',async()=>{
  const store=new FaqDraftStore(null);await assert.rejects(store.list(),{code:'STORAGE'});await assert.rejects(store.put(await draft()),{code:'STORAGE'});
});

// The fake implements the transaction boundary used by both real stores; it
// never reads or writes a browser database or installs an IndexedDB dependency.
function memoryIndexedDB(){
  const databases=new Map(),opened=[];
  return {opened,open(name){
    opened.push(name);const request={};
    queueMicrotask(()=>{
      const fresh=!databases.has(name);if(fresh)databases.set(name,new Map());const stores=databases.get(name);
      const database={createObjectStore(storeName){stores.set(storeName,new Map());},transaction(storeName,mode='readonly'){
        assert(stores.has(storeName),'the selected object store must exist');
        const persisted=stores.get(storeName),working=new Map([...persisted].map(([key,value])=>[key,clone(value)]));
        let pending=0,finished=false;const transaction={abort(){if(finished)return;finished=true;queueMicrotask(()=>transaction.onabort?.());}};
        const maybeComplete=()=>queueMicrotask(()=>{if(pending||finished)return;finished=true;if(mode==='readwrite')stores.set(storeName,working);transaction.oncomplete?.();});
        const action=fn=>{
          const operation={};pending++;queueMicrotask(()=>{if(finished)return;operation.result=fn();operation.onsuccess?.();pending--;maybeComplete();});return operation;
        };
        transaction.objectStore=()=>({get:key=>action(()=>clone(working.get(key))),getAll:()=>action(()=>[...working.values()].map(clone)),
          put:value=>action(()=>{working.set(value.id,clone(value));return value.id;})});return transaction;
      }};
      request.result=database;if(fresh)request.onupgradeneeded?.();request.onsuccess?.();
    });return request;
  }};
}

test('FAQ and News draft stores remain isolated and FAQ revisions reject a stale tab without overwriting',async()=>{
  const factory=memoryIndexedDB(),faqStore=new FaqDraftStore(factory),newsStore=new DraftStore(factory),d=await draft();
  d.token='synthetic-secret-storage';const saved=await faqStore.put(d);
  assert.equal(saved.revision,1);assert.equal(d.revision,0);assert.doesNotMatch(JSON.stringify(saved),/synthetic-secret/);
  const news=await newsStore.put(newDraft());assert.equal(news.revision,1);
  assert.deepEqual((await faqStore.list()).map(value=>value.id),[d.id]);
  assert.deepEqual((await newsStore.list()).map(value=>value.id),[news.id]);assert.equal(new Set(factory.opened).size,2);
  await assert.rejects(faqStore.put(d),{code:'LOCAL_CONFLICT'});
  assert.deepEqual((await faqStore.list())[0],saved,'a stale save cannot replace the durable draft');
  const edited=clone(saved);edited.record.answer.en+=' next revision';
  const next=await faqStore.put(edited);assert.equal(next.revision,2);assert.equal((await faqStore.list())[0].record.answer.en,edited.record.answer.en);
});

test('FAQ storage rejects a News draft rather than creating a cross-kind backup',async()=>{
  const store=new FaqDraftStore(memoryIndexedDB());await assert.rejects(store.put(newDraft()),{code:'INVALID'});assert.deepEqual(await store.list(),[]);
});

const response=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function fixture(){
  const files={[CONTENT]:json(content),[POLICY]:json(policy),
    ...Object.fromEntries(contacts.map(([file,locale])=>[file,renderFaqPage(read(file),content,policy,locale)])),
    ...Object.fromEntries(['sitemap-lastmod.json','sitemap.xml','build-version.txt'].map(file=>[file,read(file)]))};
  const calls=[],trace=[],journal=new Map(),blobs=new Map(),trees=new Map(),commits=new Map(),refs=new Map(),pulls=[];
  const changedSources=new Set();let fault=null,persistHook=null,persistCount=0,actor={login:'synthetic-editor',id:4321};
  const fetch=async(url,options={})=>{
    const parsed=new URL(url),path=parsed.pathname.replace('/repos/'+REPO,''),method=(options.method||'GET').toUpperCase(),body=options.body?JSON.parse(options.body):null;
    calls.push({path,method,body,ref:parsed.searchParams.get('ref')});trace.push({type:'request',path,method});
    assert.equal(parsed.origin,'https://api.github.com');assert(parsed.pathname==='/user'||parsed.pathname.startsWith('/repos/'+REPO+'/'));
    assert(['GET','POST'].includes(method),'Contents PUT, PATCH and other mutation verbs are forbidden');
    assert(!/\/(?:merges|reviews|merge)(?:\/|$)/.test(path),'the publisher cannot approve or merge');
    if(method==='POST'){
      assert(['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls'].includes(path),'only Git Database and PR creation are allowed');
      const durable=[...journal.values()].at(-1);assert(durable?.request,'a durable request journal must precede every remote write');
      assert.equal(durable.request.fingerprint,await faqFingerprint(durable));
      assert.equal(durable.request.baseContentSha,contentSha);assert.equal(durable.request.basePolicySha,policySha);
    }
    const early=await fault?.(path,method,body,'before');if(early instanceof Response)return early;
    let result;
    if(path==='/user')result=clone(actor);
    else if(path==='/git/ref/heads/main')result={object:{sha:mainSha}};
    else if(path.startsWith('/contents/')){
      const file=decodeURIComponent(path.slice('/contents/'.length));
      assert.equal(parsed.searchParams.get('ref'),mainSha,'all source and static files must be pinned to the exact snapshot head');
      if(!(file in files))return response({},404);
      result={type:'file',encoding:'base64',sha:changedSources.has(file)?hash('changed '+file):hash(files[file]),content:Buffer.from(files[file]).toString('base64')};
    }else if(path==='/pulls'&&method==='GET')result=pulls;
    else if(path.startsWith('/pulls/')&&method==='GET')result=pulls.find(pr=>pr.number===Number(path.split('/').at(-1)))||{};
    else if(path.startsWith('/commits/')&&path.endsWith('/check-runs'))result={check_runs:[{name:'validate',status:'completed',conclusion:'success'}]};
    else if(path.startsWith('/commits/')&&path.endsWith('/status'))result={statuses:[]};
    else if(path==='/git/blobs'&&method==='POST'){const sha=hash(body);blobs.set(sha,clone(body));result={sha};}
    else if(path.startsWith('/git/commits/')&&method==='GET')result={tree:{sha:hash('synthetic-base-tree')}};
    else if(path==='/git/trees'&&method==='POST'){const sha=hash(body);trees.set(sha,clone(body));result={sha};}
    else if(path==='/git/commits'&&method==='POST'){const sha=hash(body);commits.set(sha,clone(body));result={sha};}
    else if(path==='/git/refs'&&method==='POST'){
      assert(body.ref.startsWith('refs/heads/cms/faq-'));assert.notEqual(body.ref,'refs/heads/main');
      if(refs.has(body.ref))return response({message:'Synthetic reference already exists'},422);
      refs.set(body.ref,body.sha);result={object:{sha:body.sha}};
    }else if(path.startsWith('/git/ref/heads/')){
      const sha=refs.get('refs/heads/'+path.slice('/git/ref/heads/'.length));if(!sha)return response({},404);result={object:{sha}};
    }else if(path==='/pulls'&&method==='POST'){
      assert.equal(body.base,'main');const sha=refs.get('refs/heads/'+body.head);assert(sha,'the complete branch must exist before opening a PR');
      result={number:777,html_url:`https://github.com/${REPO}/pull/777`,head:{ref:body.head,sha,repo:{full_name:REPO}},base:{ref:'main'},state:'open'};pulls.push(result);
    }else if(path.startsWith('/compare/'))result={status:'diverged',files:[]};
    else if(path.startsWith('/actions/runs'))result={workflow_runs:[]};
    else assert.fail('Unexpected synthetic API request: '+path);
    const late=await fault?.(path,method,body,'after');return late instanceof Response?late:response(result);
  };
  const persist=async value=>{
    const attempt=++persistCount;await persistHook?.(value,attempt,'before');
    const previous=journal.get(value.id)?.revision||0;if(previous!==value.revision)throw new CmsError('LOCAL_CONFLICT');
    const saved=persistedFaqDraft({...value,revision:previous+1});journal.set(value.id,clone(saved));trace.push({type:'persist',draft:clone(saved)});
    await persistHook?.(value,attempt,'after');return saved;
  };
  return {calls,trace,journal,blobs,trees,commits,refs,pulls,files,fetch,persist,
    publisher:()=>new FaqPublisher({fetch,persist,now:()=>date}),setFault:value=>{fault=value;},setPersistHook:value=>{persistHook=value;},
    changeSource:path=>changedSources.add(path),setActor:login=>{actor={login,id:9876};}};
}
const writes=f=>f.calls.filter(call=>call.method==='POST');
function finalFiles(f){const tree=[...f.trees.values()].at(-1);assert(tree,'a Git tree must have been built');return Object.fromEntries(tree.tree.map(entry=>[entry.path,f.blobs.get(entry.sha)]));}
const outsideFaq=html=>html.replace(/(<div id="cmsFaqList">)[\s\S]*?(<\/div><div id="faqEmpty")/,'$1__SYNTHETIC_FAQ__$2');
const faqArticle=(html,id)=>{const article=html.match(new RegExp('<article class="faq-item" data-faq-id="'+id+'"[\\s\\S]*?<\\/article>'));assert(article,'the synthetic FAQ must exist');return article[0];};

test('FAQ snapshot reads primary and policy JSON at the same immutable main head',async()=>{
  const f=fixture(),snapshot=await f.publisher().snapshot('synthetic-token');
  assert.equal(snapshot.sha,mainSha);assert.equal(snapshot.contentSha,contentSha);assert.equal(snapshot.policySha,policySha);
  assert.deepEqual(snapshot.content,content);assert.deepEqual(snapshot.policy,policy);
  assert.deepEqual(f.calls.filter(call=>call.path.startsWith('/contents/')).map(call=>[call.path,call.ref]).sort(),
    [[`/contents/${CONTENT}`,mainSha],[`/contents/${POLICY}`,mainSha]].sort());assert.equal(writes(f).length,0);
});

test('one FAQ PR contains exactly primary JSON, all three static Contact pages and both sitemap files',async()=>{
  const f=fixture(),d=await draft();
  for(const locale of ['en','zh-CN'])d.record.answer[locale]+=' — synthetic approved update';
  d.reviewedFingerprint=await faqFingerprint(d);
  const original=clone(d.record),result=await f.publisher().publish(d,'synthetic-token');
  assert.equal(result.pr.number,777);assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
  const files=finalFiles(f),expected=[CONTENT,...contacts.map(([file])=>file),'sitemap-lastmod.json','sitemap.xml'];
  assert.deepEqual(Object.keys(files).sort(),expected.sort());assert(!(POLICY in files));
  const next=JSON.parse(files[CONTENT].content);assert.equal(next.faq[0].answer.ja,original.answer.ja);
  assert.deepEqual(next.faq[1],content.faq[1]);assert.deepEqual(next.faq[0].unknownRecord,content.faq[0].unknownRecord);
  assert.deepEqual({...next,faq:null},{...content,faq:null});
  for(const [file,locale] of contacts){
    const output=files[file].content;assert.equal(output,renderFaqPage(read(file),next,policy,locale));
    assert.equal(outsideFaq(output),outsideFaq(read(file)),'Contact content outside the FAQ region remains byte-for-byte identical');
    assert(output.includes(next.faq[0].answer[locale]));assert(output.includes(policy.faq[0].question[locale]));
    assert.notEqual(faqArticle(output,content.faq[0].id),faqArticle(f.files[file],content.faq[0].id),'approved FAQ A must change');
    for(const record of [content.faq[1],...policy.faq])assert.equal(faqArticle(output,record.id),faqArticle(f.files[file],record.id),'unapproved FAQ B and every policy article remain byte-for-byte identical');
  }
  const manifest=JSON.parse(files['sitemap-lastmod.json'].content);
  for(const [file] of contacts)assert.equal(manifest[file],date.slice(0,10));
  const beforeManifest=JSON.parse(read('sitemap-lastmod.json'));
  for(const [file,lastmod] of Object.entries(beforeManifest))if(!contacts.some(([contact])=>contact===file))assert.equal(manifest[file],lastmod);
  assert(!f.refs.has('refs/heads/main'));assert.equal(f.trace[0].type,'request');
  const firstWrite=f.trace.findIndex(event=>event.type==='request'&&event.method==='POST');
  assert(firstWrite>0&&f.trace.slice(0,firstWrite).some(event=>event.type==='persist'&&event.draft.request));
});

test('an approved Japanese-only FAQ A edit leaves other locales and all other FAQ articles untouched',async()=>{
  const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');
  const files=finalFiles(f);assert.deepEqual(Object.keys(files).sort(),[CONTENT,'ja/contact.html','sitemap-lastmod.json','sitemap.xml'].sort());
  const output=files['ja/contact.html'].content;
  assert.notEqual(faqArticle(output,content.faq[0].id),faqArticle(f.files['ja/contact.html'],content.faq[0].id));
  for(const record of [content.faq[1],...policy.faq])assert.equal(faqArticle(output,record.id),faqArticle(f.files['ja/contact.html'],record.id));
  assert.equal(outsideFaq(output),outsideFaq(f.files['ja/contact.html']));
  const manifest=JSON.parse(files['sitemap-lastmod.json'].content),before=JSON.parse(f.files['sitemap-lastmod.json']);
  assert.equal(manifest['ja/contact.html'],date.slice(0,10));
  for(const [file,value] of Object.entries(before))if(file!=='ja/contact.html')assert.equal(manifest[file],value);
});

for(const [file,locale] of contacts)test(`${file}: static FAQ B drift stops approved FAQ A before every remote write`,async()=>{
  const f=fixture(),d=await draft(),original=clone(d.record),before=f.files[file];
  const driftedAnswer=content.faq[1].answer[locale]+' — synthetic independently edited static FAQ B';
  assert(before.includes(content.faq[1].answer[locale]));
  f.files[file]=before.replace(content.faq[1].answer[locale],driftedAnswer);
  assert.notEqual(faqArticle(f.files[file],content.faq[1].id),faqArticle(before,content.faq[1].id));
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'CONFLICT'});
  assert.equal(writes(f).length,0);assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);assert.equal(f.journal.size,0);
  assert(f.files[file].includes(driftedAnswer),'the independent static change must not be rolled back');
  assert.deepEqual(d.record,original);assert.equal(f.files[CONTENT],json(content));assert.equal(f.files[POLICY],json(policy));
});

test('synthetic credentials and arbitrary caller fields never enter journal, backup or remote payloads',async()=>{
  const f=fixture(),d=await draft();d.token='synthetic-secret-token';d.adminKey='synthetic-secret-key';
  d.record.token='synthetic-secret-record';d.record.question.token='synthetic-secret-locale';d.unknown='synthetic-secret-caller';
  await f.publisher().publish(d,'synthetic-transport-token');
  for(const value of [persistedFaqDraft(d),[...f.journal.values()],f.calls])assert.doesNotMatch(JSON.stringify(value),/synthetic-secret/);
  assert.equal(f.calls.some(call=>call.path.includes('translation')||call.path.includes('enrich')),false);
});

test('a deletion PR removes only its selected primary FAQ and retains all policy FAQs in every static locale',async()=>{
  const f=fixture(),d=await draft('delete');await f.publisher().publish(d,'synthetic-token');
  const files=finalFiles(f),next=JSON.parse(files[CONTENT].content);assert.deepEqual(next.faq,[content.faq[1]]);assert(!(POLICY in files));
  for(const [file,locale] of contacts){
    assert(!files[file].content.includes(content.faq[0].question[locale]));assert(files[file].content.includes(content.faq[1].question[locale]));
    assert(files[file].content.includes(policy.faq[0].question[locale]));assert.equal(outsideFaq(files[file].content),outsideFaq(read(file)));
  }
});

test('an unchanged FAQ manuscript creates no journaled request, branch or PR',async()=>{
  const f=fixture(),d=newFaqDraft(content.faq[0],contentSha,policySha);d.reviewedFingerprint=await faqFingerprint(d);
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'NO_CHANGES'});
  assert.equal(writes(f).length,0);assert.equal(f.journal.size,0);assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);
});

for(const source of [CONTENT,POLICY])test(`changed ${source} rejects the request before every remote write`,async()=>{
  const f=fixture(),d=await draft(),before=clone(d.record);f.changeSource(source);
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'CONFLICT'});assert.equal(writes(f).length,0);
  assert.deepEqual(d.record,before);assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);
});

test('missing review and missing durable storage both fail before any remote write',async()=>{
  const f=fixture(),d=await draft();d.reviewedFingerprint='';
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REVIEW'});assert.equal(writes(f).length,0);
  d.reviewedFingerprint=await faqFingerprint(d);
  await assert.rejects(new FaqPublisher({fetch:f.fetch,now:()=>date}).publish(d,'synthetic-token'),{code:'STORAGE'});assert.equal(writes(f).length,0);
});

test('a synchronous persistence error is classified as storage failure before remote writes',async()=>{
  const f=fixture(),d=await draft(),publisher=new FaqPublisher({fetch:f.fetch,persist(){throw new Error('Synthetic storage failure');},now:()=>date});
  await assert.rejects(publisher.publish(d,'synthetic-token'),{code:'STORAGE'});assert.equal(writes(f).length,0);
});

test('a persistence result that drops manuscript approval cannot authorize remote writes',async()=>{
  const f=fixture(),d=await draft(),publisher=new FaqPublisher({fetch:f.fetch,
    persist:async value=>persistedFaqDraft({...value,revision:value.revision+1,reviewedFingerprint:''}),now:()=>date});
  await assert.rejects(publisher.publish(d,'synthetic-token'),{code:'STORAGE'});assert.equal(writes(f).length,0);
});

test('initial journal persistence failure prevents every remote write',async()=>{
  const f=fixture(),d=await draft(),before=clone(d.record);
  f.setPersistHook((value,attempt,phase)=>{if(attempt===1&&phase==='before')throw new CmsError('STORAGE');});
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'STORAGE'});
  assert.equal(writes(f).length,0);assert.deepEqual(d.record,before);
});

test('commit journal persistence failure stops before any branch or PR and remains safe to retry',async()=>{
  const f=fixture(),d=await draft(),before=clone(d.record);
  f.setPersistHook((value,attempt,phase)=>{if(attempt===2&&phase==='before')throw new CmsError('STORAGE');});
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'STORAGE'});
  assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);assert.deepEqual(d.record,before);
  f.setPersistHook(null);await f.publisher().publish(clone(f.journal.get(d.id)),'synthetic-token');
  assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
});

for(const phase of ['identity','source','persist'])test(`manuscript edits during awaited ${phase} work fail before remote writes`,async()=>{
  const f=fixture(),d=await draft();let changed=false;
  const mutate=()=>{changed=true;d.record.answer.ja+='・非同期中の変更';};
  if(phase==='persist')f.setPersistHook((value,attempt,when)=>{if(!changed&&when==='after')mutate();});
  else f.setFault((path,method,body,when)=>{if(!changed&&when==='before'&&(phase==='identity'?path==='/user':path===`/contents/${CONTENT}`))mutate();});
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),{code:'REQUEST_CHANGED'});assert(changed);assert.equal(writes(f).length,0);
});

test('double click and a saved-draft reload reuse the same FAQ ID, branch and PR',async()=>{
  const f=fixture(),d=await draft('create'),publisher=f.publisher();
  await Promise.all([publisher.publish(d,'synthetic-token'),publisher.publish(d,'synthetic-token')]);
  await f.publisher().publish(clone(f.journal.get(d.id)),'synthetic-token');
  assert.equal(f.pulls.length,1);assert.equal(f.refs.size,1);assert.equal(f.calls.filter(call=>call.path==='/pulls'&&call.method==='POST').length,1);
  assert.equal(JSON.parse(finalFiles(f)[CONTENT].content).faq.filter(record=>record.id===d.sourceId).length,1);
});

for(const state of ['closed','merged'])test(`retry reuses a known ${state} PR even after both source blobs change`,async()=>{
  const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');
  f.pulls[0].state='closed';if(state==='merged'){f.pulls[0].merged_at=date;f.pulls[0].merge_commit_sha=hash('synthetic-merge');}
  f.changeSource(CONTENT);f.changeSource(POLICY);const before=writes(f).length;
  const result=await f.publisher().publish(clone(f.journal.get(d.id)),'synthetic-token');
  assert.equal(result.pr.number,777);assert.equal(writes(f).length,before);assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);
});

test('another fingerprint with the same pending draft ID is rejected rather than silently sharing its request',async()=>{
  const f=fixture(),d=await draft(),publisher=f.publisher(),gate=deferred(),started=deferred();
  f.setFault(async(path,method,body,when)=>{if(path==='/user'&&when==='before'){started.resolve();await gate.promise;}});
  const first=publisher.publish(d,'synthetic-token');await started.promise;
  const changed=clone(d);changed.record.answer.en+=' different manuscript';changed.reviewedFingerprint=await faqFingerprint(changed);
  let outcome;const second=publisher.publish(changed,'synthetic-token').then(value=>{outcome={value};},error=>{outcome={error};});
  for(let turn=0;turn<8;turn++)await Promise.resolve();gate.resolve();await first;await second;
  assert.equal(outcome.error?.code,'REQUEST_CHANGED');assert.equal(f.pulls.length,1);assert.equal(f.refs.size,1);
});

for(const path of ['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls'])test(`ambiguous ${path} response can be retried without a second branch or PR`,async()=>{
  const f=fixture(),d=await draft('create');let fired=false;
  f.setFault((actual,method,body,when)=>{if(!fired&&actual===path&&method==='POST'&&when==='after'){fired=true;throw new Error('Synthetic response lost');}});
  try{await f.publisher().publish(d,'synthetic-token');}catch(error){assert.equal(error.code,'NETWORK');}
  assert(fired);f.setFault(null);await f.publisher().publish(clone(f.journal.get(d.id)),'synthetic-token');
  assert.equal(f.refs.size,1);assert.equal(f.pulls.length,1);assert.equal(f.calls.filter(call=>call.path==='/pulls'&&call.method==='POST').length,1);
});

test('changed manuscript, changed PR head and changed actor cannot overwrite a journaled request',async()=>{
  const f=fixture(),d=await draft();await f.publisher().publish(d,'synthetic-token');const beforeWrites=writes(f).length;
  const changed=clone(f.journal.get(d.id));changed.record.answer.en+=' different';changed.reviewedFingerprint=await faqFingerprint(changed);
  await assert.rejects(f.publisher().publish(changed,'synthetic-token'),{code:'REQUEST_CHANGED'});assert.equal(writes(f).length,beforeWrites);
  f.pulls[0].head.sha=hash('synthetic-foreign-commit');
  await assert.rejects(f.publisher().publish(clone(f.journal.get(d.id)),'synthetic-token'),{code:'CONFLICT'});assert.equal(writes(f).length,beforeWrites);
  f.pulls[0].head.sha=[...f.refs.values()][0];f.setActor('synthetic-other-editor');
  await assert.rejects(f.publisher().publish(clone(f.journal.get(d.id)),'synthetic-other-token'),{code:'AUTH'});assert.equal(writes(f).length,beforeWrites);
});

for(const [status,code,headers] of [[401,'AUTH',{}],[403,'PERMISSION',{}],[409,'CONFLICT',{}],[429,'RATE_LIMIT',{}],[403,'RATE_LIMIT',{'x-ratelimit-remaining':'0'}]])test(`FAQ HTTP ${status}/${code} retains inputs and reports a Japanese action`,async()=>{
  const f=fixture(),d=await draft(),before=clone(d.record);
  f.setFault((path,method,body,when)=>path==='/git/blobs'&&method==='POST'&&when==='before'?response({message:'Synthetic failure'},status,headers):null);
  await assert.rejects(f.publisher().publish(d,'synthetic-token'),error=>error.code===code&&error.status===status&&/。/.test(faqErrorText(error)));
  assert.equal(f.refs.size,0);assert.equal(f.pulls.length,0);assert.deepEqual(d.record,before);
});

test('PR permission denial returns a manual PR link without expanding permissions or rewriting main',async()=>{
  const f=fixture(),d=await draft();f.setFault((path,method,body,when)=>path==='/pulls'&&method==='POST'&&when==='before'?response({},403):null);
  const result=await f.publisher().publish(d,'synthetic-token');assert.equal(result.manual,true);
  assert(result.compareUrl.startsWith(`https://github.com/${REPO}/compare/main...`));assert.equal(f.refs.size,1);assert.equal(f.pulls.length,0);
});

test('FAQ status distinguishes validation, failure and publication instead of treating PR creation as live',async()=>{
  const f=fixture(),d=await draft(),publisher=f.publisher();await publisher.publish(d,'synthetic-token');
  assert.match((await publisher.status(777)).label,/本人承認待ち/);
  f.setFault((path,method,body,when)=>path.endsWith('/check-runs')&&when==='before'?response({check_runs:[{name:'validate',status:'completed',conclusion:'cancelled'}]}):null);
  assert.match((await publisher.status(777)).label,/検査失敗/);
  f.setFault(null);f.pulls[0].state='closed';assert.match((await publisher.status(777)).label,/クローズ/);
});

function branchVerifier(files,{changedContent=false}={}){
  const publisher=new FaqPublisher({fetch:async()=>assert.fail('the direct branch verifier must use only its synthetic transport')});
  const base=hash('synthetic-approved-commit'),head=hash('synthetic-cache-ahead'),calls=[];
  publisher.api=async(path,token)=>{calls.push({path});assert.equal(path,`/compare/${base}...${head}`);return {status:'ahead',files:files.map(filename=>({filename}))};};
  publisher.file=async(path,ref)=>{
    calls.push({path,ref});assert([base,head].includes(ref));
    if(path==='build-version.txt')return {text:ref===base?'20261016-143653\n':'20261019-120000\n'};
    const version=ref===base?'20261016-143653':'20261019-120000';
    return {text:`import './cms-faq-workflow.js?v=${version}';\n`+(changedContent&&ref===head?'window.syntheticChanged=true;\n':'')};
  };
  return {publisher,tx:{commitSha:base},head,calls};
}

test('branch verification accepts only normalized cache-key changes in allowed files',async()=>{
  const files=['cms-faq-workflow.js','faq-admin-safe.js','ja/contact.html','build-version.txt'],f=branchVerifier(files);
  await f.publisher.verifyBranch(f.tx,f.head,'synthetic-token');
  assert.equal(f.calls.length,1+files.length*2);for(const filename of files)assert.equal(f.calls.filter(call=>call.path===filename).length,2);
});

test('branch verification rejects a real code change even in an allowed workflow file',async()=>{
  const f=branchVerifier(['cms-faq-workflow.js'],{changedContent:true});
  await assert.rejects(f.publisher.verifyBranch(f.tx,f.head,'synthetic-token'),{code:'CONFLICT'});
});

test('branch verification rejects unknown JavaScript and FAQ JSON without treating them as cache updates',async()=>{
  for(const path of ['synthetic-untrusted.js',CONTENT,POLICY]){
    const f=branchVerifier([path]);await assert.rejects(f.publisher.verifyBranch(f.tx,f.head,'synthetic-token'),{code:'CONFLICT'});
    assert.equal(f.calls.length,1,'disallowed paths stop before file content is read');
  }
});
