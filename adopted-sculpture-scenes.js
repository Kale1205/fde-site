// Approved 2026-11-11 motion, using precomposed original-image parts.
// Masks and shaded silhouettes are baked once; timing/poses retain the approved
// dynamic-icons preview. Repaired surfaces remain inferred raster content.
export const APPROVED_SCENES=Object.freeze({
 understand:{file:'goals-understand-work.png',period:8800,parts:['goals01-context','goals01-underlay','goals01-target','goals01-glass']},
 license:{file:'ims-license-update.webp',period:9600,parts:['license-base','license-documents','license-arrow','shared-wrench','contact-shadow']},
 plus:{file:'ims-license-plus-customize.webp',period:9600,parts:['plus-base','plus-panel','plus-card','shared-wrench','contact-shadow']}
});
export const PARTS=Object.freeze({
 "goals01-context": {
  "file": "sculpture-parts/goals01-context-e3df2dc28118.png",
  "box": [
   0,
   0,
   730,
   1024
  ]
 },
 "goals01-underlay": {
  "file": "sculpture-parts/goals01-underlay-070e30824d66.png",
  "box": [
   0,
   0,
   730,
   1024
  ]
 },
 "goals01-target": {
  "file": "sculpture-parts/goals01-target-e27ef5bb801d.png",
  "box": [
   420,
   575,
   66,
   62
  ]
 },
 "goals01-glass": {
  "file": "sculpture-parts/goals01-glass-4baadaaf914c.png",
  "box": [
   244,
   441,
   449,
   426
  ]
 },
 "license-base": {
  "file": "sculpture-parts/license-base-b47be82f812e.png",
  "box": [
   85,
   75,
   790,
   790
  ]
 },
 "license-documents": {
  "file": "sculpture-parts/license-documents-9bd31662c530.png",
  "box": [
   229,
   248,
   450,
   432
  ]
 },
 "license-arrow": {
  "file": "sculpture-parts/license-arrow-424186049bd7.png",
  "box": [
   143,
   132,
   692,
   699
  ]
 },
 "shared-wrench": {
  "file": "sculpture-parts/shared-wrench-f0af8df1fe8e.png",
  "box": [
   540,
   362,
   375,
   425
  ]
 },
 "plus-base": {
  "file": "sculpture-parts/plus-base-dffdf99c84a2.png",
  "box": [
   94,
   209,
   733,
   585
  ]
 },
 "plus-panel": {
  "file": "sculpture-parts/plus-panel-61275683ddb3.png",
  "box": [
   329,
   325,
   427,
   421
  ]
 },
 "plus-card": {
  "file": "sculpture-parts/plus-card-7ed4390a0b25.png",
  "box": [
   147,
   381,
   258,
   265
  ]
 },
 "contact-shadow": {
  "file": "sculpture-parts/contact-shadow-916da53b4513.png",
  "box": [
   0,
   0,
   128,
   64
  ]
 }
});

