(()=>{
const P={
 ja:{title:'Updates単独契約を解約するとどうなりますか？',body:'継続アップデートは契約終了時に停止します。解約後のソフトウェア利用継続可否、データ保持、利用可能バージョンは製品仕様確定前のため未確定です。'},
 en:{title:'What happens if an Updates-only subscription is cancelled?',body:'Ongoing update service ends when the subscription term ends. Continued software use, data retention and the version available after cancellation are not yet finalized because the product specification is still under development.'},
 'zh-CN':{title:'仅订阅Updates后取消会怎样？',body:'持续更新服务会在订阅期结束时停止。取消后软件是否可继续使用、数据如何保留以及可用版本因产品规格尚未最终确定，目前仍未确定。'},
 'zh-TW':{title:'僅訂閱Updates後解約會怎樣？',body:'持續更新服務會於訂閱期結束時停止。解約後軟體是否可繼續使用、資料如何保留以及可用版本因產品規格尚未最終確定，目前仍未確定。'},
 ko:{title:'Updates 단독 계약을 해지하면 어떻게 되나요?',body:'지속 업데이트 서비스는 계약 종료 시 중단됩니다. 해지 후 소프트웨어 계속 사용 가능 여부, 데이터 보존, 이용 가능 버전은 제품 사양 확정 전이므로 아직 미정입니다.'},
 id:{title:'Apa yang terjadi jika langganan Updates saja dibatalkan?',body:'Layanan pembaruan berkelanjutan berakhir saat masa langganan selesai. Kelanjutan penggunaan perangkat lunak, penyimpanan data dan versi yang tersedia setelah pembatalan belum ditetapkan karena spesifikasi produk masih dikembangkan.'},
 ms:{title:'Apa berlaku jika langganan Updates sahaja dibatalkan?',body:'Perkhidmatan kemas kini berterusan tamat apabila tempoh langganan berakhir. Penggunaan perisian selepas pembatalan, penyimpanan data dan versi yang tersedia masih belum dimuktamadkan kerana spesifikasi produk masih dibangunkan.'},
 vi:{title:'Điều gì xảy ra nếu hủy gói chỉ Updates?',body:'Dịch vụ cập nhật liên tục kết thúc khi kỳ đăng ký hết hạn. Khả năng tiếp tục sử dụng phần mềm, lưu dữ liệu và phiên bản còn dùng được sau khi hủy vẫn chưa được chốt vì đặc tả sản phẩm còn đang phát triển.'},
 th:{title:'หากยกเลิกสัญญา Updates แบบเดี่ยวจะเกิดอะไรขึ้น?',body:'บริการอัปเดตต่อเนื่องจะสิ้นสุดเมื่อครบระยะสัญญา ส่วนการใช้ซอฟต์แวร์ต่อ การเก็บข้อมูล และเวอร์ชันที่ยังใช้ได้หลังยกเลิกยังไม่สรุป เนื่องจากข้อกำหนดผลิตภัณฑ์ยังอยู่ระหว่างพัฒนา'},
 hi:{title:'केवल Updates सदस्यता रद्द करने पर क्या होगा?',body:'निरंतर अपडेट सेवा सदस्यता अवधि समाप्त होने पर बंद हो जाएगी। उसके बाद सॉफ़्टवेयर उपयोग जारी रहेगा या नहीं, डेटा कैसे रखा जाएगा और कौन-सा संस्करण उपलब्ध रहेगा—ये बातें अभी तय नहीं हैं क्योंकि उत्पाद विनिर्देश अभी विकास में हैं।'},
 ar:{title:'ماذا يحدث عند إلغاء اشتراك Updates فقط؟',body:'تنتهي خدمة التحديثات المستمرة عند انتهاء مدة الاشتراك. أما استمرار استخدام البرنامج والاحتفاظ بالبيانات والإصدار المتاح بعد الإلغاء فلم تُحسم بعد لأن مواصفات المنتج ما زالت قيد التطوير.'}
};
const LOCAL={en:'USD',ja:'JPY','zh-CN':'CNY','zh-TW':'TWD',ko:'KRW',id:'IDR',ms:'MYR',vi:'VND',th:'THB',hi:'INR',ar:'AED'};
const LOCALE={en:'en-US',ja:'ja-JP','zh-CN':'zh-CN','zh-TW':'zh-TW',ko:'ko-KR',id:'id-ID',ms:'ms-MY',vi:'vi-VN',th:'th-TH',hi:'hi-IN',ar:'ar-AE'};
const RATE={JPY:1,USD:.00627731,CNY:.0423289,TWD:.201015,KRW:8.82247,IDR:111.918,MYR:.0256305,VND:164.052,THB:.206395,INR:.594424,AED:.0230533};
function lang(){const v=localStorage.getItem('fde-lang')||document.querySelector('#lang')?.value||'en';return P[v]?v:'en'}
function fmt(jpy,l){const c=LOCAL[l]||'USD';return new Intl.NumberFormat(LOCALE[l]||'en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(Math.round(jpy*(RATE[c]||1)))}
function replacePrices(root,l){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){let t=n.nodeValue;if(!t)continue;const map=[[49800,/(?:JPY\s*)?49,800(?:円|日元|日圓)?|¥\s*49,800/g],[4900,/(?:JPY\s*)?4,900(?:円|日元|日圓)?|¥\s*4,900/g],[9800,/(?:JPY\s*)?9,800(?:円|日元|日圓)?|¥\s*9,800/g]];for(const[a,re]of map)t=t.replace(re,fmt(a,l));n.nodeValue=t}}
function patchCancellation(l){const p=P[l]||P.en;const h=[...document.querySelectorAll('h3')].find(x=>/Updates単独|Updates-only|仅订阅Updates|僅訂閱Updates|Updates 단독|Updates sahaja|Updates saja|chỉ Updates|Updates แบบเดี่ยว|केवल Updates|اشتراك Updates فقط/i.test(x.textContent));if(h){h.textContent=p.title;const next=h.nextElementSibling;if(next)next.textContent=p.body}}
function apply(){const l=lang();patchCancellation(l);replacePrices(document.querySelector('main'),l)}
function init(){setTimeout(apply,0);document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(apply,30));window.addEventListener('pageshow',()=>setTimeout(apply,0))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();