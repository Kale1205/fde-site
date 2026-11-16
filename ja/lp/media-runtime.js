import {archiveEntry,validateMediaManifest} from './media-schema.js';
const root=new URL('./',import.meta.url);
const url=path=>new URL(path,root).href;
export async function loadMedia(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);
 try{
  const response=await fetch(url('media-manifest.json'),{cache:'no-cache',signal:controller.signal});
  if(!response.ok)return null;
  return validateMediaManifest(await response.json());
 }catch{return null;}finally{clearTimeout(timer);}
}
function setPhoto(photo,path){
 if(!photo||!path)return;
 photo.classList.add('case-custom-photo');
 photo.style.setProperty('--case-photo','url("'+url(path)+'")');
}
export const originalStoryIndex=card=>Number(card.closest('li').className.match(/print-(\d+)/)?.[1]);
const still=entry=>entry?.photo||entry?.poster;
function sprite(photo,id){
 const i=Number(id)-1;
 photo.classList.remove('case-custom-photo');
 photo.style.removeProperty('--case-photo');
 photo.style.setProperty('--px',(i%4)*100/3+'%');
 photo.style.setProperty('--py',Math.floor(i/4)*50+'%');
}
function storySource(data,id,source){
 return source?.startsWith('archive:')?archiveEntry(data,source.slice(8)):{caseId:id,...data.cases[id]};
}
function applySource(photo,source){
 if(!photo||!source)return;
 sprite(photo,source.caseId);
 setPhoto(photo,still(source));
}
export function archiveMaterial(data,items,slot){
 const source=archiveEntry(data||{cases:{}},slot);
 const item=items[Number(source.caseId)-1];
 const photo=item.firstElementChild.cloneNode(true);
 applySource(photo,source.video?{...source,photo:source.poster}:source);
 return {photo,title:source.title||item.dataset.title,details:item.dataset.url,alt:source.alt,video:source.video,poster:source.poster};
}
export function galleryMedia(data,template,stories,archive){
 if(!data)return;
 const projects=[...template.content.querySelectorAll('article')],list=stories.querySelector('.prints'),rows=[...list.children],select=[...archive.querySelectorAll('.material-access [data-material]')];
 projects.forEach((project,i)=>{
  const id=project.dataset.n,entry=data.cases[id];
  if(!entry)return;
  const link=rows[i].querySelector('a');
  if(entry.title){
   project.dataset.title=entry.title;rows[i].querySelector('.print-caption b').textContent=entry.title;link.setAttribute('aria-label',id+' '+entry.title+'の制作例');
   select[i].textContent=entry.title;
  }
  const still=entry.photo||entry.poster;
  setPhoto(project.querySelector('.photo'),still);
  rows[i].querySelectorAll('.photo').forEach(photo=>setPhoto(photo,still));
  if(entry.alt)project.dataset.alt=entry.alt;
  // The previous video metadata stays valid as stored history, but it is
  // not eligible for Archive playback without a selected Archive position.
  if(entry.story?.layers)rows[i].querySelectorAll('.collage-print').forEach((layer,j)=>{
   const config=entry.story.layers[j];
   layer.hidden=!config.visible;
   if(config.source.startsWith('archive:'))layer.dataset.archiveSource=config.source;
   layer.style.setProperty('--story-x',config.x+'%');
   layer.style.setProperty('--story-y',config.y+'%');
   layer.style.setProperty('--story-width',config.width+'%');
   layer.style.setProperty('--story-rotate',config.rotate+'deg');
   layer.classList.add('story-layer-custom');
   applySource(layer.querySelector('.photo'),storySource(data,id,config.source));
  });
 });
 if(data.order){
  for(const id of data.order)list.append(rows[Number(id)-1]);
 }
}
export function archiveVideo(path,poster){
 const video=document.createElement('video');
 video.poster=url(poster);video.loop=true;video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';
 video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');video.setAttribute('disablepictureinpicture','');
 video.tabIndex=-1;video.className='archive-loop';video.src=url(path);
 video.addEventListener('playing',()=>video.classList.add('is-playing'));
 video.addEventListener('error',()=>video.classList.remove('is-playing'));
 return video;
}
export function archivePlayback(root,blocked){
 const candidates=new Map(),visible=new Map(),players=new Map(),failed=new Map();let frame=0;
 const viewport=new IntersectionObserver(records=>{
  for(const {target,isIntersecting,intersectionRatio} of records)if(candidates.has(target)){
   if(isIntersecting&&intersectionRatio>.1)visible.set(target,intersectionRatio);
   else visible.delete(target);
  }
  refresh();
 },{root,threshold:[.1,.25,.5,.75,1]});
 function release(path){
  const player=players.get(path);if(!player)return;
  players.delete(path);player.video.pause();player.video.remove();player.video.removeAttribute('src');player.video.load();
 }
 function sync(){
  frame=0;
  if(blocked()){for(const path of players.keys())release(path);return;}
  const winners=new Map();
  for(const [node,ratio] of visible){
   const cfg=candidates.get(node);if(!cfg||!node.isConnected||node.classList.contains('is-in-flight'))continue;
   const active=players.get(cfg.video)?.node,previous=winners.get(cfg.video);
   if(!previous||node===active||(previous.node!==active&&ratio>previous.ratio))winners.set(cfg.video,{node,cfg,ratio});
  }
  for(const [path,player] of players)if(winners.get(path)?.node!==player.node)release(path);
  for(const [path,{node,cfg}] of winners){
   if(players.has(path)||failed.get(path)===node)continue;
   const video=archiveVideo(path,cfg.poster);
   node.append(video);players.set(path,{node,video});
   const fail=()=>{if(players.get(path)?.video!==video)return;failed.set(path,node);release(path);};
   video.addEventListener('error',fail,{once:true});
   video.play()?.catch(fail);
  }
 }
 function refresh(){
  // Hidden tabs can suspend RAF before delivery; pause/clear immediately.
  if(blocked()){if(frame)cancelAnimationFrame(frame);sync();}
  else if(!frame)frame=requestAnimationFrame(sync);
 }
 return {
  watch(node,cfg){if(cfg.video){candidates.set(node,cfg);viewport.observe(node);}},
  unwatch(tile){for(const [node,{video}] of candidates)if(tile.contains(node)){viewport.unobserve(node);visible.delete(node);candidates.delete(node);if(players.get(video)?.node===node)release(video);if(failed.get(video)===node)failed.delete(video);}refresh();},
  refresh,
 };
}
export async function applyCaseMedia(){
 const id=location.pathname.match(/\/(0[1-9]|10)\.html$/)?.[1];if(!id)return;
 const data=await loadMedia(),entry=data?.cases[id];if(!entry&&!data?.order)return;
 if(entry?.title){
  document.title=entry.title+'の制作例 | Baked Kale';
  document.querySelector('.case-copy h2').textContent=entry.title;
  const mockName=document.querySelector('.sample-end span:last-child');if(mockName)mockName.textContent=entry.title;
 }
 if(entry?.description)document.querySelector('.case-copy h2+p').textContent=entry.description;
 const detail=entry?.story?.detail;
 if(detail){
  const selectors={headline:'.case-hero h1',subtitle:'.case-hero > div:first-child > p:not(.eyebrow)',eyebrow:'.case-hero .eyebrow',mood:'.case-copy dd:nth-of-type(1)',composition:'.case-copy dd:nth-of-type(2)',note:'.case-copy > div:last-child > p'};
  for(const [key,selector] of Object.entries(selectors)){
   if(!Object.hasOwn(detail,key))continue;
   const node=document.querySelector(selector);
   if(node){node.textContent=detail[key];if(key==='headline')node.classList.add('case-custom-headline');}
  }
 }
 const cover=storySource(data,id,entry?.story?.cover);
 const coverPath=still(cover);
 if(coverPath||entry?.story?.cover?.startsWith('archive:')){
  applySource(document.querySelector('.sample-picture .photo'),cover);
  if(cover.alt){
   const description=document.createElement('p');description.className='case-media-alt';description.textContent=cover.alt;
   document.querySelector('.case-picture').append(description);
  }
 }
 if(entry?.story?.blocks?.length){
  const blocks=document.createElement('div');blocks.className='case-story-blocks';
  for(const block of entry.story.blocks){
   if(block.type==='text'){
    const text=document.createElement('section'),p=document.createElement('p');text.className='case-story-text';
    if(block.heading){const heading=document.createElement('h2');heading.textContent=block.heading;text.append(heading);}
    p.textContent=block.text;text.append(p);blocks.append(text);
   }else{
    const source=storySource(data,id,block.source),figure=document.createElement('figure');
    const path=still(source),alt=block.alt||source.alt||document.querySelector('.case-copy h2').textContent;
    if(path){
     const img=document.createElement('img');img.src=url(path);img.alt=alt;img.loading='lazy';figure.append(img);
    }else{
     const photo=document.createElement('span');photo.className='photo';photo.setAttribute('role','img');photo.setAttribute('aria-label',alt);
     applySource(photo,source);figure.append(photo);
    }
    if(block.caption){const caption=document.createElement('figcaption');caption.textContent=block.caption;figure.append(caption);}
    blocks.append(figure);
   }
  }
  document.querySelector('.case-copy').after(blocks);
 }
}
