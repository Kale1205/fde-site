(()=>{
const BASE_JPY=[49800,4980,99800,9800];
const DEFAULT_RATES={JPY:1,USD:0.00627731,CNY:0.0423289,TWD:0.201015,KRW:8.82247,IDR:111.918,MYR:0.0256305,VND:164.052,THB:0.206395,INR:0.594424,AED:0.0230533};
const CURRENCY_BY_LANG={ja:'JPY',en:'USD','zh-CN':'CNY','zh-TW':'TWD',ko:'KRW',id:'IDR',ms:'MYR',vi:'VND',th:'THB',hi:'INR',ar:'AED'};
const LOCALE_BY_LANG={ja:'ja-JP',en:'en-US','zh-CN':'zh-CN','zh-TW':'zh-TW',ko:'ko-KR',id:'id-ID',ms:'ms-MY',vi:'vi-VN',th:'th-TH',hi:'hi-IN',ar:'ar-AE'};
const LABELS={
 en:{currency:'Price currency',note:'Monthly reference conversion from JPY. Exchange rates are updated at the beginning of each month; the final amount is confirmed in the quotation.'},
 'zh-CN':{currency:'价格货币',note:'参考换算价。汇率于每月月初更新，最终金额以报价为准。'},
 'zh-TW':{currency:'價格貨幣',note:'參考換算價。匯率於每月月初更新，最終金額以報價為準。'},
 ko:{currency:'가격 통화',note:'참고 환산 가격입니다. 환율은 매월 초 갱신되며 최종 금액은 견적에서 확정됩니다.'},
 id:{currency:'Mata uang harga',note:'Konversi referensi. Kurs diperbarui pada awal setiap bulan; harga akhir dikonfirmasi dalam penawaran.'},
 ms:{currency:'Mata wang harga',note:'Penukaran rujukan. Kadar dikemas kini pada awal setiap bulan; harga akhir disahkan dalam sebut harga.'},
 vi:{currency:'Đơn vị tiền tệ',note:'Giá quy đổi tham khảo. Tỷ giá được cập nhật vào đầu mỗi tháng; giá cuối cùng được xác nhận trong báo giá.'},
 th:{currency:'สกุลเงินราคา',note:'ราคาแปลงอ้างอิง อัตราแลกเปลี่ยนจะอัปเดตช่วงต้นเดือน และราคาสุดท้ายยืนยันในใบเสนอราคา'},
 hi:{currency:'मूल्य मुद्रा',note:'संदर्भ रूपांतरण। विनिमय दर हर महीने की शुरुआत में अपडेट होती है; अंतिम मूल्य कोटेशन में तय होगा।'},
 ar:{currency:'عملة السعر',note:'تحويل مرجعي. يتم تحديث سعر الصرف في بداية كل شهر، ويتم تأكيد السعر النهائي في عرض السعر.'}
};
let rates={...DEFAULT_RATES};
let asOf='2026-08-16';
const qs=(s,c=document)=>c.querySelector(s);const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
const lang=()=>document.documentElement.lang||localStorage.getItem('fde-lang')||'ja';
function ensureStyle(){if(qs('#fde-monthly-pricing-style'))return;const s=document.createElement('style');s.id='fde-monthly-pricing-style';s.textContent='.currency-tools{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin:-4px 0 10px;padding:13px 15px;border:1px solid var(--line);background:#f7faf8}.currency-tools label{font-size:11px;font-weight:900;letter-spacing:.06em;color:var(--green-deep)}.currency-tools select{min-width:150px;padding:10px 34px 10px 12px;border:1px solid #b9c8bf;background:#fff;color:var(--ink);font:inherit;font-size:12px;font-weight:800}.currency-fx-note{margin:0 0 24px;color:var(--muted);font-size:11px;line-height:1.7;text-align:right}@media(max-width:760px){.currency-tools{justify-content:space-between}.currency-tools select{min-width:126px}.currency-fx-note{text-align:left}.plan-price{white-space:nowrap}}';document.head.appendChild(s)}
function format(jpy,currency,l){const value=Math.round(jpy*(rates[currency]||1));return new Intl.NumberFormat(LOCALE_BY_LANG[l]||'en-US',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:0}).format(value)}
function removeUi(){qs('#fdeCurrencyTools')?.remove();qs('#fdeCurrencyNote')?.remove()}
function ensureUi(){const shell=qs('#plans .shell'),grid=qs('#plans .plan-grid');if(!shell||!grid)return null;ensureStyle();let tools=qs('#fdeCurrencyTools');if(!tools){tools=document.createElement('div');tools.id='fdeCurrencyTools';tools.className='currency-tools';tools.innerHTML='<label for="fdeCurrencySelect"></label><select id="fdeCurrencySelect" aria-label="Price currency"></select>';shell.insertBefore(tools,grid)}let note=qs('#fdeCurrencyNote');if(!note){note=document.createElement('div');note.id='fdeCurrencyNote';note.className='currency-fx-note';shell.insertBefore(note,grid)}return{tools,note,label:qs('label',tools),select:qs('select',tools)}}
function selectedCurrency(l){const local=CURRENCY_BY_LANG[l]||'USD';if(l==='ja'||l==='en')return local;const saved=localStorage.getItem(`fde-price-currency-${l}`);return saved===local||saved==='USD'?saved:local}
function render(){const prices=qsa('#plans .plan-price');if(!prices.length)return;const l=lang();const local=CURRENCY_BY_LANG[l]||'USD';const currency=selectedCurrency(l);prices.forEach((el,i)=>{const amount=format(BASE_JPY[i]||0,currency,l);if(el.firstChild&&el.firstChild.nodeType===3)el.firstChild.nodeValue=amount+' ';else el.insertBefore(document.createTextNode(amount+' '),el.firstChild)});
 if(l==='ja'){removeUi();return}
 if(l==='en'){removeUi();const shell=qs('#plans .shell'),grid=qs('#plans .plan-grid');if(shell&&grid){const note=document.createElement('div');note.id='fdeCurrencyNote';note.className='currency-fx-note';note.textContent=`${LABELS.en.note} Rate date: ${asOf}.`;shell.insertBefore(note,grid)}return}
 const ui=ensureUi();if(!ui)return;const copy=LABELS[l]||LABELS.en;ui.label.textContent=copy.currency;ui.note.textContent=`${copy.note} (${asOf})`;ui.select.innerHTML=`<option value="${local}">${local}</option><option value="USD">USD</option>`;ui.select.value=currency;ui.select.onchange=e=>{localStorage.setItem(`fde-price-currency-${l}`,e.target.value);render()}}
async function loadRates(){try{const r=await fetch(`content/pricing-rates.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);const j=await r.json();if(j&&j.rates){rates={...DEFAULT_RATES,...j.rates};asOf=j.asOf||asOf}}catch(e){console.warn('Pricing rate load failed; using fallback rates',e)}render()}
function scheduleRender(){setTimeout(render,30)}
document.addEventListener('DOMContentLoaded',()=>{loadRates();qs('#lang')?.addEventListener('change',scheduleRender);new MutationObserver(scheduleRender).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})});
})();
