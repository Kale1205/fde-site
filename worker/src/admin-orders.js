const PRODUCT_NAMES={
  'ims-starter':'IMS Starter',
  'business-dx-pack':'Business DX Pack'
};
const SUPPORTED_LANGS=new Set(['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar']);

function clean(v,max=5000){return String(v??'').trim().slice(0,max)}
function orderDateFromId(orderId){
  const m=/^BK-(\d{4})(\d{2})(\d{2})-/i.exec(orderId||'');
  return m?`${m[1]}-${m[2]}-${m[3]}`:new Date().toISOString().slice(0,10);
}
async function readJson(env,key){
  const raw=await env.ORDER_STATUS.get(key);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}

export async function saveAdminOrder(env,raw,result){
  if(!env.ORDER_STATUS||!result?.orderId)return false;
  const orderId=clean(result.orderId,40).toUpperCase();
  const displayPrice=clean(result.price,80);
  const requestedLang=clean(raw.lang,20);
  const record={
    orderId,
    customer:{
      name:clean(raw.name,120),
      company:clean(raw.company,160),
      country:clean(raw.country,120),
      email:clean(raw.email,254).toLowerCase()
    },
    product:PRODUCT_NAMES[clean(raw.productKey,80)]||clean(raw.product,120)||clean(raw.productKey,80),
    productKey:clean(raw.productKey,80),
    plan:clean(raw.plan,30),
    lang:SUPPORTED_LANGS.has(requestedLang)?requestedLang:'ja',
    originalPrice:displayPrice,
    specialDiscount:0,
    price:displayPrice,
    currency:clean(result.currency,10),
    notes:clean(raw.notes,5000),
    quoteDate:orderDateFromId(orderId),
    validUntil:clean(result.validUntil,20),
    createdAt:new Date().toISOString()
  };
  await env.ORDER_STATUS.put(`admin-order:${orderId}`,JSON.stringify(record));
  return true;
}

export async function listAdminOrders(env,limit=1000){
  if(!env.ORDER_STATUS)return {orders:[],summary:{orders:0,customers:0,inProgress:0,delivered:0},truncated:false};
  const safeLimit=Math.max(1,Math.min(Number(limit)||1000,1000));
  const adminList=await env.ORDER_STATUS.list({prefix:'admin-order:',limit:safeLimit});
  const adminRecords=(await Promise.all(adminList.keys.map(k=>readJson(env,k.name)))).filter(Boolean);
  const ids=new Set(adminRecords.map(r=>r.orderId));
  const merged=await Promise.all(adminRecords.map(async admin=>{
    const status=await readJson(env,`order:${admin.orderId}`);
    return {
      ...admin,
      lang:SUPPORTED_LANGS.has(admin.lang)?admin.lang:'ja',
      originalPrice:admin.originalPrice||admin.price||status?.originalPrice||status?.price||'',
      specialDiscount:Number(admin.specialDiscount||status?.specialDiscount||0)||0,
      price:admin.price||status?.price||'',
      status:status?.status||'order_received',
      statusMessage:status?.message||'',
      updatedAt:status?.updatedAt||admin.updatedAt||admin.createdAt
    };
  }));

  const legacyList=await env.ORDER_STATUS.list({prefix:'order:',limit:safeLimit});
  for(const key of legacyList.keys){
    const orderId=key.name.slice('order:'.length);
    if(ids.has(orderId))continue;
    const status=await readJson(env,key.name);
    if(!status)continue;
    merged.push({
      orderId,
      customer:{name:'',company:'',country:'',email:''},
      product:status.product||'',productKey:'',plan:status.plan||'',lang:'ja',
      originalPrice:status.originalPrice||status.price||'',specialDiscount:Number(status.specialDiscount||0)||0,price:status.price||'',currency:status.currency||'',notes:'',
      quoteDate:status.quoteDate||orderDateFromId(orderId),validUntil:status.validUntil||'',createdAt:status.updatedAt||'',
      status:status.status||'order_received',statusMessage:status.message||'',updatedAt:status.updatedAt||'',legacy:true
    });
  }

  merged.sort((a,b)=>String(b.createdAt||b.quoteDate||'').localeCompare(String(a.createdAt||a.quoteDate||'')));
  const customerEmails=new Set(merged.map(o=>o.customer?.email).filter(Boolean));
  const delivered=merged.filter(o=>o.status==='delivered').length;
  return {
    orders:merged,
    summary:{orders:merged.length,customers:customerEmails.size,inProgress:merged.length-delivered,delivered},
    truncated:!adminList.list_complete||!legacyList.list_complete
  };
}
