import baseWorker from './index-v7.js';

const LOCALES=['en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];
function clean(v,max=10000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function buildSchema(keys){const fields={};for(const key of keys)fields[key]={type:'string'};const item={type:'object',properties:fields,required:keys,additionalProperties:false};const properties={};for(const locale of LOCALES)properties[locale]=item;return{type:'object',properties,required:LOCALES,additionalProperties:false}}
function normalize(result,keys){let value=result?.response??result?.result??result;if(typeof value==='string')value=JSON.parse(value);if(value?.response&&typeof value.response==='object')value=value.response;if(!value||typeof value!=='object')throw new Error('TRANSLATION_RESPONSE_INVALID');const out={};for(const locale of LOCALES){const item={};for(const key of keys){const text=clean(value?.[locale]?.[key],9000);if(!text)throw new Error(`TRANSLATION_MISSING_${locale}_${key}`);item[key]=text}out[locale]=item}return out}
async function translateFields(env,fields){if(!env.AI?.run)throw new Error('AI_NOT_CONFIGURED');const source={};for(const [key,value] of Object.entries(fields||{})){if(!/^[a-z][a-z0-9_]{0,30}$/i.test(key))continue;const text=clean(value,8000);if(text)source[key]=text}const keys=Object.keys(source);if(!keys.length||keys.length>6)throw new Error('INVALID_TRANSLATION_FIELDS');const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{messages:[{role:'system',content:'You are a professional B2B software localization translator. Translate Japanese website content accurately. Preserve product names, company names, URLs, numbers, currencies and technical terms. Use natural regional language. zh-CN must be Simplified Chinese and zh-TW must be Traditional Chinese used in Taiwan. Do not add facts.'},{role:'user',content:`Translate this Japanese JSON object into all requested locales while preserving the same field names: ${JSON.stringify(source)}`}],response_format:{type:'json_schema',json_schema:buildSchema(keys)},max_tokens:4200,temperature:0.1});return normalize(result,keys)}

export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,60);
  if(type!=='admin_translate_fields')return baseWorker.fetch(request,env,ctx);
  if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
  if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
  if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
  if(!env.AI?.run)return json({ok:false,error:'AI_NOT_CONFIGURED'},503,origin,allowedOrigin);
  try{return json({ok:true,translations:await translateFields(env,raw?.fields)},200,origin,allowedOrigin)}catch(error){console.error('Structured CMS translation failed',error);return json({ok:false,error:String(error?.message||'CONTENT_TRANSLATION_FAILED').startsWith('INVALID_')?'INVALID_TRANSLATION_FIELDS':'CONTENT_TRANSLATION_FAILED'},502,origin,allowedOrigin)}
 }
};
