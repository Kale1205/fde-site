(()=>{
const SITE_KEY=String(window.FDE_TURNSTILE_SITE_KEY||'').trim();
const WORKER_ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
if(!SITE_KEY)return;

const COPY={
 ja:{title:'セキュリティ確認',waiting:'送信前にセキュリティ確認を完了してください。',verified:'セキュリティ確認が完了しました。',expired:'確認の有効期限が切れました。もう一度確認してください。',error:'セキュリティ確認に失敗しました。再度お試しください。'},
 en:{title:'Security check',waiting:'Complete the security check before sending.',verified:'Security check completed.',expired:'The security check expired. Please complete it again.',error:'The security check failed. Please try again.'},
 'zh-CN':{title:'安全验证',waiting:'发送前请完成安全验证。',verified:'安全验证已完成。',expired:'安全验证已过期，请重新验证。',error:'安全验证失败，请重试。'},
 'zh-TW':{title:'安全驗證',waiting:'送出前請完成安全驗證。',verified:'安全驗證已完成。',expired:'安全驗證已過期，請重新驗證。',error:'安全驗證失敗，請再試一次。'},
 ko:{title:'보안 확인',waiting:'전송 전에 보안 확인을 완료해 주세요.',verified:'보안 확인이 완료되었습니다.',expired:'보안 확인이 만료되었습니다. 다시 확인해 주세요.',error:'보안 확인에 실패했습니다. 다시 시도해 주세요.'},
 id:{title:'Pemeriksaan keamanan',waiting:'Selesaikan pemeriksaan keamanan sebelum mengirim.',verified:'Pemeriksaan keamanan selesai.',expired:'Pemeriksaan keamanan telah kedaluwarsa. Silakan ulangi.',error:'Pemeriksaan keamanan gagal. Silakan coba lagi.'},
 ms:{title:'Pemeriksaan keselamatan',waiting:'Lengkapkan pemeriksaan keselamatan sebelum menghantar.',verified:'Pemeriksaan keselamatan selesai.',expired:'Pemeriksaan keselamatan telah tamat tempoh. Sila ulangi.',error:'Pemeriksaan keselamatan gagal. Sila cuba lagi.'},
 vi:{title:'Kiểm tra bảo mật',waiting:'Hãy hoàn tất kiểm tra bảo mật trước khi gửi.',verified:'Đã hoàn tất kiểm tra bảo mật.',expired:'Kiểm tra bảo mật đã hết hạn. Vui lòng thực hiện lại.',error:'Kiểm tra bảo mật không thành công. Vui lòng thử lại.'},
 th:{title:'การตรวจสอบความปลอดภัย',waiting:'โปรดตรวจสอบความปลอดภัยให้เสร็จก่อนส่ง',verified:'ตรวจสอบความปลอดภัยเรียบร้อยแล้ว',expired:'การตรวจสอบหมดอายุ โปรดตรวจสอบอีกครั้ง',error:'การตรวจสอบความปลอดภัยล้มเหลว โปรดลองอีกครั้ง'},
 hi:{title:'सुरक्षा जाँच',waiting:'भेजने से पहले सुरक्षा जाँच पूरी करें।',verified:'सुरक्षा जाँच पूरी हो गई है।',expired:'सुरक्षा जाँच की समय-सीमा समाप्त हो गई। कृपया दोबारा जाँच करें।',error:'सुरक्षा जाँच विफल रही। कृपया फिर प्रयास करें।'},
 ar:{title:'فحص الأمان',waiting:'أكمل فحص الأمان قبل الإرسال.',verified:'اكتمل فحص الأمان.',expired:'انتهت صلاحية فحص الأمان. يرجى إجراؤه مرة أخرى.',error:'فشل فحص الأمان. يرجى المحاولة مرة أخرى.'}
};
const states={
 contact:{action:'contact',section:'#inquiryConfirm',button:'#confirmSend',back:'#confirmBack',token:'',widgetId:null,panel:null,status:null},
 order:{action:'order',section:'#orderConfirm',button:'#orderSend',back:'#orderBack',token:'',widgetId:null,panel:null,status:null}
};
const lang=()=>document.querySelector('#lang')?.value||document.documentElement.lang||'en';
const copy=()=>COPY[lang()]||COPY.en;

function injectStyle(){if(document.getElementById('fdeTurnstileStyle'))return;const style=document.createElement('style');style.id='fdeTurnstileStyle';style.textContent='.fde-turnstile-panel{margin:18px 0;padding:16px;border:1px solid #c9d8ce;background:#f6faf7}.fde-turnstile-title{margin:0 0 10px;color:#173126;font-size:13px;font-weight:800}.fde-turnstile-widget{min-height:65px}.fde-turnstile-status{margin:9px 0 0;color:#68756f;font-size:12px;line-height:1.55}.fde-turnstile-status.ok{color:#0e7a4b;font-weight:700}.fde-turnstile-status.error{color:#a33a3a;font-weight:700}';document.head.appendChild(style)}
function ensurePanel(state){if(state.panel?.isConnected)return state.panel;const section=document.querySelector(state.section);if(!section)return null;const actions=section.querySelector('.form-actions,.order-actions');const panel=document.createElement('div');panel.className='fde-turnstile-panel';panel.innerHTML='<p class="fde-turnstile-title"></p><div class="fde-turnstile-widget"></div><p class="fde-turnstile-status" aria-live="polite"></p>';if(actions)section.insertBefore(panel,actions);else section.appendChild(panel);state.panel=panel;state.status=panel.querySelector('.fde-turnstile-status');refreshPanelCopy(state);return panel}
function refreshPanelCopy(state){if(!state.panel)return;state.panel.querySelector('.fde-turnstile-title').textContent=copy().title;if(!state.token&&state.status&&!state.status.classList.contains('error')){state.status.textContent=copy().waiting;state.status.className='fde-turnstile-status'}}
function setStatus(state,key,kind=''){if(!state.status)ensurePanel(state);if(!state.status)return;state.status.textContent=copy()[key]||copy().waiting;state.status.className=`fde-turnstile-status ${kind}`.trim()}
function loadApi(){if(window.turnstile)return Promise.resolve(window.turnstile);if(window.__FDE_TURNSTILE_PROMISE__)return window.__FDE_TURNSTILE_PROMISE__;window.__FDE_TURNSTILE_PROMISE__=new Promise((resolve,reject)=>{let script=document.getElementById('fdeTurnstileApi');if(!script){script=document.createElement('script');script.id='fdeTurnstileApi';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.defer=true;document.head.appendChild(script)}const started=Date.now();const poll=()=>{if(window.turnstile)return resolve(window.turnstile);if(Date.now()-started>12000)return reject(new Error('TURNSTILE_API_TIMEOUT'));setTimeout(poll,80)};poll()});return window.__FDE_TURNSTILE_PROMISE__}
async function renderState(state){const section=document.querySelector(state.section);if(!section||section.hidden)return;const panel=ensurePanel(state);if(!panel)return;refreshPanelCopy(state);try{const api=await loadApi();if(state.widgetId!==null)return;const target=panel.querySelector('.fde-turnstile-widget');state.widgetId=api.render(target,{sitekey:SITE_KEY,action:state.action,theme:'light',size:'flexible',language:lang(),callback(token){state.token=String(token||'');setStatus(state,'verified','ok')},'expired-callback'(){state.token='';setStatus(state,'expired','error')},'error-callback'(){state.token='';setStatus(state,'error','error')},'timeout-callback'(){state.token='';setStatus(state,'error','error')}})}catch(error){console.warn('Turnstile render failed',error);setStatus(state,'error','error')}}
function resetState(state){state.token='';if(window.turnstile&&state.widgetId!==null){try{window.turnstile.reset(state.widgetId)}catch{}}setStatus(state,'waiting')}
function removeAndRerender(state){state.token='';if(window.turnstile&&state.widgetId!==null){try{window.turnstile.remove(state.widgetId)}catch{}}state.widgetId=null;const target=state.panel?.querySelector('.fde-turnstile-widget');if(target)target.innerHTML='';renderState(state)}
function stateForType(type){return type==='inquiry'?states.contact:type==='order'?states.order:null}

const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){let nextInit=init;try{const url=typeof input==='string'?input:input?.url||'';const method=String(init?.method||((input&&typeof input!=='string')?input.method:'GET')||'GET').toUpperCase();if(WORKER_ENDPOINT&&url===WORKER_ENDPOINT&&method==='POST'&&typeof init?.body==='string'){const body=JSON.parse(init.body);const state=stateForType(body?.type);if(state){body.turnstileToken=state.token;body.turnstileAction=state.action;nextInit={...init,body:JSON.stringify(body)};const response=await nativeFetch(input,nextInit);resetState(state);return response}}}catch(error){console.warn('Turnstile request decoration failed',error)}return nativeFetch(input,nextInit)};

function bindState(state){const section=document.querySelector(state.section);if(!section)return;ensurePanel(state);new MutationObserver(()=>{if(!section.hidden)renderState(state)}).observe(section,{attributes:true,attributeFilter:['hidden']});if(!section.hidden)renderState(state)}

document.addEventListener('click',event=>{for(const state of Object.values(states)){if(event.target.closest(state.back)){resetState(state);continue}if(event.target.closest(state.button)&&!state.token){event.preventDefault();event.stopImmediatePropagation();ensurePanel(state);setStatus(state,'waiting','error');renderState(state);state.panel?.scrollIntoView({behavior:'smooth',block:'center'});return}}},true);
document.addEventListener('DOMContentLoaded',()=>{injectStyle();Object.values(states).forEach(bindState);document.querySelector('#lang')?.addEventListener('change',()=>setTimeout(()=>Object.values(states).forEach(state=>{refreshPanelCopy(state);if(!document.querySelector(state.section)?.hidden)removeAndRerender(state)}),0))});
window.FDETurnstile={enabled:true,getToken(action){const state=Object.values(states).find(x=>x.action===action);return state?.token||''},reset(action){const state=Object.values(states).find(x=>x.action===action);if(state)resetState(state)}};
})();
