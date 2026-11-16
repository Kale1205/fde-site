export const LP_MANIFEST='ja/lp/media-manifest.json';
export const LP_IDS=Object.freeze(Array.from({length:10},(_,i)=>String(i+1).padStart(2,'0')));
const slotIds=Array.from({length:25},(_,i)=>String(i).padStart(2,'0'));
export const LP_ARCHIVE_SLOTS=Object.freeze(slotIds.filter(id=>id!=='12'));
// One repeating 5 × 5 sheet, with the Archive wordmark at its center.
export const LP_ARCHIVE_CASES=Object.freeze(Object.fromEntries(
 [2,8,3,0,5,9,4,6,7,1,0,5,-1,3,8,6,1,9,4,2,7,8,0,5,9]
 .flatMap((index,slot)=>index<0?[]:[[slotIds[slot],LP_IDS[index]]])
));
export const LP_STORY_SOURCES=Object.freeze(['case',...LP_ARCHIVE_SLOTS.map(slot=>'archive:'+slot)]);
export const LIMITS={title:100,description:1200,alt:180};
export const LP_STORY_LAYER_LIMITS=Object.freeze({x:[0,100],y:[0,100],width:[8,100],rotate:[-45,45]});
export const LP_STORY_BLOCK_LIMIT=12;
export const LP_STORY_TEXT_LIMITS=Object.freeze({heading:100,text:2000,alt:180,caption:400});
export const LP_STORY_DETAIL_LIMITS=Object.freeze({headline:180,subtitle:180,eyebrow:100,mood:200,composition:600,note:1200});
const fields=['title','description','alt','photo','video','poster','story'];
const archiveFields=['caseId','title','alt','photo','video','poster'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[null,Object.prototype].includes(Object.getPrototypeOf(value));
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const string=(value,limit)=>typeof value==='string'&&value.length<=limit&&value.length>0&&value.trim()===value;
const validSource=value=>LP_STORY_SOURCES.includes(value);
const fail=()=>{throw Error('LP_MANIFEST');};
function checkStory(value){
 if(!keys(value,['layers','cover','blocks','detail']))fail();
 if(Object.hasOwn(value,'detail')){
  if(!keys(value.detail,Object.keys(LP_STORY_DETAIL_LIMITS)))fail();
  for(const [key,text] of Object.entries(value.detail))if(!string(text,LP_STORY_DETAIL_LIMITS[key]))fail();
 }
 if(Object.hasOwn(value,'cover')&&!validSource(value.cover))fail();
 if(Object.hasOwn(value,'layers')){
  if(!Array.isArray(value.layers)||value.layers.length!==7)fail();
  for(const item of value.layers){
   if(!keys(item,['source','visible',...Object.keys(LP_STORY_LAYER_LIMITS)])||!validSource(item.source)||typeof item.visible!=='boolean')fail();
   for(const [key,[min,max]] of Object.entries(LP_STORY_LAYER_LIMITS)){
    const n=item[key];if(!Number.isFinite(n)||n<min||n>max)fail();
   }
  }
  if(!value.layers.some(item=>item.visible))fail();
 }
 if(Object.hasOwn(value,'blocks')){
  if(!Array.isArray(value.blocks)||value.blocks.length>LP_STORY_BLOCK_LIMIT)fail();
  for(const block of value.blocks){
   if(!object(block))fail();
   if(block.type==='text'){
    if(!keys(block,['type','heading','text'])||!string(block.text,LP_STORY_TEXT_LIMITS.text))fail();
    if(Object.hasOwn(block,'heading')&&!string(block.heading,LP_STORY_TEXT_LIMITS.heading))fail();
   }else if(block.type==='image'){
    if(!keys(block,['type','source','alt','caption'])||!validSource(block.source))fail();
    for(const key of ['alt','caption'])if(Object.hasOwn(block,key)&&!string(block[key],LP_STORY_TEXT_LIMITS[key]))fail();
   }else fail();
  }
 }
}
function checkEntry(id,entry,archive=false){
 if(!keys(entry,archive?archiveFields:fields))fail();
 const prefix='assets/'+(archive?'archive/':'cases/')+id+'/';
 for(const [key,value] of Object.entries(entry)){
  if(key==='story')checkStory(value);
  else if(key==='caseId'){if(!LP_IDS.includes(value))fail();}
  else if(Object.hasOwn(LIMITS,key)){if(!string(value,LIMITS[key]))fail();}
  else{
   const kind=key==='video'?/^[a-f0-9]{64}\.mp4$/:/^[a-f0-9]{64}\.(?:png|jpg|webp)$/;
   const matches=target=>typeof value==='string'&&value.startsWith(target)&&kind.test(value.slice(target.length));
   // Reuse a still from the assigned case, without copying media or
   // broadening the accepted Archive clip location.
   if(!matches(prefix)&&!(archive&&key!=='video'&&LP_IDS.includes(entry.caseId)&&matches('assets/cases/'+entry.caseId+'/')))fail();
  }
 }
 if(archive&&!LP_IDS.includes(entry.caseId))fail();
 if((entry.photo||entry.video)&&!entry.alt||Boolean(entry.video)!==Boolean(entry.poster))fail();
}
export function validateMediaManifest(data){
 if(!keys(data,['version','cases','order','archive'])||data.version!==1||!object(data.cases))fail();
 if(Object.hasOwn(data,'order')&&(!Array.isArray(data.order)||data.order.length!==10||new Set(data.order).size!==10||[...data.order].some(id=>!LP_IDS.includes(id))))fail();
 for(const [id,entry] of Object.entries(data.cases)){
  if(!LP_IDS.includes(id))fail();
  checkEntry(id,entry);
 }
 if(Object.hasOwn(data,'archive')){
  if(!object(data.archive))fail();
  for(const [slot,entry] of Object.entries(data.archive)){
   if(!LP_ARCHIVE_SLOTS.includes(slot))fail();
   checkEntry(slot,entry,true);
  }
 }
 return data;
}
// The pre-existing case video was never an autoplay tile; only explicit
// Archive uploads play here. Legacy case images remain visible by default.
export function archiveEntry(data,slot){
 if(!Object.hasOwn(LP_ARCHIVE_CASES,slot))return null;
 const caseId=LP_ARCHIVE_CASES[slot];
 const custom=data?.archive?.[slot];
 if(custom)return custom;
 const legacy=data?.cases?.[caseId];
 return {caseId,...(legacy?.title?{title:legacy.title}:{}),...(legacy?.alt?{alt:legacy.alt}:{}),...(legacy?.photo||legacy?.poster?{photo:legacy.photo||legacy.poster}:{})};
}
