(()=>{
const COPY={
 ja:{buy:'購入する',intro:'FDE IMSは現在開発中です。買い切り型のLicenseを推奨プランとして初期表示しています。',cancelU:'Updates単独契約を解約した場合、継続アップデートは契約終了時に停止します。解約後のソフトウェア利用継続可否、データ保持、利用可能バージョンは製品仕様確定前のため未確定です。'},
 en:{buy:'Buy',intro:'FDE IMS is under development. The one-time License is shown first as the recommended plan.',cancelU:'For an Updates-only subscription, ongoing update service ends when the subscription term ends. Whether the software remains usable, how data is retained, and which version remains available after cancellation are not yet finalized because the product specification is still under development.'},
 'zh-CN':{buy:'购买',intro:'FDE IMS仍在开发中。默认优先显示推荐的一次性License方案。',cancelU:'仅订阅Updates的客户取消后，持续更新服务会在订阅期结束时停止。取消后的软件是否可继续使用、数据保留方式以及可用版本因产品规格尚未最终确定，目前仍未确定。'},
 'zh-TW':{buy:'購買',intro:'FDE IMS仍在開發中。預設優先顯示推薦的一次性License方案。',cancelU:'僅訂閱Updates的客戶解約後，持續更新服務會於訂閱期結束時停止。解約後軟體是否可繼續使用、資料保留方式及可用版本因產品規格尚未最終確定，目前仍未確定。'},
 ko:{buy:'구매하기',intro:'FDE IMS는 현재 개발 중입니다. 일시불 License를 권장 플랜으로 먼저 표시합니다.',cancelU:'Updates 단독 계약을 해지하면 지속 업데이트 서비스는 계약 종료 시 중단됩니다. 해지 후 소프트웨어 계속 사용 가능 여부, 데이터 보존, 이용 가능한 버전은 제품 사양 확정 전이므로 아직 미정입니다.'},
 id:{buy:'Beli',intro:'FDE IMS masih dalam pengembangan. License sekali bayar ditampilkan pertama sebagai paket yang direkomendasikan.',cancelU:'Untuk langganan Updates saja, layanan pembaruan berkelanjutan berakhir saat masa langganan selesai. Apakah perangkat lunak tetap dapat digunakan, bagaimana data disimpan, dan versi apa yang tetap tersedia setelah pembatalan belum ditetapkan.'},
 ms:{buy:'Beli',intro:'FDE IMS masih dalam pembangunan. License sekali bayar dipaparkan dahulu sebagai pelan yang disyorkan.',cancelU:'Bagi langganan Updates sahaja, perkhidmatan kemas kini berterusan tamat apabila tempoh langganan berakhir. Sama ada perisian masih boleh digunakan, bagaimana data disimpan dan versi yang tersedia selepas pembatalan masih belum dimuktamadkan.'},
 vi:{buy:'Mua',intro:'FDE IMS đang được phát triển. License trả một lần được hiển thị trước như gói được khuyến nghị.',cancelU:'Với gói chỉ Updates, dịch vụ cập nhật liên tục kết thúc khi kỳ đăng ký kết thúc. Việc phần mềm có tiếp tục sử dụng được không, dữ liệu được lưu thế nào và phiên bản nào còn khả dụng sau khi hủy vẫn chưa được chốt.'},
 th:{buy:'ซื้อ',intro:'FDE IMS อยู่ระหว่างพัฒนา โดยแสดง License แบบชำระครั้งเดียวเป็นแผนแนะนำก่อน',cancelU:'สำหรับสัญญา Updates แบบเดี่ยว บริการอัปเดตต่อเนื่องจะสิ้นสุดเมื่อครบระยะสัญญา ส่วนการใช้ซอฟต์แวร์ต่อ การเก็บข้อมูล และเวอร์ชันที่ยังใช้ได้หลังยกเลิกยังไม่สรุป'},
 hi:{buy:'खरीदें',intro:'FDE IMS अभी विकास में है। एकमुश्त License को अनुशंसित योजना के रूप में पहले दिखाया जाता है।',cancelU:'केवल Updates सदस्यता रद्द करने पर निरंतर अपडेट सेवा सदस्यता अवधि समाप्त होने पर बंद हो जाएगी। उसके बाद सॉफ़्टवेयर उपयोग, डेटा रिटेंशन और उपलब्ध संस्करण अभी तय नहीं हैं।'},
 ar:{buy:'شراء',intro:'FDE IMS ما زال قيد التطوير. يظهر License بدفعة واحدة أولاً باعتباره الخطة الموصى بها.',cancelU:'في اشتراك Updates فقط، تنتهي خدمة التحديثات المستمرة عند انتهاء مدة الاشتراك. أما استمرار استخدام البرنامج والاحتفاظ بالبيانات والإصدار المتاح بعد الإلغاء فلم تُحسم بعد.'}
};
function lang(){return document.querySelector('#lang')?.value||localStorage.getItem('fde-lang')||document.documentElement.lang||'en'}
function style(){if(document.getElementById('ims-spec-mobile-style'))return;const s=document.createElement('style');s.id='ims-spec-mobile-style';s.textContent=`
.ims-plan-face .ims-model-list{display:none!important}
.ims-plan-face [data-flip],.ims-plan-face .ims-flip-hint,.ims-plan-face .flip-hint{display:none!important}
.ims-plan-card,.ims-plan-face{cursor:pointer}
@media(max-width:760px){.ims-compare{overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;grid-template-columns:minmax(150px,1fr) minmax(180px,1fr) minmax(190px,1fr);scrollbar-width:thin;padding-bottom:8px}.ims-compare>div{min-width:0}}
`;document.head.appendChild(s)}
function apply(){style();const p=COPY[lang()]||COPY.en;
 document.querySelectorAll('.ims-plan-face [data-flip],.ims-plan-face .ims-flip-hint,.ims-plan-face .flip-hint').forEach(el=>el.remove());
 document.querySelectorAll('.ims-plan-face .ims-model-list').forEach(el=>el.remove());
 [...document.querySelectorAll('#plans p')].forEach(el=>{if(/flip the card|カードを切り替える|点击卡片|點擊卡片|카드를 클릭|klik kartu|klik kad|nhấp vào thẻ|คลิก|कार्ड|البطاقة/i.test(el.textContent||''))el.textContent=p.intro});
 document.querySelectorAll('.ims-plan-face a,.ims-model-actions a').forEach(a=>{if(/purchase flow|view purchase|購入フロー|购买流程|購買流程|구매 흐름|alur pembelian|aliran pembelian|quy trình mua|ขั้นตอนการซื้อ|खरीद प्रक्रिया|مسار الشراء/i.test(a.textContent||''))a.textContent=p.buy});
 const cancel=[...document.querySelectorAll('.ims-switch-copy p')].find(el=>/Updates-only|Updates単独|仅订阅Updates|僅訂閱Updates|Updates 단독|Updates sahaja|Updates saja|chỉ Updates|Updates แบบเดี่ยว|केवल Updates|اشتراك Updates فقط/i.test(el.textContent));if(cancel)cancel.textContent=p.cancelU;
}
function init(){apply();document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(apply,0));new MutationObserver(()=>setTimeout(apply,0)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();