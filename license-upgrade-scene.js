// Approved counterclockwise License upgrade, preserving original raster texture.
import {PARTS} from './adopted-sculpture-scenes.js';
export const LICENSE_UPGRADE=Object.freeze({duration:4800,turns:2,stages:[.19,.42,.65],stageDuration:.09,lift:60,scale:.10});
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
function checkedRoot(root){if(!/^(?:\.\.\/)*assets\/$/.test(root))throw Error('Unexpected asset root');return root;}
export function licenseUpgradeAssets(root='assets/'){
 checkedRoot(root);return [root+'ims-license-update.webp',...['license-base','license-documents','license-arrow'].map(key=>root+PARTS[key].file)];
}
export function licenseUpgradeIllustration(id,root='assets/'){
 if(!/^[-\w]+$/.test(id))throw Error('Unexpected scene id');checkedRoot(root);
 const image=(file,x,y,w,h,extra='')=>`<image href="${root+file}" x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
 const raster=(key,extra='')=>image(PARTS[key].file,...PARTS[key].box,extra);
 const rows=[{y:377,barY:381},{y:452,barY:458},{y:528,barY:532}];
 let defs=`<filter id="${id}-dim" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope=".44"/><feFuncG type="linear" slope=".44"/><feFuncB type="linear" slope=".44"/></feComponentTransfer></filter>`;
 defs+=rows.map((r,i)=>`<clipPath id="${id}-row-${i}"><rect x="347" y="${r.y}" width="51" height="50" rx="13"/><rect x="422" y="${r.barY}" width="172" height="44" rx="22"/></clipPath><clipPath id="${id}-cover-${i}"><rect data-cover="${i}" x="347" y="${r.y-3}" width="250" height="60"/></clipPath>`).join('');
 const shading=rows.map((r,i)=>`<g clip-path="url(#${id}-row-${i})"><g clip-path="url(#${id}-cover-${i})">${raster('license-documents',`filter="url(#${id}-dim)"`)}</g></g>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-140 -140 1240 1240" aria-hidden="true" focusable="false" data-license-upgrade><defs>${defs}</defs><g data-upgrade-animated opacity="0"><g data-part="base">${raster('license-base')}</g><g data-part="documents">${raster('license-documents')}${shading}</g><g data-part="upgrade">${raster('license-arrow')}</g></g><g data-upgrade-rest>${image('ims-license-update.webp',0,0,960,960)}</g></svg>`;
}
const cached=new WeakMap();
function nodes(root){let value=cached.get(root);if(!value){value={animated:root.querySelector('[data-upgrade-animated]'),rest:root.querySelector('[data-upgrade-rest]'),paper:root.querySelector('[data-part=documents]'),arrow:root.querySelector('[data-part=upgrade]'),covers:[...root.querySelectorAll('[data-cover]')]};cached.set(root,value);}return value;}
export function renderLicenseUpgrade(root,phase){
 const p=clamp(phase),n=nodes(root),blend=smooth((p-.025)/.045)*(1-smooth((p-.94)/.06));
 n.animated.setAttribute('opacity',blend.toFixed(7));n.rest.setAttribute('opacity',(1-blend).toFixed(7));
 const progress=LICENSE_UPGRADE.stages.map(start=>smooth((p-start)/LICENSE_UPGRADE.stageDuration)),level=progress.reduce((a,b)=>a+b,0)/3;
 const pulse=LICENSE_UPGRADE.stages.reduce((sum,start)=>{const t=clamp((p-start)/.13);return sum+4*t*(1-t);},0),settle=1-smooth((p-.82)/.13);
 const y=(-LICENSE_UPGRADE.lift*level-10*pulse)*settle,scale=1+(LICENSE_UPGRADE.scale*level+.018*pulse)*settle;
 const rotation=-360*LICENSE_UPGRADE.turns*smooth((p-.06)/.76);
 n.arrow.setAttribute('transform',`translate(480 480) rotate(${rotation.toFixed(6)}) translate(-480 -480)`);
 n.paper.setAttribute('transform',`translate(0 ${y.toFixed(6)}) translate(454 463) scale(${scale.toFixed(7)}) translate(-454 -463)`);
 n.covers.forEach((cover,i)=>{cover.setAttribute('x',(347+250*progress[i]).toFixed(5));cover.setAttribute('width',(250*(1-progress[i])).toFixed(5));});
 root.dataset.upgradeAngle=rotation.toFixed(6);root.dataset.upgradeLevel=String(progress.filter(value=>value>=.999).length);root.dataset.upgradePhase=p.toFixed(7);
}
