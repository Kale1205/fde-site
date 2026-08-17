import baseWorker from './index-v2.js';
import {saveAdminOrder,listAdminOrders} from './admin-orders.js';

function clean(v,max=4000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}

export default{
  async fetch(request,env,ctx){
    if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
    const origin=request.headers.get('Origin')||'';
    const allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
    let raw=null;
    try{raw=await request.clone().json()}catch{}
    const type=clean(raw?.type,40)||'inquiry';

    if(type==='admin_orders_list'){
      if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
      if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
      if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
      if(!env.ORDER_STATUS)return json({ok:false,error:'ORDER_STATUS_NOT_CONFIGURED'},503,origin,allowedOrigin);
      try{
        const data=await listAdminOrders(env,raw?.limit);
        return json({ok:true,...data},200,origin,allowedOrigin);
      }catch(error){
        console.error('Admin orders list failed',error);
        return json({ok:false,error:'ADMIN_ORDERS_FAILED'},500,origin,allowedOrigin);
      }
    }

    const response=await baseWorker.fetch(request,env,ctx);
    if(type==='order'&&response.ok&&raw){
      try{
        const result=await response.clone().json();
        if(result?.ok!==false&&result?.orderId)await saveAdminOrder(env,raw,result);
      }catch(error){console.error('Admin order registry save failed',error)}
    }
    return response;
  }
};
