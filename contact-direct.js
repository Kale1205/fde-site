(()=>{
const WORKER_ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
const RUNTIME_ENV=String(window.FDE_RUNTIME_ENV||'production').trim();
const IS_STAGING=RUNTIME_ENV==='staging';
const CURRENT_SCRIPT=document.currentScript;
const CURRENT_SCRIPT_URL=CURRENT_SCRIPT?.src?new URL(CURRENT_SCRIPT.src,location.href):null;
const BUILD_KEY=CURRENT_SCRIPT_URL?.searchParams.get('v')||'';
const TURNSTILE_RUNTIME_URL=CURRENT_SCRIPT_URL?new URL(`turnstile-protection.js${BUILD_KEY?`?v=${encodeURIComponent(BUILD_KEY)}`:''}`,CURRENT_SCRIPT_URL).href:'';
let turnstileRuntimePromise=null;
const $=(s,c=document)=>c.querySelector(s);
const labels={ja:{intro:'すべて必須項目です。入力内容を確認してから、サイト上で送信できます。',notice:'入力後に内容確認画面が表示されます。確認後、このサイトから直接送信されます。',sending:'送信中…',failed:'送信に失敗しました。時間をおいてもう一度お試しください。',confirm:'この内容で送信しますか？',emailLabel:'メールアドレス',invalidEmail:'有効なメールアドレスを入力してください。例: name@example.com',notConfigured:'送信先が設定されていません。現在このフォームからは送信できません。',stagingMismatch:'STAGINGの安全確認に失敗しました。送信完了として扱いません。'},en:{intro:'All fields are required. Review your inquiry before sending it directly from this website.',notice:'After entering your details, you can review them before the inquiry is sent directly from this website.',sending:'Sending…',failed:'The message could not be sent. Please try again later.',confirm:'Send this inquiry?',emailLabel:'Email address',invalidEmail:'Enter a valid email address, for example name@example.com.',notConfigured:'The submission endpoint is not configured. This form cannot send at the moment.',stagingMismatch:'The staging safety check failed. This submission will not be treated as complete.'}};
const lang=()=>document.documentElement.lang==='ja'?'ja':'en';
const tr=k=>(labels[lang()]||labels.en)[k]||labels.en[k];
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function value(id){return $('#'+id)?.value.trim()||''}
function validateEmail(){const input=$('#contact');if(!input)return true;const ok=emailPattern.test(input.value.trim());input.setCustomValidity(ok?'':tr('invalidEmail'));return ok}
function validate(form){validateEmail();if(form.checkValidity())return true;form.reportValidity();return false}
function summaryRows(){return [[$('#name')?.previousElementSibling?.textContent||'Name',value('name')],[$('#company')?.previousElementSibling?.textContent||'Company',value('company')],[$('#country')?.previousElementSibling?.textContent||'Country',value('country')],[tr('emailLabel'),value('contact')],[$('#product')?.previousElementSibling?.textContent||'Product',value('product')],[$('#message')?.previousElementSibling?.textContent||'Message',value('message')]]}
function renderSummary(){const box=$('#confirmSummary');if(!box)return;box.innerHTML='';summaryRows().forEach(([label,val])=>{const row=document.createElement('div');row.className='confirm-row';const a=document.createElement('strong');a.textContent=label;const b=document.createElement('span');b.textContent=val;row.append(a,b);box.appendChild(row)})}
function ensureTurnstileRuntime(){
  if(window.FDETurnstile?.enabled)return Promise.resolve(window.FDETurnstile);
  if(turnstileRuntimePromise)return turnstileRuntimePromise;
  if(!TURNSTILE_RUNTIME_URL)return Promise.reject(new Error('TURNSTILE_RUNTIME_URL_MISSING'));
  turnstileRuntimePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    let settled=false;
    const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);window.FDETurnstile?.enabled?resolve(window.FDETurnstile):reject(new Error('TURNSTILE_RUNTIME_UNAVAILABLE'))};
    script.src=TURNSTILE_RUNTIME_URL;
    script.async=false;
    script.dataset.fdeTurnstileFallback='1';
    script.onload=finish;
    script.onerror=()=>{if(settled)return;settled=true;clearTimeout(timer);reject(new Error('TURNSTILE_RUNTIME_LOAD_FAILED'))};
    const timer=setTimeout(()=>{if(settled)return;settled=true;reject(new Error('TURNSTILE_RUNTIME_TIMEOUT'))},12000);
    document.head.appendChild(script);
  }).catch(error=>{turnstileRuntimePromise=null;throw error});
  return turnstileRuntimePromise;
}
function showConfirm(){const form=$('#contactForm'),confirm=$('#inquiryConfirm'),complete=$('#inquiryComplete');if(!form||!confirm)return;renderSummary();form.hidden=true;if(complete)complete.hidden=true;confirm.hidden=false;confirm.querySelector('h2').textContent=tr('confirm');$('#directSendNotice').textContent=tr('notice');ensureTurnstileRuntime().catch(error=>console.warn('Turnstile preload failed',error));confirm.scrollIntoView({behavior:'smooth',block:'start'})}
function showForm(){const form=$('#contactForm'),confirm=$('#inquiryConfirm');if(confirm)confirm.hidden=true;if(form){form.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'})}}
function workerPayload(){return{type:'inquiry',name:value('name'),company:value('company'),country:value('country'),email:value('contact'),product:value('product'),message:value('message'),lang:lang(),website:''}}
function assertEndpoint(){if(!WORKER_ENDPOINT)throw new Error('CONTACT_ENDPOINT_NOT_CONFIGURED');if(IS_STAGING&&!WORKER_ENDPOINT.includes('kales-fde-contact-staging.'))throw new Error('STAGING_ENDPOINT_MISMATCH');if(!IS_STAGING&&WORKER_ENDPOINT.includes('kales-fde-contact-staging.'))throw new Error('PRODUCTION_ENDPOINT_MISMATCH')}
function assertResponse(data){if(!IS_STAGING)return;if(data?.staging!==true||data?.dryRun!==true||data?.mailSent!==false)throw new Error('STAGING_RESPONSE_MISMATCH')}
async function postJson(endpoint,payload){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok||data.ok===false||data.success===false)throw new Error(data.error||data.message||`HTTP ${res.status}`);assertResponse(data);return data}
async function send(){const btn=$('#confirmSend'),confirm=$('#inquiryConfirm'),complete=$('#inquiryComplete'),form=$('#contactForm');if(!btn||!confirm||!complete||!form)return;btn.disabled=true;const original=btn.textContent;btn.textContent=tr('sending');try{assertEndpoint();await ensureTurnstileRuntime();if(!window.FDETurnstile?.getToken?.('contact')){btn.disabled=false;btn.textContent=original;queueMicrotask(()=>btn.click());return}await postJson(WORKER_ENDPOINT,workerPayload());confirm.hidden=true;complete.hidden=false;if(IS_STAGING){const h=complete.querySelector('h2');const p=complete.querySelector('p');if(h)h.textContent='STAGING DRY RUN';if(p)p.textContent=lang()==='ja'?'STAGING専用KVへの保存を確認しました。メールは送信していません。':'Saved to the staging-only KV. No email was sent.'}complete.scrollIntoView({behavior:'smooth',block:'start'});form.reset()}catch(e){console.warn('Contact submission failed',e);const code=String(e?.message||'');const message=code==='CONTACT_ENDPOINT_NOT_CONFIGURED'?tr('notConfigured'):IS_STAGING?`${tr('stagingMismatch')} (${code||'UNKNOWN'})`:code==='PRODUCTION_ENDPOINT_MISMATCH'?tr('stagingMismatch'):tr('failed');alert(message)}finally{btn.disabled=false;btn.textContent=original}}
function refreshCopy(){const intro=document.querySelector('.form-wrap .section-head .section-copy');if(intro)intro.textContent=tr('intro');const notice=$('#formNotice');if(notice)notice.textContent=tr('notice');const direct=$('#directSendNotice');if(direct)direct.textContent=tr('notice');const emailLabel=$('#contact')?.previousElementSibling;if(emailLabel)emailLabel.textContent=tr('emailLabel');validateEmail()}
document.addEventListener('submit',e=>{if(e.target?.id!=='contactForm')return;e.preventDefault();e.stopImmediatePropagation();if(validate(e.target))showConfirm()},true);
document.addEventListener('click',e=>{if(e.target.closest('#confirmSend')){e.preventDefault();send();return}if(e.target.closest('#confirmBack')){e.preventDefault();showForm()}},false);
document.addEventListener('DOMContentLoaded',()=>{refreshCopy();const email=$('#contact');email?.addEventListener('input',()=>{email.setCustomValidity('');if(email.value.trim())validateEmail()});email?.addEventListener('blur',validateEmail)});
})();
