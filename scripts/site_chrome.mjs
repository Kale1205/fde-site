import {readFileSync} from 'node:fs';

const chromeAssets=(prefix,version)=>`<!-- Shared site chrome -->\n<link rel="stylesheet" href="${prefix}site-chrome.css?v=${version}">\n<script type="module" src="${prefix}site-chrome.js?v=${version}"></script>\n<!-- End shared site chrome -->\n`;
export function stripSiteChromeAssets(source){
 return source.replace(/<!-- Shared site chrome -->\n[\s\S]*?<!-- End shared site chrome -->\n/g,block=>{
  const m=block.match(/href="((?:\.\.\/)?)(?:site-chrome\.css)\?v=(\d{8}-\d{6}|BUILD)"/);
  if(!m||block!==chromeAssets(m[1],m[2]))throw Error('Unexpected script in shared site chrome');
  return '';
 });
}

export function withSiteChrome(file,source){
 if(!/^(?:(?:ja|zh)\/)?(?:index|quiet-form|license|goals|news|demo|contact|customer|order)\.html$/.test(file)||!/^<!doctype html>/i.test(source))return source;
 // Historical purchase templates acquire the shared header when their current
 // page composer runs; do not rewrite an unrelated legacy asset suffix.
 if(!source.includes('class="site-header"')||!source.includes('gallery-ui.css'))return source;
 const prefix=file.includes('/')?'../':'',version=source.includes('site-chrome.css?v=BUILD')?'BUILD':readFileSync(new URL('../build-version.txt',import.meta.url),'utf8').trim();
 const brand=`<img data-brand-character src="${prefix}assets/bakedkale-character.svg" width="48" height="45" alt=""><span class="brand-wordmark" aria-hidden="true">Baked Kale<small>FDE / IT Engineering</small></span>`;
 const originals=new Set(['<span>Baked Kale FDE</span><small>FDE IMS</small>','<span>Baked Kale FDE</span><small>IMS</small>',`<img alt="Baked Kale FDE" src="${prefix}assets/baked-kale-logo.svg" width="980" height="240">`,`<img src="${prefix}assets/baked-kale-logo.svg" alt="Baked Kale FDE">`,`<img alt="Baked Kale FDE" src="${prefix}assets/baked-kale-logo.svg">`,`<img src="${prefix}assets/baked-kale-logo.svg" alt="Baked Kale FDE" width="980" height="240">`,brand]);
 let html=stripSiteChromeAssets(source);
 html=html.replace(/(<a class="brand"[^>]*>)([\s\S]*?)(<\/a>)/,(_,open,inside,close)=>{
  if(!originals.has(inside.trim()))throw Error(`Unexpected brand source: ${file}`);
  return open+brand+close;
 });
 const boundary=html.indexOf(`<link rel="stylesheet" href="${prefix}gallery-ui.css`);
 if(boundary<0)throw Error(`Missing shared stylesheet boundary: ${file}`);
 return html.slice(0,boundary)+chromeAssets(prefix,version)+html.slice(boundary);
}
