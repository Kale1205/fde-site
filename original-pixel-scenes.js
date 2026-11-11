// Original-image parts only. No replacement geometry or invented hidden faces.
export const SOURCE_SCENES = Object.freeze({
 license: {file:'ims-license-update.webp',width:960,height:960,reach:'material-study'},
 plus: {file:'ims-license-plus-customize.webp',width:960,height:960,reach:'material-study'},
 understand: {file:'goals-understand-work.png',width:1536,height:1024,reach:'partial-parts'},
 assemble: {file:'goals-open-system.png',width:1536,height:1024,reach:'material-study'},
 partner: {file:'goals-partner-dialogue.png',width:1536,height:1024,reach:'adopted-parts'},
});
export const PARTNER_MOTION = Object.freeze({period:7200,x:62,y:70,scale:.15,dim:.38,keys:[[0,0],[.10,1.20],[.18,1],[.31,1],[.43,0],[.53,-1.20],[.61,-1],[.76,-1],[.91,0],[1,0]],starts:[.15,.39,.60],fill:.075,reset:.90});
export const scenePeriod = kind => kind==='understand'?6400:7200;
const bars=[{x:745,y:437,w:227,h:42},{x:745,y:508,w:227,h:42},{x:745,y:579,w:227,h:43}];
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function sourceCurve(keys,phase){for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i];if(phase<=b[0])return a[1]+(b[1]-a[1])*smooth((phase-a[0])/(b[0]-a[0]));}return keys.at(-1)[1];}
const transform=(cx,cy,dx,dy,scale)=>`translate(${dx.toFixed(5)} ${dy.toFixed(5)}) translate(${cx} ${cy}) scale(${scale.toFixed(7)}) translate(${-cx} ${-cy})`;