function checkedRoot(root){if(!/^(?:\.\.\/)*assets\/$/.test(root))throw Error('Unexpected asset root');return root;}
export function approvedAssets(kind,root='assets/'){
 const scene=APPROVED_SCENES[kind];if(!scene)throw Error('Unknown approved scene');checkedRoot(root);
 return [root+scene.file,...scene.parts.map(key=>root+PARTS[key].file)];
}
export function approvedIllustration(kind,id,root='assets/'){
 const scene=APPROVED_SCENES[kind];if(!scene||!/^[-\w]+$/.test(id))throw Error('Unknown approved illustration');checkedRoot(root);
 const wide=kind==='understand',W=wide?1536:960,H=wide?1024:960;
 const image=(file,x,y,w,h,extra='')=>`<image href="${root+file}" x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
 const raster=(key,extra='')=>{const p=PARTS[key];return image(p.file,...p.box,extra);};
 const original=image(scene.file,0,0,W,H);
 const part=(name,content)=>`<g data-part="${name}">${content}</g>`;
 let defs='',body='';
 if(wide){
  defs=`<clipPath id="${id}-window"><ellipse cx="419" cy="618" rx="99" ry="99"/></clipPath><clipPath id="${id}-arrow"><rect x="730" width="165" height="1024"/></clipPath><clipPath id="${id}-result"><rect x="895" width="641" height="1024"/></clipPath>`;
  const target=raster('goals01-target');
  const field=`<g data-lens-field>${raster('goals01-underlay')}<g data-target-lens opacity="0">${target}</g></g>`;
  const glass=`<g clip-path="url(#${id}-window)">${field}</g><ellipse cx="419" cy="618" rx="99" ry="99" fill="#dbe8df" opacity=".10"/>${raster('goals01-glass')}`;
  body=part('context',raster('goals01-context'))+`<g data-target opacity="0">${target}</g>`+part('arrow',`<g clip-path="url(#${id}-arrow)">${original}</g>`)+part('result',`<g clip-path="url(#${id}-result)">${original}</g>`)+part('glass',glass);
  body+='<g data-found-badge opacity="0"><rect x="500" y="455" width="44" height="44" rx="22" fill="#bd8529"/><text x="522" y="487" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="700" fill="#fff9ea">!</text></g>';
 }else{
  body=part('base',raster(kind+'-base'));
  body+=kind==='license'?part('documents',raster('license-documents'))+part('upgrade',raster('license-arrow')):part('panel',raster('plus-panel'))+part('mini-card',raster('plus-card'));
  const cx=kind==='license'?564:601,cy=kind==='license'?399:443;
  body+=`<g data-contact-shadow opacity="0">${image(PARTS['contact-shadow'].file,cx-48,cy-18,96,48)}</g>`;
  body+=`<g data-impact opacity="0"><circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#bb8c36" stroke-width="4"/></g>`+part('wrench',raster('shared-wrench'));
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${wide?'-55 -37 1646 1098':'-140 -140 1240 1240'}" aria-hidden="true" focusable="false"><defs>${defs}</defs><g data-animated opacity="0">${body}</g><g data-rest>${original}</g></svg>`;
}
const cache=new WeakMap();
function find(root,selector){let nodes=cache.get(root);if(!nodes){nodes=new Map();cache.set(root,nodes);}if(!nodes.has(selector))nodes.set(selector,root.querySelector(selector));return nodes.get(selector);}
  const clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
  function curve(keys,p){for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(p<=b[0])return a[1]+(b[1]-a[1])*smooth((p-a[0])/(b[0]-a[0]));}return keys.at(-1)[1];}
  const pose=(cx,cy,x=0,y=0,a=0,s=1)=>`translate(${x.toFixed(5)} ${y.toFixed(5)}) translate(${cx} ${cy}) rotate(${a.toFixed(5)}) scale(${s.toFixed(7)}) translate(${-cx} ${-cy})`;
  const set=(root,name,value)=>find(root,`[data-part="${name}"]`).setAttribute('transform',value);
  export function renderApprovedScene(root,kind,phase){
    const p=clamp(phase),blend=curve([[0,0],[.035,0],[.085,1],[.87,1],[.95,0],[1,0]],p);
    find(root,'[data-animated]').setAttribute('opacity',blend.toFixed(7));
    find(root,'[data-rest]').setAttribute('opacity',(1-blend).toFixed(7));
    let state='原画';
    if(kind==='understand'){
      const x=curve([[0,0],[.085,0],[.22,-132],[.35,35],[.46,34],[.64,34],[.82,0],[1,0]],p);
      const y=curve([[0,0],[.085,0],[.22,-48],[.35,-150],[.46,-11],[.64,-11],[.82,0],[1,0]],p);
      const a=curve([[0,0],[.085,0],[.22,-12],[.35,9],[.46,0],[.64,0],[.82,0],[1,0]],p);
      const s=curve([[0,1],[.35,1],[.46,1.09],[.62,1.09],[.82,1],[1,1]],p);
      const found=curve([[0,0],[.40,0],[.46,1],[.64,1],[.76,0],[1,0]],p);
      const pop=curve([[0,0],[.58,0],[.67,1],[.74,.8],[.82,0],[1,0]],p);
      set(root,'glass',pose(419,618,x,y,a,s));
      find(root,'[data-lens-field]').setAttribute('transform',`translate(419 618) rotate(${-a}) scale(${1.17/s}) translate(${-419-x} ${-618-y})`);
      find(root,'[data-target]').setAttribute('opacity',(found*.8).toFixed(5));
      find(root,'[data-target-lens]').setAttribute('opacity',found.toFixed(5));
      find(root,'[data-found-badge]').setAttribute('opacity',found.toFixed(5));
      set(root,'arrow',pose(810,550,curve([[0,0],[.57,0],[.64,18],[.70,0],[1,0]],p)));
      set(root,'result',pose(1225,530,0,-28*pop,0,1+.09*pop));
      state=p<.12?'調査開始':p<.41?'虫眼鏡で調べる':p<.61?'課題を発見':p<.80?'改善につなげる':'元の位置へ';
    }else{
      const split=curve([[0,0],[.10,0],[.25,1],[.44,1],[.49,.9],[.65,-.065],[.73,0],[1,0]],p);
      const jolt=curve([[0,0],[.475,0],[.488,1],[.51,-.5],[.535,0],[.555,0],[.568,.5],[.59,0],[1,0]],p);
      const rx=curve([[0,0],[.10,0],[.25,75],[.34,75],[.425,45],[.48,0],[.52,28],[.56,0],[.65,0],[1,0]],p);
      const ry=curve([[0,0],[.10,0],[.25,-155],[.34,-155],[.425,-95],[.48,0],[.52,-42],[.56,0],[.65,0],[1,0]],p);
      const ra=curve([[0,0],[.10,0],[.25,27],[.34,27],[.425,39],[.48,-8],[.52,20],[.56,-4],[.65,0],[1,0]],p);
      if(kind==='license'){
        set(root,'documents',pose(454,463,-116*split,-126*split+8*jolt,-11*split,1+.035*split));
        set(root,'upgrade',pose(480,480,117*split,83*split+4*jolt,18*split,1-.07*split));
        const enter=curve([[0,0],[.27,0],[.35,1],[.70,1],[.82,0],[1,0]],p);
        const exit=curve([[0,0],[.70,0],[.82,1],[1,1]],p);
        const wrench=find(root,'[data-part="wrench"]');wrench.setAttribute('opacity',enter.toFixed(5));
        set(root,'wrench',pose(820,700,-80+rx+130*exit,-46+ry-130*exit,ra,.85));
      }else{
        set(root,'panel',pose(540,530,100*split,88*split+8*jolt,9*split,1+.03*split));
        set(root,'mini-card',pose(245,515,-128*split,-84*split+5*jolt,-11*split,1-.02*split));
        set(root,'wrench',pose(820,700,rx,ry,ra));
      }
      const impact=curve([[0,0],[.474,0],[.485,1],[.515,0],[.554,0],[.565,.6],[.59,0],[1,0]],p);
      find(root,'[data-impact]').setAttribute('opacity',impact.toFixed(5));
      const contact=curve([[0,0],[.435,0],[.475,1],[.49,.8],[.525,0],[.55,0],[.56,.5],[.59,0],[1,0]],p);
      find(root,'[data-contact-shadow]').setAttribute('opacity',contact.toFixed(5));
      state=p<.12?'元の状態':p<.29?'部品が分解':p<.45?'レンチを振り上げる':p<.59?'レンチで叩く':p<.77?'元の形へ組み直す':'復元完了';
      root.dataset.split=split.toFixed(6);
    }
    root.dataset.phase=p.toFixed(7);root.dataset.stage=state;
    return state;
  }
