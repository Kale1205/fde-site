import baseWorker from './index-v12.js';

const VERIFY_URL='https://challenges.cloudflare.com/turnstile/v0/siteverify';
const EXPECTED_HOSTNAME='kale1205.github.io';

function clean(v,max=4000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}

async function verifyTurnstile(request,env,raw){
 const secret=clean(env.TURNSTILE_SECRET_KEY,1000);
 if(!secret)return{ok:true,staged:true};
 const type=clean(raw?.type,40);
 const expectedAction=type==='inquiry'?'contact':type==='order'?'order':'';
 const token=clean(raw?.turnstileToken,4096);
 const claimedAction=clean(raw?.turnstileAction,80);
 if(!expectedAction)return{ok:true};
 if(!token)return{ok:false,error:'TURNSTILE_TOKEN_REQUIRED'};
 if(claimedAction&&claimedAction!==expectedAction)return{ok:false,error:'TURNSTILE_ACTION_MISMATCH'};
 const body=new URLSearchParams({secret,response:token});
 const remoteIp=request.headers.get('CF-Connecting-IP');
 if(remoteIp)body.set('remoteip',remoteIp);
 let result;
 try{
   const response=await fetch(VERIFY_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
   result=await response.json();
 }catch(error){
   console.error('Turnstile Siteverify request failed',error);
   return{ok:false,error:'TURNSTILE_VERIFY_UNAVAILABLE'};
 }
 if(!result?.success){
   console.warn('Turnstile rejected request',result?.['error-codes']||[]);
   return{ok:false,error:'TURNSTILE_FAILED'};
 }
 if(result.action&&result.action!==expectedAction)return{ok:false,error:'TURNSTILE_ACTION_MISMATCH'};
 if(result.hostname&&result.hostname!==EXPECTED_HOSTNAME)return{ok:false,error:'TURNSTILE_HOSTNAME_MISMATCH'};
 return{ok:true};
}

export default{
 async fetch(request,env,ctx){
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'';
  const allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,40);
  if(type!=='inquiry'&&type!=='order')return baseWorker.fetch(request,env,ctx);
  const verified=await verifyTurnstile(request,env,raw);
  if(!verified.ok)return json({ok:false,error:verified.error},403,origin,allowedOrigin);
  return baseWorker.fetch(request,env,ctx);
 }
};
