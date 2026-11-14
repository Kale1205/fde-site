import {validateMediaManifest} from './media-schema.js';
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
  if(entry.video){project.dataset.video=entry.video;project.dataset.poster=entry.poster;}
 });
 if(data.order){
  for(const id of data.order)list.append(rows[Number(id)-1]);
 }
}
export function mediaVideo(path,poster,description){
 const video=document.createElement('video');
 video.src=url(path);video.poster=url(poster);video.controls=true;video.playsInline=true;video.preload='none';
 video.setAttribute('aria-label',description);video.className='case-video';
 return video;
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
 if(entry?.photo||entry?.poster){
  const photo=document.querySelector('.sample-picture .photo');
  setPhoto(photo,entry.photo||entry.poster);
  const description=document.createElement('p');description.className='case-media-alt';description.textContent=entry.alt;
  document.querySelector('.case-picture').append(description);
 }
 if(entry?.video){
  const section=document.createElement('section');section.className='case-media';const heading=document.createElement('h2');heading.textContent='制作例の動画';
  section.append(heading,mediaVideo(entry.video,entry.poster,entry.alt));document.querySelector('.case-hero').after(section);
 }
}
