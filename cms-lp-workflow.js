import {CmsError,base64,sha256} from './cms-news-workflow.js';
import {LP_MANIFEST,LP_IDS,LIMITS,validateMediaManifest} from './ja/lp/media-schema.js';

export const LP_MAX_IMAGE=4*1024*1024, LP_MAX_VIDEO=12*1024*1024;
const isSha=value=>/^[a-f0-9]{40}$/.test(value||'');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const imageTypes={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
const encoder=new TextEncoder();
export async function inspectLpAsset(file,kind,{probe=probeAsset}={}){
 if(!['photo','video','poster'].includes(kind)||!file?.size||file.size>(kind==='video'?LP_MAX_VIDEO:LP_MAX_IMAGE))throw Error('LP_MEDIA');
 const ext=kind==='video'?(file.type==='video/mp4'?'mp4':''):imageTypes[file.type];
 if(!ext)throw Error('LP_MEDIA');
 const bytes=new Uint8Array(await file.arrayBuffer()),ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 const valid=ext==='mp4'?ascii(4,8)==='ftyp'&&bytes.length>=24:
  ext==='png'?ascii(1,4)==='PNG'&&bytes[0]===137&&bytes.length>=24:
  ext==='jpg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
  ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
 if(!valid)throw Error('LP_MEDIA');
 const {width,height,duration}=await probe(file,kind);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width>(kind==='video'?1920:4096)||height>(kind==='video'?1920:4096)||kind==='video'&&(!Number.isFinite(duration)||duration<=0||duration>30))throw Error('LP_DIMENSIONS');
 return {bytes,ext,hash:await sha256(bytes),width,height,duration};
}
function probeAsset(blob,kind){
 return new Promise((resolve,reject)=>{
  const video=kind==='video',node=document.createElement(video?'video':'img'),url=URL.createObjectURL(blob);
  const done=(result)=>{clearTimeout(timer);node.onloadedmetadata=node.onload=node.onerror=null;node.removeAttribute('src');if(video)node.load();URL.revokeObjectURL(url);result?resolve(result):reject(Error('LP_MEDIA'));};
  const timer=setTimeout(()=>done(),8000);node.onerror=()=>done();
  if(video){node.muted=true;node.playsInline=true;node.preload='metadata';node.onloadedmetadata=()=>done({width:node.videoWidth,height:node.videoHeight,duration:node.duration});}
  else node.onload=()=>done({width:node.naturalWidth,height:node.naturalHeight});
  node.src=url;
 });
}
export async function prepareLpDraft(draft,base,{inspect=inspectLpAsset}={}){
 validateMediaManifest(base);
 const next=structuredClone(base),assets=[];
 if(!LP_IDS.includes(draft.id))throw Error('LP_MANIFEST');
 const entry={...next.cases[draft.id]};
 for(const field of Object.keys(LIMITS)){
  const value=String(draft[field]||'').trim();
  if(value.length>LIMITS[field])throw Error('LP_MANIFEST');
  if(value)entry[field]=value;else delete entry[field];
 }
 if(draft.removePhoto)delete entry.photo;
 if(draft.removeVideo){delete entry.video;delete entry.poster;}
 for(const kind of ['photo','poster','video'])if(draft.files?.[kind]){
  const result=await inspect(draft.files[kind],kind);
  const path='assets/cases/'+draft.id+'/'+result.hash+'.'+result.ext;
  entry[kind]=path;
  if(!assets.some(a=>a.path===path))assets.push({path,bytes:result.bytes});
 }
 if(!entry.video)delete entry.poster;
 if(Object.keys(entry).length)next.cases[draft.id]=entry;else delete next.cases[draft.id];
 const order=Array.isArray(draft.order)?draft.order:LP_IDS;
 if(same(order,LP_IDS))delete next.order;else next.order=[...order];
 validateMediaManifest(next);
 if(same(next,base))throw Error('LP_NO_CHANGE');
 const contents=JSON.stringify(next,null,2)+'\n';
 return {next,assets,contents,fingerprint:await sha256(contents)};
}

