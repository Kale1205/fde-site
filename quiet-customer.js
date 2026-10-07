// W08 input review only. No order lookup, payments, network or persistence.
export function validatePortalInput(order,email){
  const normalized={order:order.trim().toUpperCase(),email:email.trim()};
  return {...normalized,orderValid:/^BK-\d{8}-[A-F0-9]{8}$/.test(normalized.order),emailValid:normalized.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)};
}

export function initPortal(document){
  const form=document.getElementById('portal-form');if(!form)return;
  const order=document.getElementById('portal-order'),email=document.getElementById('portal-email'),review=document.getElementById('portal-review'),announcement=document.getElementById('portal-announcement');
  const fields=[order,email];
  const setError=(field,invalid)=>{
    field.setAttribute('aria-invalid',String(invalid));
    document.getElementById(field.id+'-error').hidden=!invalid;
    const hints=[field===order?'portal-order-hint':'',invalid?field.id+'-error':''].filter(Boolean).join(' ');
    if(hints)field.setAttribute('aria-describedby',hints);else field.removeAttribute('aria-describedby');
  };
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const value=validatePortalInput(order.value,email.value);
    const invalid=[!value.orderValid,!value.emailValid||!email.validity.valid];
    fields.forEach((field,i)=>setError(field,invalid[i]));
    const first=fields.find((_,i)=>invalid[i]);
    if(first){announcement.textContent=fields.filter((_,i)=>invalid[i]).map(field=>document.getElementById(field.id+'-error').textContent).join(' ');first.focus();return;}
    order.value=value.order;email.value=value.email;
    document.getElementById('portal-review-order').textContent=value.order;
    document.getElementById('portal-review-email').textContent=value.email;
    form.hidden=true;review.hidden=false;
    announcement.textContent=document.getElementById('portal-review-title').textContent;
    review.focus();
  });
  fields.forEach(field=>field.addEventListener('input',()=>{setError(field,false);announcement.textContent='';}));
  document.getElementById('portal-edit').addEventListener('click',()=>{review.hidden=true;form.hidden=false;announcement.textContent='';order.focus();});
}
if(typeof document!=='undefined')initPortal(document);
