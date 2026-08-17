import baseWorker from './index-v6.js';

const LOCALES=['en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];

function clean(v,max=10000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}

function translationSchema(){
 const item={type:'object',properties:{question:{type:'string'},answer:{type:'string'}},required:['question','answer'],additionalProperties:false};
 const properties={};for(const locale of LOCALES)properties[locale]=item;
 return{type:'object',properties,required:LOCALES,additionalProperties:false};
}
function normalizeResult(result){
 let value=result?.response??result?.result??result;
 if(typeof value==='string')value=JSON.parse(value);
 if(value?.response&&typeof value.response==='object')value=value.response;
 if(!value||typeof value!=='object')throw new Error('TRANSLATION_RESPONSE_INVALID');
 const out={};
 for(const locale of LOCALES){
  const q=clean(value?.[locale]?.question,1600),a=clean(value?.[locale]?.answer,8000);
  if(!q||!a)throw new Error(`TRANSLATION_MISSING_${locale}`);
  out[locale]={question:q,answer:a};
 }
 return out;
}
async function translateFaq(env,questionJa,answerJa){
 if(!env.AI?.run)throw new Error('AI_NOT_CONFIGURED');
 const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{
  messages:[
   {role:'system',content:'You are a professional B2B software localization translator. Translate Japanese FAQ content accurately. Preserve product names, company names, URLs, numbers, currencies and technical terms. Use natural regional language. zh-CN must be Simplified Chinese and zh-TW must be Traditional Chinese used in Taiwan. Do not add facts.'},
   {role:'user',content:`Translate this FAQ into the requested locales. Japanese question: ${questionJa}\nJapanese answer: ${answerJa}`}
  ],
  response_format:{type:'json_schema',json_schema:translationSchema()},
  max_tokens:3600,
  temperature:0.1
 });
 return normalizeResult(result);
}

export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,60);
  if(type!=='admin_translate')return baseWorker.fetch(request,env,ctx);
  if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
  if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
  if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
  if(!env.AI?.run)return json({ok:false,error:'AI_NOT_CONFIGURED'},503,origin,allowedOrigin);
  const fields=raw?.fields||{},questionJa=clean(fields.question,1600),answerJa=clean(fields.answer,8000);
  if(!questionJa||!answerJa)return json({ok:false,error:'INVALID_TRANSLATION_FIELDS'},400,origin,allowedOrigin);
  try{
   const translations=await translateFaq(env,questionJa,answerJa);
   return json({ok:true,translations},200,origin,allowedOrigin);
  }catch(error){
   console.error('Structured FAQ translation failed',error);
   return json({ok:false,error:'CONTENT_TRANSLATION_FAILED'},502,origin,allowedOrigin);
  }
 }
};
