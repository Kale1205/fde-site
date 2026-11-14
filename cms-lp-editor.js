import {LpPublisher,prepareLpDraft,inspectLpAsset} from './cms-lp-workflow.js';
import {LP_IDS,LIMITS,validateMediaManifest} from './ja/lp/media-schema.js';
import {errorText} from './cms-news-workflow.js';

const labels=['自家焙煎カフェ','少人数ピラティス','住宅リノベーション','フラワーアトリエ','革小物ブランド','税理士事務所','金属加工工場','陶芸体験工房','個別指導塾','ビジネス写真スタジオ'];
const m=(tag,t='')=>{const n=document.createElement(tag);n.textContent=t;return n;};
const btn=t=>{const n=m('button',t);n.type='button';n.className='admin-button secondary';return n;};
const errors={LP_MEDIA:'ファイルの形式・容量・再生可否を確認してください。',LP_DIMENSIONS:'画像・動画のサイズ、または動画の長さが制限外です。',LP_MANIFEST:'掲載情報に不備があります。動画を指定する場合は表紙画像と説明が必要です。',LP_NO_CHANGE:'公開内容と同じです。変更箇所を入力してください。',LP_STORAGE:'端末に保存できませんでした。容量やブラウザー設定を確認してください。'};
function localDraft(value){
 return {id:value.id,title:value.title,description:value.description,alt:value.alt,order:value.order,baseSha:value.baseSha,removePhoto:Boolean(value.removePhoto),removeVideo:Boolean(value.removeVideo),files:Object.fromEntries(['photo','poster','video'].filter(k=>value.files[k] instanceof Blob).map(k=>[k,value.files[k]]))};
}
let db;
function draftDb(){
 if(!db)db=new Promise((resolve,reject)=>{const q=indexedDB.open('baked-kale-cms-lp',1);q.onupgradeneeded=()=>q.result.createObjectStore('drafts',{keyPath:'id'});q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>reject(Error('LP_STORAGE'));}).catch(e=>{db=null;throw e;});
 return db;
}
async function storage(mode,id){
 const db=await draftDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts',mode==='put'?'readwrite':'readonly'),store=tx.objectStore('drafts'),r=mode==='put'?store.put(localDraft(id)):store.get(id);
  tx.oncomplete=()=>resolve(r.result);tx.onerror=tx.onabort=()=>reject(Error('LP_STORAGE'));
 });
}
export function buildLpEditor(api,getToken){
 const publisher=new LpPublisher(api),dialog=m('dialog');dialog.id='cmsLpEditor';dialog.className='cms-news-preview cms-lp-editor';dialog.setAttribute('aria-labelledby','lpEditorTitle');
 const title=m('h2','LP制作例');title.id='lpEditorTitle';
 const help=m('p','写真や短い動画を案件ごとに差し替えられます。保存先はこの端末だけです。公開依頼は、確認後にGitHubの公開ブランチへ送ります。未公開・個人情報を含む素材は送らないでください。');
 const status=m('p');status.setAttribute('role','status');status.className='status';const controls=[];
 const panel=m('div');panel.className='field';
 function field(label,input){
  const wrap=m('label');wrap.className='field';wrap.append(m('span',label),input);panel.append(wrap);controls.push(input);return input;
 }
 const select=field('編集する制作例',m('select'));
 LP_IDS.forEach((id,i)=>select.add(new Option(id+' '+labels[i],id)));
 const inputs={};
 for(const [key,label] of [['title','名前（空欄なら既定の名前）'],['description','紹介文（空欄なら既定の説明）'],['alt','写真・動画の説明（読み上げ用）']]){
  const input=field(label,m(key==='description'?'textarea':'input'));input.maxLength=LIMITS[key];inputs[key]=input;
 }
 const order=field('Storiesの掲載順',m('select'));
 LP_IDS.forEach((id,i)=>order.add(new Option(String(i+1)+'番目',id)));
 const kinds={photo:['写真（JPEG・PNG・WebP、4MB以下）','image/jpeg,image/png,image/webp'],poster:['動画の表紙画像（動画がある場合は必須）','image/jpeg,image/png,image/webp'],video:['動画（MP4、30秒・12MB以下、推奨H.264）','video/mp4']};
 const files={};
 for(const [kind,[label,accept]] of Object.entries(kinds)){
  const input=field(label,m('input'));input.type='file';input.accept=accept;files[kind]=input;
 }
 const removal={};
 for(const [kind,label] of [['photo','差し替え写真を外して既定の素材に戻す'],['video','動画と表紙を外す']]){
  const input=field(label,m('input'));input.type='checkbox';removal[kind]=input;
 }
 const action=m('div');action.className='actions';const save=btn('下書き保存'),preview=btn('変更をプレビュー'),close=btn('メニューへ戻る');action.append(save,preview,close);
 const restart=btn('最新の公開内容からやり直す');restart.hidden=true;action.append(restart);
 const reviewBox=m('div');reviewBox.hidden=true;
 const result=m('div');result.id='lpEditorResult';
 const reviewed=m('input');reviewed.type='checkbox';const check=m('label');check.append(reviewed,document.createTextNode('変更内容と公開できる素材であることを確認しました'));
 const request=btn('公開依頼（PR）');request.disabled=true;
 reviewBox.append(result,check,request);
 dialog.append(title,help,status,panel,action,reviewBox);document.body.append(dialog);
 let base=null,draft=null,prepared=null,running=false,dirty=false,urls=[],returnFocus=null;
 const say=t=>{status.textContent=t;};
 const busy=value=>{running=value;[...controls,save,preview,close,restart,reviewed].forEach(el=>el.disabled=value);request.disabled=value||!reviewed.checked||!prepared||!getToken()||!base?.manifestSha;};
 const clearUrls=()=>{for(const url of urls)URL.revokeObjectURL(url);urls=[];};
 function invalidate(){prepared=null;reviewed.checked=false;reviewBox.hidden=true;clearUrls();request.disabled=true;}
 function run(fn){return async e=>{
  if(running)return;
  busy(true);
  try{await fn(e);}catch(error){say(errors[error?.message]||errorText(error));}
  finally{busy(false);}
 };}
 async function load(id,{reset=false}={}){
  const published=base.data.cases[id]||{}, saved=reset?null:await storage('get',id);
  draft=saved||{id,baseSha:base.manifestSha,order:[...(base.data.order||LP_IDS)],files:{},title:published.title||'',description:published.description||'',alt:published.alt||''};
  select.value=id;
  for(const [key,input] of Object.entries(inputs))input.value=draft[key]||'';
  order.value=LP_IDS[draft.order.indexOf(id)];Object.values(files).forEach(el=>el.value='');
  removal.photo.checked=Boolean(draft.removePhoto);removal.video.checked=Boolean(draft.removeVideo);
  invalidate();dirty=false;restart.hidden=!saved||saved.baseSha===base.manifestSha;
  say(saved&&saved.baseSha!==base.manifestSha?'この下書きの後に公開内容が更新されました。内容を控えて下書きを作り直してください。':saved?'端末内の下書きを開きました。':'公開中の情報を読み込みました。');
 }
 const capture=()=>{
  if(!draft)return;
  for(const [key,input]of Object.entries(inputs))draft[key]=input.value;
  draft.removePhoto=removal.photo.checked;draft.removeVideo=removal.video.checked;
  const index=LP_IDS.indexOf(order.value);
  if(index>=0){draft.order=draft.order.filter(id=>id!==draft.id);draft.order.splice(index,0,draft.id);}
 };
 async function preserve(){
  if(!draft||!dirty)return;capture();await storage('put',draft);dirty=false;
 }
 panel.addEventListener('input',e=>{if(!draft||e.target===select||e.target.type==='file')return;dirty=true;invalidate();});
 select.addEventListener('change',run(async()=>{const id=select.value;try{await preserve();await load(id);}catch(e){select.value=draft?.id||LP_IDS[0];throw e;}}));
 for(const [kind,input]of Object.entries(files))input.addEventListener('change',run(async()=>{
  const file=input.files[0];if(!file||!draft)return;
  say('ファイルを確認しています。');
  let inspected;try{inspected=await inspectLpAsset(file,kind);}catch(e){input.value='';throw e;}
  // Copy the checked bytes out of the temporary picker handle before the next
  // media selection or a browser draft reload.
  draft.files[kind]=new Blob([inspected.bytes],{type:file.type});
  if(kind==='photo')removal.photo.checked=false;
  if(kind==='video')removal.video.checked=false;
  dirty=true;invalidate();say('ファイルを選択しました。下書き保存かプレビューに進めます。');
 }));
 for(const [kind,input]of Object.entries(removal))input.addEventListener('change',()=>{if(!input.checked||!draft)return;delete draft.files[kind];files[kind].value='';if(kind==='video'){delete draft.files.poster;files.poster.value='';}});
 restart.addEventListener('click',run(async()=>{if(!confirm('この制作例の端末内の下書きを最新の公開内容に置き換えます。公開ページは変更しません。続けますか？'))return;await load(draft.id,{reset:true});await storage('put',draft);say('最新の公開内容から編集を始められます。');}));
 save.addEventListener('click',run(async()=>{await preserve();say('端末内に下書き保存しました。');}));
 close.addEventListener('click',run(async()=>{await preserve();dialog.close();}));
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(!running)close.click();});
 dialog.addEventListener('close',()=>{clearUrls();returnFocus?.focus();});
 function previewUrl(kind,value){
  if(draft.files[kind]){const url=URL.createObjectURL(draft.files[kind]);urls.push(url);return url;}
  return value?'ja/lp/'+value:'';
 }
 preview.addEventListener('click',run(async()=>{
  await preserve();invalidate();
  if(draft.baseSha!==base.manifestSha){say('公開内容が更新されています。下書きを控え、最新の公開内容からやり直してください。');return;}
  prepared=await prepareLpDraft(draft,base.data);
  const value=prepared.next.cases[draft.id]||{},heading=m('h3',value.title||labels[LP_IDS.indexOf(draft.id)]),desc=m('p',value.description||'既定の紹介文を表示'),orderNote=m('p','Storiesの掲載順：'+((prepared.next.order||LP_IDS).indexOf(draft.id)+1)+'番目');
  result.replaceChildren(heading,desc,orderNote);
  if(value.photo){const img=m('img');img.alt=value.alt;img.src=previewUrl('photo',value.photo);img.style.maxWidth='100%';result.append(img);}
  if(value.video){
   const video=m('video');video.controls=true;video.playsInline=true;video.preload='none';video.src=previewUrl('video',value.video);video.poster=previewUrl('poster',value.poster);video.setAttribute('aria-label',value.alt);video.style.maxWidth='100%';result.append(video);
  }
  reviewBox.hidden=false;say(getToken()&&base.manifestSha?'内容を確認してから、公開依頼を作成できます。':'公開依頼には、メニューの接続設定でGitHub接続が必要です。');
 }));
 reviewed.addEventListener('change',()=>busy(false));
 request.addEventListener('click',run(async()=>{
  if(!prepared||!reviewed.checked||dirty)return;
  const outcome=await publisher.publish(getToken(),draft,base,prepared.fingerprint);
  const link=m('a',outcome.number?'PR #'+outcome.number+' を確認':'GitHubで公開依頼を確認');
  link.href=outcome.number?'https://github.com/Kale1205/fde-site/pull/'+outcome.number:outcome.compare;link.target='_blank';link.rel='noopener noreferrer';result.append(link);
  reviewed.checked=false;say('本番は未変更です。GitHubでレビュー・マージ後に反映されます。');
 }));
 window.addEventListener('beforeunload',e=>{if(dialog.open&&(dirty||running)){e.preventDefault();e.returnValue='';}});
 return async trigger=>{
  if(dialog.open||running)return;returnFocus=trigger;dialog.showModal();busy(true);
  try{
   if(getToken())base=await publisher.snapshot(getToken());
   else{
    const response=await fetch('ja/lp/media-manifest.json',{cache:'no-cache',credentials:'same-origin'});if(!response.ok)throw Error('LP_MANIFEST');
    const bytes=new Uint8Array(await response.arrayBuffer()),header=new TextEncoder().encode('blob '+bytes.length+'\0');
    const blob=new Uint8Array(header.length+bytes.length);blob.set(header);blob.set(bytes,header.length);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',blob)),n=>n.toString(16).padStart(2,'0')).join('');
    base={data:validateMediaManifest(JSON.parse(new TextDecoder().decode(bytes))),manifestSha:hash};
   }
   await load(select.value||LP_IDS[0]);
  }catch(e){base=null;draft=null;say(errors[e?.message]||errorText(e));}
  finally{busy(false);preview.disabled=save.disabled=!draft;}
 };
}
