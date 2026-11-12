// The only approved change to existing Japanese navigation destinations.
export const pendingLpDestination='<span class="nav-destination-pending" data-lp-destination aria-disabled="true" aria-label="LP制作（準備中）">LP制作 <span class="nav-destination-status">準備中</span></span>';
export const liveLpDestination='<a href="lp/" data-lp-destination>LP制作</a>';
const pages=new Set(['index','quiet-form','license','goals','news','demo','contact','customer','order'].map(name=>'ja/'+name+'.html'));
export function withLpDestination(file,source){
 return pages.has(file)?source.replaceAll(pendingLpDestination,liveLpDestination):source;
}
