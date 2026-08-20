(()=>{
if(window.__FDE_TURNSTILE_RUNTIME__)return;
window.__FDE_TURNSTILE_RUNTIME__=true;

const SITE_KEY=String(window.FDE_TURNSTILE_SITE_KEY||'').trim();
const WORKER_ENDPOINT=String(window.FDE_CONTACT_API||'').trim();
if(!SITE_KEY||!WORKER_ENDPOINT)return;

const COPY={
  en:{title:'Security check',waiting:'Complete the security check before sending.',verified:'Security check completed.',expired:'The security check expired. Please complete it again.',error:'The security check failed. Please try again.'},
  ja:{title:'セキュリティ確認',waiting:'送信前にセキュリティ確認を完了してください。',verified:'セキュリティ確認が完了しました。',expired:'確認の有効期限が切れました。もう一度確認してください。',error:'セキュリティ確認に失敗しました。再度お試しください。'}
};
const states={
  contact:{action:'contact',section:'#inquiryConfirm',button:'#confirmSend',back:'#confirmBack',trigger:'#contactForm',token:'',widgetId:null,panel:null,status:null},
  order:{action:'order',section:'#orderConfirm',button:'#orderSend',back:'#orderBack',trigger:'#orderForm',token:'',widgetId:null,panel:null,status:null}
};
const lang=()=>document.documentElement.lang==='ja'?'ja':'en';
const copy=()=>COPY[lang()];

function injectStyle(){
  if(document.getElementById('fdeTurnstileStyle'))return;
  const style=document.createElement('style');
  style.id='fdeTurnstileStyle';
  style.textContent='.fde-turnstile-panel{margin:18px 0;padding:16px;border:1px solid #c9d8ce;background:#f6faf7}.fde-turnstile-title{margin:0 0 10px;color:#173126;font-size:13px;font-weight:800}.fde-turnstile-widget{min-height:65px;max-width:100%;overflow:hidden}.fde-turnstile-status{margin:9px 0 0;color:#68756f;font-size:12px;line-height:1.55}.fde-turnstile-status.ok{color:#0e7a4b;font-weight:700}.fde-turnstile-status.error{color:#a33a3a;font-weight:700}';
  document.head.appendChild(style);
}
function refreshPanelCopy(state){
  if(!state.panel)return;
  const title=state.panel.querySelector('.fde-turnstile-title');
  if(title)title.textContent=copy().title;
  if(!state.token&&state.status&&!state.status.classList.contains('error')){
    state.status.textContent=copy().waiting;
    state.status.className='fde-turnstile-status';
  }
}
function ensurePanel(state){
  if(state.panel?.isConnected)return state.panel;
  const section=document.querySelector(state.section);if(!section)return null;
  const actions=section.querySelector('.form-actions,.order-actions');
  const panel=document.createElement('div');panel.className='fde-turnstile-panel';
  panel.innerHTML='<p class="fde-turnstile-title"></p><div class="fde-turnstile-widget"></div><p class="fde-turnstile-status" aria-live="polite"></p>';
  if(actions)section.insertBefore(panel,actions);else section.appendChild(panel);
  state.panel=panel;state.status=panel.querySelector('.fde-turnstile-status');refreshPanelCopy(state);return panel;
}
function setStatus(state,key,kind=''){
  if(!state.status)ensurePanel(state);if(!state.status)return;
  state.status.textContent=copy()[key]||copy().waiting;
  state.status.className=`fde-turnstile-status ${kind}`.trim();
}
function loadApi(){
  if(window.turnstile)return Promise.resolve(window.turnstile);
  if(window.__FDE_TURNSTILE_PROMISE__)return window.__FDE_TURNSTILE_PROMISE__;
  window.__FDE_TURNSTILE_PROMISE__=new Promise((resolve,reject)=>{
    let script=document.getElementById('fdeTurnstileApi');let timer=0;
    const finish=()=>{clearTimeout(timer);if(window.turnstile)resolve(window.turnstile);else reject(new Error('TURNSTILE_API_UNAVAILABLE'))};
    if(!script){
      script=document.createElement('script');script.id='fdeTurnstileApi';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.defer=true;script.onload=finish;script.onerror=()=>{clearTimeout(timer);reject(new Error('TURNSTILE_API_LOAD_FAILED'))};document.head.appendChild(script);
    }else script.addEventListener('load',finish,{once:true});
    timer=setTimeout(()=>reject(new Error('TURNSTILE_API_TIMEOUT')),12000);
  });
  return window.__FDE_TURNSTILE_PROMISE__;
}
async function renderState(state){
  const section=document.querySelector(state.section);if(!section||section.hidden||state.widgetId!==null)return;
  const panel=ensurePanel(state);if(!panel)return;refreshPanelCopy(state);
  try{
    const api=await loadApi();if(state.widgetId!==null||section.hidden)return;
    const target=panel.querySelector('.fde-turnstile-widget');
    state.widgetId=api.render(target,{sitekey:SITE_KEY,action:state.action,theme:'light',size:'normal',language:lang(),appearance:'always',execution:'render',retry:'auto','retry-interval':8000,'refresh-expired':'auto',callback(token){state.token=String(token||'');setStatus(state,'verified','ok')},'expired-callback'(){state.token='';setStatus(state,'expired','error')},'error-callback'(){state.token='';setStatus(state,'error','error')},'unsupported-callback'(){state.token='';setStatus(state,'error','error')}});
  }catch(error){console.warn('Turnstile render failed',error);setStatus(state,'error','error')}
}
function resetState(state){
  state.token='';
  if(window.turnstile&&state.widgetId!==null){try{window.turnstile.reset(state.widgetId)}catch{}}
  setStatus(state,'waiting');
}
function stateForType(type){return type==='inquiry'?states.contact:type==='order'?states.order:null}

const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  let nextInit=init;
  try{
    const url=typeof input==='string'?input:input?.url||'';
    const method=String(init?.method||((input&&typeof input!=='string')?input.method:'GET')||'GET').toUpperCase();
    if(url===WORKER_ENDPOINT&&method==='POST'&&typeof init?.body==='string'){
      const body=JSON.parse(init.body);const state=stateForType(body?.type);
      if(state){
        body.turnstileToken=state.token;body.turnstileAction=state.action;
        nextInit={...init,body:JSON.stringify(body)};
        const response=await nativeFetch(input,nextInit);resetState(state);return response;
      }
    }
  }catch(error){console.warn('Turnstile request decoration failed',error)}
  return nativeFetch(input,nextInit);
};
function scheduleRender(state){setTimeout(()=>requestAnimationFrame(()=>renderState(state)),60)}

document.addEventListener('click',event=>{
  for(const state of Object.values(states)){
    if(event.target.closest(state.back)){resetState(state);continue}
    if(event.target.closest(state.button)&&!state.token){
      event.preventDefault();event.stopImmediatePropagation();ensurePanel(state);setStatus(state,'waiting','error');renderState(state);state.panel?.scrollIntoView({block:'center'});return;
    }
  }
},true);

document.addEventListener('DOMContentLoaded',()=>{
  injectStyle();loadApi().catch(error=>console.warn('Turnstile preload failed',error));
  Object.values(states).forEach(state=>{
    const trigger=document.querySelector(state.trigger);if(trigger)trigger.addEventListener('submit',()=>scheduleRender(state));
    const section=document.querySelector(state.section);if(section&&!section.hidden)scheduleRender(state);
  });
});

window.FDETurnstile={enabled:true,getToken(action){const state=Object.values(states).find(x=>x.action===action);return state?.token||''},reset(action){const state=Object.values(states).find(x=>x.action===action);if(state)resetState(state)}};
})();
