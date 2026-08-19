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
function lang(){return document.querySelector('#lang')?.value||localStorage.getItem('fde-lang')||document.documentElement.lang||'en'}
function apply(){const p=P[lang()]||P.en;const hs=[...document.querySelectorAll('h3')];const h=hs.find(x=>/Updates単独|Updates-only|仅订阅Updates|僅訂閱Updates|Updates 단독|Updates sahaja|Updates saja|chỉ Updates|Updates แบบเดี่ยว|केवल Updates|اشتراك Updates فقط/i.test(x.textContent));if(h){h.textContent=p.title;const next=h.nextElementSibling;if(next)next.textContent=p.body;}}
function init(){apply();document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(apply,0));new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
