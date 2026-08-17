(()=>{
const ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
const $=s=>document.querySelector(s);
const LABELS={quote_order:'見積書兼注文書',delivery_note:'納品書',receipt:'領収書'};
function message(text,type=''){const el=$('#orderDocumentsMessage');if(!el)return;el.textContent=text;el.className=`status ${type}`.trim();el.hidden=false}
function filenameFromDisposition(value,fallback){const m=/filename="?([^";]+)"?/i.exec(value||'');return m?.[1]||fallback}
async function generate(type,button){
 const detail=$('#orderAdminDetail'),orderId=detail?.dataset.orderId||'',adminKey=$('#ordersAdminKey')?.value.trim()||'';
 if(!ENDPOINT){message('Cloudflare WorkerのURLが設定されていません。','error');return}
 if(!orderId){message('先に注文を選択してください。','error');return}
 if(!adminKey){message('Customers / OrdersのAdmin fulfillment keyを入力してください。','error');return}
 const old=button.textContent;button.disabled=true;button.textContent='生成中…';message(`${LABELS[type]}PDFを生成しています…`);
 try{
   const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/pdf, application/json'},body:JSON.stringify({type:'admin_pdf',adminKey,orderId,documentType:type})});
   if(!res.ok){let data={};try{data=await res.json()}catch{};throw new Error(data.error||`HTTP_${res.status}`)}
   const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=filenameFromDisposition(res.headers.get('Content-Disposition'),`${type}-${orderId}.pdf`);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
   message(`${LABELS[type]}PDFを生成しました。`,'success');
 }catch(e){
   const map={ADMIN_AUTH_FAILED:'Admin fulfillment keyが一致しません。',ADMIN_ORDER_NOT_FOUND:'この注文の顧客台帳データが見つかりません。',PAYMENT_NOT_CONFIRMED:'納品書・領収書は「支払い確認済み」以降に生成できます。',BROWSER_NOT_CONFIGURED:'Cloudflare Browser RunのBROWSER bindingがまだ本番Workerへ反映されていません。',ORDER_STATUS_NOT_CONFIGURED:'Cloudflare KV（ORDER_STATUS）が有効になっていません。'};
   message(map[e.message]||`PDFを生成できませんでした: ${e.message}`,'error');
 }finally{button.disabled=false;button.textContent=old}
}
function inject(){
 const detail=$('#orderAdminDetail');if(!detail||$('#orderDocumentsCard'))return false;
 const operations=$('#orderAdminOperate')?.closest('.actions');if(!operations)return false;
 const card=document.createElement('div');card.id='orderDocumentsCard';card.className='order-documents-card';card.innerHTML=`<div class="order-documents-head"><div><small>DOCUMENTS</small><h4>書類PDFを自動生成</h4></div><p>注文台帳の情報からPDFを生成します。納品書・領収書は支払い確認済み以降に生成できます。</p></div><div class="order-documents-actions"><button class="admin-button secondary" type="button" data-doc="quote_order">見積書兼注文書 PDF</button><button class="admin-button secondary" type="button" data-doc="delivery_note">納品書 PDF</button><button class="admin-button secondary" type="button" data-doc="receipt">領収書 PDF</button></div><div id="orderDocumentsMessage" class="status" hidden></div><div class="token-note">現在は管理者端末へPDFをダウンロードします。次工程で安全な保管先と納品メールへの自動添付を接続します。</div>`;
 operations.parentNode.insertBefore(card,operations);
 card.querySelectorAll('[data-doc]').forEach(btn=>btn.addEventListener('click',()=>generate(btn.dataset.doc,btn)));
 if(!$('#orderDocumentsStyle')){const st=document.createElement('style');st.id='orderDocumentsStyle';st.textContent='.order-documents-card{margin:18px 0;padding:18px;border:1px solid var(--line);background:#f7faf8}.order-documents-head{display:grid;grid-template-columns:minmax(220px,.65fr) 1fr;gap:18px;align-items:end}.order-documents-head small{display:block;color:var(--green);font-size:9px;font-weight:800;letter-spacing:.12em}.order-documents-head h4{margin:3px 0 0;font-size:18px}.order-documents-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.7}.order-documents-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.order-documents-card .status{margin-top:12px}@media(max-width:760px){.order-documents-head{grid-template-columns:1fr}}';document.head.appendChild(st)}
 return true;
}
function init(){if(inject())return;const obs=new MutationObserver(()=>{if(inject())obs.disconnect()});obs.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
