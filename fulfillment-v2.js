(()=>{
const ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER=/^BK-\d{8}-[A-F0-9]{8}$/i;
const $=s=>document.querySelector(s);
function show(message,type=''){const el=$('#adminStatus');if(!el)return;el.textContent=message;el.className=`status ${type}`.trim();el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'nearest'})}
function validUrl(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'}catch{return false}}
async function send(){const btn=$('#sendFulfillmentBtn');if(!btn)return;const orderId=$('#fulfillOrderId')?.value.trim().toUpperCase()||'',product=$('#fulfillProduct')?.value||'',name=$('#fulfillName')?.value.trim()||'',email=$('#fulfillEmail')?.value.trim().toLowerCase()||'',deliveryNoteUrl=$('#deliveryNoteUrl')?.value.trim()||'',receiptUrl=$('#receiptUrl')?.value.trim()||'',installerUrl=$('#installerUrl')?.value.trim()||'',note=$('#fulfillNote')?.value.trim()||'',adminKey=$('#fulfillmentKey')?.value.trim()||'';
 if(!ENDPOINT){show('Cloudflare WorkerのURLが設定されていません。','error');return}
 if(!ORDER.test(orderId)){show('注文番号の形式を確認してください。','error');return}
 if(!name||!product){show('購入者名と製品名を入力してください。','error');return}
 if(!EMAIL.test(email)){show('購入者メールアドレスの形式が正しくありません。','error');return}
 if(!deliveryNoteUrl||!receiptUrl||!installerUrl||!adminKey){show('納品書URL・領収書URL・インストーラーURL・Admin keyは必須です。','error');return}
 if(!validUrl(deliveryNoteUrl)||!validUrl(receiptUrl)||!validUrl(installerUrl)){show('納品書・領収書・インストーラーのURLは有効な http/https URLを入力してください。','error');return}
 btn.disabled=true;
 try{show('納品書・領収書・インストーラーの案内を送信しています…');const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({type:'fulfillment',adminKey,orderId,product,name,email,deliveryNoteUrl,receiptUrl,installerUrl,note,lang:'ja'})});const data=await res.json().catch(()=>({}));if(!res.ok||data.ok===false)throw new Error(data.error||`HTTP ${res.status}`);show(`注文 ${orderId} の納品書・領収書・インストーラー案内を ${email} へ送信しました。`,'success')}catch(e){show(`納品メールを送信できませんでした: ${e.message}`,'error')}finally{btn.disabled=false}}
document.addEventListener('click',e=>{const btn=e.target.closest?.('#sendFulfillmentBtn');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();send()},true);
})();