import baseWorker from './index-v13.js';

const PROTECTED=['FDE IMS License Plus','FDE IMS License','FDE IMS Updates','License Agreement','EULA','IMS Starter','Business DX Pack','Baked Kale','Kale’s FDE','Kale\'s FDE','FDE','Customer Portal','Cloudflare','Brevo','GitHub'];
// The inherited commerce handlers still implement the retired two-plan catalog.
// Keep every public or mutating commerce route fail-closed until a reviewed
// three-plan backend, EULA, payment, and fulfillment migration replaces them.
const PRE_RELEASE_COMMERCE_TYPES=new Set(['order','status_lookup','status_update','admin_orders_list','admin_order_update','admin_order_cancel','admin_pdf','fulfillment']);
function clean(v,max=8000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function protect(text){let value=String(text||'');const tokens=[];PROTECTED.forEach((term,i)=>{const token=`FDETERM${i}X`;if(value.includes(term)){value=value.split(term).join(token);tokens.push([token,term])}});return{value,tokens}}
function restore(text,tokens){let value=String(text||'');for(const [token,term] of tokens)value=value.split(token).join(term);return value.trim()}
function extractText(result){const v=result?.response??result?.translated_text??result?.result?.response??result?.result?.translated_text??result;if(typeof v!=='string'||!v.trim())throw new Error('AI_EMPTY');return v.trim()}
function extractJson(text){const t=String(text||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();try{return JSON.parse(t)}catch{}const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(t.slice(a,b+1));throw new Error('AI_JSON_INVALID')}
function terms(v){const arr=Array.isArray(v)?v:String(v||'').split(/[,、;|\n]/);return[...new Set(arr.map(x=>clean(x,100)).filter(Boolean))].slice(0,10)}
function baseKeywords(q,a){const words=`${q} ${a}`.replace(/[\p{P}\p{S}]/gu,' ').split(/\s+/).map(x=>x.trim()).filter(x=>x.length>1);return[...new Set(words)].slice(0,8)}
async function retry(fn){let last;for(let i=0;i<2;i++){try{return await fn()}catch(e){last=e;if(i===0)await new Promise(r=>setTimeout(r,150))}}throw last}
async function translateEnglish(env,text){const {value,tokens}=protect(text);const out=await retry(()=>env.AI.run('@cf/meta/m2m100-1.2b',{text:value,source_lang:'ja',target_lang:'en'}));return restore(extractText(out),tokens)}
async function translateFields(env,title,body){const [enTitle,enBody]=await Promise.all([translateEnglish(env,title),translateEnglish(env,body)]);return{ja:{title,body},en:{title:enTitle,body:enBody}}}
async function enrichFaq(env,q,a){
 const pq=protect(q),pa=protect(a),tokenPairs=[...pq.tokens,...pa.tokens];
 const prompt=`You are preparing English FAQ search data for a professional B2B software website. Translate the Japanese question and answer naturally into English. Preserve tokens such as FDETERM0X exactly and do not translate protected brand/product names.\n\nJapanese question:\n${pq.value}\n\nJapanese answer:\n${pa.value}\n\nReturn ONLY valid JSON with exactly these fields:\n{"question":"...","answer":"...","keywords":["..."],"synonyms":["..."]}\n\nRules:\n- keywords: 5 to 8 short English search terms.\n- synonyms: 4 to 7 natural alternative English words or phrasings.\n- Do not invent policies, prices, features, promises, platforms, or payment methods.\n- No markdown and no commentary.`;
 let en;
 try{
  const out=await retry(()=>env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{prompt,max_tokens:1300,temperature:.1}));
  const parsed=extractJson(extractText(out));
  en={question:restore(clean(parsed.question,1200),tokenPairs),answer:restore(clean(parsed.answer,7000),tokenPairs),keywords:terms(parsed.keywords).map(x=>restore(x,tokenPairs)),synonyms:terms(parsed.synonyms).map(x=>restore(x,tokenPairs))};
  if(!en.question||!en.answer||!en.keywords.length||!en.synonyms.length)throw new Error('AI_FAQ_FIELDS_EMPTY');
 }catch(error){
  console.warn('English FAQ enrichment fallback',error);
  const [question,answer]=await Promise.all([translateEnglish(env,q),translateEnglish(env,a)]);
  en={question,answer,keywords:baseKeywords(question,answer),synonyms:[]};
 }
 return{question:{ja:q,en:en.question},answer:{ja:a,en:en.answer},keywords:{ja:baseKeywords(q,a),en:en.keywords},synonyms:{ja:[],en:en.synonyms}};
}
function authorize(raw,env,origin,allowedOrigin){
 if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
 if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
 if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
 if(!env.AI?.run)return json({ok:false,error:'AI_NOT_CONFIGURED'},503,origin,allowedOrigin);
 return null;
}
export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,60);
  if(PRE_RELEASE_COMMERCE_TYPES.has(type))return json({ok:false,error:'FDE_COMMERCE_DISABLED_PRE_RELEASE'},503,origin,allowedOrigin);
  if(type!=='admin_faq_enrich'&&type!=='admin_translate_fields')return baseWorker.fetch(request,env,ctx);
  const auth=authorize(raw,env,origin,allowedOrigin);if(auth)return auth;
  try{
   if(type==='admin_translate_fields'){
    const title=clean(raw?.fields?.title,1200),body=clean(raw?.fields?.body,7000);if(!title||!body)return json({ok:false,error:'INVALID_TRANSLATION_SOURCE'},400,origin,allowedOrigin);
    const translations=await translateFields(env,title,body);return json({ok:true,translations},200,origin,allowedOrigin);
   }
   const q=clean(raw?.question,1200),a=clean(raw?.answer,7000);if(!q||!a)return json({ok:false,error:'INVALID_FAQ_SOURCE'},400,origin,allowedOrigin);
   const faq=await enrichFaq(env,q,a);return json({ok:true,faq},200,origin,allowedOrigin);
  }catch(error){console.error('CMS language generation failed',error);return json({ok:false,error:type==='admin_faq_enrich'?'FAQ_ENRICH_FAILED':'CONTENT_TRANSLATION_FAILED',detail:String(error?.message||error)},502,origin,allowedOrigin)}
 }
};
