(()=>{
const add=(lang,values)=>{if(window.FDE_I18N&&window.FDE_I18N[lang])Object.assign(window.FDE_I18N[lang],values)};
add('ja',{
  productsHero:'Business Software, Where You Need It',
  plansTitle:'Plans',coverageTitle:'Coverage',howTitle:'How It Works',demoTitle:'Demo & Updates',
  whyHero:'Forward Deployed Engineering, Beyond Implementation',fdeRoleTitle:'What Is FDE?',backgroundTitle:'Background',whyClosing:'Why It Matters',
  aboutHero:'Kale’s Goals',goalDiagramTitle:'Business Model',approachTitle:'Approach',principlesTitle:'Principles',
  contactTitle:'Contact',faqTitle:'FAQ',formTitle:'Inquiry Form',businessProfileTitle:'Business Profile',
  instagramBody:'写真・映像・小説を中心とした個人のクリエイティブ活動を発信しています。FDEの業務情報とは分け、作品や制作活動を掲載しています。'
});
add('en',{
  tradeNameLabel:'Business name',
  instagramBody:'A personal creative account focused on photography, short-form video and literary writing. It is kept separate from Kale’s FDE business updates.'
});
const PORTAL_LABELS={
  ja:'利用者の方へ / 注文状況 ↗',
  en:'Customer Portal / Order Status ↗',
  'zh-CN':'客户入口 / 订单状态 ↗',
  'zh-TW':'客戶入口 / 訂單狀態 ↗',
  ko:'고객 포털 / 주문 상태 ↗',
  id:'Portal Pelanggan / Status Pesanan ↗',
  ms:'Portal Pelanggan / Status Pesanan ↗',
  vi:'Cổng khách hàng / Trạng thái đơn hàng ↗',
  th:'พอร์ทัลลูกค้า / สถานะคำสั่งซื้อ ↗',
  hi:'ग्राहक पोर्टल / ऑर्डर स्थिति ↗',
  ar:'بوابة العملاء / حالة الطلب ↗'
};
function currentLang(){return document.documentElement.lang||localStorage.getItem('fde-lang')||'ja'}
function portalLabel(){const l=currentLang();return PORTAL_LABELS[l]||PORTAL_LABELS.en}
function ensurePortal(){
  if(location.pathname.endsWith('/customer.html')||location.pathname.endsWith('customer.html'))return;
  const header=document.querySelector('.site-header');if(!header)return;
  let bar=document.querySelector('.customer-utility-bar');
  if(!bar){
    bar=document.createElement('div');bar.className='customer-utility-bar';
    bar.innerHTML='<div class="customer-utility-inner"><a class="customer-utility-link" href="customer.html" target="_blank" rel="noopener"></a></div>';
    header.parentNode.insertBefore(bar,header);
    const st=document.createElement('style');st.id='customer-utility-style';
    st.textContent='.customer-utility-bar{background:#0a5135;color:#fff;border-bottom:1px solid rgba(255,255,255,.18)}.customer-utility-inner{width:min(1180px,calc(100% - 32px));height:34px;margin:0 auto;display:flex;justify-content:flex-end;align-items:center}.customer-utility-link{color:#fff!important;text-decoration:none;font-size:11px;font-weight:850;letter-spacing:.04em}.customer-utility-link:hover{text-decoration:underline}@media(max-width:760px){.customer-utility-inner{width:min(100% - 20px,1180px);height:32px}.customer-utility-link{font-size:10px}}';
    document.head.appendChild(st);
  }
  const link=bar.querySelector('.customer-utility-link');
  if(link){link.textContent=portalLabel();link.lang=currentLang();}
}
function initPortal(){
  ensurePortal();
  document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(ensurePortal,0));
  new MutationObserver(()=>ensurePortal()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPortal,{once:true});else initPortal();
['pricing-monthly.js?v=20260817-0850','commerce-ui.js?v=20260817-0905'].forEach(src=>{const s=document.createElement('script');s.src=src;s.async=false;document.head.appendChild(s)});
})();