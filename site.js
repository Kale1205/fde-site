(()=>{
const qs=(s,c=document)=>c.querySelector(s);const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
function openDemo(){const href='demo.html';const w=window.open(href,'KalesFDE_IMS_Demo');if(w)w.focus();else location.href=href}
function addDemoDemandCallout(){
 if(!document.body.classList.contains('demo-app')||qs('[data-web-demo-demand]'))return;
 const intro=qs('.demo-intro');if(!intro)return;
 const lang=document.documentElement.lang;
 const text={
  ja:{title:'WEB DEMO / 各OSのブラウザ向けプレビュー',description:'このWeb Demoは、macOS・Windows・Linux・iPhone/iPad・Androidのモダンブラウザ向け操作プレビューです。ネイティブ版の初回提供範囲は、上記の説明をご確認ください。',demand:'希望するネイティブ対応を教えてください: ',note:'Web Demoの利用可否は、各OS向けネイティブアプリの対応・正式リリース・セキュリティ検証完了を意味しません。',other:'その他 / わからない'},
  en:{title:'WEB DEMO / A PREVIEW FOR MAJOR BROWSER PLATFORMS',description:'This Web Demo is an operating preview for modern browsers on macOS, Windows, Linux, iPhone/iPad, and Android. See the description above for the initial native release scope.',demand:'Tell us which native platform you need: ',note:'Web Demo availability does not mean the corresponding native app is supported, released, or security-validated.',other:'Other / Not sure'},
  'zh-CN':{title:'WEB DEMO / 各平台浏览器操作预览',description:'本 Web Demo 是面向 macOS、Windows、Linux、iPhone/iPad 和 Android 现代浏览器的操作预览。原生应用首个版本的范围请参阅上方说明。',demand:'请告诉我们您希望支持的原生平台：',note:'能够使用 Web Demo，并不代表相应平台的原生应用已获得支持、正式发布或通过安全验证。',other:'其他 / 不确定'},
 }[lang]||{title:'WEB DEMO',description:'See the description above for the initial native release scope.',demand:'Tell us which native platform you need: ',note:'This preview does not establish native release or security validation.',other:'Other / Not sure'};
 const wrap=document.createElement('div');wrap.className='ims-pre';wrap.dataset.webDemoDemand='1';
 const strong=document.createElement('strong');strong.textContent=text.title;
 const p=document.createElement('p');p.textContent=text.description;
 const demand=document.createElement('p');demand.className='demo-note';demand.append(document.createTextNode(text.demand));
 const options=[['Windows','Windows'],['Mac M1','M1'],['Mac M2 or later','M2-or-later'],['iPhone / iPad','iOS-iPadOS'],['Android','Android'],['Linux','Linux'],[text.other,'Other-Not-sure']];
 options.forEach(([label,value],index)=>{const a=document.createElement('a');a.href=`contact.html?source=web-demo&platform=${encodeURIComponent(value)}#contactForm`;a.textContent=label;a.rel='nofollow';demand.append(a);if(index<options.length-1)demand.append(document.createTextNode(' · '))});
 const note=document.createElement('small');note.className='demo-note';note.textContent=text.note;
 wrap.append(strong,p,demand,note);(qs('[data-demo-notes]')||intro).appendChild(wrap);
}
function init(){
 const mt=qs('.mobile-toggle'),nav=qs('.main-nav'),header=qs('.site-header');if(mt&&nav&&header){mt.addEventListener('click',e=>{e.stopPropagation();nav.classList.toggle('open');mt.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!header.contains(e.target)){nav.classList.remove('open');mt.setAttribute('aria-expanded','false')}})}
 qsa('[data-demo-open]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openDemo()}));
 const close=qs('#closeDemo');if(close)close.addEventListener('click',()=>{if(window.opener&&!window.opener.closed){window.opener.focus();window.close()}else location.href='index.html#demo'});
 qsa('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.faq-item')?.classList.toggle('open')));
 const faqSearch=qs('#faqSearch');if(faqSearch)faqSearch.addEventListener('input',()=>{const v=faqSearch.value.trim().toLowerCase();let shown=0;qsa('.faq-item').forEach(item=>{const hit=!v||item.textContent.toLowerCase().includes(v);item.style.display=hit?'':'none';if(hit)shown++});const empty=qs('#faqEmpty');if(empty)empty.style.display=shown?'none':'block'});
 addDemoDemandCallout();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
