export const LP_MANIFEST='ja/lp/media-manifest.json';
export const LP_IDS=Array.from({length:10},(_,i)=>String(i+1).padStart(2,'0'));
export const LP_MAX_VIDEO=24*1024**2;
export const LIMITS={title:100,description:1200,alt:180};
const fields=['title','description','alt','photo','video','poster'];
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const photoPath=/^assets\/cases\/(?:0[1-9]|10)\/[a-f0-9]{64}\.(?:png|jpg|webp)$/;
const videoPath=/^assets\/cases\/(?:0[1-9]|10)\/[a-f0-9]{64}\.mp4$/;
export function validateMediaManifest(data){
 if(!plain(data)||data.version!==1||Object.keys(data).some(k=>!['version','cases','order'].includes(k))||!plain(data.cases))throw Error('LP_MANIFEST');
 if(data.order&&(!Array.isArray(data.order)||data.order.length!==10||new Set(data.order).size!==10||data.order.some(id=>!LP_IDS.includes(id))))throw Error('LP_MANIFEST');
 for(const [id,entry] of Object.entries(data.cases)){
  if(!LP_IDS.includes(id)||!plain(entry)||Object.keys(entry).some(k=>!fields.includes(k)))throw Error('LP_MANIFEST');
  for(const [k,v] of Object.entries(entry)){
   if(typeof v!=='string'||!v.trim()||v.trim()!==v)throw Error('LP_MANIFEST');
   if(k in LIMITS){if(v.length>LIMITS[k])throw Error('LP_MANIFEST');}
   else if(!(k==='video'?videoPath:photoPath).test(v)||!v.startsWith('assets/cases/'+id+'/'))throw Error('LP_MANIFEST');
  }
  if((entry.photo||entry.video)&&!entry.alt||Boolean(entry.video)!==Boolean(entry.poster))throw Error('LP_MANIFEST');
 }
 return data;
}
