import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LP_IDS,LP_MANIFEST,validateMediaManifest} from '../ja/lp/media-schema.js';
import {inspectLpAsset,LpPublisher,LP_MAX_IMAGE,prepareLpDraft} from '../cms-lp-workflow.js';
const blank={version:1,cases:{}};
const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),hash='a'.repeat(64);
const photo='assets/cases/01/'+hash+'.jpg',video='assets/cases/01/'+hash+'.mp4';
const draft={id:'01',title:'新しい制作例',description:'紹介文',alt:'コーヒーカップの写真',order:[LP_IDS[1],LP_IDS[0],...LP_IDS.slice(2)],files:{}};

test('public manifest rejects third-party URLs, other case paths, HTML/SVG and incomplete video',()=>{
 for(const entry of [
  {photo:'https://example.com/a.jpg',alt:'example'},
  {photo:photo.replace('/01/','/02/'),alt:'example'},
  {photo:photo.replace('jpg','svg'),alt:'example'},
  {photo},{video,alt:'動画'},{poster:photo,alt:'画像'},
  {photo:photo.replace('/01/','/01/../01/'),alt:'example'},
 ])assert.throws(()=>validateMediaManifest({version:1,cases:{'01':entry}}),/LP_MANIFEST/);
 assert.throws(()=>validateMediaManifest({version:1,cases:{},order:LP_IDS.map(()=>LP_IDS[0])}),/LP_MANIFEST/);
 assert.doesNotThrow(()=>validateMediaManifest({version:1,cases:{'01':{video,poster:photo,alt:'動画'}}}));
 assert.deepEqual(JSON.parse(readFileSync(new URL('../'+LP_MANIFEST,import.meta.url))),blank);
});
test('asset inspector rejects incorrect signatures, oversized photo or unsupported browser dimensions',async()=>{
 const fake=new Blob(['<svg>'],{type:'image/jpeg'}),jpeg=new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'});
 const inspect=(f,dimensions)=>inspectLpAsset(f,'photo',{probe:async()=>dimensions});
 await assert.rejects(inspect(fake,{width:80,height:80}),/LP_MEDIA/);
 await assert.rejects(inspect(new Blob([new Uint8Array(LP_MAX_IMAGE+1)],{type:'image/jpeg'}),{width:80,height:80}),/LP_MEDIA/);
 await assert.rejects(inspect(jpeg,{width:50,height:90}),/LP_DIMENSIONS/);
 const good=await inspect(jpeg,{width:80,height:90});assert.equal(good.ext,'jpg');
 const mp4=new Blob([new Uint8Array([0,0,0,24]),'ftypisom',new Uint8Array(12)],{type:'video/mp4'});
 const input=(duration)=>inspectLpAsset(mp4,'video',{probe:async()=>({width:1280,height:720,duration})});
 await assert.rejects(input(32),/LP_DIMENSIONS/);
 assert.equal((await input(5)).ext,'mp4');
});
test('draft overrides preserve original case IDs, support separate video+poster and removal',async()=>{
 const data={...draft,files:{photo:1,video:2,poster:3}},inspect=async(_,kind)=>({bytes:new Uint8Array([1]),ext:kind==='video'?'mp4':'jpg',hash});
 const value=await prepareLpDraft(data,blank,{inspect});
 assert.deepEqual(value.next.order,draft.order);assert.deepEqual(value.assets.map(a=>a.path),[photo,video]);
 assert.equal(value.next.cases['01'].poster,photo);assert.equal(value.next.cases['01'].title,draft.title);
 const removal=await prepareLpDraft({...draft,removeVideo:true,removePhoto:true},value.next,{inspect});
 assert.equal(removal.next.cases['01'].video,undefined);assert.equal(removal.next.cases['01'].poster,undefined);
 await assert.rejects(prepareLpDraft({...draft,files:{video:2}},blank,{inspect}),/LP_MANIFEST/);
});
test('publisher enforces reviewed fingerprint, main conflict and draft PR-only transaction',async()=>{
 const events=[];
 const api={
  api:async(path,token,opt)=>{
   events.push({path,token,opt});
   if(path==='/git/ref/heads/main')return {object:{sha:a}};
   if(path.startsWith('/git/ref/heads/cms'))throw Object.assign(Error('not found'),{status:404});
   if(path==='/user')return {id:1,login:'fixture'};
   if(path.startsWith('/git/commits/'))return {tree:{sha:c}};
   if(path==='/pulls')return {number:30};
   return {sha:b};
  },
  file:async()=>({sha:b,text:JSON.stringify(blank)}),findPR:async()=>null
 };
 const client=new LpPublisher(api),base=await client.snapshot('fixture'),ready=await prepareLpDraft(draft,base.data);
 await assert.rejects(client.publish('',draft,base,ready.fingerprint),e=>e.code==='AUTH');
 await assert.rejects(client.publish('fixture',draft,base,'wrong'),e=>e.code==='REVIEW');
 await assert.rejects(client.publish('fixture',draft,{...base,manifestSha:c},ready.fingerprint),e=>e.code==='CONFLICT');
 assert.equal(events.filter(e=>e.opt?.method==='POST').length,0);
 assert.equal((await client.publish('fixture',draft,base,ready.fingerprint)).number,30);
 const writes=events.filter(e=>e.opt?.method==='POST').map(e=>[e.path,JSON.parse(e.opt.body)]);
 assert.deepEqual(writes.map(([path])=>path),['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls']);
 assert.deepEqual(writes[1][1].tree.map(f=>f.path),[LP_MANIFEST]);
 assert.match(writes[3][1].ref,/^refs\/heads\/cms\/lp\//);
 assert.equal(writes[4][1].draft,true);
});
test('video-only entry uses the poster and reorders the visible Stories without changing case identifiers',async()=>{
 const {galleryMedia,originalStoryIndex,mediaVideo}=await import('../ja/lp/media-runtime.js');
 const image=()=>({classList:{add(v){this.value=v;}},style:{setProperty(k,v){this[k]=v;}}});
 const cases=LP_IDS.map(id=>({dataset:{n:id,title:'old'},photo:image(),querySelector(){return this.photo;}}));
 const rows=LP_IDS.map((id,index)=>{
  const row={className:'print-'+index,photo:image(),label:{textContent:'old'},link:{href:'cases/'+id+'.html',setAttribute(k,v){this[k]=v;}}};
  row.card={closest:()=>row};
  row.querySelector=s=>s==='a'?row.link:row.label;row.querySelectorAll=()=>[row.photo];return row;
 });
 const list={children:[...rows],append(row){this.children=this.children.filter(value=>value!==row);this.children.push(row);}};
 const archiveLabels=LP_IDS.map(()=>({textContent:'old'}));
 const data={version:1,cases:{'01':{title:'new',description:'detail',alt:'poster',video,poster:photo}},order:[LP_IDS[1],LP_IDS[0],...LP_IDS.slice(2)]};
 galleryMedia(data,{content:{querySelectorAll:()=>cases}},{querySelector:()=>list},{querySelectorAll:()=>archiveLabels});
 assert.equal(originalStoryIndex(list.children[0].card),1);
 assert.equal(originalStoryIndex(list.children[1].card),0);
 assert.equal(list.children[1].link.href,'cases/01.html');
 assert.equal(rows[0].label.textContent,'new');
 assert.match(rows[0].photo.style['--case-photo'],/\/01\/a+\.jpg/);
 assert.equal(cases[0].dataset.video,video);
 const prev=globalThis.document;
 try{
  globalThis.document={createElement:()=>({paused:true,setAttribute(k,v){this[k]=v;}})};
  const player=mediaVideo(video,photo,'poster');
  assert.equal(player.preload,'none');
  assert.equal(player.paused,true);
  assert.equal(player.autoplay,undefined);
  assert.equal(player.controls,true);
  assert.match(player.poster,/\.jpg$/);
 }finally{globalThis.document=prev;}
});
