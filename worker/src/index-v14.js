import baseWorker from './index-v13.js';

const LOCALES=['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];
const LOCALE_NAMES={ja:'Japanese',en:'English','zh-CN':'Simplified Chinese','zh-TW':'Traditional Chinese used in Taiwan',ko:'Korean',id:'Bahasa Indonesia',ms:'Bahasa Melayu',vi:'Vietnamese',th:'Thai',hi:'Hindi',ar:'Arabic'};
const M2M_TARGET={en:'en','zh-CN':'zh',ko:'ko',id:'id',ms:'ms',vi:'vi',th:'th',hi:'hi',ar:'ar'};
const PROTECTED=['IMS Starter','Business DX Pack','Baked Kale','Kale’s FDE','Kale\'s FDE','FDE','Customer Portal','Cloudflare','Brevo','GitHub'];
function clean(v,max=8000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function protect(text){let value=String(text||'');const tokens=[];PROTECTED.forEach((term,i)=>{const token=`FDETERM${i}X`;if(value.includes(term)){value=value.split(term).join(token);tokens.push([token,term])}});return{value,tokens}}
function restore(text,tokens){let value=String(text||'');for(const [token,term] of tokens)value=value.split(token).join(term);return value.trim()}
function extractText(result){const v=result?.response??result?.translated_text??result?.result?.response??result?.result?.translated_text??result;if(typeof v!=='string'||!v.trim())throw new Error('AI_EMPTY');return v.trim()}
async function retry(fn){let last;for(let i=0;i<2;i++){try{return await fn()}catch(e){last=e;if(i===0)await new Promise(r=>setTimeout(r,150))}}throw last}
function extractJson(text){const t=String(text||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();try{return JSON.parse(t)}catch{}const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(t.slice(a,b+1));throw new Error('AI_JSON_INVALID')}
function terms(v){const arr=Array.isArray(v)?v:String(v||'').split(/[,、;|\n]/);return[...new Set(arr.map(x=>clean(x,100)).filter(Boolean))].slice(0,10)}
function baseKeywords(q,a){const words=`${q} ${a}`.replace(/[\p{P}\p{S}]/gu,' ').split(/\s+/).map(x=>x.trim()).filter(x=>x.length>1);return[...new Set(words)].slice(0,8)}
async function m2m(env,text,locale){const target=M2M_TARGET[locale];if(!target)throw new Error('M2M_UNAVAILABLE');const {value,tokens}=protect(text);const out=await retry(()=>env.AI.run('@cf/meta/m2m100-1.2b',{text:value,source_lang:'ja',target_lang:target}));return restore(extractText(out),tokens)}
async function fallbackLocale(env,q,a,locale){if(locale==='ja')return{question:q,answer:a,keywords:baseKeywords(q,a),synonyms:[]};let tq=q,ta=a;try{tq=await m2m(env,q,locale);ta=await m2m(env,a,locale)}catch{}return{question:tq,answer:ta,keywords:baseKeywords(tq,ta),synonyms:[]}}
async function enrichLocale(env,q,a,locale){const language=LOCALE_NAMES[locale]||locale;const pq=protect(q),pa=protect(a);const preserve='Preserve tokens such as FDETERM0X exactly and do not translate brand/product names represented by those tokens.';const sourceNote=locale==='ja'?'Keep question and answer exactly in Japanese as provided.':'Translate question and answer naturally into the target language.';const prompt=`You are preparing FAQ search data for a professional B2B software website. Target language: ${language}. ${sourceNote} ${preserve}\n\nJapanese question:\n${pq.value}\n\nJapanese answer:\n${pa.value}\n\nReturn ONLY valid JSON with exactly these fields:\n{"question":"...","answer":"...","keywords":["..."],"synonyms":["..."]}\n\nRules:\n- keywords: 5 to 8 short search terms a customer may type in ${language}.\n- synonyms: 4 to 7 alternative words or natural phrasings with the same user intent in ${language}; they may be phrases rather than strict dictionary synonyms.\n- Include common abbreviations or product-related wording when relevant.\n- Do not invent product policies, prices, features, promises, supported platforms, or payment methods that are not in the source.\n- No markdown and no commentary.`;
 try{const out=await retry(()=>env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{prompt,max_tokens:1300,temperature:.1}));const parsed=extractJson(extractText(out));const question=locale==='ja'?q:restore(clean(parsed.question,1200),pq.tokens),answer=locale==='ja'?a:restore(clean(parsed.answer,7000),pa.tokens);if(!question||!answer)throw new Error('AI_FAQ_FIELDS_EMPTY');return{question,answer,keywords:terms(parsed.keywords),synonyms:terms(parsed.synonyms)}}catch(error){console.warn(`FAQ enrichment fallback for ${locale}`,error);return fallbackLocale(env,q,a,locale)}
}
async function enrichFaq(env,q,a){const question={},answer={},keywords={},synonyms={};for(let i=0;i<LOCALES.length;i+=3){const batch=LOCALES.slice(i,i+3);const rows=await Promise.all(batch.map(async locale=>[locale,await enrichLocale(env,q,a,locale)]));for(const [locale,v] of rows){question[locale]=v.question;answer[locale]=v.answer;keywords[locale]=v.keywords;synonyms[locale]=v.synonyms}}return{question,answer,keywords,synonyms}}

export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  if(clean(raw?.type,60)!=='admin_faq_enrich')return baseWorker.fetch(request,env,ctx);
  if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
  if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
  if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
  if(!env.AI?.run)return json({ok:false,error:'AI_NOT_CONFIGURED'},503,origin,allowedOrigin);
  const q=clean(raw?.question,1200),a=clean(raw?.answer,7000);if(!q||!a)return json({ok:false,error:'INVALID_FAQ_SOURCE'},400,origin,allowedOrigin);
  try{const faq=await enrichFaq(env,q,a);return json({ok:true,faq},200,origin,allowedOrigin)}catch(error){console.error('FAQ enrichment failed',error);return json({ok:false,error:'FAQ_ENRICH_FAILED',detail:String(error?.message||error)},502,origin,allowedOrigin)}
 }
};
