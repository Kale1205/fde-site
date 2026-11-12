import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

import {JPY_CAMPAIGN,USD_CAMPAIGN,priceBook,money,campaignCopy,approveUsdCopy} from '../price-policy.js';
export {campaignCopy,USD_CAMPAIGN};
export const campaign=JPY_CAMPAIGN;
const arrow='<svg class="hp-arrow" viewBox="0 0 92 80" preserveAspectRatio="none" aria-hidden="true"><path d="M80 4C100 44 76 73 12 68M12 68l10-8M12 68l12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const marker='<svg class="hp-swash" viewBox="0 0 280 30" preserveAspectRatio="none" aria-hidden="true"><path d="M3 13Q43 8 83 11T164 10T274 7L277 23Q230 24 186 25T102 24T5 28Z" fill="currentColor"/><path d="M7 10Q75 6 130 9T270 4L272 20Q204 21 157 20T10 24Z" fill="currentColor" opacity=".42"/></svg>';
const localeOf=file=>file.startsWith('ja/')?'ja':file.startsWith('zh/')?'zh':'en';
const amount=(number,unit='symbol')=>unit==='word'?number.toLocaleString('en-US')+'円':'¥'+number.toLocaleString('en-US');
export function campaignPrice(key,original,locale,{live=false}={}){
 const c=campaignCopy[locale],price=priceBook(locale)[key],unit=live?'word':'symbol';
 return `<!-- Campaign price ${key} -->\n<div class="handdrawn-price hp-combined" data-campaign-product="${key}"><div class="hp-annotation" aria-hidden="true"><span>${c.launch}</span><strong>${c.off}</strong>${arrow}</div><div class="hp-was"><span>${c.standard}</span><s${live?' data-campaign-standard-value':''}>${money(price.standard,locale,{word:live})}</s></div><div class="hp-current"><span class="hp-number">${marker}${original}</span><small>${c.tax}</small></div><span class="hp-duration">${c.duration}</span></div>\n<!-- End campaign price ${key} -->`;
}
function stripPrices(source){return source.replace(/<!-- Campaign price (license|plus) -->\n([\s\S]*?)\n<!-- End campaign price \1 -->/g,(block,key,body)=>body.match(/<strong (?:class="(?:plan-price|order-product-price)"|data-license-price)[^>]*>[\s\S]*?<\/strong>/)?.[0]||block);}
export function withCampaignPrices(file,source){
 if(!/^<!doctype html>/i.test(source))return source;
 const home=/^(?:(?:ja|zh)\/)?(?:index|quiet-form)\.html$/.test(file),order=/^(?:(?:ja|zh)\/)?order\.html$/.test(file),license=/^(?:(?:ja|zh)\/)?license\.html$/.test(file);
 if(!home&&!order&&!license)return source;
 const locale=localeOf(file),c=campaignCopy[locale],version=source.includes('campaign-prices.css?v=BUILD')?'BUILD':readFileSync(new URL('../build-version.txt',import.meta.url),'utf8').trim(),prefix=locale==='en'?'':'../';
 let html=stripPrices(approveUsdCopy(locale,source)).replace(/<!-- Campaign assets -->\n[\s\S]*?<!-- End campaign assets -->\n/g,'').replace(/<!-- Planned campaign terms -->\n[\s\S]*?<!-- End planned campaign terms -->\n/g,'');
 if(locale!=='ja'&&(home||order)){for(const [jpy,usd]of [['4,900','31'],['9,800','62']])for(const tag of ['strong','dd'])for(const unit of ['/mo','/月'])html=html.replaceAll(`<${tag}>¥${jpy}${unit}</${tag}>`,`<${tag}>$${usd}${unit}</${tag}>`);}
 if(home||order){
  for(const key of ['license','plus']){
   const formatted=money(priceBook(locale)[key].launch,locale),tag=home?`<strong class="plan-price">${formatted}</strong>`:`<strong class="order-product-price">${formatted}<small> ${priceBook(locale).currency}</small></strong>`;
   const previous=home?`<strong class="plan-price">${amount(campaign[key].launch)}</strong>`:`<strong class="order-product-price">${amount(campaign[key].launch)}<small> JPY</small></strong>`;
   if(locale!=='ja')html=html.replace(previous,tag);
   if(!html.includes(tag))throw Error(`Missing approved campaign price: ${file}/${key}`);
   html=html.replace(tag,campaignPrice(key,tag,locale));
  }
 }else{
  const current=html.match(/<strong data-license-price>[^<]+<\/strong>/)?.[0];
  if(!current||!(locale==='ja'?/(?:49,800|99,800)円/:/\$(?:349|699)/).test(current))throw Error('Unexpected License price');
  html=html.replace(current,campaignPrice('plus',current,locale,{live:true}));
  html=html.replace(/\sdata-campaign-standard="[^"]*"/g,'').replace(/(data-license-plan="(license|plus)"[^>]*)(>)/g,(_,attrs,key,end)=>attrs+` data-campaign-standard="${money(priceBook(locale)[key].standard,locale,{word:true})}"`+end);
  for(const key of ['license','plus']){
   const now=money(priceBook(locale)[key].launch,locale,{word:true}),standard=money(priceBook(locale)[key].standard,locale,{word:true});
   for(const duration of [c.duration,'発売から6か月間']){const owned=`<td><span class="campaign-matrix-price"><span>${c.standard} <s>${standard}</s></span><strong>${now}</strong><small>${duration}</small></span></td>`;html=html.replace(owned,`<td>${now}</td>`);}
   const original=`<td>${now}</td>`,replacement=`<td><span class="campaign-matrix-price"><span>${c.standard} <s>${standard}</s></span><strong>${now}</strong><small>${c.duration}</small></span></td>`;
   if(html.includes(original))html=html.replace(original,replacement);
  }
 }
 const terms=`<!-- Planned campaign terms -->\n<p class="campaign-terms" data-campaign-terms>${c.terms}</p>\n<!-- End planned campaign terms -->\n`;
 if(home){const anchor='<div class="updates-strip">';if(!html.includes(anchor))throw Error(`Missing Updates boundary: ${file}`);html=html.replace(anchor,terms+anchor);}
 if(order)html=html.replace('    <section class="order-updates"',terms+'    <section class="order-updates"');
 if(license)html=html.replace('        <div class="license-matrix-region"',terms+'        <div class="license-matrix-region"');
 const assets=`<!-- Campaign assets -->\n<link rel="stylesheet" href="${prefix}campaign-prices.css?v=${version}">\n<script defer src="${prefix}campaign-prices.js?v=${version}"></script>\n<!-- End campaign assets -->\n`;
 return html.replace('</head>',assets+'</head>');
}
const priorCampaignBlocks=new Set(["058935840b029dadf311c3da976c851ec48c5dcdfef3d70b4c4ff0e318e533ff", "0a0d015292f8bf2da2ee97de108e3ee88c8b8647ee4981d2256a536958e0acf4", "0f10d86e692bb12f131eb833ea1be848ebec44804447452fd778bace85eaeca7", "132b9e6b20421ee4edc38d25ea8316323a00b087b2ab23eb08bceb0d190f2287", "476861114dce06f74efb0522486deadffad645013537ec1610a6b0c5245d1947", "5a42afedaacac3bc816e52c127aded00f0f745794efed7e2cfc67fa1fa07bb8b", "78026e38df593688d84fe93a37b120de1e93032e5988e5b410e1577c69575f3f", "94d3a10bb2e9c0cf69799e423470d9d46917f045228a967c0f52740c6b68a66b", "a48317163e17a81b5f202e98d73ada8c459506bdd2968b14483ddf100eca567c", "b989c1ba328c5ba88d15e63cf9583c6f213b296e5f5654e7e3b0749547b9ff00", "c57846ab5b0dcb180d94ba0dc04158e323f17257882fc61f69ffd03ada5a09bd", "d5810de02375f1a643870cc1e43011c892515eb773f47630af0e1ae768ffa760", "ec16ade24ba2ba13da78a1131504431a06f84e81bd4ac7f69bc76e506e1b28ad"]);
export function applyReviewedCampaign(file,source){
 if(source.includes('<!-- Campaign price ')){
  if(source.includes(campaignCopy[localeOf(file)].terms))return source;
  const blocks=[...source.matchAll(/<!-- Campaign price (?:license|plus) -->\n[\s\S]*?<!-- End campaign price (?:license|plus) -->/g)].map(m=>m[0]);
  if(blocks.length&&blocks.every(b=>priorCampaignBlocks.has(createHash('sha256').update(b).digest('hex'))))return withCampaignPrices(file,source);
  return source;
 }
 if(/(?:index|quiet-form)\.html$/.test(file)&&!source.includes('<strong class="plan-price">¥49,800</strong>'))return source;
 if(/order\.html$/.test(file)&&!source.includes('<strong class="order-product-price">¥49,800<small> JPY</small></strong>'))return source;
 if(file==='ja/license.html'&&!source.includes('<strong data-license-price>99,800円</strong>'))return source;
 return withCampaignPrices(file,source);
}
