(()=>{
const RECIPIENT='reyouinjune@gmail.com';
const notices={
 ja:'Gmailを選択するとGmailの作成画面が開きます。Gmail以外を選択すると、MacのメールやOutlookなど端末の既定メールアプリに宛先・件名・本文を入力した状態で開きます。',
 en:'Choose Gmail to open Gmail compose. Choose a non-Gmail mailer to open your device’s default mail app with the recipient, subject and message pre-filled.'
};
if(window.FDE_I18N){Object.keys(window.FDE_I18N).forEach(k=>{window.FDE_I18N[k].formNotice=notices[k]||notices.en;window.FDE_I18N[k].directSendNotice=notices[k]||notices.en})}
const q=(s,c=document)=>c.querySelector(s);
function bodyText(form){const value=id=>q('#'+id,form)?.value.trim()||'';const label=id=>q('#'+id,form)?.previousElementSibling?.textContent?.trim()||id;return `${label('name')}: ${value('name')}\n${label('company')}: ${value('company')}\n${label('country')}: ${value('country')}\n${label('contact')}: ${value('contact')}\n${label('product')}: ${value('product')}\n\n${label('message')}:\n${value('message')}`}
function updateNotice(){const el=q('#formNotice');if(!el)return;const l=document.documentElement.lang||'ja';el.textContent=notices[l]||notices.en}
document.addEventListener('submit',e=>{const form=e.target;if(!(form instanceof HTMLFormElement)||form.id!=='contactForm')return;e.preventDefault();e.stopImmediatePropagation();if(!form.checkValidity()){form.reportValidity();return}const product=q('#product',form)?.value||'Inquiry';const subject=`Kale’s FDE Inquiry — ${product}`;const body=bodyText(form);const mailer=q('#mailer',form)?.value;if(mailer==='gmail'){window.location.assign(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(RECIPIENT)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);return}window.location.href=`mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`},true);
document.addEventListener('DOMContentLoaded',()=>{updateNotice();q('#lang')?.addEventListener('change',()=>setTimeout(updateNotice,0))});
})();