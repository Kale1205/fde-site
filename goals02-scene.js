// Reference-matched complete raster parts. Native source at rest; inferred hidden surfaces, no true 3D back faces.
export const GOALS02_MOTION=Object.freeze({duration:4800,impact:.24,split:.43,rejoin:.84});
const ATLAS='sculpture-parts/goals02-atlas-fda86c558bdc.png';
const outline={
 frame:'M94 128L420 46Q471 31 475 89L475 368Q475 409 434 423L101 481Q42 492 41 438L42 192Q42 148 94 128Z M123 200L401 129Q407 127 407 147L406 324Q407 348 382 355L126 423Q120 426 121 409L121 215Q121 202 123 200Z',
 rear:'M592 151L948 65Q985 57 987 100L986 345Q986 378 950 390L599 463Q554 471 554 428L554 203Q553 166 592 151Z',
 middle:'M1107 149L1460 65Q1498 55 1500 99L1499 347Q1500 376 1463 388L1110 463Q1067 474 1067 430L1067 201Q1066 166 1107 149Z',
 front:'M84 657L431 573Q473 563 475 607L475 865Q475 893 437 905L91 984Q40 995 40 947L40 708Q40 673 84 657Z',
 wrench:'M716 577Q699 575 701 592L724 627Q736 650 718 671Q699 690 685 672L664 627Q656 603 640 619Q613 650 626 694Q633 730 665 749L699 758L808 942Q827 978 858 974Q901 971 914 937Q924 912 905 884L811 720Q812 692 799 660Q789 620 764 595Q740 578 716 577Z'
};
const bounds={frame:[160,125,606,683],rear:[418,243,570,555],middle:[525,317,432,533],front:[740,273,542,601],wrench:[1147,445,323,438]};
const crops={frame:[40,42,438,442],rear:[553,63,436,402],middle:[1066,63,435,402],front:[39,571,438,413],wrench:[622,573,295,405]};
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const curve=(keys,p)=>{for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(p<=b[0])return a[1]+(b[1]-a[1])*smooth((p-a[0])/(b[0]-a[0]));}return keys.at(-1)[1];};
function checkedRoot(root){if(!/^(?:\.\.\/)*assets\/$/.test(root))throw Error('Unexpected Goals 02 asset root');return root;}
export function goals02Assets(root='assets/'){checkedRoot(root);return[root+'goals-open-system.png',root+ATLAS];}
export function goals02Illustration(id,root='assets/'){
 checkedRoot(root);if(!/^[-\w]+$/.test(id))throw Error('Unexpected scene id');
 const original=`<image href="${root}goals-open-system.png" width="1536" height="1024"/>`;
 const order=['frame','rear','middle','front','wrench'];
 const defs=order.map(name=>`<clipPath id="${id}-${name}" clipPathUnits="userSpaceOnUse"><path d="${outline[name]}" fill-rule="evenodd" clip-rule="evenodd"/></clipPath>`).join('');
 const parts=order.map(name=>{const [x,y,w,h]=bounds[name],[cx,cy,cw,ch]=crops[name],sx=w/cw,sy=h/ch;return `<g data-part="${name}"><g transform="matrix(${sx} 0 0 ${sy} ${x-cx*sx} ${y-cy*sy})" clip-path="url(#${id}-${name})"><image href="${root+ATLAS}" width="1536" height="1024"/></g></g>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" aria-hidden="true" focusable="false" data-goals02-scene><defs>${defs}</defs><g data-goals02-active opacity="0"><ellipse data-contact cx="1215" cy="574" rx="28" ry="11" fill="#15352a" opacity="0"/>${parts}</g><g data-goals02-rest>${original}</g></svg>`;
}
const cache=new WeakMap();
function nodes(root){let n=cache.get(root);if(!n){n={active:root.querySelector('[data-goals02-active]'),rest:root.querySelector('[data-goals02-rest]'),contact:root.querySelector('[data-contact]'),parts:Object.fromEntries(Object.keys(outline).map(name=>[name,root.querySelector(`[data-part=${name}]`)]))};cache.set(root,n);}return n;}
const pose=(cx,cy,x=0,y=0,a=0,s=1)=>`translate(${x.toFixed(5)} ${y.toFixed(5)}) translate(${cx} ${cy}) rotate(${a.toFixed(5)}) scale(${s.toFixed(6)}) translate(${-cx} ${-cy})`;
export function renderGoals02(root,phase){
 const p=clamp(phase),n=nodes(root),blend=smooth((p-.025)/.025)*(1-smooth((p-.975)/.025));n.active.setAttribute('opacity',blend.toFixed(6));n.rest.setAttribute('opacity',(1-blend).toFixed(6));
 const split=curve([[0,0],[.245,0],[.43,1],[.53,1],[.84,0],[1,0]],p),jolt=curve([[0,0],[.232,0],[.245,1],[.27,-.55],[.30,0],[1,0]],p);
 const rejoin=(start,end)=>p<.53?split:1-smooth((p-start)/(end-start));
 const f=rejoin(.53,.66),r=rejoin(.57,.71),m=rejoin(.61,.77),front=rejoin(.65,.84);
 n.parts.frame.setAttribute('transform',pose(461,466,-84*f,-48*f,-2.4*f));
 n.parts.rear.setAttribute('transform',pose(704,520,-46*r,-18*r,-2*r));
 n.parts.middle.setAttribute('transform',pose(741,588,28*m,30*m,1.6*m));
 n.parts.front.setAttribute('transform',pose(1011,579,108*front-8*jolt,67*front+6*jolt,3.4*front,1+.008*jolt));
 const angle=curve([[0,0],[.08,0],[.18,20],[.22,20],[.245,-11],[.29,-7],[.37,13],[.56,13],[.78,0],[1,0]],p),x=curve([[0,0],[.29,0],[.40,18],[.56,18],[.78,0],[1,0]],p),y=curve([[0,0],[.18,-10],[.22,-10],[.245,7],[.29,3],[.40,-34],[.56,-34],[.78,0],[1,0]],p);
 n.parts.wrench.setAttribute('transform',pose(1360,799,x,y,angle));n.contact.setAttribute('opacity',(curve([[0,0],[.225,0],[.245,.22],[.29,0],[1,0]],p)).toFixed(5));
 root.dataset.assemblySplit=split.toFixed(6);root.dataset.assemblyPhase=p.toFixed(6);root.dataset.assemblyStage=p<.22?'windup':p<.30?'strike':p<.54?'separate':p<.84?'reassemble':'rest';
}
