import baseWorker from './index-v4.js';

const TARGET_LANGS=['en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];

function clean(v,max=8000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function extractJson(value){
 const text=String(value??'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 const start=text.indexOf('{'),end=text.lastIndexOf('}');
 if(start<0||end<=start)throw new Error('AI_RESPONSE_NOT_JSON');
 return JSON.parse(text.slice(start,end+1));
}
function validateTranslations(raw){
 const out={};
 for(const lang of TARGET_LANGS){
   const item=raw?.[lang];
   const question=clean(item?.question,1200),answer=clean(item?.answer,6000);
   if(!question||!answer)throw new Error(`MISSING_TRANSLATION_${lang}`);
   out[lang]={question,answer};
 }
 return out;
}
async function translateFaq(env,questionJa,answerJa){
 if(!env.AI?.run)throw new Error('AI_NOT_CONFIGURED');
 const source=JSON.stringify({question:questionJa,answer:answerJa});
 const prompt=`You are a professional software-product localization translator. Translate the Japanese FAQ JSON below into exactly these locale keys: en, zh-CN, zh-TW, ko, id, ms, vi, th, hi, ar.\n\nRequirements:\n- Preserve product names, company names, plan names, URLs, numbers, currency amounts and technical terms accurately.\n- zh-CN must use Simplified Chinese.\n- zh-TW must use Traditional Chinese.\n- id must be natural Bahasa Indonesia.\n- ms must be natural Bahasa Melayu.\n- Keep the tone concise and professional for a B2B software website.\n- Do not add information that is not present in the Japanese source.\n- Return ONLY one valid JSON object. No markdown, no comments, no code fences.\n- Each locale value must be an object with exactly two string properties: question and answer.\n\nJapanese source JSON:\n${source}`;
 const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{prompt,max_tokens:3200,temperature:0.1});
 const parsed=extractJson(result?.response??result?.result??result);
 return validateTranslations(parsed);
}

export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,50);
  if(type!=='admin_faq_translate')return baseWorker.fetch(request,env,ctx);
  if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
  if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
  if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
  const questionJa=clean(raw?.questionJa,1200),answerJa=clean(raw?.answerJa,6000);
  if(!questionJa||!answerJa)return json({ok:false,error:'INVALID_FAQ_TRANSLATION_DATA'},400,origin,allowedOrigin);
  try{
    const translations=await translateFaq(env,questionJa,answerJa);
    return json({ok:true,translations},200,origin,allowedOrigin);
  }catch(error){
    console.error('FAQ translation failed',error);
    const code=String(error?.message||'FAQ_TRANSLATION_FAILED');
    if(code==='AI_NOT_CONFIGURED')return json({ok:false,error:code},503,origin,allowedOrigin);
    return json({ok:false,error:'FAQ_TRANSLATION_FAILED'},502,origin,allowedOrigin);
  }
 }
};
