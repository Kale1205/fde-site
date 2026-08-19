(()=>{
const COPY={
 ja:'Updates単独契約を解約した場合、継続アップデートは契約終了時に停止します。解約後のソフトウェア利用継続可否、データ保持、利用可能バージョンは製品仕様確定前のため未確定です。',
 en:'For an Updates-only subscription, ongoing update service ends when the subscription term ends. Whether the software remains usable, how data is retained, and which version remains available after cancellation are not yet finalized because the product specification is still under development.',
 'zh-CN':'仅订阅Updates的客户取消后，持续更新服务会在订阅期结束时停止。取消后的软件是否可继续使用、数据保留方式以及可用版本因产品规格尚未最终确定，目前仍未确定。',
 'zh-TW':'僅訂閱Updates的客戶解約後，持續更新服務會於訂閱期結束時停止。解約後軟體是否可繼續使用、資料保留方式及可用版本因產品規格尚未最終確定，目前仍未確定。',
 ko:'Updates 단독 계약을 해지하면 지속 업데이트 서비스는 계약 종료 시 중단됩니다. 해지 후 소프트웨어 계속 사용 가능 여부, 데이터 보존, 이용 가능한 버전은 제품 사양 확정 전이므로 아직 미정입니다.',
 id:'Untuk langganan Updates saja, layanan pembaruan berkelanjutan berakhir saat masa langganan selesai. Apakah perangkat lunak tetap dapat digunakan, bagaimana data disimpan, dan versi apa yang tetap tersedia setelah pembatalan belum ditetapkan.',
 ms:'Bagi langganan Updates sahaja, perkhidmatan kemas kini berterusan tamat apabila tempoh langganan berakhir. Sama ada perisian masih boleh digunakan, bagaimana data disimpan dan versi yang tersedia selepas pembatalan masih belum dimuktamadkan.',
 vi:'Với gói chỉ Updates, dịch vụ cập nhật liên tục kết thúc khi kỳ đăng ký kết thúc. Việc phần mềm có tiếp tục sử dụng được không, dữ liệu được lưu thế nào và phiên bản nào còn khả dụng sau khi hủy vẫn chưa được chốt.',
 th:'สำหรับสัญญา Updates แบบเดี่ยว บริการอัปเดตต่อเนื่องจะสิ้นสุดเมื่อครบระยะสัญญา ส่วนการใช้ซอฟต์แวร์ต่อ การเก็บข้อมูล และเวอร์ชันที่ยังใช้ได้หลังยกเลิกยังไม่สรุป',
 hi:'केवल Updates सदस्यता रद्द करने पर निरंतर अपडेट सेवा सदस्यता अवधि समाप्त होने पर बंद हो जाएगी। उसके बाद सॉफ़्टवेयर उपयोग, डेटा रिटेंशन और उपलब्ध संस्करण अभी तय नहीं हैं।',
 ar:'في اشتراك Updates فقط، تنتهي خدمة التحديثات المستمرة عند انتهاء مدة الاشتراك. أما استمرار استخدام البرنامج والاحتفاظ بالبيانات والإصدار المتاح بعد الإلغاء فلم تُحسم بعد.'
};
function lang(){return document.querySelector('#lang')?.value||localStorage.getItem('fde-lang')||document.documentElement.lang||'en'}
function apply(){
 const copy=COPY[lang()]||COPY.en;
 const cancel=[...document.querySelectorAll('.ims-switch-copy p')].find(el=>/Updates-only|Updates単独|仅订阅Updates|僅訂閱Updates|Updates 단독|Updates sahaja|Updates saja|chỉ Updates|Updates แบบเดี่ยว|केवल Updates|اشتراك Updates فقط/i.test(el.textContent||''));
 if(cancel&&cancel.textContent!==copy)cancel.textContent=copy;
}
function init(){
 apply();
 document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(apply,0));
 new MutationObserver(()=>setTimeout(apply,0)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
