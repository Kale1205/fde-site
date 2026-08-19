(()=>{
const LANGS=['en','ja','zh-CN','zh-TW','ko','id','ms','vi','th','hi','ar'];
const LOCAL={en:'USD',ja:'JPY','zh-CN':'CNY','zh-TW':'TWD',ko:'KRW',id:'IDR',ms:'MYR',vi:'VND',th:'THB',hi:'INR',ar:'AED'};
const LOCALE={en:'en-US',ja:'ja-JP','zh-CN':'zh-CN','zh-TW':'zh-TW',ko:'ko-KR',id:'id-ID',ms:'ms-MY',vi:'vi-VN',th:'th-TH',hi:'hi-IN',ar:'ar-AE'};
const RATE={JPY:1,USD:.00627731,CNY:.0423289,TWD:.201015,KRW:8.82247,IDR:111.918,MYR:.0256305,VND:164.052,THB:.206395,INR:.594424,AED:.0230533};
function lang(){const v=localStorage.getItem('fde-lang')||document.querySelector('#lang')?.value||'en';return LANGS.includes(v)?v:'en'}
function currency(l){return LOCAL[l]||'USD'}
function fmt(jpy,c,l){return new Intl.NumberFormat(LOCALE[l]||'en-US',{style:'currency',currency:c,maximumFractionDigits:0}).format(Math.round(jpy*(RATE[c]||1)))}
function stripAmount(text,amount){const n=amount.toLocaleString('en-US');const patterns=[new RegExp(`JPY\\s*${n}(?:円|日元|日圓)?`,'g'),new RegExp(`${n}(?:円|日元|日圓)`,'g'),new RegExp(`¥\\s*${n}`,'g')];let out=text;patterns.forEach(r=>out=out.replace(r,`__FDE_${amount}__`));return out}
function localizeText(text,l,c){let out=text;[49800,4900,9800].forEach(a=>out=stripAmount(out,a));[49800,4900,9800].forEach(a=>out=out.replace(new RegExp(`__FDE_${a}__`,'g'),fmt(a,c,l)));return out}
function apply(){const l=lang(),c=currency(l),root=document.querySelector('main');if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{const t=n.nodeValue;if(!t)return;if(/(?:JPY\s*)?(?:49,800|4,900|9,800)(?:円|日元|日圓)?|¥\s*(?:49,800|4,900|9,800)/.test(t)){n.nodeValue=localizeText(t,l,c)}})}
function schedule(){setTimeout(apply,60)}
function init(){schedule();document.querySelector('#lang')?.addEventListener('change',schedule);window.addEventListener('pageshow',schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();