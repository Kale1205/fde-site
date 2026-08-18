import baseWorker from './index-v9.js';

const SUPPORTED_LANGS=new Set(['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar']);
const CANCEL_MESSAGE={ja:'この注文はキャンセルされました。',en:'This order has been cancelled.','zh-CN':'此订单已取消。','zh-TW':'此訂單已取消。',ko:'이 주문은 취소되었습니다.',id:'Pesanan ini telah dibatalkan.',ms:'Pesanan ini telah dibatalkan.',vi:'Đơn hàng này đã bị hủy.',th:'คำสั่งซื้อนี้ถูกยกเลิกแล้ว',hi:'यह ऑर्डर रद्द कर दिया गया है।',ar:'تم إلغاء هذا الطلب.'};
const LANG_LABEL={ja:'注文言語',en:'Order language','zh-CN':'订单语言','zh-TW':'訂單語言',ko:'주문 언어',id:'Bahasa pesanan',ms:'Bahasa pesanan',vi:'Ngôn ngữ đơn hàng',th:'ภาษาของคำสั่งซื้อ',hi:'ऑर्डर भाषा',ar:'لغة الطلب'};
const LANG_VALUE={ja:['日本語','日本語'],en:['英語','English'],'zh-CN':['簡体字中国語','简体中文'],'zh-TW':['繁体字中国語','繁體中文'],ko:['韓国語','한국어'],id:['インドネシア語','Bahasa Indonesia'],ms:['マレー語','Bahasa Melayu'],vi:['ベトナム語','Tiếng Việt'],th:['タイ語','ไทย'],hi:['ヒンディー語','हिन्दी'],ar:['アラビア語','العربية']};
function clean(v,max=4000){return String(v??'').trim().slice(0,max)}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function validOrderId(v){return /^BK-\d{8}-[A-F0-9]{8}$/i.test(v)}
async function readJson(env,key){const raw=await env.ORDER_STATUS?.get(key);if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
async function cancelled(env,orderId){const record=await readJson(env,`order:${orderId}`);return record?.status==='cancelled'}
function languageLine(order){const lang=SUPPORTED_LANGS.has(order?.lang)?order.lang:'ja',names=LANG_VALUE[lang]||LANG_VALUE.ja;return lang==='ja'?`注文言語: ${names[0]}`:`注文言語 / ${LANG_LABEL[lang]}: ${names[0]} / ${names[1]}`}
function documentEnv(env,orderId){
 const original=env.ORDER_STATUS;
 if(!original)return env;
 const kv=new Proxy(original,{get(target,prop){if(prop==='get')return async(key,...args)=>{const value=await target.get(key,...args);if(key!==`admin-order:${orderId}`||typeof value!=='string')return value;try{const order=JSON.parse(value),line=languageLine(order),notes=clean(order.notes,5000);order.notes=notes?`${line}\n\n${notes}`:line;return JSON.stringify(order)}catch{return value}};const value=Reflect.get(target,prop);return typeof value==='function'?value.bind(target):value}});
 return new Proxy(env,{get(target,prop){if(prop==='ORDER_STATUS')return kv;const value=Reflect.get(target,prop);return typeof value==='function'?value.bind(target):value}});
}

export default{
 async fetch(request,env,ctx){
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,60);

  if(type==='admin_order_cancel'){
   if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
   if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
   if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
   if(!env.ORDER_STATUS)return json({ok:false,error:'ORDER_STATUS_NOT_CONFIGURED'},503,origin,allowedOrigin);
   const orderId=clean(raw?.orderId,40).toUpperCase();if(!validOrderId(orderId))return json({ok:false,error:'INVALID_ORDER_ID'},400,origin,allowedOrigin);
   const admin=await readJson(env,`admin-order:${orderId}`),status=await readJson(env,`order:${orderId}`);
   if(!admin||!status)return json({ok:false,error:'ORDER_NOT_FOUND'},404,origin,allowedOrigin);
   if(status.status==='delivered')return json({ok:false,error:'DELIVERED_ORDER_CANNOT_CANCEL'},409,origin,allowedOrigin);
   if(status.status==='cancelled')return json({ok:true,status:'cancelled',message:status.message||CANCEL_MESSAGE.ja,cancelReason:admin.cancelReason||'',cancelledAt:admin.cancelledAt||status.updatedAt},200,origin,allowedOrigin);
   const lang=SUPPORTED_LANGS.has(admin.lang)?admin.lang:'ja',now=new Date().toISOString(),reason=clean(raw?.reason,1000);
   admin.cancelledFrom=status.status||'order_received';admin.cancelReason=reason;admin.cancelledAt=now;admin.updatedAt=now;
   status.status='cancelled';status.message=CANCEL_MESSAGE[lang]||CANCEL_MESSAGE.en;status.cancelledAt=now;status.updatedAt=now;
   await Promise.all([env.ORDER_STATUS.put(`admin-order:${orderId}`,JSON.stringify(admin)),env.ORDER_STATUS.put(`order:${orderId}`,JSON.stringify(status))]);
   return json({ok:true,status:'cancelled',message:status.message,cancelReason:reason,cancelledAt:now},200,origin,allowedOrigin);
  }

  if(type==='fulfillment'){
   const orderId=clean(raw?.orderId,40).toUpperCase();if(validOrderId(orderId)&&await cancelled(env,orderId))return json({ok:false,error:'ORDER_CANCELLED'},409,origin,allowedOrigin);
  }
  if(type==='admin_pdf'){
   const orderId=clean(raw?.orderId,40).toUpperCase();if(validOrderId(orderId)&&await cancelled(env,orderId))return json({ok:false,error:'ORDER_CANCELLED'},409,origin,allowedOrigin);
   if(validOrderId(orderId))return baseWorker.fetch(request,documentEnv(env,orderId),ctx);
  }
  return baseWorker.fetch(request,env,ctx);
 }
};