export class LpPublisher{
 constructor(api){this.api=api;}
 async snapshot(token=''){
  const ref=await this.api.api('/git/ref/heads/main',token),sha=ref.object?.sha;
  if(!isSha(sha))throw Error('LP_MANIFEST');
  const f=await this.api.file(LP_MANIFEST,sha,token);
  if(!isSha(f.sha))throw Error('LP_MANIFEST');
  return {sha,manifestSha:f.sha,data:validateMediaManifest(JSON.parse(f.text))};
 }
 async publish(token,draft,base,reviewed){
  if(!token)throw new CmsError('AUTH');
  const prepared=await prepareLpDraft(draft,base.data);
  if(prepared.fingerprint!==reviewed)throw new CmsError('REVIEW');
  const latest=await this.snapshot(token);
  if(latest.manifestSha!==base.manifestSha)throw new CmsError('CONFLICT');
  const branch='cms/lp/'+latest.manifestSha.slice(0,12)+'-'+reviewed.slice(0,24);
  const compare='https://github.com/Kale1205/fde-site/compare/main...'+encodeURIComponent(branch)+'?expand=1';
  const post=(path,value)=>this.api.api(path,token,{method:'POST',body:JSON.stringify(value)});
  const find=async()=>{
   const found=await this.api.findPR(branch,token);
   if(found&&(!Number.isSafeInteger(found.number)||found.number<1||found.base?.ref!=='main'||found.head?.repo?.full_name!=='Kale1205/fde-site'))throw Error('LP_MANIFEST');
   return found?.number||null;
  };
  const old=await find();
  if(old)return {number:old,compare};
  const branchRef=await this.api.api('/git/ref/heads/'+branch,token).catch(error=>{if(error.status===404)return null;throw error;});
  if(branchRef){
   const sha=branchRef.object?.sha;if(!isSha(sha))throw new CmsError('CONFLICT');
   const file=await this.api.file(LP_MANIFEST,sha,token);
   if(file.text!==prepared.contents)throw new CmsError('CONFLICT');
   // A previously saved branch is surfaced, not silently submitted again.
   return {number:null,compare};
  }
  const user=await this.api.api('/user',token),identity={name:user.login,email:user.id+'+'+user.login+'@users.noreply.github.com'};
  if(!Number.isSafeInteger(user.id)||!/^[-A-Za-z0-9]{1,39}$/.test(user.login||''))throw Error('LP_MANIFEST');
  const tree=[];
  for(const asset of [{path:LP_MANIFEST,bytes:encoder.encode(prepared.contents)},...prepared.assets.map(a=>({...a,path:'ja/lp/'+a.path}))]){
   const blob=await post('/git/blobs',{content:base64(asset.bytes),encoding:'base64'});
   if(!isSha(blob.sha))throw Error('LP_MANIFEST');
   tree.push({path:asset.path,mode:'100644',type:'blob',sha:blob.sha});
  }
  const original=await this.api.api('/git/commits/'+latest.sha,token);
  if(!isSha(original.tree?.sha))throw Error('LP_MANIFEST');
  const updated=await post('/git/trees',{base_tree:original.tree.sha,tree});
  if(!isSha(updated.sha))throw Error('LP_MANIFEST');
  const commit=await post('/git/commits',{message:'CMS: LP制作例の更新依頼 ('+draft.id+')',tree:updated.sha,parents:[latest.sha],author:identity,committer:identity});
  if(!isSha(commit.sha))throw Error('LP_MANIFEST');
  await post('/git/refs',{ref:'refs/heads/'+branch,sha:commit.sha});
  try{
   const pr=await post('/pulls',{title:'LP制作例の更新依頼',head:branch,base:'main',draft:true,body:'CMSで確認したLP素材・表示情報の変更です。公開にはレビューとマージが必要です。'});
   if(!Number.isSafeInteger(pr.number)||pr.number<1)throw Error('LP_MANIFEST');
   return {number:pr.number,compare};
  }catch{
   const number=await find().catch(()=>null);return {number,compare};
  }
 }
}
