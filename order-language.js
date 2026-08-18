(()=>{
const $=s=>document.querySelector(s);
const LABEL={ja:'注文言語',en:'Order language','zh-CN':'订单语言','zh-TW':'訂單語言',ko:'주문 언어',id:'Bahasa pesanan',ms:'Bahasa pesanan',vi:'Ngôn ngữ đơn hàng',th:'ภาษาของคำสั่งซื้อ',hi:'ऑर्डर भाषा',ar:'لغة الطلب'};
const NAME={ja:'日本語',en:'English','zh-CN':'简体中文','zh-TW':'繁體中文',ko:'한국어',id:'Bahasa Indonesia',ms:'Bahasa Melayu',vi:'Tiếng Việt',th:'ไทย',hi:'हिन्दी',ar:'العربية'};
const NOTE={
 ja:'この注文は、現在Webで表示している日本語版として受け付けます。言語を変更すると注文言語も変更されます。',
 en:'This order will be recorded as the English version currently displayed on the website. Changing the site language also changes the order language.',
 'zh-CN':'此订单将按网站当前显示的简体中文版记录。更改网站语言时，订单语言也会随之更改。',
 'zh-TW':'此訂單將依網站目前顯示的繁體中文版記錄。變更網站語言時，訂單語言也會隨之變更。',
 ko:'이 주문은 현재 웹사이트에 표시된 한국어 버전으로 기록됩니다. 사이트 언어를 변경하면 주문 언어도 함께 변경됩니다.',
 id:'Pesanan ini akan dicatat sebagai versi Bahasa Indonesia yang sedang ditampilkan di situs. Mengubah bahasa situs juga akan mengubah bahasa pesanan.',
 ms:'Pesanan ini akan direkodkan sebagai versi Bahasa Melayu yang sedang dipaparkan di laman. Menukar bahasa laman juga akan menukar bahasa pesanan.',
 vi:'Đơn hàng này sẽ được ghi nhận theo phiên bản Tiếng Việt đang hiển thị trên website. Khi đổi ngôn ngữ website, ngôn ngữ đơn hàng cũng thay đổi.',
 th:'คำสั่งซื้อนี้จะถูกบันทึกเป็นเวอร์ชันภาษาไทยที่กำลังแสดงบนเว็บไซต์ หากเปลี่ยนภาษาของเว็บไซต์ ภาษาของคำสั่งซื้อจะเปลี่ยนตาม',
 hi:'यह ऑर्डर वेबसाइट पर वर्तमान में दिखाई जा रही हिन्दी संस्करण के रूप में दर्ज किया जाएगा। वेबसाइट की भाषा बदलने पर ऑर्डर की भाषा भी बदल जाएगी।',
 ar:'سيتم تسجيل هذا الطلب باعتباره النسخة العربية المعروضة حالياً على الموقع. يؤدي تغيير لغة الموقع أيضاً إلى تغيير لغة الطلب.'
};
function lang(){return $('#lang')?.value||localStorage.getItem('fde-lang')||document.documentElement.lang||'ja'}
function languageName(l){return NAME[l]||NAME.en}
function ensure(){
 const grid=$('.quote-grid');
 if(grid&&!$('#quoteLanguageCell')){
  const cell=document.createElement('div');cell.id='quoteLanguageCell';cell.className='quote-cell';cell.innerHTML='<small id="quoteLanguageLabel"></small><strong id="quoteLanguage"></strong>';grid.appendChild(cell);
  const note=document.createElement('div');note.id='orderLanguageNotice';note.className='quote-note order-language-notice';grid.insertAdjacentElement('afterend',note);
 }
 const complete=$('#orderComplete');if(complete&&!$('#completeOrderLanguage')){const p=document.createElement('p');p.id='completeOrderLanguage';const orderIdLine=complete.querySelector('p:has(#completeOrderId)');(orderIdLine||complete.lastElementChild)?.insertAdjacentElement('afterend',p)}
}
function syncSummary(){const box=$('#orderSummary');if(!box||!box.children.length)return;let row=$('#orderLanguageSummary');if(!row){row=document.createElement('div');row.id='orderLanguageSummary';row.className='order-summary-row';row.innerHTML='<strong></strong><span></span>';box.appendChild(row)}const l=lang();row.querySelector('strong').textContent=LABEL[l]||LABEL.en;row.querySelector('span').textContent=languageName(l)}
function render(){ensure();const l=lang();if($('#quoteLanguageLabel'))$('#quoteLanguageLabel').textContent=LABEL[l]||LABEL.en;if($('#quoteLanguage'))$('#quoteLanguage').textContent=languageName(l);if($('#orderLanguageNotice'))$('#orderLanguageNotice').textContent=NOTE[l]||NOTE.en;if($('#completeOrderLanguage'))$('#completeOrderLanguage').textContent=`${LABEL[l]||LABEL.en}: ${languageName(l)}`;syncSummary();document.body.dataset.orderLanguage=l}
function init(){ensure();render();const summary=$('#orderSummary');if(summary)new MutationObserver(syncSummary).observe(summary,{childList:true,subtree:true});$('#lang')?.addEventListener('change',()=>setTimeout(render,0));new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
