(()=>{
const DEFAULT_LANG='en';
const SUPPORTED_LANGS=new Set(['ja','en','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar']);
try{
  const saved=localStorage.getItem('fde-lang');
  if(!SUPPORTED_LANGS.has(saved)){
    localStorage.setItem('fde-lang',DEFAULT_LANG);
    document.documentElement.lang=DEFAULT_LANG;
  }else{
    document.documentElement.lang=saved;
  }
}catch{
  document.documentElement.lang=DEFAULT_LANG;
}
const add=(lang,values)=>{if(window.FDE_I18N&&window.FDE_I18N[lang])Object.assign(window.FDE_I18N[lang],values)};
add('ja',{
  productsEyebrow:'Baked Kale / Kale’s FDE — 小規模企業向け業務ソフトウェア',
  productsHero:'Small Business Software,<br>Built for Real Operations.',
  productsLead:'Baked Kaleは、小規模企業向けのデスクトップ業務ソフトを開発・提供しています。在庫管理のIMS Starterを起点に、承認・帳票・分析へ段階的に広げます。',
  productsFocus:'主力製品：IMS Starter — 在庫管理システム',
  plansTitle:'Plans',coverageTitle:'Coverage',howTitle:'How It Works',demoTitle:'Demo & Updates',
  whyHero:'Forward Deployed Engineering, Beyond Implementation',fdeRoleTitle:'What Is FDE?',backgroundTitle:'Background',whyClosing:'Why It Matters',
  aboutHero:'Kale’s Goals',goalDiagramTitle:'Business Model',approachTitle:'Approach',principlesTitle:'Principles',
  contactTitle:'Contact',faqTitle:'FAQ',formTitle:'Inquiry Form',businessProfileTitle:'Business Profile',
  instagramBody:'写真・映像・小説を中心とした個人のクリエイティブ活動を発信しています。FDEの業務情報とは分け、作品や制作活動を掲載しています。'
});
add('en',{
  tradeNameLabel:'Business name',
  productsEyebrow:'Baked Kale / Kale’s FDE — Business software for small companies',
  productsHero:'Small Business Software,<br>Built for Real Operations.',
  productsLead:'Baked Kale develops practical desktop business software for small companies. Starting with IMS Starter for inventory management, the product line expands into approvals, documents and analytics.',
  productsFocus:'Flagship product: IMS Starter — Inventory Management System',
  instagramBody:'A personal creative account focused on photography, short-form video and literary writing. It is kept separate from Kale’s FDE business updates.'
});
add('zh-CN',{
  productsEyebrow:'Baked Kale / Kale’s FDE — 面向小型企业的业务软件',
  productsHero:'面向实际业务的<br>小型企业软件。',
  productsLead:'Baked Kale 为小型企业开发和提供实用的桌面业务软件。以库存管理产品 IMS Starter 为起点，并逐步扩展到审批、单据和分析。',
  productsFocus:'主力产品：IMS Starter — 库存管理系统'
});
add('zh-TW',{
  productsEyebrow:'Baked Kale / Kale’s FDE — 面向小型企業的業務軟體',
  productsHero:'為實際業務打造的<br>小型企業軟體。',
  productsLead:'Baked Kale 為小型企業開發並提供實用的桌面業務軟體。從庫存管理產品 IMS Starter 開始，再逐步擴展至審批、單據與分析。',
  productsFocus:'主力產品：IMS Starter — 庫存管理系統'
});
add('ko',{
  productsEyebrow:'Baked Kale / Kale’s FDE — 소규모 기업용 업무 소프트웨어',
  productsHero:'실제 업무를 위한<br>소규모 기업 소프트웨어.',
  productsLead:'Baked Kale는 소규모 기업을 위한 실용적인 데스크톱 업무 소프트웨어를 개발·제공합니다. 재고관리 제품 IMS Starter를 시작으로 승인, 문서, 분석 기능으로 단계적으로 확장합니다.',
  productsFocus:'주력 제품: IMS Starter — 재고관리 시스템'
});
add('id',{
  productsEyebrow:'Baked Kale / Kale’s FDE — Perangkat lunak bisnis untuk usaha kecil',
  productsHero:'Perangkat Lunak Usaha Kecil,<br>Dibuat untuk Operasional Nyata.',
  productsLead:'Baked Kale mengembangkan perangkat lunak bisnis desktop yang praktis untuk usaha kecil. Dimulai dari IMS Starter untuk manajemen inventaris, lalu berkembang ke persetujuan, dokumen, dan analitik.',
  productsFocus:'Produk utama: IMS Starter — Sistem Manajemen Inventaris'
});
add('ms',{
  productsEyebrow:'Baked Kale / Kale’s FDE — Perisian perniagaan untuk syarikat kecil',
  productsHero:'Perisian Perniagaan Kecil,<br>Dibina untuk Operasi Sebenar.',
  productsLead:'Baked Kale membangunkan perisian perniagaan desktop yang praktikal untuk syarikat kecil. Bermula dengan IMS Starter untuk pengurusan inventori, kemudian berkembang kepada kelulusan, dokumen dan analitik.',
  productsFocus:'Produk utama: IMS Starter — Sistem Pengurusan Inventori'
});
add('vi',{
  productsEyebrow:'Baked Kale / Kale’s FDE — Phần mềm nghiệp vụ cho doanh nghiệp nhỏ',
  productsHero:'Phần mềm cho doanh nghiệp nhỏ,<br>được xây dựng cho vận hành thực tế.',
  productsLead:'Baked Kale phát triển phần mềm nghiệp vụ desktop thực tế cho doanh nghiệp nhỏ. Bắt đầu với IMS Starter để quản lý tồn kho, sau đó mở rộng dần sang phê duyệt, chứng từ và phân tích.',
  productsFocus:'Sản phẩm chủ lực: IMS Starter — Hệ thống quản lý tồn kho'
});
add('th',{
  productsEyebrow:'Baked Kale / Kale’s FDE — ซอฟต์แวร์ธุรกิจสำหรับบริษัทขนาดเล็ก',
  productsHero:'ซอฟต์แวร์สำหรับธุรกิจขนาดเล็ก<br>ที่สร้างมาเพื่อการทำงานจริง',
  productsLead:'Baked Kale พัฒนาและให้บริการซอฟต์แวร์ธุรกิจบนเดสก์ท็อปสำหรับบริษัทขนาดเล็ก โดยเริ่มจาก IMS Starter สำหรับจัดการสินค้าคงคลัง และขยายต่อไปสู่การอนุมัติ เอกสาร และการวิเคราะห์',
  productsFocus:'ผลิตภัณฑ์หลัก: IMS Starter — ระบบจัดการสินค้าคงคลัง'
});
add('hi',{
  productsEyebrow:'Baked Kale / Kale’s FDE — छोटे व्यवसायों के लिए बिज़नेस सॉफ़्टवेयर',
  productsHero:'छोटे व्यवसायों के लिए सॉफ़्टवेयर,<br>वास्तविक संचालन के लिए बनाया गया।',
  productsLead:'Baked Kale छोटे व्यवसायों के लिए व्यावहारिक डेस्कटॉप बिज़नेस सॉफ़्टवेयर विकसित और उपलब्ध कराता है। शुरुआत इन्वेंटरी प्रबंधन के IMS Starter से होती है, फिर अनुमोदन, दस्तावेज़ और विश्लेषण तक विस्तार किया जाता है।',
  productsFocus:'मुख्य उत्पाद: IMS Starter — इन्वेंटरी मैनेजमेंट सिस्टम'
});
add('ar',{
  productsEyebrow:'Baked Kale / Kale’s FDE — برمجيات أعمال للشركات الصغيرة',
  productsHero:'برمجيات للشركات الصغيرة،<br>مصممة للعمل الفعلي.',
  productsLead:'تطوّر Baked Kale برمجيات أعمال مكتبية عملية للشركات الصغيرة. تبدأ المنتجات بـ IMS Starter لإدارة المخزون، ثم تتوسع تدريجيًا إلى الموافقات والمستندات والتحليلات.',
  productsFocus:'المنتج الرئيسي: IMS Starter — نظام إدارة المخزون'
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
function currentLang(){return document.querySelector('#lang')?.value||localStorage.getItem('fde-lang')||document.documentElement.lang||DEFAULT_LANG}
function portalLabel(){const l=currentLang();return PORTAL_LABELS[l]||PORTAL_LABELS.en}
function ensureHeroIdentity(){
  if(!(location.pathname.endsWith('/fde-site/')||location.pathname.endsWith('/fde-site/index.html')||location.pathname==='/'||location.pathname.endsWith('/index.html')))return;
  const lead=document.querySelector('.products-hero .lede');if(!lead)return;
  let focus=document.querySelector('.hero-product-focus');
  if(!focus){
    focus=document.createElement('div');focus.className='hero-product-focus';focus.setAttribute('aria-label','Flagship product');lead.insertAdjacentElement('afterend',focus);
    if(!document.querySelector('#hero-product-focus-style')){
      const st=document.createElement('style');st.id='hero-product-focus-style';
      st.textContent='.hero-product-focus{margin-top:18px;padding-left:14px;border-left:3px solid #0e7a4b;color:#0b6b43;font-size:13px;font-weight:850;line-height:1.55;letter-spacing:.01em}.hero-product-focus+ .hero-actions{margin-top:22px}@media(max-width:760px){.hero-product-focus{margin-top:16px;font-size:12px;padding-left:12px}}';
      document.head.appendChild(st);
    }
  }
  const l=currentLang();focus.textContent=window.FDE_I18N?.[l]?.productsFocus||window.FDE_I18N?.en?.productsFocus||'Flagship product: IMS Starter — Inventory Management System';focus.lang=l;
}
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
function refreshDynamicLabels(){ensurePortal();ensureHeroIdentity()}
function initPortal(){
  refreshDynamicLabels();
  document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(refreshDynamicLabels,0));
  new MutationObserver(()=>refreshDynamicLabels()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPortal,{once:true});else initPortal();
['pricing-monthly.js?v=20260819-131113','commerce-ui.js?v=20260819-131113'].forEach(src=>{const s=document.createElement('script');s.src=src;s.async=false;document.head.appendChild(s)});
})();
