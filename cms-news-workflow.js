import {renderNewsPage} from './news-renderer.js?v=20261016-092023';

export const REPO='Kale1205/fde-site', API=`https://api.github.com/repos/${REPO}`;
export const LANGS=['ja','en','zh-CN'];
const CONTENT='content/site-content.json', NEWS=['news.html','ja/news.html','zh/news.html'];
const json=value=>JSON.stringify(value,null,2)+'\n';
const copy=value=>structuredClone(value);
export class CmsError extends Error {
 constructor(code,status=0){super(code);this.name='CmsError';this.code=code;this.status=status;}
}
export function errorText(error){
 const messages={
  AUTH:'認証できません。トークンを確認してください。入力内容は保持しています。',
  PERMISSION:'現在の権限では実行できません。権限は自動変更しません。下書きを保持し、管理者へ確認してください。',
  CONFLICT:'公開データまたは依頼ブランチが別の操作で変更されています。上書きしていません。下書きを退避し、最新データと比較してください。',
  NETWORK:'通信結果を確認できません。同じ下書きから再試行してください。既存ブランチ・PRを確認してから再開します。',
  RATE_LIMIT:'GitHubの利用制限中です。時間を置いて同じ下書きから再試行してください。',
  STORAGE:'端末内へ保存できません。入力は画面に残しています。画面を閉じず、バックアップを保存してください。',
  LOCAL_CONFLICT:'この下書きは別のタブで更新されています。上書きしていません。入力をバックアップして再読み込みしてください。',
  REVIEW:'日本語・英語・中国語のプレビューを確認し、公開依頼への同意をチェックしてください。',
  INCOMPLETE:'日英中すべてのタイトル・本文と、正しい日付を入力してください。',
  IMAGE:'PNG・JPEG・WebP・GIFの実画像、8MB以下を選んでください。',
  TRANSLATION_KEY:'翻訳用のAdmin fulfillment keyを入力してください。下書き保存には不要です。',
  TRANSLATION:'英訳を取得できませんでした。入力済みの翻訳は変更していません。手動入力するか、時間を置いて翻訳だけ再試行してください。公開依頼は開始していません。',
  REQUEST_CHANGED:'既存の公開依頼と内容が異なります。重複PRは作りません。既存PRの状況を確認し、変更分は別の下書きとして保存してください。',
  LAST_ARTICLE:'最後の1件は削除できません。ニュース画面を空にする変更は別途確認してください。',
  INVALID:'取得データを検証できません。公開処理を停止しました。入力は保持しています。'
 };
 return (error?.status?`HTTP ${error.status}：`:'')+(messages[error?.code]||'処理を完了できませんでした。入力は保持しています。');
}
export const base64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out);};
export const decode=value=>new TextDecoder().decode(Uint8Array.from(atob(String(value).replace(/\s/g,'')),c=>c.charCodeAt(0)));
export const sha256=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function inspectImage(blob){
 if(!blob||blob.size>8*1024*1024||!blob.size)throw new CmsError('IMAGE');
 const bytes=new Uint8Array(await blob.arrayBuffer()),head=String.fromCharCode(...bytes.slice(0,12));
 const ext=bytes[0]===137&&head.slice(1,4)==='PNG'?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':/^GIF8[79]a/.test(head)?'gif':head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'?'webp':'';
 const type={png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[ext];
 if(!ext||blob.type!==type)throw new CmsError('IMAGE');
 return {bytes,ext,hash:await sha256(bytes)};
}
export function newDraft(record=null,baseContentSha=''){
 return {id:crypto.randomUUID(),revision:0,operation:record?'edit':'create',sourceId:record?.id||'',baseContentSha,record:copy(record||{date:new Date().toISOString().slice(0,10),category:'Product',featured:false,title:{ja:'',en:'','zh-CN':''},body:{ja:'',en:'','zh-CN':''},image:'',link:'news.html'}),image:null,removeImage:false,updatedAt:new Date().toISOString(),reviewedFingerprint:'',request:null};
}
// Explicit allowlist: credentials, DOM state and arbitrary caller properties
// never enter persistent storage or exported draft backups.
export function persistedDraft(d){
 const out=Object.fromEntries(['id','revision','operation','sourceId','baseContentSha','image','imageName','removeImage','updatedAt','reviewedFingerprint','mediaTarget'].filter(k=>k in d).map(k=>[k,d[k]]));
 out.record=Object.fromEntries(['date','category','featured','image','link','id','translationStatus'].filter(k=>k in d.record).map(k=>[k,d.record[k]]));
 for(const field of ['title','body'])out.record[field]=Object.fromEntries(Object.entries(d.record[field]||{}).filter(([key,value])=>/^[a-z]{2}(?:-[A-Z]{2})?$/.test(key)&&typeof value==='string'));
 out.request=d.request?Object.fromEntries(['fingerprint','baseSha','baseContentSha','createdAt','branch','actor','commitSha','branchReady','prNumber','prUrl'].filter(k=>k in d.request).map(k=>[k,d.request[k]])):null;
 return copy(out);
}
export class DraftStore {
 constructor(indexedDB=globalThis.indexedDB){this.factory=indexedDB;this.db=null;}
 async open(){
  if(this.db)return this.db;if(!this.factory)throw new CmsError('STORAGE');
  this.db=await new Promise((resolve,reject)=>{const r=this.factory.open('baked-kale-cms-local-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new CmsError('STORAGE'));r.onblocked=()=>reject(new CmsError('STORAGE'));}).catch(()=>{throw new CmsError('STORAGE');});return this.db;
 }
 async list(){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));r.onerror=()=>reject(new CmsError('STORAGE'));}).catch(()=>{throw new CmsError('STORAGE');});}
 async put(value){
  const d=persistedDraft(value),db=await this.open();let failure=null;
  return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(d.id);r.onsuccess=()=>{if((r.result?.revision||0)!==d.revision){failure=new CmsError('LOCAL_CONFLICT');tx.abort();return;}d.revision++;store.put(d);};tx.oncomplete=()=>resolve(d);tx.onerror=()=>reject(failure||new CmsError('STORAGE'));tx.onabort=()=>reject(failure||new CmsError('STORAGE'));}).catch(e=>{throw e instanceof CmsError?e:new CmsError('STORAGE');});
 }
}
export async function fingerprint(d){
 const image=d.image?await inspectImage(d.image):null;
 return sha256(JSON.stringify({operation:d.operation,sourceId:d.sourceId,base:d.baseContentSha,record:persistedDraft(d).record,image:image?.hash||'',removeImage:!!d.removeImage,mediaTarget:d.mediaTarget||''}));
}
export function applyDraft(content,d,imagePath=''){
 const result=copy(content);if(!Array.isArray(result.news))throw new CmsError('INVALID');
 if(d.operation==='media'){
  if(d.mediaTarget==='fallback')result.newsFallbackImage=d.removeImage?'':imagePath;
  else if(d.mediaTarget==='instagram')result.instagram={...result.instagram,image:d.removeImage?'':imagePath};
  else throw new CmsError('INVALID');return result;
 }
 const index=result.news.findIndex(x=>x.id===d.sourceId);
 if(d.operation==='delete'){
  if(index<0)throw new CmsError('CONFLICT');if(result.news.length===1)throw new CmsError('LAST_ARTICLE');
  const featured=result.news[index].featured;result.news.splice(index,1);if(featured&&!result.news.some(x=>x.featured))result.news[0].featured=true;return result;
 }
 if(!['create','edit'].includes(d.operation)||d.operation==='edit'&&index<0)throw new CmsError('CONFLICT');
 const old=index>=0?result.news[index]:{},record={...old,...copy(d.record),id:d.operation==='create'?`cms-${d.id}`:d.sourceId,link:'news.html',title:{...old.title,...d.record.title},body:{...old.body,...d.record.body},translationStatus:'ja-en-zh-reviewed'};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||Number.isNaN(Date.parse(record.date))||new Date(record.date).toISOString().slice(0,10)!==record.date||!['Product','Development','Social'].includes(record.category))throw new CmsError('INCOMPLETE');
 for(const locale of LANGS)if(!record.title?.[locale]?.trim()||!record.body?.[locale]?.trim()||record.title[locale].length>120||record.body[locale].length>20000)throw new CmsError('INCOMPLETE');
 if(d.image)record.image=imagePath;else if(d.removeImage)record.image='';
 if(record.featured)result.news.forEach(x=>x.featured=false);
 if(d.operation==='create'){if(result.news.some(x=>x.id===record.id))throw new CmsError('CONFLICT');result.news.push(record);}else result.news[index]=record;
 return result;
}
export function updateSitemap(xml,manifest,changed,date){
 const next={...manifest};let output=xml;
 for(const file of changed){
  if(!NEWS.includes(file)||!(file in next))throw new CmsError('INVALID');next[file]=date;
  const loc=`https://kale1205.github.io/fde-site/${file}`;
  let count=0;output=output.replace(/(<url>\s*<loc>)([^<]+)(<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/g,(all,a,url,b,c)=>url===loc?(count++,a+url+b+date+c):all);
  if(count!==1)throw new CmsError('INVALID');
 }
 return {manifest:json(next),xml:output};
}
const normalizeCache=text=>text.replace(/(\.(?:js|css)\?v=)\d{8}-\d{6}/g,'$1BUILD');
export class NewsPublisher {
 constructor({fetch=globalThis.fetch,persist=async d=>d,now=()=>new Date().toISOString()}={}){this.fetch=fetch;this.persist=persist;this.now=now;this.pending=new Map();}
 async api(path,token,options={}){
  if(!path.startsWith('/')||path.startsWith('//')||options.method&& !['POST','GET'].includes(options.method))throw new CmsError('INVALID');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{
   const r=await this.fetch(path==='/user'?'https://api.github.com/user':API+path,{...options,signal:controller.signal,credentials:'omit',redirect:'error',headers:{Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`} : {}),'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})}});
   if(!r.ok){const data=await r.json().catch(()=>({}));const limited=r.status===429||r.status===403&&(r.headers?.get('x-ratelimit-remaining')==='0'||/rate limit/i.test(data.message||''));throw new CmsError(limited?'RATE_LIMIT':r.status===401?'AUTH':r.status===403?'PERMISSION':r.status===409?'CONFLICT':`HTTP_${r.status}`,r.status);}
   return await r.json();
  }catch(e){if(e instanceof CmsError)throw e;throw new CmsError('NETWORK');}finally{clearTimeout(timer);}
 }
 async file(path,ref,token){const f=await this.api(`/contents/${path}?ref=${encodeURIComponent(ref)}`,token);if(f.type!=='file'||f.encoding!=='base64')throw new CmsError('INVALID');return {...f,text:decode(f.content)};}
 async snapshot(token){const ref=await this.api('/git/ref/heads/main',token),sha=ref.object?.sha;if(!/^[a-f0-9]{40}$/.test(sha||''))throw new CmsError('INVALID');const file=await this.file(CONTENT,sha,token);return {sha,contentSha:file.sha,content:JSON.parse(file.text)};}
 async findPR(branch,token){const path=`/pulls?state=all&base=main&head=Kale1205:${encodeURIComponent(branch)}&per_page=100`;const list=await this.api(path,token).catch(e=>{if(e.code==='PERMISSION')return this.api(path,'');throw e;});if(!Array.isArray(list))throw new CmsError('INVALID');return list.find(p=>p.head?.ref===branch&&p.head?.repo?.full_name===REPO)||null;}
 async save(d){const saved=await this.persist(d);d.revision=saved.revision;}
 publish(d,token){if(this.pending.has(d.id))return this.pending.get(d.id);const run=this.perform(d,token).finally(()=>this.pending.delete(d.id));this.pending.set(d.id,run);return run;}
 async verifyBranch(tx,head,token){
  if(head===tx.commitSha)return;
  const comparison=await this.api(`/compare/${tx.commitSha}...${head}`,token);
  if(comparison.status!=='ahead'||comparison.files?.length>40||!Array.isArray(comparison.files))throw new CmsError('CONFLICT');
  for(const file of comparison.files){
   if(!/^(?:build-version\.txt|(?:contact-config|cms-admin|cms-news-workflow|news-renderer)\.js|(?:ja\/|zh\/)?(?:index|license|demo|goals|news|contact|order|customer|cms-admin)\.html)$/.test(file.filename))throw new CmsError('CONFLICT');
   const a=await this.file(file.filename,tx.commitSha,token),b=await this.file(file.filename,head,token);
   if(file.filename==='build-version.txt'){if(!/^\d{8}-\d{6}\n$/.test(a.text)||!/^\d{8}-\d{6}\n$/.test(b.text))throw new CmsError('CONFLICT');}
   else if(normalizeCache(a.text)!==normalizeCache(b.text))throw new CmsError('CONFLICT');
  }
 }
 async perform(d,token){
  if(!token)throw new CmsError('AUTH');
  if(!/^[a-f0-9-]{36}$/.test(d.id||'')||!Number.isInteger(d.revision)||d.revision<0)throw new CmsError('INVALID');
  const digest=await fingerprint(d);
  if(d.reviewedFingerprint!==digest)throw new CmsError('REVIEW');
  if(d.request&&d.request.fingerprint!==digest)throw new CmsError('REQUEST_CHANGED');
  // Identity is read using this token, never inferred from the CLI's credentials.
  const user=await this.api('/user',token).catch(async e=>{if(e.status!==404)throw e;throw new CmsError('AUTH');});
  if(!/^[\w-]+$/.test(user.login||'')||!Number.isSafeInteger(user.id))throw new CmsError('AUTH');
  let tx=d.request,existing;
  if(tx){
   if(tx.actor!==user.login)throw new CmsError('AUTH');
   if(tx.branch!==`cms/news-${d.id}-${tx.fingerprint.slice(0,12)}`||!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(tx.createdAt)||!/^\w{40}$/.test(tx.baseSha))throw new CmsError('INVALID');
   existing=await this.findPR(tx.branch,token);
   if(existing){if(!tx.commitSha)throw new CmsError('CONFLICT');await this.verifyBranch(tx,existing.head.sha,token);tx.prNumber=existing.number;tx.prUrl=existing.html_url;await this.save(d);return {pr:existing,branch:tx.branch};}
  }
  const snapshot=await this.snapshot(token);
  if(d.baseContentSha&&d.baseContentSha!==snapshot.contentSha)throw new CmsError('CONFLICT');
  if(!d.baseContentSha){if(d.operation!=='create')throw new CmsError('CONFLICT');d.baseContentSha=snapshot.contentSha;d.reviewedFingerprint=await fingerprint(d);}
  const fingerprintValue=await fingerprint(d);
  if(!tx){tx=d.request={fingerprint:fingerprintValue,baseSha:snapshot.sha,baseContentSha:snapshot.contentSha,createdAt:this.now(),branch:`cms/news-${d.id}-${fingerprintValue.slice(0,12)}`,actor:user.login};await this.save(d);}
  if(tx.actor!==user.login)throw new CmsError('AUTH');
  // A known PR is never recreated, including after a timeout or after closure.
  existing=await this.findPR(tx.branch,token);
  if(existing){if(!tx.commitSha)throw new CmsError('CONFLICT');await this.verifyBranch(tx,existing.head.sha,token);tx.prNumber=existing.number;tx.prUrl=existing.html_url;await this.save(d);return {pr:existing,branch:tx.branch};}
  const original=await this.file(CONTENT,tx.baseSha,token);
  if(original.sha!==tx.baseContentSha)throw new CmsError('CONFLICT');
  const image=d.image?await inspectImage(d.image):null;
  const imagePath=image?`assets/cms/${tx.createdAt.slice(0,4)}/${tx.createdAt.slice(5,7)}/${image.hash}.${image.ext}`:'';
  const content=applyDraft(JSON.parse(original.text),d,imagePath),files={[CONTENT]:{text:json(content)}};
  const build=(await this.file('build-version.txt',tx.baseSha,token)).text.trim();
  const changed=[];
  for(const file of NEWS){const current=await this.file(file,tx.baseSha,token);const next=renderNewsPage(current.text,content,build);if(next!==current.text){files[file]={text:next};changed.push(file);}}
  if(changed.length){const manifest=await this.file('sitemap-lastmod.json',tx.baseSha,token),xml=await this.file('sitemap.xml',tx.baseSha,token);const updated=updateSitemap(xml.text,JSON.parse(manifest.text),changed,tx.createdAt.slice(0,10));if(updated.manifest!==manifest.text)files['sitemap-lastmod.json']={text:updated.manifest};if(updated.xml!==xml.text)files['sitemap.xml']={text:updated.xml};}
  if(image)files[imagePath]={bytes:image.bytes};
  // All local state is durable before any remote write. Blobs alone are not
  // referenced by a branch. The single ref creation publishes the whole tree.
  await this.save(d);
  const tree=[];
  for(const [path,file] of Object.entries(files)){const blob=await this.api('/git/blobs',token,{method:'POST',body:JSON.stringify(file.bytes?{content:base64(file.bytes),encoding:'base64'}:{content:file.text,encoding:'utf-8'})});if(!/^[a-f0-9]{40}$/.test(blob.sha||''))throw new CmsError('INVALID');tree.push({path,mode:'100644',type:'blob',sha:blob.sha});}
  const parent=await this.api(`/git/commits/${tx.baseSha}`,token);
  const built=await this.api('/git/trees',token,{method:'POST',body:JSON.stringify({base_tree:parent.tree.sha,tree})});
  const identity={name:user.login,email:`${user.id}+${user.login}@users.noreply.github.com`,date:tx.createdAt};
  const commit=await this.api('/git/commits',token,{method:'POST',body:JSON.stringify({message:`CMS News ${d.id} ${tx.fingerprint}`,tree:built.sha,parents:[tx.baseSha],author:identity,committer:identity})});
  if(!/^[a-f0-9]{40}$/.test(commit.sha||''))throw new CmsError('INVALID');tx.commitSha=commit.sha;await this.save(d);
  try{await this.api('/git/refs',token,{method:'POST',body:JSON.stringify({ref:`refs/heads/${tx.branch}`,sha:tx.commitSha})});}
  catch(e){const current=await this.api(`/git/ref/heads/${tx.branch}`,token).catch(()=>{throw e;});await this.verifyBranch(tx,current.object.sha,token);}
  tx.branchReady=true;await this.save(d);
  existing=await this.findPR(tx.branch,token);
  if(!existing){
   try{const operation={create:'新規',edit:'編集',delete:'削除',media:'共通画像'}[d.operation];existing=await this.api('/pulls',token,{method:'POST',body:JSON.stringify({head:tx.branch,base:'main',title:`News［${operation}］: ${d.record.title?.ja||'画像の変更'}`.slice(0,180),body:`CMS公開依頼 ${d.id}\n操作：${operation}\n\n日英中の確認済み原稿・画像・静的HTML・sitemapを一括変更します。\nmain保護を維持し、検査通過と本人承認後にのみマージしてください。\nCMSはマージ・自動承認を行いません。`,draft:false})});}
   catch(e){existing=await this.findPR(tx.branch,token).catch(()=>null);if(!existing){if(e.code==='PERMISSION')return {branch:tx.branch,manual:true,compareUrl:`https://github.com/${REPO}/compare/main...${encodeURIComponent(tx.branch)}?expand=1`};throw e;}}
  }
  if(existing.head?.ref!==tx.branch||existing.base?.ref!=='main')throw new CmsError('INVALID');
  tx.prNumber=existing.number;tx.prUrl=existing.html_url;await this.save(d);return {pr:existing,branch:tx.branch};
 }
 async status(number){
  if(!Number.isInteger(number)||number<1)throw new CmsError('INVALID');
  const pr=await this.api(`/pulls/${number}`,'');
  if(pr.merged_at){const runs=await this.api(`/actions/runs?head_sha=${pr.merge_commit_sha}&per_page=100`,'').catch(()=>null);const pages=runs?.workflow_runs?.find(r=>r.head_sha===pr.merge_commit_sha&&r.name==='pages build and deployment');return {pr,label:pages?.conclusion==='success'?'マージ済み・Pages公開処理成功':pages?.conclusion==='failure'?'マージ済み・公開処理失敗':'マージ済み・公開確認待ち'};}
  if(pr.state==='closed')return {pr,label:'依頼はクローズされています。新しいPRは自動作成しません。'};
  const sha=pr.head.sha;
  const [checks,status]=await Promise.all([this.api(`/commits/${sha}/check-runs?per_page=100`,'').catch(()=>null),this.api(`/commits/${sha}/status`,'').catch(()=>null)]);
  const runs=checks?.check_runs||[],states=status?.statuses||[];
  const validate=[...runs.filter(x=>x.name==='validate').map(x=>x.status==='completed'&&x.conclusion==='success'?'success':x.status==='completed'?'failure':'pending'),...states.filter(x=>x.context==='validate').map(x=>x.state)];
  const failed=runs.some(x=>x.status==='completed'&&['failure','cancelled','timed_out','action_required','stale'].includes(x.conclusion))||states.some(x=>['failure','error'].includes(x.state));
  const pending=!checks||!status||!validate.length||validate.some(x=>x!=='success')||runs.some(x=>x.status!=='completed'||x.conclusion!=='success');
  return {pr,label:failed?'検査失敗・要確認（公開していません）':pending?'検査中または未確認（公開していません）':'検査通過・本人承認待ち（まだ公開していません）',head:sha};
 }
}
