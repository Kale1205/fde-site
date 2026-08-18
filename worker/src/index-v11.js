import baseWorker from './index-v10.js';

const PURGE_ORDER_ID='BK-20260817-3AF5AEC0';
function clean(v,max=4000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function sanitizedEnv(env){
 const original=env.ORDER_STATUS;if(!original)return env;
 const blocked=new Set([`order:${PURGE_ORDER_ID}`,`admin-order:${PURGE_ORDER_ID}`]);
 const kv=new Proxy(original,{get(target,prop){
  if(prop==='get')return async(key,...args)=>blocked.has(String(key))?null:target.get(key,...args);
  if(prop==='list')return async(opts,...args)=>{const out=await target.list(opts,...args);if(out?.keys)out.keys=out.keys.filter(k=>!blocked.has(k.name));return out};
  const value=Reflect.get(target,prop);return typeof value==='function'?value.bind(target):value;
 }});
 return new Proxy(env,{get(target,prop){if(prop==='ORDER_STATUS')return kv;const value=Reflect.get(target,prop);return typeof value==='function'?value.bind(target):value}});
}

export default{
 async fetch(request,env,ctx){
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,60);
  if(type==='admin_orders_list'){
   if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
   if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
   if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
   if(!env.ORDER_STATUS)return json({ok:false,error:'ORDER_STATUS_NOT_CONFIGURED'},503,origin,allowedOrigin);
   await Promise.all([
    env.ORDER_STATUS.delete(`order:${PURGE_ORDER_ID}`),
    env.ORDER_STATUS.delete(`admin-order:${PURGE_ORDER_ID}`)
   ]);
   return baseWorker.fetch(request,sanitizedEnv(env),ctx);
  }
  return baseWorker.fetch(request,env,ctx);
 }
};
