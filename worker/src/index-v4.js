import baseWorker from './index-v3.js';

const PAID_STATUSES=new Set(['payment_confirmed','preparing_delivery','delivered']);

function clean(v,max=4000){return String(v??'').trim().slice(0,max)}
function esc(v){return clean(v,20000).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
function cors(origin,allowedOrigin){const allow=origin&&origin===allowedOrigin?origin:allowedOrigin;return{'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Expose-Headers':'Content-Disposition','Vary':'Origin'}}
function json(data,status,origin,allowedOrigin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin,allowedOrigin)}})}
function validOrderId(v){return /^BK-\d{8}-[A-F0-9]{8}$/i.test(v)}
function planLabel(v){return v==='monthly'?'月額プラン / Monthly plan':'買い切り / One-time purchase'}
function dateOnly(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(0,10):d.toISOString().slice(0,10)}
function money(value,currency){try{return new Intl.NumberFormat('en-US',{style:'currency',currency:clean(currency,10)||'JPY',minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(Number(value)||0))}catch{return`${Math.round(Number(value)||0).toLocaleString('en-US')} ${clean(currency,10)||''}`.trim()}}
async function readJson(env,key){const raw=await env.ORDER_STATUS?.get(key);if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}
function documentMeta(type,order,status){
 const suffix=order.orderId.replace(/^BK-/,'');
 if(type==='quote_order')return{title:'見積書兼注文書',en:'Quotation & Order',number:`Q-${suffix}`,date:order.quoteDate||dateOnly(order.createdAt),validUntil:order.validUntil||'',badge:'ORDER'};
 if(type==='delivery_note')return{title:'納品書',en:'Delivery Note',number:`DN-${suffix}`,date:dateOnly(status?.updatedAt||new Date()),validUntil:'',badge:'DELIVERY'};
 return{title:'領収書',en:'Receipt',number:`RCPT-${suffix}`,date:dateOnly(status?.updatedAt||new Date()),validUntil:'',badge:'PAID'};
}
function documentHtml(type,order,status){
 const meta=documentMeta(type,order,status),c=order.customer||{};
 const isQuote=type==='quote_order',isReceipt=type==='receipt';
 const amountLabel=isQuote?'見積価格 / Quoted total':isReceipt?'領収金額 / Amount received':'注文金額 / Order total';
 const note=isQuote
  ?'税金・決済手数料・その他の諸費用は製品価格に含まれています。支払い方法は別途ご案内します。 / Taxes, payment fees and other charges are included in the product price. Payment instructions will be provided separately.'
  :isReceipt
    ?'上記金額を製品代金として領収しました。 / The amount above has been received as payment for the software product.'
    :'上記製品を本注文に基づき納品します。 / The product above is delivered under this order.';
 const statusText=status?.status||'order_received';
 const originalPrice=order.originalPrice||status?.originalPrice||order.price||status?.price||'';
 const finalPrice=order.price||status?.price||originalPrice;
 const discount=Math.max(0,Number(order.specialDiscount??status?.specialDiscount??0)||0);
 const discountDisplay=money(discount,order.currency||status?.currency||'JPY');
 const discountRow=discount>0?`<tr class="discount"><td><b>特別割引 / Special discount</b><br>Administrative discount applied to this order</td><td>—</td><td class="amount">-${esc(discountDisplay)}</td></tr>`:'';
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
 @page{size:A4;margin:14mm 14mm 16mm}*{box-sizing:border-box}body{margin:0;color:#17251f;font-family:'Noto Sans CJK JP','IPA Gothic',sans-serif;font-size:11px;line-height:1.65}.top{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #0e7a4b;padding-bottom:15px;margin-bottom:22px}.brand small{display:block;color:#65736c;font-size:9px;letter-spacing:.12em;text-transform:uppercase}.brand strong{display:block;font-size:20px;margin-top:2px}.doc{text-align:right}.badge{display:inline-block;border:1px solid #0e7a4b;color:#0e7a4b;padding:3px 8px;font-size:9px;font-weight:700;letter-spacing:.1em}.doc h1{font-size:22px;margin:7px 0 0}.doc p{margin:2px 0;color:#65736c}.to{margin:0 0 20px}.to small{color:#65736c}.to strong{display:block;font-size:16px;margin-top:3px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;padding:13px 15px;background:#f1f6f2;border:1px solid #d7e1da;margin-bottom:18px}.meta div span{display:block;color:#65736c;font-size:9px}.meta div b{font-size:11px}.table{width:100%;border-collapse:collapse;margin-bottom:18px}.table th,.table td{padding:10px;border-bottom:1px solid #d7e1da;text-align:left;vertical-align:top}.table th{background:#eef6f1;font-size:9px;color:#65736c}.table td.amount{font-size:15px;font-weight:800;text-align:right}.table .discount td{background:#fafcfb}.table .discount td.amount{color:#0e7a4b}.total{display:flex;justify-content:flex-end;margin:18px 0}.totalbox{min-width:300px;border-top:2px solid #17251f;border-bottom:2px solid #17251f;padding:12px 0;display:flex;justify-content:space-between;align-items:baseline}.totalbox span{font-size:10px;color:#65736c}.totalbox strong{font-size:20px}.discount-summary{display:flex;justify-content:flex-end;margin-top:-10px}.discount-summary div{min-width:300px;display:flex;justify-content:space-between;color:#65736c;font-size:10px}.note{margin-top:22px;padding:14px 16px;border-left:4px solid #0e7a4b;background:#eef6f1}.issuer{margin-top:28px;display:flex;justify-content:space-between;gap:20px;border-top:1px solid #d7e1da;padding-top:15px}.issuer small{display:block;color:#65736c}.issuer strong{font-size:13px}.footer{margin-top:18px;color:#65736c;font-size:8.5px;text-align:right}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
 </style></head><body><header class="top"><div class="brand"><small>Baked Kale</small><strong>Kale’s FDE</strong><small>Forward Deployed Engineering</small></div><div class="doc"><span class="badge">${esc(meta.badge)}</span><h1>${esc(meta.title)} / ${esc(meta.en)}</h1><p>No. <span class="mono">${esc(meta.number)}</span></p><p>発行日 / Issue date: ${esc(meta.date)}</p></div></header>
 <section class="to"><small>宛先 / Bill to</small><strong>${esc(c.company||c.name||'Customer')} 御中</strong><div>${esc(c.name||'')} ${c.email?`&lt;${esc(c.email)}&gt;`:''}${c.country?` / ${esc(c.country)}`:''}</div></section>
 <section class="meta"><div><span>注文番号 / Order ID</span><b class="mono">${esc(order.orderId)}</b></div><div><span>製品 / Product</span><b>${esc(order.product)}</b></div><div><span>契約方法 / Plan</span><b>${esc(planLabel(order.plan))}</b></div><div><span>注文状況 / Status</span><b>${esc(statusText)}</b></div>${meta.validUntil?`<div><span>有効期限 / Valid until</span><b>${esc(meta.validUntil)}</b></div>`:''}<div><span>通貨 / Currency</span><b>${esc(order.currency||status?.currency||'')}</b></div></section>
 <table class="table"><thead><tr><th>内容 / Description</th><th>契約 / Plan</th><th style="text-align:right">金額 / Amount</th></tr></thead><tbody><tr><td><b>${esc(order.product)}</b><br>Kale’s FDE software product</td><td>${esc(planLabel(order.plan))}</td><td class="amount">${esc(originalPrice)}</td></tr>${discountRow}</tbody></table>
 ${discount>0?`<div class="discount-summary"><div><span>特別割引 / Special discount</span><strong>-${esc(discountDisplay)}</strong></div></div>`:''}
 <div class="total"><div class="totalbox"><span>${esc(amountLabel)}</span><strong>${esc(finalPrice)}</strong></div></div>
 <section class="note">${esc(note)}</section>
 ${order.notes?`<section class="note"><b>注文備考 / Order notes</b><br>${esc(order.notes).replaceAll('\n','<br>')}</section>`:''}
 <section class="issuer"><div><small>発行者 / Issuer</small><strong>Baked Kale / Kale’s FDE</strong><div>Japan - Nara Prefecture</div></div><div style="text-align:right"><small>Service</small><strong>Forward Deployed Engineering</strong><div class="mono">${esc(order.orderId)}</div></div></section>
 <div class="footer">This document was generated from the Kale’s FDE order record.</div></body></html>`;
}
async function generatePdf(env,type,order,status){
 if(!env.BROWSER?.quickAction)throw new Error('BROWSER_NOT_CONFIGURED');
 const rendered=await env.BROWSER.quickAction('pdf',{
   html:documentHtml(type,order,status),
   pdfOptions:{format:'a4',printBackground:true,preferCSSPageSize:true,margin:{top:'0px',bottom:'0px',left:'0px',right:'0px'}}
 });
 if(!rendered?.ok)throw new Error(`PDF_RENDER_${rendered?.status||500}`);
 return rendered.arrayBuffer();
}

export default{
 async fetch(request,env,ctx){
  const origin=request.headers.get('Origin')||'',allowedOrigin=env.ALLOWED_ORIGIN||'https://kale1205.github.io';
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname.endsWith('/health'))return json({ok:true,service:'kales-fde-contact',version:'v4',browserConfigured:!!env.BROWSER,orderStatusConfigured:!!env.ORDER_STATUS},200,origin,allowedOrigin);
  if(request.method==='OPTIONS')return baseWorker.fetch(request,env,ctx);
  if(request.method!=='POST')return baseWorker.fetch(request,env,ctx);
  let raw=null;try{raw=await request.clone().json()}catch{}
  const type=clean(raw?.type,40);
  if(type!=='admin_pdf')return baseWorker.fetch(request,env,ctx);
  if(origin&&origin!==allowedOrigin)return json({ok:false,error:'ORIGIN_NOT_ALLOWED'},403,origin,allowedOrigin);
  if(!env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_FULFILLMENT_NOT_CONFIGURED'},503,origin,allowedOrigin);
  if(clean(raw?.adminKey,300)!==env.ADMIN_FULFILLMENT_KEY)return json({ok:false,error:'ADMIN_AUTH_FAILED'},403,origin,allowedOrigin);
  if(!env.ORDER_STATUS)return json({ok:false,error:'ORDER_STATUS_NOT_CONFIGURED'},503,origin,allowedOrigin);
  const orderId=clean(raw?.orderId,40).toUpperCase(),documentType=clean(raw?.documentType,40);
  if(!validOrderId(orderId)||!['quote_order','delivery_note','receipt'].includes(documentType))return json({ok:false,error:'INVALID_PDF_REQUEST'},400,origin,allowedOrigin);
  const order=await readJson(env,`admin-order:${orderId}`),status=await readJson(env,`order:${orderId}`);
  if(!order)return json({ok:false,error:'ADMIN_ORDER_NOT_FOUND'},404,origin,allowedOrigin);
  if(documentType!=='quote_order'&&!PAID_STATUSES.has(status?.status))return json({ok:false,error:'PAYMENT_NOT_CONFIRMED'},409,origin,allowedOrigin);
  try{
   const bytes=await generatePdf(env,documentType,order,status);
   const names={quote_order:'quotation-order',delivery_note:'delivery-note',receipt:'receipt'};
   return new Response(bytes,{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${names[documentType]}-${orderId}.pdf"`,'Cache-Control':'no-store',...cors(origin,allowedOrigin)}});
  }catch(error){console.error('PDF generation failed',error);const code=String(error?.message||'PDF_GENERATION_FAILED');return json({ok:false,error:code},code==='BROWSER_NOT_CONFIGURED'?503:502,origin,allowedOrigin)}
 }
};
