const VERIFY_URL='https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_STAGING_TYPES=new Set(['inquiry','order']);

const clean=(v,max=5000)=>String(v??'').trim().slice(0,max);
const cors=(origin,allowed)=>({
  'Access-Control-Allow-Origin':origin&&origin===allowed?origin:allowed,
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Expose-Headers':'X-FDE-Environment',
  'X-FDE-Environment':'staging',
  'Vary':'Origin'
});
const json=(data,status,origin,allowed)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowed)}});

async function verifyTurnstile(request,env,raw){
  const secret=clean(env.TURNSTILE_SECRET_KEY,1000);
  if(!secret)return{ok:false,error:'TURNSTILE_NOT_CONFIGURED'};
  const type=clean(raw?.type,40);
  const expectedAction=type==='inquiry'?'contact':type==='order'?'order':'';
  const token=clean(raw?.turnstileToken,4096);
  const claimedAction=clean(raw?.turnstileAction,80);
  if(!expectedAction)return{ok:false,error:'STAGING_TYPE_NOT_ALLOWED'};
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
    console.error('Staging Turnstile Siteverify failed',error);
    return{ok:false,error:'TURNSTILE_VERIFY_UNAVAILABLE'};
  }
  if(!result?.success)return{ok:false,error:'TURNSTILE_FAILED'};
  if(result.action&&result.action!==expectedAction)return{ok:false,error:'TURNSTILE_ACTION_MISMATCH'};
  const expectedHostname=clean(env.TURNSTILE_EXPECTED_HOSTNAME,300);
  if(expectedHostname&&result.hostname&&result.hostname!==expectedHostname)return{ok:false,error:'TURNSTILE_HOSTNAME_MISMATCH'};
  return{ok:true};
}

async function storeDryRun(env,raw,request){
  if(!env.ORDER_STATUS?.put)throw new Error('STAGING_KV_NOT_CONFIGURED');
  const id=crypto.randomUUID();
  const key=`staging:submission:${Date.now()}:${id}`;
  const record={
    staging:true,
    dryRun:true,
    mailSent:false,
    receivedAt:new Date().toISOString(),
    type:clean(raw?.type,40),
    lang:clean(raw?.lang,10),
    name:clean(raw?.name,300),
    company:clean(raw?.company,300),
    country:clean(raw?.country,160),
    email:clean(raw?.email,500),
    product:clean(raw?.product,300),
    message:clean(raw?.message,6000),
    cfRay:clean(request.headers.get('CF-Ray'),100)
  };
  await env.ORDER_STATUS.put(key,JSON.stringify(record),{expirationTtl:604800});
  return{id,key};
}

export default{
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    const allowedOrigin=env.ALLOWED_ORIGIN||'';

    if(request.method==='GET'){
      const url=new URL(request.url);
      if(url.pathname==='/__staging/health')return json({
        ok:true,
        staging:true,
        dryRun:true,
        mailDisabled:true,
        productionImported:false,
        kvConfigured:Boolean(env.ORDER_STATUS?.put),
        turnstileConfigured:Boolean(clean(env.TURNSTILE_SECRET_KEY,1000))
      },200,origin,allowedOrigin);
      return json({ok:false,error:'STAGING_ROUTE_NOT_FOUND'},404,origin,allowedOrigin);
    }

    if(request.method==='OPTIONS'){
      if(origin&&allowedOrigin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
      return new Response(null,{status:204,headers:cors(origin,allowedOrigin)});
    }

    if(request.method!=='POST')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405,origin,allowedOrigin);
    if(!allowedOrigin||origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);

    let raw=null;
    try{raw=await request.clone().json()}catch{return json({ok:false,error:'INVALID_JSON'},400,origin,allowedOrigin)}
    const type=clean(raw?.type,40);
    if(!ALLOWED_STAGING_TYPES.has(type))return json({ok:false,error:'STAGING_OPERATION_DISABLED'},403,origin,allowedOrigin);

    const verified=await verifyTurnstile(request,env,raw);
    if(!verified.ok)return json({ok:false,error:verified.error},verified.error==='TURNSTILE_NOT_CONFIGURED'?503:403,origin,allowedOrigin);

    try{
      const saved=await storeDryRun(env,raw,request);
      return json({ok:true,staging:true,dryRun:true,submissionId:saved.id,mailSent:false},200,origin,allowedOrigin);
    }catch(error){
      console.error('Staging submission storage failed',error);
      return json({ok:false,error:String(error?.message||error)},503,origin,allowedOrigin);
    }
  }
};
