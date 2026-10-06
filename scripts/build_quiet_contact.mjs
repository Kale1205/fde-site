import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Selected W06 option 2: FAQ first, then one soft form surface. Preserve
// existing copy, CMS/search anchors, six fields and the confirm/send contract.
export function renderQuietContact(source) {
  if(source.includes('contact-renewal'))return source;
  const prefix=/<html lang="en">/.test(source)?'':'../';
  const faq=source.match(/    <section class="content-section section-frame">\n      <details class="faq-shell contact-faq">[\s\S]*?      <\/details>\n    <\/section>/)?.[0];
  if(!faq)throw Error('Contact FAQ anchors not found');
  let html=source.replace(' contact-page"',' contact-page contact-renewal"');
  html=html.replace('<section class="page-hero compact-hero section-frame">',
    `<section class="page-hero compact-hero contact-page-hero section-frame">\n      <img class="contact-hero-mark" src="${prefix}assets/baked-kale-mark.svg" width="280" height="280" alt="" aria-hidden="true">`);
  html=html.replace(faq,'');
  html=html.replace('    <section class="content-section contact-form-section section-frame">',
    `${faq.replace('class="content-section section-frame"','class="content-section contact-faq-section section-frame"').replace('02 / FAQ','01 / FAQ')}\n    <section class="content-section contact-form-section section-frame">`);
  html=html.replace(/(<div class="form-wrap">\n)(        <div class="section-intro compact">)/,'$1        <div class="contact-surface">\n$2');
  html=html.replace(/(<div class="section-intro compact"><p>)01 \/ /,(_,open)=>`${open}02 / `);
  html=html.replace(/(<summary class="section-intro compact">)([\s\S]*?)(<\/summary>)/,
    (_,open,copy,close)=>`${open}${copy}<img class="contact-faq-chevron" src="${prefix}assets/phosphor-caret-right.svg" width="24" height="24" alt="" aria-hidden="true">${close}`);
  html=html.replace(/(  <link rel="stylesheet" href="(?:\.\.\/)?quiet-pages\.css\?v=([^\"]+)">)/,
    (_,link,key)=>`${link}\n  <script defer src="${prefix}quiet-contact.js?v=${key}"></script>`);
  html=html.replace('        <section class="business-profile">','        </div>\n        <section class="business-profile">');
  if(!html.includes('contact-surface'))throw Error('Contact form anchors not found');
  return html;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  for(const file of ['contact.html','ja/contact.html','zh/contact.html']){
    const source=readFileSync(path.join(root,file),'utf8');
    const output=renderQuietContact(source);
    if(process.argv.includes('--check')){
      if(source!==output)throw Error(`${file} is not composed`);
    }else if(source!==output){
      process.stdout.write(`*** Begin Patch\n*** Update File: ${path.join(root,file)}\n@@\n${source.trimEnd().split('\n').map(x=>'-'+x).join('\n')}\n${output.trimEnd().split('\n').map(x=>'+'+x).join('\n')}\n*** End Patch\n`);
    }
  }
  if(process.argv.includes('--check'))console.log('Quiet Form Contact composition is current.');
}
