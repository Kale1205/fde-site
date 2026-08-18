import baseWorker from './index-v8.js';

const LOCALES=['en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];
const M2M_TARGET={en:'en','zh-CN':'zh',ko:'ko',id:'id',ms:'ms',vi:'vi',th:'th',hi:'hi',ar:'ar'};
const ORDER_STATUSES=new Set(['order_received','billing_preparation','awaiting_payment','payment_confirmed','preparing_delivery','delivered']);
const PRODUCTS=new Map([['IMS Starter','ims-starter'],['Business DX Pack','business-dx-pack']]);
const PLANS=new Set(['one-time','monthly']);
const PROTECTED=['IMS Starter','Business DX Pack','Baked Kale','Kale’s FDE','Kale\'s FDE','FDE'];

function clean(v,max=10000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function validOrderId(v){return /^BK-\d{8}-[A-F0-9]{8}$/i.test(v)}
function protect(text){let value=String(text||'');const tokens=[];PROTECTED.forEach((term,i)=>{const token=`FDETERM${i}X`;if(value.includes(term)){value=value.split(term).join(token);tokens.push([token,term])}});return{value,tokens}}
function restore(text,tokens){let value=String(text||'').trim();for(const [token,term] of tokens)value=value.split(token).join(term);return value}
function extractText(result){const value=result?.translated_text??result?.response??result?.result?.translated_text??result?.result?.response??result;if(typeof value!=='string'||!value.trim())throw new Error('AI_TRANSLATION_EMPTY');return value.trim()}
async function runWithRetry(fn){let last;for(let i=0;i<2;i++){try{return await fn()}catch(e){last=e;if(i===0)await new Promise(r=>setTimeout(r,120))}}throw last}
async function translateTraditional(env,text){const {value,tokens}=protect(text);const result=await runWithRetry(()=>env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{prompt:`Translate the following Japanese website text into natural Traditional Chinese used in Taiwan. Preserve tokens such as FDETERM0X exactly. Output only the translation, with no explanation or quotation marks.\n\n${value}`,max_tokens:1800,temperature:0}));return restore(extractText(result).replace(/^['\"]|['\"]$/g,''),tokens)}
async function translateOne(env,text,locale){if(!env.AI?.run)throw new Error('AI_NOT_CONFIGURED');if(locale==='zh-TW')return translateTraditional(env,text);const target=M2M_TARGET[locale];if(!target)throw new Error(`UNSUPPORTED_LOCALE_${locale}`);const {value,tokens}=protect(text);const result=await runWithRetry(()=>env.AI.run('@cf/meta/m2m100-1.2b',{text:value,source_lang:'ja',target_lang:target}));return restore(extractText(result),tokens)}
async function translateFields(env,fields){const source={};for(const [key,value] of Object.entries(fields||{})){if(!/^[a-z][a-z0-9_]{0,30}$/i.test(key))continue;const text=clean(value,8000);if(text)source[key]=text}const keys=Object.keys(source);if(!keys.length||keys.length>6)throw new Error('INVALID_TRANSLATION_FIELDS');const pairs=await Promise.all(LOCALES.map(async locale=>{const item={};for(const key of keys)item[key]=await translateOne(env,source[key],locale);return[locale,item]}));return Object.fromEntries(pairs)}
async function readJson(env,key){const raw=await env.ORDER_STATUS?.get(key);if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
async function writeOrderUpdate(env,raw){
 if(!env.ORDER_STATUS)throw new Error('ORDER_STATUS_NOT_CONFIGURED');
 const orderId=clean(raw.orderId,40).toUpperCase();if(!validOrderId(orderId))throw new Error('INVALID_ORDER_ID');
 const admin=await readJson(env,`admin-order:${orderId}`),statusRecord=await readJson(env,`order:${orderId}`);if(!admin||!statusRecord)throw new Error('ORDER_NOT_FOUND');
 const status=clean(raw.status,50),product=clean(raw.product,120),plan=clean(raw.plan,30);
 if(status&&!ORDER_STATUSES.has(status))throw new Error('INVALID_STATUS_DATA');
 if(product&&!PRODUCTS.has(product))throw new Error('INVALID_PRODUCT');
 if(plan&&!PLANS.has(plan))throw new Error('INVALID_PLAN');
 if(status)statusRecord.status=status;
 if(product){statusRecord.product=product;admin.product=product;admin.productKey=PRODUCTS.get(product)}
 if(plan){statusRecord.plan=plan;admin.plan=plan}
 if(Object.prototype.hasOwnProperty.call(raw,'message'))statusRecord.message=clean(raw.message,1200);
 const now=new Date().toISOString();statusRecord.updatedAt=now;admin.updatedAt=now;
 await Promise.all([env.ORDER_STATUS.put(`order:${orderId}`,JSON.stringify(statusRecord)),env.ORDER_STATUS.put(`admin-order:${orderId}`,JSON.stringify(admin))]);
 return{admin,status:statusRecord};
}

export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,60);
  if(!['admin_translate','admin_translate_fields','admin_order_update'].includes(type))return baseWorker.fetch(request,env,ctx);
  if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
  if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
  if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
  if(type==='admin_order_update'){
   try{const updated=await writeOrderUpdate(env,raw);return json({ok:true,status:updated.status.status,message:updated.status.message,product:updated.status.product,plan:updated.status.plan,updatedAt:updated.status.updatedAt},200,origin,allowedOrigin)}catch(error){const code=String(error?.message||'ORDER_UPDATE_FAILED');const status=code==='ORDER_NOT_FOUND'?404:code==='ORDER_STATUS_NOT_CONFIGURED'?503:400;return json({ok:false,error:code},status,origin,allowedOrigin)}
  }
  if(!env.AI?.run)return json({ok:false,error:'AI_NOT_CONFIGURED'},503,origin,allowedOrigin);
  try{return json({ok:true,translations:await translateFields(env,raw?.fields)},200,origin,allowedOrigin)}catch(error){console.error('CMS translation failed',error);const detail=String(error?.message||'CONTENT_TRANSLATION_FAILED');return json({ok:false,error:detail==='AI_NOT_CONFIGURED'?detail:'CONTENT_TRANSLATION_FAILED',detail},detail==='AI_NOT_CONFIGURED'?503:502,origin,allowedOrigin)}
 }
};
