import baseWorker from './index-v5.js';

const TARGETS={
  en:'en',
  'zh-CN':'zh',
  ko:'ko',
  id:'id',
  ms:'ms',
  vi:'vi',
  th:'th',
  hi:'hi',
  ar:'ar'
};

function clean(v,max=10000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function extractTranslation(result){
  if(typeof result==='string'&&result.trim())return result.trim();
  const candidates=[
    result?.translated_text,result?.translation,result?.response,result?.text,
    result?.result?.translated_text,result?.result?.translation,result?.result?.response,
    result?.[0]?.translated_text,result?.[0]?.translation_text,result?.[0]?.translation,result?.[0]?.generated_text
  ];
  const found=candidates.find(v=>typeof v==='string'&&v.trim());
  if(!found)throw new Error('TRANSLATION_EMPTY');
  return found.trim();
}
async function translateText(env,text,target){
  if(!env.AI?.run)throw new Error('AI_NOT_CONFIGURED');
  const result=await env.AI.run('@cf/meta/m2m100-1.2b',{text,source_lang:'ja',target_lang:target});
  return extractTranslation(result);
}
async function toTraditionalChinese(env,text){
  if(!env.AI?.run)throw new Error('AI_NOT_CONFIGURED');
  const prompt=`Convert the following Simplified Chinese text to natural Traditional Chinese used in Taiwan. Preserve product names, company names, URLs, numbers and punctuation. Output only the converted text, without quotes or explanation.\n\n${text}`;
  const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct',{prompt,max_tokens:1200,temperature:0});
  return extractTranslation(result).replace(/^['"]|['"]$/g,'').trim();
}
async function translateFields(env,fields){
  const source={};
  for(const [key,value] of Object.entries(fields||{})){
    const text=clean(value,8000);
    if(text)source[key]=text;
  }
  if(!Object.keys(source).length)throw new Error('NO_TRANSLATION_FIELDS');
  const translations={};
  for(const [locale,target] of Object.entries(TARGETS)){
    const values={};
    for(const [key,text] of Object.entries(source))values[key]=await translateText(env,text,target);
    translations[locale]=values;
  }
  const tw={};
  for(const [key,text] of Object.entries(translations['zh-CN']))tw[key]=await toTraditionalChinese(env,text);
  translations['zh-TW']=tw;
  return translations;
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
    try{
      const translations=await translateFields(env,raw?.fields);
      return json({ok:true,translations},200,origin,allowedOrigin);
    }catch(error){
      console.error('CMS translation failed',error);
      const code=String(error?.message||'CONTENT_TRANSLATION_FAILED');
      if(code==='AI_NOT_CONFIGURED')return json({ok:false,error:code},503,origin,allowedOrigin);
      return json({ok:false,error:'CONTENT_TRANSLATION_FAILED'},502,origin,allowedOrigin);
    }
  }
};
