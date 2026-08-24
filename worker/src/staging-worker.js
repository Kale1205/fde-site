import { QUOTE_VALIDITY_DAYS, createQuoteWindow } from './staging-quote-policy.js';
import { appendAuditEvent } from './staging-audit-log.js';
import { EXPIRY_CRON, STAGING_ORDER_TTL, runExpirySweep } from './staging-expiry-cron.js';
import { STRIPE_WEBHOOK_PATH, handleStripeWebhook, stagingOrderIndexKey } from './staging-stripe-webhook.js';
import {
  STRIPE_CHECKOUT_PATH,
  handleStripeCheckout,
  stripeCheckoutConfiguration
} from './staging-stripe-checkout.js';

const VERIFY_URL='https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_STAGING_TYPES=new Set(['inquiry','order']);
const CONTACT_DRY_RUN_TTL=7*24*60*60;

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
  const type=clean(raw?.type,40);
  const receivedAt=new Date();
  const isOrder=type==='order';
  const quote=isOrder?createQuoteWindow(receivedAt):null;
  const key=isOrder?`staging:order:${Date.now()}:${id}`:`staging:submission:${Date.now()}:${id}`;
  const record={
    staging:true,
    dryRun:true,
    mailSent:false,
    receivedAt:receivedAt.toISOString(),
    type,
    lang:clean(raw?.lang,10),
    name:clean(raw?.name,300),
    company:clean(raw?.company,300),
    country:clean(raw?.country,160),
    email:clean(raw?.email,500),
    product:clean(raw?.product,300),
    message:clean(raw?.message,6000),
    cfRay:clean(request.headers.get('CF-Ray'),100),
    ...(isOrder?{
      stagingOrderId:id,
      orderStatus:'order_received',
      ...quote,
      autoCancelEnabled:true
    }:{})
  };

  if(!isOrder){
    await env.ORDER_STATUS.put(key,JSON.stringify(record),{expirationTtl:CONTACT_DRY_RUN_TTL});
    return{id,key,quote:null,auditEventId:null};
  }

  await env.ORDER_STATUS.put(key,JSON.stringify(record),{expirationTtl:STAGING_ORDER_TTL});
  await env.ORDER_STATUS.put(stagingOrderIndexKey(id),key,{expirationTtl:STAGING_ORDER_TTL});
  try{
    const audit=await appendAuditEvent(env,{
      orderId:id,
      actor:'system:staging-worker',
      action:'quote_issued',
      fromStatus:null,
      toStatus:'order_received',
      reason:'staging_order_created',
      source:'order_submission',
      occurredAt:receivedAt,
      metadata:{
        quoteIssuedAt:quote.quoteIssuedAt,
        quoteExpiresAt:quote.quoteExpiresAt,
        quoteValidityDays:quote.quoteValidityDays
      }
    },{expirationTtl:STAGING_ORDER_TTL});
    return{id,key,quote,auditEventId:audit.event.eventId};
  }catch(error){
    console.error('Staging audit write failed',error);
    try{
      await env.ORDER_STATUS.delete?.(key);
      await env.ORDER_STATUS.delete?.(stagingOrderIndexKey(id));
    }catch(cleanupError){console.error('Staging order rollback failed',cleanupError)}
    throw new Error('STAGING_AUDIT_WRITE_FAILED');
  }
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname===STRIPE_WEBHOOK_PATH)return handleStripeWebhook(request,env);
    if(url.pathname===STRIPE_CHECKOUT_PATH)return handleStripeCheckout(request,env);
    const origin=request.headers.get('Origin')||'';
    const allowedOrigin=env.ALLOWED_ORIGIN||'';

    if(request.method==='GET'){
      if(url.pathname==='/__staging/health')return json({
        ok:true,
        staging:true,
        dryRun:true,
        mailDisabled:true,
        productionImported:false,
        kvConfigured:Boolean(env.ORDER_STATUS?.put),
        turnstileConfigured:Boolean(clean(env.TURNSTILE_SECRET_KEY,1000)),
        p2:{
          quoteExpiryEnabled:true,
          quoteValidityDays:QUOTE_VALIDITY_DAYS,
          auditLogEnabled:true,
          autoCancelEnabled:true,
          expiryCron:EXPIRY_CRON,
          stripeWebhookBoundaryEnabled:true,
          stripeWebhookConfigured:Boolean(clean(env.STRIPE_WEBHOOK_SECRET,1000)),
          stripeCheckoutBoundaryEnabled:true,
          stripeCheckoutConfigured:stripeCheckoutConfiguration(env),
          stripeCheckoutActivationEnabled:clean(env.STAGING_CHECKOUT_ENABLED,20).toLowerCase()==='true',
          livePaymentsEnabled:false
        }
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
      return json({
        ok:true,
        staging:true,
        dryRun:true,
        submissionId:saved.id,
        mailSent:false,
        ...(saved.quote?{
          quote:saved.quote,
          auditEventId:saved.auditEventId,
          autoCancelEnabled:true
        }:{})
      },200,origin,allowedOrigin);
    }catch(error){
      console.error('Staging submission storage failed',error);
      return json({ok:false,error:String(error?.message||error)},503,origin,allowedOrigin);
    }
  },

  async scheduled(controller,env){
    const scheduledAt=new Date(controller?.scheduledTime??Date.now());
    const summary=await runExpirySweep(env,scheduledAt);
    console.log('P2-3 staging quote expiry sweep',JSON.stringify({scheduledAt:scheduledAt.toISOString(),...summary}));
  }
};
