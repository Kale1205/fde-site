import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {LP_RECEPTION_NOTICE} from '../ja/lp/lp-policy.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const studies=runInNewContext(read('ja/lp/studies.js')+'\nstudies');
const cases=studies.map((s,i)=>({...s,num:String(i+1).padStart(2,'0')}));
const tones=['#d5c1a4','#d5cadf','#d2c2a8','#e7c7c8','#c69870','#c6d3cf','#dc9f65','#d2b79c','#e5cc6f','#d3d0c6'];
const e=x=>String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function photo(i,extra=''){return `<span class="photo ${extra}" aria-hidden="true" style="--px:${(i%4)*100/3}%;--py:${Math.floor(i/4)*50}%"></span>`}
const names=['KISSA / 余白','SLOW FORM','棲み継ぐ','atelier saison','NOMAD LEATHER','はじめの会計','KATA METALWORKS','土と旅','あおぞら個別','STILL / STUDIO'];
const action=['お店をみる','体験レッスン','住まいの相談','教室のご案内','コレクション','開業のご相談','試作のご相談','体験を予約','体験授業','撮影のご相談'];
const palettes=[['#f0e4d3','#482e23','#9a513e'],['#e8dfef','#42334c','#765b8f'],['#e5e6da','#2c3d30','#426551'],['#f3ddd8','#652e42','#a34c66'],['#29211f','#f0d3aa','#cb945f'],['#edf2f6','#233751','#2b619c'],['#282925','#f6e8da','#ea7b3c'],['#e4cead','#3c362d','#3d6a7b'],['#f9efb7','#183858','#2d639e'],['#eeebe5','#222220','#4d4b48']];
function mock(s,i){return `<span class="sample sample-${i}" aria-hidden="true" style="--paper:${palettes[i][0]};--ink:${palettes[i][1]};--accent:${palettes[i][2]}"><span class="sample-nav"><b>${e(names[i])}</b><span>MENU <b>☰</b></span></span><span class="sample-picture">${photo(i)}</span><span class="sample-copy"><span>${e(s.en)}</span><strong>${e(s.line).replaceAll('\n','<br>')}</strong><span class="sample-cta">${action[i]} <b>↗</b></span></span><span class="sample-end"><span>01 — ABOUT</span><span>${e(s.title)}</span></span></span>`;}
function collage(i){
 const s=cases[i],palette=palettes[i];
 const labels=['DESIGN DETAIL','VISUAL STUDY','FIELD NOTES','MATERIAL CROP','COLOUR STUDY','ART DIRECTION',names[i]];
 return `<span class="story-collage" aria-hidden="true" style="--collage-paper:${palette[0]};--collage-ink:${palette[1]};--collage-accent:${palette[2]}">${labels.map((label,j)=>`<span class="collage-print cp-${j}" data-layer="${j}">${photo(i)}${j===6?`<span class="collage-cover"><b>${e(label)}</b><strong>${e(s.line).replaceAll('\n','<br>')}</strong></span>`:j===4?`<span class="collage-palette"><i></i><i></i><i></i><small>${label}</small></span>`:j===1||j===3?`<small class="collage-mark">${label}</small>`:''}</span>`).join('')}</span>`;
}
export function showcaseBody(base='./'){
const p=base||'./';
const prints=cases.map((s,i)=>`<li class="print-${i}"><a href="${p}cases/${s.num}.html" aria-label="${s.num} ${e(s.title)}の制作例">${collage(i)}<span class="print-caption"><b>${e(s.title)}</b></span></a></li>`).join('');
return `<a class="skip skip-link" href="#works">作品へスキップ</a>
<header class="parallel-head">
<div class="left-tools"><a class="identity" href="${p}index.html"><img src="${p}assets/bakedkale-character.png" width="28" height="28" alt=""><b>Baked Kale</b></a><a href="${p}service.html#schedule">制作の流れ <span aria-hidden="true">↗</span></a><a class="fde-link" href="${p}../index.html">FDE製品 <span aria-hidden="true">↗</span></a></div>
<nav class="view-switch" aria-label="表示切替"><a href="#archive" aria-current="page">Archive</a><a href="#works">Stories</a></nav>
<button class="theme" type="button" aria-label="ダーク表示" aria-pressed="false"><span aria-hidden="true">◐</span></button>
</header>
<main id="main-content">
<section id="archive" aria-labelledby="archive-title"><h1 class="sr-only" id="archive-title">bakedkale library</h1><div id="field" tabindex="0" role="region" aria-label="繰り返し表示する素材。ドラッグまたは矢印キーで移動" aria-describedby="archive-help"><div id="plane"></div></div><p class="sr-only" id="archive-help">矢印キーで移動、プラス・マイナスで拡大・縮小、ホームキーでリセット。素材の一覧を下に用意しています。</p><div class="archive-notes"><span>自主制作 · 素材アーカイブ</span><span class="sr-only" data-lp-reception>${LP_RECEPTION_NOTICE}</span><span class="gesture" aria-hidden="true">ドラッグで移動</span></div>
<div class="field-tools" aria-label="拡大・表示位置"><button type="button" data-do="minus" aria-label="縮小">−</button><output id="zoom-value">100%</output><button type="button" data-do="plus" aria-label="拡大">+</button><button class="reset" type="button" data-do="reset" aria-label="表示をリセット">↺</button></div>
<div class="material-access"><p>素材を選択</p>${cases.map((s,i)=>`<button type="button" data-material="${i}">${e(s.title)}</button>`).join('')}</div>
</section>
<section id="works" class="stories" aria-labelledby="stories-title"><div class="stories-note"><h1 id="stories-title" class="sr-only">制作例 10件</h1><span>自主制作・架空の案件</span></div><ol class="prints">${prints}</ol></section>
</main>
<template id="material-data">${cases.map((s,i)=>`<article data-title="${e(s.title)}" data-url="${p}cases/${s.num}.html" data-n="${s.num}">${photo(i)}</article>`).join('')}</template>
<dialog id="inspect" aria-labelledby="inspect-title"><div class="inspect-sheet"><button class="close-inspect" type="button" aria-label="閉じる">×</button><div class="inspect-image"></div><div class="inspect-caption"><span class="inspect-id"></span><h2 id="inspect-title"></h2><a class="inspect-link" href="#works">制作例を見る ↗</a><div class="inspect-switch"><button type="button" class="inspect-prev" aria-label="前の素材">←</button><button type="button" class="inspect-next" aria-label="次の素材">→</button></div></div></div></dialog>
<noscript><style>#archive,.view-switch,.theme{display:none}.stories[hidden]{display:block}</style></noscript>
`;
}
export const showcaseCases=cases;
export function showcaseCaseBody(i){const s=cases[i];
const next=cases[(i+1)%cases.length];
return `<main id="main-content" class="case-main"><div class="case-meta"><a class="textlink" href="../index.html#works">← 制作例一覧</a><span>${s.num} / 10 · 架空の制作例</span></div>
<section class="case-hero" style="--mat:${tones[i]}"><div><p class="eyebrow">${e(s.type)} / DESIGN CONCEPT</p><h1>${e(s.line).replaceAll('\n','<br>')}</h1><p>${e(s.en)}</p></div><div class="case-picture">${mock(s,i)}</div></section>
<section class="case-copy"><div><p class="eyebrow">ABOUT THIS CONCEPT</p><h2>${e(s.title)}</h2><p>${e(s.purpose)}</p></div><div><dl><dt>雰囲気</dt><dd>${e(s.mood)}</dd><dt>ページ構成の例</dt><dd>${e(s.composition)}</dd></dl><p>${e(s.note)}</p><p class="muted">写真は架空の制作例用に生成した素材です。完成したLPや受注実績ではありません。</p></div></section>
<div class="case-next"><a href="../service.html">サービスと料金 ↗</a><a href="${next.num}.html">次の制作例：${e(next.title)} ↗</a></div></main>`;
}