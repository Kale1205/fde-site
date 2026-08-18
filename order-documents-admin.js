(()=>{
const ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
const $=s=>document.querySelector(s);
const LABELS={quote_order:'見積書兼注文書',invoice:'請求書',delivery_note:'納品書',receipt:'領収書'};
function message(text,type=''){const el=$('#orderDocumentsMessage');if(el){el.textContent=text;el.className=`status ${type}`.trim();el.hidden=false}window.FDE_ADMIN_TOAST?.(text,type)}
function isLegacy(){const legacy=$('#orderAdminLegacy');return !!legacy&&!legacy.hidden}
function getAdminKey(){const field=$('#ordersAdminKey')?.value.trim()||'';return field||window.FDE_ADMIN_KEY?.get?.()||''}
function syncLegacyState(){const card=$('#orderDocumentsCard');if(!card)return;const legacy=isLegacy();card.querySelectorAll('[data-doc]').forEach(btn=>{btn.disabled=legacy;btn.setAttribute('aria-disabled',legacy?'true':'false')});const note=$('#orderDocumentsLegacyNote');if(note)note.hidden=!legacy;const msg=$('#orderDocumentsMessage');if(msg&&legacy){msg.textContent='この注文は顧客台帳機能追加前の旧注文のため、正式なPDFは生成できません。新しいテスト注文または今後の注文で確認してください。';msg.className='status';msg.hidden=false}else if(msg&&!legacy&&msg.textContent.includes('旧注文'))msg.hidden=true}
async function generate(type,button){
 const detail=$('#orderAdminDetail'),orderId=detail?.dataset.orderId||'',adminKey=getAdminKey();
 if(isLegacy()){message('この注文は顧客台帳機能追加前の旧注文のため、顧客情報が不足しておりPDFを生成できません。新規注文で確認してください。','error');return}
 if(!ENDPOINT){message('Cloudflare WorkerのURLが設定されていません。','error');return}
 if(!orderId){message('先に注文を選択してください。','error');return}
 if(!adminKey){message('Admin fulfillment keyを入力してください。入力後はこのタブのセッション中だけ保持されます。','error');return}
 window.FDE_ADMIN_KEY?.set?.(adminKey);
 const pdfTab=window.open('about:blank','_blank');
 if(!pdfTab){message('PDFを別タブで開けませんでした。ブラウザのポップアップを許可して再度実行してください。','error');return}
 try{pdfTab.document.title=`${LABELS[type]} PDF`;pdfTab.document.body.innerHTML='<p style="font-family:system-ui;padding:24px">PDFを生成しています…</p>'}catch{}
 const old=button.textContent;button.disabled=true;button.textContent='生成中…';message(`${LABELS[type]}PDFを生成しています…`);
 try{
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/pdf, application/json'},body:JSON.stringify({type:'admin_pdf',adminKey,orderId,documentType:type})});
  if(!res.ok){let data={};try{data=await res.json()}catch{};throw new Error(data.error||`HTTP_${res.status}`)}
  const blob=await res.blob(),url=URL.createObjectURL(blob);pdfTab.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),120000);message(`${LABELS[type]}PDFを別タブで開きました。CMS画面とAdmin keyはこのタブに維持されます。`,'success')
 }catch(e){
  try{pdfTab.close()}catch{}
  const map={ADMIN_AUTH_FAILED:'Admin fulfillment keyが一致しません。',ADMIN_ORDER_NOT_FOUND:'この注文は顧客台帳機能追加前の旧注文、または顧客台帳データが存在しない注文です。新規注文で確認してください。',PAYMENT_NOT_CONFIRMED:'納品書・領収書は「支払い確認済み」以降に生成できます。請求書は支払い前に生成できます。',BROWSER_NOT_CONFIGURED:'Cloudflare Browser RunのBROWSER bindingがまだ本番Workerへ反映されていません。',ORDER_STATUS_NOT_CONFIGURED:'Cloudflare KV（ORDER_STATUS）が有効になっていません。'};message(map[e.message]||`PDFを生成できませんでした: ${e.message}`,'error')
 }finally{button.disabled=isLegacy();button.textContent=old}
}
function inject(){
 const detail=$('#orderAdminDetail');if(!detail||$('#orderDocumentsCard'))return false;const operations=$('#orderAdminOperate')?.closest('.actions');if(!operations)return false;
 const card=document.createElement('div');card.id='orderDocumentsCard';card.className='order-documents-card';card.innerHTML=`<div class="order-documents-head"><div><small>DOCUMENTS</small><h4>書類PDFを自動生成</h4></div><p>注文台帳の情報からPDFを生成します。見積書兼注文書・請求書は支払い前に生成でき、納品書・領収書は支払い確認済み以降に生成できます。注文時のサイト言語が日本語以外の場合、各項目は日本語の直後にその言語を併記します。</p></div><div class="order-documents-actions"><button class="admin-button secondary" type="button" data-doc="quote_order">見積書兼注文書 PDF</button><button class="admin-button secondary" type="button" data-doc="invoice">請求書 PDF</button><button class="admin-button secondary" type="button" data-doc="delivery_note">納品書 PDF</button><button class="admin-button secondary" type="button" data-doc="receipt">領収書 PDF</button></div><div id="orderDocumentsLegacyNote" class="legacy-note" hidden>顧客台帳機能追加前の注文では、氏名・企業名・メールアドレスが保存されていないため書類PDFを生成しません。新しい注文から自動生成できます。</div><div id="orderDocumentsMessage" class="status" hidden></div><div class="token-note">PDFは自動保存せず、新しいブラウザタブで表示します。必要な場合のみ端末へ保存してください。クラウド保管先・保存ルール・納品時の保管方法は未決定のため、保存フローはペンディングです。</div>`;
 operations.parentNode.insertBefore(card,operations);card.querySelectorAll('[data-doc]').forEach(btn=>btn.addEventListener('click',()=>generate(btn.dataset.doc,btn)));
 if(!$('#orderDocumentsStyle')){const st=document.createElement('style');st.id='orderDocumentsStyle';st.textContent='.order-documents-card{margin:18px 0;padding:18px;border:1px solid var(--line);background:#f7faf8}.order-documents-head{display:grid;grid-template-columns:minmax(220px,.65fr) 1fr;gap:18px;align-items:end}.order-documents-head small{display:block;color:var(--green);font-size:9px;font-weight:800;letter-spacing:.12em}.order-documents-head h4{margin:3px 0 0;font-size:18px}.order-documents-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.7}.order-documents-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.order-documents-card .status{margin-top:12px}.order-documents-actions button:disabled{opacity:.45;cursor:not-allowed}.order-documents-card .legacy-note{margin-top:12px}@media(max-width:760px){.order-documents-head{grid-template-columns:1fr}}';document.head.appendChild(st)}
 const legacy=$('#orderAdminLegacy');if(legacy)new MutationObserver(syncLegacyState).observe(legacy,{attributes:true,attributeFilter:['hidden']});const detailObserver=new MutationObserver(()=>setTimeout(syncLegacyState,0));detailObserver.observe(detail,{attributes:true,attributeFilter:['data-order-id']});setTimeout(syncLegacyState,0);return true
}
function init(){if(inject())return;const obs=new MutationObserver(()=>{if(inject())obs.disconnect()});obs.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
