import {LpPublisher,prepareLpDraft,inspectLpAsset} from './cms-lp-workflow.js';
import {LP_IDS,LIMITS,LP_ARCHIVE_SLOTS,LP_ARCHIVE_CASES,LP_STORY_TEXT_LIMITS,LP_STORY_DETAIL_LIMITS,LP_STORY_BLOCK_LIMIT,archiveEntry,validateMediaManifest} from './ja/lp/media-schema.js';
import {archiveFrames} from './ja/lp/archive-layout.js';
import {errorText} from './cms-news-workflow.js';

const labels=['自家焙煎カフェ','少人数ピラティス','住宅リノベーション','フラワーアトリエ','革小物ブランド','税理士事務所','金属加工工場','陶芸体験工房','個別指導塾','ビジネス写真スタジオ'];
const m=(tag,t='')=>{const n=document.createElement(tag);n.textContent=t;return n;};
const btn=t=>{const n=m('button',t);n.type='button';n.className='admin-button secondary';return n;};
const errors={LP_MEDIA:'ファイルの形式・容量・再生可否を確認してください。',LP_DIMENSIONS:'画像・動画のサイズ、または動画の長さが制限外です。',LP_MANIFEST:'掲載情報に不備があります。画像・動画には説明、動画には表紙画像が必要です。',LP_NO_CHANGE:'公開内容と同じです。変更箇所を入力してください。',LP_STORAGE:'端末に保存できませんでした。容量やブラウザー設定を確認してください。'};
const mediaKeys=['photo','poster','video'];
const draftKey=d=>d.scope==='archive'?'archive:'+d.slot:d.id;
async function localDraft(value){
 const files={};
 for(const key of mediaKeys)if(value.files[key] instanceof Blob){const file=value.files[key];files[key]={bytes:await file.arrayBuffer(),type:file.type};}
 return {...value,id:draftKey(value),caseId:value.id,files};
}
function readDraft(value){
 if(!value)return value;const files={};
 for(const key of mediaKeys){const file=value.files?.[key];if(file?.bytes instanceof ArrayBuffer&&typeof file.type==='string')files[key]=new Blob([file.bytes],{type:file.type});else if(file instanceof Blob)files[key]=file;}
 return {...value,id:value.caseId||value.id,files};
}
let db;
function draftDb(){
 if(!db)db=new Promise((resolve,reject)=>{const q=indexedDB.open('baked-kale-cms-lp',1);q.onupgradeneeded=()=>q.result.createObjectStore('drafts',{keyPath:'id'});q.onsuccess=()=>resolve(q.result);q.onerror=q.onblocked=()=>reject(Error('LP_STORAGE'));}).catch(e=>{db=null;throw e;});return db;
}
async function storage(mode,id){
 const record=mode==='put'?await localDraft(id):null,db=await draftDb();
 return new Promise((resolve,reject)=>{const tx=db.transaction('drafts',mode==='put'?'readwrite':'readonly'),store=tx.objectStore('drafts'),r=mode==='put'?store.put(record):store.get(id);tx.oncomplete=()=>resolve(mode==='get'?readDraft(r.result):r.result);tx.onerror=tx.onabort=()=>reject(Error('LP_STORAGE'));});
}
const defaults=()=>[[7,13,47,-1.2],[39,6,40,.9],[53,37,40,1.2],[12,57,29,-.9],[38,56,35,1.2],[64,12,26,-1.5],[26,27,46,-.3]].map(([x,y,width,rotate])=>({source:'case',visible:true,x,y,width,rotate}));
const slotLabel=slot=>'位置 '+String(Number(slot)+1).padStart(2,'0')+'（'+(Math.floor(Number(slot)/5)+1)+'行'+(Number(slot)%5+1)+'列）';
export function buildLpEditor(api,readToken,{previewOnly=false}={}){
 const getToken=()=>previewOnly?'':readToken();
 const publisher=new LpPublisher(api),dialog=m('dialog');dialog.id='cmsLpEditor';dialog.className='cms-news-preview cms-lp-editor';dialog.setAttribute('aria-labelledby','lpEditorTitle');
 const title=m('h2','LP制作例');title.id='lpEditorTitle';
 const help=m('p',previewOnly?'未公開の編集確認用です。ArchivesとStoriesの変更は、このブラウザー内の下書きだけに保存されます。GitHub接続・アップロード・公開依頼はできません。':'Archivesで素材の位置を選び、Storiesで一覧の構成と案件詳細を編集します。下書きはこの端末だけに保存され、本番は変わりません。公開依頼は確認後にGitHubの公開ブランチへ送ります。未公開・個人情報を含む素材は送らないでください。');
 const status=m('p');status.setAttribute('role','status');status.className='status';
 const tabs=m('div');tabs.className='lp-editor-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','LPの編集場所');
 const tabArchive=btn('Archives'),tabStories=btn('Stories');for(const tab of [tabArchive,tabStories]){tab.setAttribute('role','tab');tabs.append(tab);}
 const panel=m('div');panel.className='lp-editor-panel';const controls=[tabArchive,tabStories];
 const archive=m('section'),stories=m('section');archive.id='lpArchivePanel';stories.id='lpStoriesPanel';archive.setAttribute('role','tabpanel');stories.setAttribute('role','tabpanel');tabArchive.setAttribute('aria-controls',archive.id);tabStories.setAttribute('aria-controls',stories.id);
 let fieldIndex=0;
 function field(parent,label,input){const wrap=m('label'),caption=m('span',label);caption.id='lp-editor-field-'+(++fieldIndex);input.setAttribute('aria-labelledby',caption.id);wrap.className='field';wrap.append(caption,input);parent.append(wrap);controls.push(input);return input;}
 const map=m('div');map.className='lp-editor-map';map.setAttribute('role','group');map.setAttribute('aria-label','Archivesの配置マップ。位置を選んで編集');
 const mapButtons=new Map();
 for(let n=0;n<25;n++){const slot=String(n).padStart(2,'0');if(n===12){const mark=m('span','bakedkale\nlibrary');mark.className='lp-map-wordmark';map.append(mark);continue;}const b=btn('');b.className='lp-map-slot';b.dataset.slot=slot;b.setAttribute('aria-label',slotLabel(slot));const image=m('span'),number=m('span',String(n+1).padStart(2,'0'));image.className='lp-map-image';number.className='lp-map-number';b.append(image,number);map.append(b);mapButtons.set(slot,b);controls.push(b);}
 archive.append(m('h3','Archivesの素材マップ'),m('p','サイトと同じ5×5の配置です。中央のロゴ以外をクリック。繰り返し表示される同じ位置もまとめて変わります。矢印キーでも選択できます。'),map);
 const slotSelect=field(archive,'編集する位置（一覧から選択）',m('select'));for(const slot of LP_ARCHIVE_SLOTS)slotSelect.add(new Option(slotLabel(slot),slot));
 const caseSelect=field(archive,'この素材から開くStoriesの案件',m('select'));LP_IDS.forEach((id,i)=>caseSelect.add(new Option(id+' '+labels[i],id)));
 const archiveTitle=field(archive,'Archivesの素材名（空欄なら案件名）',m('input'));archiveTitle.maxLength=LIMITS.title;
 const archiveAlt=field(archive,'Archivesの画像・動画の説明（読み上げ用）',m('input'));archiveAlt.maxLength=LIMITS.alt;
 const kinds={photo:['Archivesの写真（JPEG・PNG・WebP、4MB以下）','image/jpeg,image/png,image/webp'],poster:['Archivesの動画の表紙画像（動画がある場合は必須）','image/jpeg,image/png,image/webp'],video:['Archivesの短いループ動画（MP4、30秒・12MB以下、推奨H.264）','video/mp4']};
 const archiveFiles={};for(const [key,[label,accept]]of Object.entries(kinds)){const input=field(archive,label,m('input'));input.type='file';input.accept=accept;archiveFiles[key]=input;}
 archive.append(m('p','動画は音声なしでループ再生します。画面外・別タブ・動きの停止設定では止まり、表紙画像を表示します。案件詳細に独立した動画欄は表示しません。'));
 const removeArchivePhoto=field(archive,'この位置の差し替え写真を外す',m('input')),removeArchiveVideo=field(archive,'この位置の動画と表紙を外す',m('input'));removeArchivePhoto.type=removeArchiveVideo.type='checkbox';
 stories.append(m('h3','Storiesの一覧と案件詳細'));
 const select=field(stories,'編集する案件',m('select'));LP_IDS.forEach((id,i)=>select.add(new Option(id+' '+labels[i],id)));
 const inputs={};for(const [key,label]of [['title','名前（空欄なら既定の名前）'],['description','紹介文（空欄なら既定の説明）'],['alt','Storiesの表紙写真の説明（読み上げ用）']]){const input=field(stories,label,m(key==='description'?'textarea':'input'));input.maxLength=LIMITS[key];inputs[key]=input;}
 const order=field(stories,'Storiesの掲載順',m('select'));LP_IDS.forEach((id,i)=>order.add(new Option(String(i+1)+'番目',id)));
 const photo=field(stories,'Storiesの表紙写真（JPEG・PNG・WebP、4MB以下）',m('input'));photo.type='file';photo.accept='image/jpeg,image/png,image/webp';
 const removeStoryPhoto=field(stories,'Storiesの差し替え写真を外して既定に戻す',m('input'));removeStoryPhoto.type='checkbox';
 function sources(input){input.add(new Option('この案件の表紙写真','case'));for(const slot of LP_ARCHIVE_SLOTS)input.add(new Option('Archives '+slotLabel(slot),'archive:'+slot));return input;}
 const cover=sources(field(stories,'案件詳細のメイン画像に使う素材',m('select')));
 const detailText=m('details'),detailSummary=m('summary','案件詳細の文章を編集（空欄は既定の文章）');detailText.className='lp-detail-text-editor';detailText.append(detailSummary);stories.append(detailText);const detailInputs={};
 for(const [key,label]of [['headline','詳細の大見出し'],['subtitle','詳細のサブタイトル'],['eyebrow','詳細の業種・種別'],['mood','詳細の雰囲気'],['composition','詳細のページ構成の例'],['note','詳細の補足文章']]){const input=field(detailText,label,m(['headline','composition','note'].includes(key)?'textarea':'input'));input.maxLength=LP_STORY_DETAIL_LIMITS[key];detailInputs[key]=input;}

 stories.append(m('h4','一覧の画像構成'),m('p',previewOnly?'下の画像を選ぶと、表示する素材と位置を編集できます。素材一覧には、この確認版に用意した画像・動画の表紙を表示します。各変更は下の「変更をプレビュー」で確認できます。':'下の画像を選ぶと、表示する素材と位置を編集できます。画像はArchivesの公開済み素材から選べます。未公開の素材は、Archivesの公開依頼を先に反映してください。'));
 const stage=m('div');stage.className='lp-story-stage';stage.setAttribute('role','group');stage.setAttribute('aria-label','Storiesの画像構成プレビュー');stories.append(stage);
 const layerButtons=[];for(let i=0;i<7;i++){const b=btn(String(i+1));b.className='lp-story-layer';b.setAttribute('aria-label','画像レイヤー '+(i+1)+' を編集');b.dataset.layer=i;stage.append(b);layerButtons.push(b);controls.push(b);}
 const layerSelect=field(stories,'編集する画像レイヤー',m('select'));for(let i=0;i<7;i++)layerSelect.add(new Option(String(i+1)+'枚目'+(i===6?'（表紙）':''),String(i)));
 const layerSource=sources(field(stories,'このレイヤーに表示する素材',m('select'))),layerVisible=field(stories,'このレイヤーを表示する',m('input'));layerVisible.type='checkbox';
 const geometry=m('div');geometry.className='lp-layer-geometry';stories.append(geometry);const layerInputs={};
 for(const [key,label,min,max,step]of [['x','横位置（%）',0,100,1],['y','縦位置（%）',0,100,1],['width','幅（%）',8,100,1],['rotate','傾き（度）',-45,45,.1]]){const input=field(geometry,label,m('input'));input.type='number';input.min=min;input.max=max;input.step=step;layerInputs[key]=input;}
 const resetLayout=btn('一覧の画像構成を既定に戻す');stories.append(resetLayout);controls.push(resetLayout);
 stories.append(m('h4','案件をクリックしたときの画像・文章'),m('p','上の名前・紹介文・メイン画像に加えて、下に画像と文章を並べられます。ここで外しても保存済みの素材ファイルは削除されません。'));
 const blocks=m('div');blocks.className='lp-detail-blocks';stories.append(blocks);const blockActions=m('div');blockActions.className='actions';const addText=btn('文章を追加'),addImage=btn('画像を追加');blockActions.append(addText,addImage);stories.append(blockActions);controls.push(addText,addImage);
 panel.append(archive,stories);
 const actions=m('div');actions.className='actions';const save=btn('下書き保存'),preview=btn('変更をプレビュー'),close=btn('メニューへ戻る'),restart=btn('最新の公開内容からやり直す');restart.hidden=true;actions.append(save,preview,close,restart);
 const reviewBox=m('div');reviewBox.hidden=true;const result=m('div');result.id='lpEditorResult';const reviewed=m('input');reviewed.type='checkbox';const check=m('label');check.append(reviewed,document.createTextNode('変更内容と公開できる素材であることを確認しました'));const request=btn('公開依頼（PR）');request.disabled=true;request.hidden=previewOnly;check.hidden=previewOnly;reviewBox.append(result,check,request);
 dialog.append(title,help,status,tabs,panel,actions,reviewBox);document.body.append(dialog);
 let base=null,draft=null,prepared=null,running=false,dirty=false,urls=[],returnFocus=null,scope='archive',slot='00',caseId='01',activeLayer=6,layerDraft=defaults();
 const say=t=>{status.textContent=t;};
 const busy=value=>{running=value;[...controls,save,preview,close,restart,reviewed,...blocks.querySelectorAll('input,select,textarea,button')].forEach(el=>el.disabled=value);request.disabled=value||!reviewed.checked||!prepared||!getToken()||!base?.manifestSha;};
 let blobUrls=new Map();
 const blobUrl=blob=>{if(!blobUrls.has(blob)){const url=URL.createObjectURL(blob);blobUrls.set(blob,url);urls.push(url);}return blobUrls.get(blob);};
 const clearUrls=()=>{for(const url of urls)URL.revokeObjectURL(url);urls=[];blobUrls.clear();};
 function invalidate(){result.querySelectorAll('video').forEach(v=>v.pause());prepared=null;reviewed.checked=false;reviewBox.hidden=true;request.disabled=true;}
 function changed(){dirty=true;invalidate();renderMap();renderStage();}
 function run(fn){return async e=>{if(running)return;busy(true);try{await fn(e);}catch(error){say(errors[error?.message]||errorText(error));}finally{busy(false);}};}
 function publishedArchive(s){return archiveEntry(base.data,s);}
 function visualSource(source='case'){
  if(source==='case'){
   const entry=base.data.cases[caseId]||{};
   if(scope==='stories'&&draft?.files.photo&&!removeStoryPhoto.checked)return {caseId,path:blobUrl(draft.files.photo)};
   const still=scope==='stories'&&removeStoryPhoto.checked?entry.poster:entry.photo||entry.poster;
   return {caseId,path:still?'ja/lp/'+still:''};
  }
  const s=source.slice(8);let entry=publishedArchive(s);
  if(scope==='archive'&&s===slot&&draft){
   const assigned=caseSelect.value;
   if(assigned!==entry.caseId&&!base.data.archive?.[s])entry={caseId:assigned};
   else entry={...entry,caseId:assigned};
   if(removeArchivePhoto.checked)delete entry.photo;
   if(removeArchiveVideo.checked){delete entry.video;delete entry.poster;}
   const hasVideo=!removeArchiveVideo.checked&&(draft.files.video||entry.video),file=hasVideo?draft.files.poster:!removeArchivePhoto.checked&&draft.files.photo;
   if(hasVideo&&entry.poster&&!draft.files.poster)entry.photo=entry.poster;
   if(file)return {caseId:assigned,path:blobUrl(file)};
  }
  return {caseId:entry.caseId,path:entry.photo||entry.poster?'ja/lp/'+(entry.photo||entry.poster):''};
 }
 function paintImage(node,source,id){const visual=visualSource(source),path=visual.path,i=Number(id||visual.caseId)-1;node.style.backgroundImage=path?'url("'+path+'")':'url("ja/lp/assets/concept-materials.png")';node.style.backgroundSize=path?'cover':'400% 300%';node.style.backgroundPosition=path?'center':(i%4)*100/3+'% '+Math.floor(i/4)*50+'%';}
 function renderMap(){if(!base)return;for(const [s,b]of mapButtons){const entry=publishedArchive(s),id=scope==='archive'&&s===slot?caseSelect.value:entry.caseId,[width,ratio]=archiveFrames[Number(id)-1],n=Number(s);b.style.left=(n%5+.5)*20+'%';b.style.top=(Math.floor(n/5)+.5)*20+'%';b.style.width=width*20+'%';b.style.aspectRatio=String(ratio);paintImage(b.firstElementChild,'archive:'+s,id);b.setAttribute('aria-pressed',String(scope==='archive'&&s===slot));b.title=slotLabel(s)+' / '+(entry.title||labels[Number(id)-1]);}}
 function renderStage(){if(!draft||scope!=='stories')return;layerDraft.forEach((layer,i)=>{const b=layerButtons[i];paintImage(b,layer.source);b.style.left=layer.x+'%';b.style.top=layer.y+'%';b.style.width=layer.width+'%';b.style.transform='rotate('+layer.rotate+'deg)';b.classList.toggle('is-disabled',!layer.visible);b.setAttribute('aria-pressed',String(i===activeLayer));});}
 function showLayer(i){activeLayer=Number(i);layerSelect.value=String(i);const layer=layerDraft[activeLayer];layerSource.value=layer.source;layerVisible.checked=layer.visible;for(const [key,input]of Object.entries(layerInputs))input.value=String(layer[key]);renderStage();}
 function ensureStory(){draft.story||={};return draft.story;}
 function capture(){if(!draft)return;if(scope==='archive'){draft.id=caseSelect.value;draft.title=archiveTitle.value;draft.alt=archiveAlt.value;draft.removePhoto=removeArchivePhoto.checked;draft.removeVideo=removeArchiveVideo.checked;}else{for(const [key,input]of Object.entries(inputs))draft[key]=input.value;draft.removePhoto=removeStoryPhoto.checked;const index=LP_IDS.indexOf(order.value);if(index>=0){draft.order=draft.order.filter(id=>id!==draft.id);draft.order.splice(index,0,draft.id);}}}
 async function preserve(){if(!draft||!dirty)return;capture();await storage('put',draft);dirty=false;}
 function renderBlocks(){blocks.replaceChildren();const values=draft?.story?.blocks||[];values.forEach((block,i)=>{const box=m('fieldset'),legend=m('legend',(i+1)+' · '+(block.type==='text'?'文章':'画像'));box.append(legend);function bound(key,label,node){field(box,label,node);node.value=block[key]||'';node.addEventListener('input',()=>{block[key]=node.value;changed();});return node;}if(block.type==='text'){bound('heading','見出し',m('input')).maxLength=LP_STORY_TEXT_LIMITS.heading;bound('text','本文',m('textarea')).maxLength=LP_STORY_TEXT_LIMITS.text;}else{bound('source','表示する画像',sources(m('select')));bound('alt','画像の説明（読み上げ用）',m('input')).maxLength=LIMITS.alt;bound('caption','画像の下の文章',m('textarea')).maxLength=LP_STORY_TEXT_LIMITS.caption;}const row=m('div');row.className='actions';const up=btn('上へ'),down=btn('下へ'),remove=btn('この項目を外す');up.disabled=i===0;down.disabled=i===values.length-1;up.addEventListener('click',()=>{if(running||i===0)return;[values[i-1],values[i]]=[values[i],values[i-1]];changed();renderBlocks();});down.addEventListener('click',()=>{if(running||i===values.length-1)return;[values[i+1],values[i]]=[values[i],values[i+1]];changed();renderBlocks();});remove.addEventListener('click',()=>{if(running)return;values.splice(i,1);changed();renderBlocks();});row.append(up,down,remove);box.append(row);blocks.append(box);});}
 async function load({reset=false}={}){
  clearUrls();const key=scope==='archive'?'archive:'+slot:caseId,saved=reset?null:await storage('get',key),published=scope==='archive'?publishedArchive(slot):base.data.cases[caseId]||{};
  draft=saved||{scope,slot:scope==='archive'?slot:undefined,id:scope==='archive'?published.caseId:caseId,baseSha:base.manifestSha,order:[...(base.data.order||LP_IDS)],files:{},title:published.title||'',description:published.description||'',alt:published.alt||'',...(scope==='stories'&&published.story?{story:structuredClone(published.story)}:{})};draft.scope=scope;
  archive.hidden=scope!=='archive';stories.hidden=scope!=='stories';tabArchive.setAttribute('aria-selected',String(scope==='archive'));tabStories.setAttribute('aria-selected',String(scope==='stories'));
  slotSelect.value=slot;caseSelect.value=draft.id;archiveTitle.value=draft.title||'';archiveAlt.value=draft.alt||'';removeArchivePhoto.checked=Boolean(draft.removePhoto);removeArchiveVideo.checked=Boolean(draft.removeVideo);
  select.value=caseId;for(const [key,input]of Object.entries(inputs))input.value=draft[key]||'';order.value=LP_IDS[Math.max(0,draft.order.indexOf(draft.id))];removeStoryPhoto.checked=Boolean(draft.removePhoto);cover.value=draft.story?.cover||'case';for(const [key,input]of Object.entries(detailInputs))input.value=draft.story?.detail?.[key]||'';layerDraft=structuredClone(draft.story?.layers||defaults());
  [photo,...Object.values(archiveFiles)].forEach(el=>el.value='');invalidate();dirty=false;restart.hidden=!saved||saved.baseSha===base.manifestSha;renderMap();showLayer(activeLayer);renderBlocks();
  say(saved&&saved.baseSha!==base.manifestSha?'この下書きの後に公開内容が更新されました。内容を控えて下書きを作り直してください。':saved?'端末内の下書きを開きました。':'公開中の情報を読み込みました。');
 }
 const switchScope=next=>run(async()=>{if(scope===next)return;await preserve();scope=next;await load();});tabArchive.addEventListener('click',switchScope('archive'));tabStories.addEventListener('click',switchScope('stories'));
 const selectSlot=async s=>{await preserve();slot=s;await load();};for(const [s,b]of mapButtons)b.addEventListener('click',run(()=>selectSlot(s)));
 map.addEventListener('keydown',e=>{const b=e.target.closest('[data-slot]');if(!b)return;const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-5,ArrowDown:5}[e.key];if(!delta)return;e.preventDefault();let n=Number(b.dataset.slot)+delta;if(n===12)n+=delta;const next=mapButtons.get(String(n).padStart(2,'0'));next?.focus();});
 slotSelect.addEventListener('change',run(()=>selectSlot(slotSelect.value)));select.addEventListener('change',run(async()=>{await preserve();caseId=select.value;await load();}));
 for(const input of [archiveTitle,archiveAlt,caseSelect,...Object.values(inputs),order,removeStoryPhoto,removeArchivePhoto,removeArchiveVideo])input.addEventListener('input',()=>{if(!draft)return;capture();changed();});
 caseSelect.addEventListener('change',()=>{if(draft){draft.id=caseSelect.value;changed();}});
 async function chooseFile(input,kind){const file=input.files[0];if(!file||!draft)return;say('ファイルを確認しています。');let inspected;try{inspected=await inspectLpAsset(file,kind);}catch(e){input.value='';throw e;}draft.files[kind]=new Blob([inspected.bytes],{type:file.type});if(scope==='archive'){if(kind==='photo')removeArchivePhoto.checked=false;if(kind==='video')removeArchiveVideo.checked=false;}else removeStoryPhoto.checked=false;capture();changed();say('ファイルを選択しました。下書き保存かプレビューに進めます。');}
 for(const [kind,input]of Object.entries(archiveFiles))input.addEventListener('change',run(()=>chooseFile(input,kind)));photo.addEventListener('change',run(()=>chooseFile(photo,'photo')));
 for(const [input,kind]of [[removeArchivePhoto,'photo'],[removeArchiveVideo,'video'],[removeStoryPhoto,'photo']])input.addEventListener('change',()=>{if(!input.checked||!draft)return;delete draft.files[kind];if(kind==='video')delete draft.files.poster;changed();});
 layerSelect.addEventListener('change',()=>showLayer(layerSelect.value));layerButtons.forEach((b,i)=>b.addEventListener('click',()=>showLayer(i)));
 for(const input of [layerSource,layerVisible,...Object.values(layerInputs)])input.addEventListener('input',()=>{if(!draft)return;const layer=layerDraft[activeLayer];layer.source=layerSource.value;layer.visible=layerVisible.checked;for(const [key,node]of Object.entries(layerInputs))layer[key]=Number(node.value);ensureStory().layers=structuredClone(layerDraft);changed();});
 for(const [key,input]of Object.entries(detailInputs))input.addEventListener('input',()=>{if(!draft)return;(ensureStory().detail||={})[key]=input.value;changed();});
 cover.addEventListener('change',()=>{if(draft){if(cover.value==='case'){if(draft.story)delete draft.story.cover;}else ensureStory().cover=cover.value;changed();}});
 resetLayout.addEventListener('click',()=>{if(!draft)return;if(draft.story)delete draft.story.layers;layerDraft=defaults();showLayer(activeLayer);changed();});
 for(const [button,type]of [[addText,'text'],[addImage,'image']])button.addEventListener('click',()=>{if(!draft||running)return;const items=ensureStory().blocks||=[];if(items.length>=LP_STORY_BLOCK_LIMIT){say('追加できる項目は12件までです。');return;}items.push(type==='text'?{type,heading:'',text:''}:{type,source:'case',alt:'',caption:''});changed();renderBlocks();});
 restart.addEventListener('click',run(async()=>{if(!confirm('この位置・案件の端末内の下書きを最新の公開内容に置き換えます。公開ページと素材ファイルは変更しません。続けますか？'))return;await load({reset:true});await storage('put',draft);say('最新の公開内容から編集を始められます。');}));
 save.addEventListener('click',run(async()=>{await preserve();say('端末内に下書き保存しました。');}));close.addEventListener('click',run(async()=>{await preserve();dialog.close();}));dialog.addEventListener('cancel',e=>{e.preventDefault();if(!running)close.click();});dialog.addEventListener('close',()=>{result.querySelectorAll('video').forEach(v=>v.pause());clearUrls();returnFocus?.focus();});
 function reviewStage(){const copy=stage.cloneNode(true);copy.setAttribute('aria-label','未公開のStories画像構成');copy.querySelectorAll('button').forEach(b=>b.disabled=true);return copy;}
 function previewImage(parent,source,alt=''){const box=m('div');box.className='lp-review-image';paintImage(box,source);box.setAttribute('role','img');box.setAttribute('aria-label',alt||'素材のプレビュー');parent.append(box);}
 preview.addEventListener('click',run(async()=>{await preserve();invalidate();if(draft.baseSha!==base.manifestSha){say('公開内容が更新されています。下書きを控え、最新の公開内容からやり直してください。');return;}prepared=await prepareLpDraft(draft,base.data);result.replaceChildren(m('h3','未公開の変更プレビュー'),m('p',scope==='archive'?'Archives '+slotLabel(slot):'Stories '+(inputs.title.value||labels[Number(draft.id)-1])));if(scope==='archive'){previewImage(result,'archive:'+slot,archiveAlt.value);const entry=prepared.next.archive[slot];if(entry.video){const video=m('video');video.controls=true;video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';for(const [kind,property]of [['video','src'],['poster','poster']]){if(draft.files[kind]){video[property]=blobUrl(draft.files[kind]);}else video[property]='ja/lp/'+entry[kind];}result.append(video,m('p','プレビューは手動再生です。本番では画面内の素材として音声なしでループします。'));}}else{result.append(m('p','掲載順：'+((prepared.next.order||LP_IDS).indexOf(draft.id)+1)+'番目'),reviewStage(),m('h4',inputs.title.value||labels[Number(draft.id)-1]),m('p',inputs.description.value||'既定の紹介文を表示'));previewImage(result,cover.value,inputs.alt.value);for(const [key,input]of Object.entries(detailInputs))if(input.value.trim()){result.append(m('h4',input.closest('label').querySelector('span').textContent),m('p',input.value));}for(const block of draft.story?.blocks||[]){if(block.type==='text'){if(block.heading)result.append(m('h4',block.heading));result.append(m('p',block.text));}else{previewImage(result,block.source,block.alt);if(block.caption)result.append(m('p',block.caption));}}}reviewBox.hidden=false;say(previewOnly?'未公開のプレビューです。変更はこのブラウザー内だけに保存され、本番には送信されません。':getToken()&&base.manifestSha?'内容を確認してから、公開依頼を作成できます。':'公開依頼には、メニューの接続設定でGitHub接続が必要です。');}));
 reviewed.addEventListener('change',()=>busy(false));request.addEventListener('click',run(async()=>{if(!prepared||!reviewed.checked||dirty)return;const outcome=await publisher.publish(getToken(),draft,base,prepared.fingerprint);const link=m('a',outcome.number?'PR #'+outcome.number+' を確認':'GitHubで公開依頼を確認');link.href=outcome.number?'https://github.com/Kale1205/fde-site/pull/'+outcome.number:outcome.compare;link.target='_blank';link.rel='noopener noreferrer';result.append(link);reviewed.checked=false;say('本番は未変更です。GitHubでレビュー・マージ後に反映されます。');}));
 window.addEventListener('beforeunload',e=>{if(dialog.open&&(dirty||running)){e.preventDefault();e.returnValue='';}});
 return async trigger=>{if(dialog.open||running)return;returnFocus=trigger;dialog.showModal();busy(true);try{if(getToken())base=await publisher.snapshot(getToken());else{const response=await fetch('ja/lp/media-manifest.json',{cache:'no-cache',credentials:'same-origin'});if(!response.ok)throw Error('LP_MANIFEST');const bytes=new Uint8Array(await response.arrayBuffer()),header=new TextEncoder().encode('blob '+bytes.length+'\0'),blob=new Uint8Array(header.length+bytes.length);blob.set(header);blob.set(bytes,header.length);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',blob)),n=>n.toString(16).padStart(2,'0')).join('');base={data:validateMediaManifest(JSON.parse(new TextDecoder().decode(bytes))),manifestSha:hash};}await load();}catch(e){base=null;draft=null;say(errors[e?.message]||errorText(e));}finally{busy(false);preview.disabled=save.disabled=!draft;}};
}