export function illustration(kind,id,source){
 const scene=SOURCE_SCENES[kind];
 if(!scene||!/^[-\w]+$/.test(id))throw new Error('Unknown source illustration');
 source ||= 'assets/'+scene.file;
 if(!/^(?:\.\.\/)*assets\/[\w-]+\.(?:png|webp)$/.test(source)||source.split('/').at(-1)!==scene.file)throw new Error('Unexpected source image');
 const W=scene.width,H=scene.height,image=extra=>`<image href="${source}" x="0" y="0" width="${W}" height="${H}" ${extra||''}/>`;
 let defs='',content='';
 const clip=(name,x,width)=>`<clipPath id="${id}-${name}"><rect x="${x}" y="0" width="${width}" height="${H}"/></clipPath>`;
 const part=name=>`<g data-part="${name}"><g clip-path="url(#${id}-${name})">${image()}</g></g>`;
 if(kind==='partner'){
  defs=clip('left',0,480)+clip('center',480,619)+clip('right',1099,437);
  defs+=bars.map((b,i)=>`<clipPath id="${id}-bar-${i}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="21"/></clipPath><clipPath id="${id}-fill-${i}"><rect data-fill="${i}" x="${b.x}" y="${b.y-2}" width="0" height="${b.h+4}"/></clipPath>`).join('');
  defs+=`<filter id="${id}-dim" x="0" y="0" width="100%" height="100%"><feComponentTransfer><feFuncR type="linear" slope=".38"/><feFuncG type="linear" slope=".38"/><feFuncB type="linear" slope=".38"/></feComponentTransfer></filter>`;
  const fill=bars.map((b,i)=>`<g clip-path="url(#${id}-bar-${i})">${image(`filter="url(#${id}-dim)"`)}<g data-filled="${i}" clip-path="url(#${id}-fill-${i})">${image()}</g></g>`).join('');
  content=`<g data-layer="back">${part('left')}${part('right')}</g><g data-part="center"><g clip-path="url(#${id}-center)">${image()}</g>${fill}</g><g data-layer="front"></g>`;
 }else if(kind==='understand'){
  defs=clip('context',0,730)+clip('arrow',730,165)+clip('result',895,641);
  content=part('context')+part('result')+part('arrow');
 }else{
  // These studies can change only visible material. They do not pretend to
  // rotate the wrench or separate panels whose hidden pixels are unavailable.
  const rows=kind==='plus'?[{x:390,y:392,w:230,h:67},{x:390,y:480,w:178,h:59},{x:390,y:548,w:210,h:63},{x:390,y:611,w:205,h:67}]:[{x:800,y:370,w:400,h:125},{x:800,y:510,w:400,h:125},{x:800,y:645,w:400,h:145}];
  defs=`<filter id="${id}-bright"><feComponentTransfer><feFuncR type="linear" slope="1.7"/><feFuncG type="linear" slope="1.7"/><feFuncB type="linear" slope="1.7"/></feComponentTransfer></filter><filter id="${id}-soft"><feGaussianBlur stdDeviation="5"/></filter>`;
  if(kind==='license'){
   defs+=`<mask id="${id}-light" maskUnits="userSpaceOnUse" x="0" y="0" width="960" height="960"><rect width="960" height="960" fill="black"/><path data-light-path d="M205 520C235 755 525 835 704 645C840 500 792 328 697 231" fill="none" stroke="white" stroke-width="80" stroke-linecap="round" filter="url(#${id}-soft)"/></mask>`;
   content=image()+`<g data-study-light opacity="0" mask="url(#${id}-light)">${image(`filter="url(#${id}-bright)"`)}</g>`;
  }else{
   defs+=`<filter id="${id}-cream"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  4 -1 0 0 -.8"/><feComposite in2="SourceAlpha" operator="in"/></filter><filter id="${id}-dim"><feComponentTransfer><feFuncR type="linear" slope=".42"/><feFuncG type="linear" slope=".42"/><feFuncB type="linear" slope=".42"/></feComponentTransfer></filter>`;
   defs+=rows.map((b,i)=>`<clipPath id="${id}-row-${i}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></clipPath><clipPath id="${id}-reveal-${i}"><rect data-study-fill="${i}" x="${b.x}" y="${b.y}" width="0" height="${b.h}"/></clipPath><mask id="${id}-material-${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><g clip-path="url(#${id}-row-${i})">${image(`filter="url(#${id}-cream)"`)}</g></mask>`).join('');
   content=image()+rows.map((b,i)=>`<g data-study-row="${i}" data-width="${b.w}" opacity="0" mask="url(#${id}-material-${i})">${image(`filter="url(#${id}-dim)"`)}<g clip-path="url(#${id}-reveal-${i})">${image()}</g></g>`).join('');
  }
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><defs>${defs}</defs>${content}</svg>`;
}

function reorder(layer,nodes){if(nodes.length!==layer.children.length||nodes.some((n,i)=>layer.children[i]!==n))nodes.forEach(n=>layer.append(n));}
export function renderOriginalScene(root,kind,phase){
 const p=Math.max(0,Math.min(1,phase));
 if(kind==='partner'){
  const option=PARTNER_MOTION,depth=sourceCurve(option.keys,p),left=root.querySelector('[data-part=left]'),right=root.querySelector('[data-part=right]');
  left.setAttribute('transform',transform(255,550,option.x*depth,-option.y*depth,1+option.scale*depth));
  right.setAttribute('transform',transform(1298,550,option.x*depth,option.y*depth,1-option.scale*depth));
  const parts=[{node:left,depth},{node:right,depth:-depth}],back=root.querySelector('[data-layer=back]'),front=root.querySelector('[data-layer=front]');
  const behind=parts.filter(x=>x.depth<=0).map(x=>x.node),closer=parts.filter(x=>x.depth>0).map(x=>x.node);
  behind.forEach(n=>{if(n.parentNode!==back)back.append(n);});closer.forEach(n=>{if(n.parentNode!==front)front.append(n);});reorder(back,behind);reorder(front,closer);
  const settle=1-smooth((p-option.reset)/(1-option.reset));
  bars.forEach((b,i)=>{root.querySelector(`[data-fill="${i}"]`).setAttribute('width',(b.w*smooth((p-option.starts[i])/option.fill)).toFixed(4));root.querySelector(`[data-filled="${i}"]`).setAttribute('opacity',String(settle));});
 }else if(kind==='understand'){
  const depth=sourceCurve([[0,0],[.16,0],[.24,1],[.31,.8],[.55,.8],[.72,0],[1,0]],p);
  const arrow=sourceCurve([[0,0],[.08,-14],[.16,-14],[.24,4],[.31,0],[1,0]],p);
  root.querySelector('[data-part=result]').setAttribute('transform',transform(1225,530,0,-24*depth,1+.11*depth));
  root.querySelector('[data-part=result]').setAttribute('opacity',String(sourceCurve([[0,1],[.06,.35],[.16,.35],[.24,1],[1,1]],p)));
  root.querySelector('[data-part=arrow]').setAttribute('transform',transform(805,550,arrow,0,1+.06*depth));
 }else if(kind==='license'){
  const path=root.querySelector('[data-light-path]'),length=path.getTotalLength();
  path.setAttribute('stroke-dasharray',`100 ${length+200}`);path.setAttribute('stroke-dashoffset',String(100-(length+200)*smooth((p-.07)/.76)));
  root.querySelector('[data-study-light]').setAttribute('opacity',String(sourceCurve([[0,0],[.07,0],[.13,1],[.77,1],[.87,0],[1,0]],p)));
 }else{
  const envelope=sourceCurve([[0,0],[.08,1],[.84,1],[1,0]],p);
  root.querySelectorAll('[data-study-row]').forEach((row,i)=>{row.setAttribute('opacity',String(envelope));root.querySelector(`[data-study-fill="${i}"]`).setAttribute('width',(Number(row.dataset.width)*smooth((p-.15-i*.16)/.09)).toFixed(4));});
 }
 root.dataset.motionPhase=p.toFixed(6);
}
