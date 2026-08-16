(()=>{
const PURCHASE={ja:'購入',en:'Purchase','zh-CN':'购买','zh-TW':'購買',ko:'구매',id:'Beli',ms:'Beli',vi:'Mua',th:'ซื้อ',hi:'खरीदें',ar:'شراء'};
const INTRO={
 ja:'カードをクリックすると、買い切りと月額プランが切り替わります。',
 en:'Click a card to switch between the one-time purchase and monthly plan.',
 'zh-CN':'点击卡片可切换一次性购买与月度方案。','zh-TW':'點擊卡片可切換一次性購買與月費方案。',ko:'카드를 클릭하면 일시 구매와 월간 플랜을 전환할 수 있습니다.',id:'Klik kartu untuk beralih antara pembelian satu kali dan paket bulanan.',ms:'Klik kad untuk bertukar antara pembelian sekali bayar dan pelan bulanan.',vi:'Nhấp vào thẻ để chuyển giữa mua một lần và gói hàng tháng.',th:'คลิกการ์ดเพื่อสลับระหว่างการซื้อครั้งเดียวและแพ็กเกจรายเดือน',hi:'एकमुश्त खरीद और मासिक योजना के बीच बदलने के लिए कार्ड पर क्लिक करें।',ar:'انقر على البطاقة للتبديل بين الشراء لمرة واحدة والخطة الشهرية.'
};
const lang=()=>document.documentElement.lang||localStorage.getItem('fde-lang')||'ja';
function setup(){const plans=document.querySelector('#plans');if(!plans)return;const intro=plans.querySelector('.section-head .section-copy');if(intro){intro.removeAttribute('data-i18n');intro.textContent=INTRO[lang()]||INTRO.en}const first=plans.querySelector('.plan-card');if(!first)return;const front=first.querySelector('.plan-front .plan-actions a');const back=first.querySelector('.plan-back .plan-actions a');if(front){front.removeAttribute('data-i18n');front.textContent=PURCHASE[lang()]||PURCHASE.en;front.href='order.html?product=ims-starter&plan=one-time';front.classList.add('dark')}if(back){back.removeAttribute('data-i18n');back.textContent=PURCHASE[lang()]||PURCHASE.en;back.href='order.html?product=ims-starter&plan=monthly';back.classList.add('dark')}}
function init(){setup();document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(setup,0));new MutationObserver(()=>setup()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();