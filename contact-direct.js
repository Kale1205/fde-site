(()=>{
const FORM_SUBMIT_ENDPOINT='https://formsubmit.co/ajax/reyouinjune@gmail.com';
const WORKER_ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
const $=(s,c=document)=>c.querySelector(s);
const labels={
 ja:{intro:'すべて必須項目です。入力内容を確認してから、サイト上で送信できます。',notice:'入力後に内容確認画面が表示されます。確認後、このサイトから直接送信されます。',sending:'送信中…',failed:'送信に失敗しました。時間をおいてもう一度お試しください。',confirm:'この内容で送信しますか？',emailLabel:'メールアドレス',invalidEmail:'有効なメールアドレスを入力してください。例: name@example.com'},
 en:{intro:'All fields are required. Review your inquiry before sending it directly from this website.',notice:'After entering your details, you can review them before the inquiry is sent directly from this website.',sending:'Sending…',failed:'The message could not be sent. Please try again later.',confirm:'Send this inquiry?',emailLabel:'Email address',invalidEmail:'Enter a valid email address, for example name@example.com.'}
};
const lang=()=>document.querySelector('#lang')?.value||document.documentElement.lang||'en';
const tr=k=>(labels[lang()]||labels.en)[k]||labels.en[k];
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function value(id){return $('#'+id)?.value.trim()||''}
function validateEmail(){const input=$('#contact');if(!input)return true;const ok=emailPattern.test(input.value.trim());input.setCustomValidity(ok?'':tr('invalidEmail'));return ok}
function validate(form){validateEmail();if(form.checkValidity())return true;form.reportValidity();return false}
function summaryRows(){return [
 [$('#name')?.previousElementSibling?.textContent||'Name',value('name')],
 [$('#company')?.previousElementSibling?.textContent||'Company',value('company')],
 [$('#country')?.previousElementSibling?.textContent||'Country',value('country')],
 [tr('emailLabel'),value('contact')],
 [$('#product')?.previousElementSibling?.textContent||'Product',value('product')],
 [$('#message')?.previousElementSibling?.textContent||'Message',value('message')]
 ]}
function renderSummary(){const box=$('#confirmSummary');if(!box)return;box.innerHTML='';summaryRows().forEach(([label,val])=>{const row=document.createElement('div');row.className='confirm-row';const a=document.createElement('strong');a.textContent=label;const b=document.createElement('span');b.textContent=val;row.append(a,b);box.appendChild(row)})}
function showConfirm(){const form=$('#contactForm'),confirm=$('#inquiryConfirm'),complete=$('#inquiryComplete');if(!form||!confirm)return;renderSummary();form.hidden=true;if(complete)complete.hidden=true;confirm.hidden=false;confirm.querySelector('h2').textContent=tr('confirm');$('#directSendNotice').textContent=tr('notice');confirm.scrollIntoView({behavior:'smooth',block:'start'})}
function showForm(){const form=$('#contactForm'),confirm=$('#inquiryConfirm');if(confirm)confirm.hidden=true;if(form){form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'})}}
function workerPayload(){return{
 type:'inquiry',name:value('name'),company:value('company'),country:value('country'),email:value('contact'),product:value('product'),message:value('message'),lang:lang(),website:''
 }}
function formSubmitPayload(){return{
 name:value('name'),company:value('company'),country:value('country'),email:value('contact'),product:value('product'),message:value('message'),
 _subject:`Kale’s FDE Inquiry — ${value('product')||'Inquiry'}`,_template:'table',_replyto:value('contact'),_honey:''
 }}
async function postJson(endpoint,payload){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok||data.ok===false||data.success===false)throw new Error(data.error||data.message||`HTTP ${res.status}`);return data}
async function send(){const btn=$('#confirmSend'),confirm=$('#inquiryConfirm'),complete=$('#inquiryComplete'),form=$('#contactForm');if(!btn||!confirm||!complete||!form)return;btn.disabled=true;const original=btn.textContent;btn.textContent=tr('sending');try{if(WORKER_ENDPOINT){await postJson(WORKER_ENDPOINT,workerPayload())}else{await postJson(FORM_SUBMIT_ENDPOINT,formSubmitPayload())}confirm.hidden=true;complete.hidden=false;complete.scrollIntoView({behavior:'smooth',block:'start'});form.reset()}catch(e){console.warn('Contact submission failed',e);alert(tr('failed'))}finally{btn.disabled=false;btn.textContent=original}}
function refreshCopy(){const intro=document.querySelector('.form-wrap .section-head .section-copy');if(intro)intro.textContent=tr('intro');const notice=$('#formNotice');if(notice)notice.textContent=tr('notice');const direct=$('#directSendNotice');if(direct)direct.textContent=tr('notice');const emailLabel=$('#contact')?.previousElementSibling;if(emailLabel)emailLabel.textContent=tr('emailLabel');validateEmail()}
document.addEventListener('submit',e=>{if(e.target?.id!=='contactForm')return;e.preventDefault();e.stopImmediatePropagation();if(validate(e.target))showConfirm()},true);
// Use bubble phase here so Turnstile's capture-phase gate can block submission first.
document.addEventListener('click',e=>{if(e.target.closest('#confirmSend')){e.preventDefault();send();return}if(e.target.closest('#confirmBack')){e.preventDefault();showForm()}},false);
document.addEventListener('DOMContentLoaded',()=>{refreshCopy();const email=$('#contact');email?.addEventListener('input',()=>{email.setCustomValidity('');if(email.value.trim())validateEmail()});email?.addEventListener('blur',validateEmail);$('#lang')?.addEventListener('change',()=>setTimeout(refreshCopy,0))});
})();
