// W05: fixed-size circular bookshelf; no feed SDKs, credentials or social API calls.
export const modulo=(value,length)=>((value%length)+length)%length;
export const MAX_BOOKS=5;
export const MAX_TOP_NEWS=10;
// Keep the established publication-date order and deterministic ID tie-break.
// The public feed has no scheduled-publication or draft-status filter.
export function partitionNews(items){
 const ordered=[...items].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.id).localeCompare(String(b.id)));
 const top=[],archive=[];
 for(const item of ordered)(item.featured===true&&top.length<MAX_TOP_NEWS?top:archive).push(item);
 return {top,archive};
}

export const wrapBookOffset=offset=>modulo(offset+1,MAX_BOOKS)-1;
export function prepareBookOffset(offset,delta){const min=delta===2?0:delta===-2?-2:-1;return modulo(offset-min,MAX_BOOKS)+min;}
export const BOOK_MOTION={select:680,open:1120,close:680,viewOut:240,viewIn:680};
export function bookFlightTransform(source,target,base=''){
 if(![source.left,source.top,source.width,source.height,target.left,target.top,target.width,target.height].every(Number.isFinite)||target.width<=0||target.height<=0)return base;
 return `translate3d(${source.left-target.left}px,${source.top+source.height/2-target.top-target.height/2}px,0) ${base} scale(${source.width/target.width},${source.height/target.height})`;
}
export const INSTAGRAM_ACCOUNTS=['kale1999_','bakedkale'];
export function newsImagePath(item,prefix='',fallback=''){
 // One source for the card, its transition and the article. Retired coverImage
 // values are deliberately ignored, without deleting saved CMS data or files.
 const value=String(item.image||(item.id==='ims-license-updates-policy-20260819'?'assets/ims-license-update.webp':fallback)||'assets/news-fallback-user.svg');
 // CMS media must resolve to this project's public assets, never arbitrary
 // schemes, hosts, HTML metacharacters, query payloads or traversal segments.
 const match=/^(?:https:\/\/raw\.githubusercontent\.com\/Kale1205\/fde-site\/main\/|https:\/\/kale1205\.github\.io\/fde-site\/)?(assets\/[A-Za-z0-9_/-]+\.(?:png|jpe?g|webp|gif|svg))$/.exec(value);
 if(!match)return `${prefix}assets/news-fallback-user.svg`;
 const asset=match[1];
 if(asset.endsWith('20260816-193614-ChatGPT-Image-Aug-16-2026-06_24_32-PM-bca22a.png'))return `${prefix}assets/news-demo-cover.webp`;
 if(asset.endsWith('20260816-211414-ChatGPT-Image-Aug-16-2026-08_58_09-PM-1f5fe7.png'))return `${prefix}assets/news-site-cover.webp`;
 return prefix+asset.split('/').map(encodeURIComponent).join('/');
}
export function validInstagramFeed(feed){
 if(feed?.schemaVersion!==1||feed.connectionStatus!=='connected'||!Array.isArray(feed.posts))return [];
 const connected=new Set((Array.isArray(feed.accounts)?feed.accounts:[]).filter(a=>INSTAGRAM_ACCOUNTS.includes(a.username)&&a.profileUrl===`https://www.instagram.com/${a.username}/`&&a.connectionStatus==='connected').map(a=>a.username));
 return feed.posts.filter(post=>typeof post.id==='string'&&post.id.length<=128&&typeof post.caption==='string'&&post.caption.length<=2200&&post.caption.trim()&&connected.has(post.author)&&post.source==='instagram'&&/^\d{4}-\d{2}-\d{2}T/.test(post.publishedAt||'')&&/^https:\/\/www\.instagram\.com\/(?:p|reel)\/[^/]+\/?$/.test(post.permalink||'')).slice(0,24);
}
export function shuffled(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}

if(typeof document!=='undefined'&&document.body.classList.contains('book-news'))init();
function init(){
 const seed=JSON.parse(document.getElementById('book-news-data').textContent),ui=seed.ui;
 let listView=new URLSearchParams(window.location.search).get('view')==='all';
 const main=document.querySelector('main'),heading=document.querySelector('.news-page-hero h1'),pageHeading=heading.textContent,pageTitle=document.title;
 const overview=document.querySelector('[data-news-overview]'),newsIndex=document.querySelector('[data-news-index]'),social=document.querySelector('.news-social');
 const preserveListLocale=()=>document.querySelectorAll('a[hreflang]').forEach(link=>{const url=new URL(link.href);if(url.origin===window.location.origin&&url.pathname.endsWith('/news.html')){if(listView)url.searchParams.set('view','all');else url.searchParams.delete('view');link.href=url.href;}});
 function showView(next){
  listView=next;document.body.dataset.newsView=listView?'all':'top';
  overview.hidden=listView;newsIndex.hidden=!listView;social.hidden=listView;
  heading.textContent=listView?ui.all:pageHeading;document.title=listView?`${ui.all} | ${pageTitle}`:pageTitle;preserveListLocale();
 }
 showView(listView);document.addEventListener('DOMContentLoaded',preserveListLocale,{once:true});
 const prefix=seed.locale==='en'?'':'../';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const stage=document.querySelector('.book-stage'),reader=document.querySelector('.book-reader'),read=document.querySelector('.book-read');
 const title=document.querySelector('#selected-story-title'),live=document.querySelector('.book-announcement');
 let allItems=seed.items,{top:items}=partitionNews(allItems),index=0,busy=false,queued=0,finishTimer,closeTimer,openingTimer,lastTrigger=null,drag=null,dragFrame=0,suppressClick=false,pendingContent=null,followBookFocus=false,bookAnimations=[],coverAnimation=null,liftedBook=null,flightFrom='',wheelDistance=0,lastWheel=0,viewTimer=0,pendingView=null;
 document.body.dataset.bookInput='pointer';
 document.addEventListener('pointerdown',()=>{document.body.dataset.bookInput='pointer';},{passive:true});
 document.addEventListener('keydown',event=>{if(['Tab','Enter',' ','ArrowLeft','ArrowRight'].includes(event.key))document.body.dataset.bookInput='keyboard';});
 const slots=[...stage.querySelectorAll('.news-book')];
 const clone=slots[0].cloneNode(true);
 for(const offset of [-1,3]){const node=clone.cloneNode(true);node.dataset.offset=offset;node.tabIndex=-1;node.setAttribute('aria-hidden','true');stage.querySelector('.chronicle-panels').append(node);slots.push(node);}
 let newsFallbackImage=seed.newsFallbackImage||'';
 const resolveImage=item=>newsImagePath(item,prefix,newsFallbackImage);
 const text=(v)=>typeof v==='string'?v:v?.[seed.locale==='zh'?'zh-CN':seed.locale]||v?.en||v?.ja||'';
 function fill(node,offset){
  const item=items[modulo(index+offset,items.length)];node.dataset.bookId=item.id;node.dataset.panelTone=item.category==='Product'?'forest':'ivory';
  node.querySelector('.book-accessible').textContent=`${ui.read}: ${item.title} — ${item.date}`;
  const cover=resolveImage(item),art=node.querySelector('.book-art');
  art.hidden=!cover;if(cover)art.src=cover;else art.removeAttribute('src');
  const coverTitle=node.querySelector('.book-cover-title');coverTitle.textContent=item.title;coverTitle.hidden=!!cover;
 }
 function position(node,offset){node.dataset.offset=offset;node.tabIndex=offset===0?0:-1;node.setAttribute('aria-hidden',String(offset<0||offset>Math.min(2,items.length-1)));node.setAttribute('aria-label',`${offset===0?ui.read:offset<0?ui.previous:ui.next}: ${node.querySelector('.book-cover-title').textContent}`);if(offset===0)node.setAttribute('aria-haspopup','dialog');else node.removeAttribute('aria-haspopup');node.style.zIndex=String(10-offset);}
 function selection(announce=false){
  const item=items[index];if(!item)return;title.textContent=item.title;read.dataset.article=item.id;stage.dataset.index=index;stage.dataset.count=items.length;
  const selectedDate=document.querySelector('.chronicle-selected-date');selectedDate.dateTime=item.date;selectedDate.textContent=item.date.replaceAll('-','.');
  document.querySelectorAll('[data-date-offset]').forEach((button,offset)=>{const target=Math.floor(index/3)*3+offset,story=items[target]||items[0];button.dataset.dateIndex=target;button.parentElement.hidden=target>=items.length;button.querySelector('.chronicle-year').textContent=story.date.slice(0,4);const date=button.querySelector('time');date.dateTime=story.date;date.textContent=story.date.slice(5).replace('-','.');button.setAttribute('aria-label',`${target===index?ui.read:ui.next}: ${story.title} — ${story.date}`);button.setAttribute('aria-pressed',String(target===index));if(target===index){button.setAttribute('aria-haspopup','dialog');const top=button.getBoundingClientRect().top-stage.getBoundingClientRect().top+parseFloat(getComputedStyle(button,'::before').top)-2.5;stage.style.setProperty('--date-marker-y',`${top}px`);}else button.removeAttribute('aria-haspopup');});
  const dots=stage.querySelector('.chronicle-pagination');if(dots.children.length!==items.length){dots.replaceChildren();for(const _ of items)dots.append(document.createElement('span'));}[...dots.children].forEach((dot,i)=>dot.classList.toggle('is-active',i===index));
  if(announce){live.textContent=`${index+1} / ${items.length} — ${item.title}`;if(!reduce.matches)title.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'ease-out'});}
 }
 function renderList(){
  const list=document.querySelector('[data-news-list]');list.replaceChildren();
  for(const item of allItems){
   const button=document.createElement('button');button.type='button';button.className='wire-row';button.dataset.storyId=item.id;button.setAttribute('aria-haspopup','dialog');
   const category=document.createElement('div');category.className='wire-type';category.textContent=item.category||'Update';
   const heading=document.createElement('div');heading.className='wire-title';heading.textContent=item.title;
   const date=document.createElement('time');date.dateTime=item.date;date.textContent=item.date.replaceAll('-','.');
   const label=document.createElement('span');label.className='wire-read-more';label.textContent=ui.read;
   button.append(category,heading,date,label);list.append(button);
  }
  document.querySelector('[data-news-list-empty]').hidden=allItems.length>0;
 }
 function render(){
  if(!items.length)live.textContent='';
  stage.dataset.count=items.length;stage.hidden=!items.length;document.querySelector('.book-selection').hidden=!items.length;document.querySelector('[data-top-news-empty]').hidden=items.length>0;
  for(const node of slots){if(!items.length){node.tabIndex=-1;node.setAttribute('aria-hidden','true');continue;}const offset=Number(node.dataset.offset);fill(node,offset);position(node,offset);}
  selection();read.hidden=!items.length;document.querySelector('.book-controls').hidden=items.length<2;renderList();
 }
 function finish(delta){
  clearTimeout(finishTimer);
  for(const animation of bookAnimations)animation.cancel();bookAnimations=[];
  for(const node of slots){const offset=wrapBookOffset(Number(node.dataset.offset));if(offset!==Number(node.dataset.offset)){node.classList.add('is-recycling');fill(node,offset);position(node,offset);requestAnimationFrame(()=>requestAnimationFrame(()=>node.classList.remove('is-recycling')));}}
  busy=false;stage.classList.remove('is-moving');
  if(followBookFocus&&stage.contains(document.activeElement))stage.querySelector('[data-offset="0"]').focus({preventScroll:true});
  if(pendingContent&&!reader.open){const data=pendingContent;pendingContent=null;updateContent(data);}
  if(queued){const step=queued;queued=0;rotate(step);}
 }
 function rotate(delta,fromTransforms){
  if(items.length<2||reader.open)return;
  if(busy){queued=Math.max(-2,Math.min(2,delta));return;}
  for(const node of slots){const offset=prepareBookOffset(Number(node.dataset.offset),delta);if(offset!==Number(node.dataset.offset)){node.classList.add('is-recycling');fill(node,offset);position(node,offset);requestAnimationFrame(()=>node.classList.remove('is-recycling'));}}
  const from=fromTransforms||slots.map(node=>getComputedStyle(node).transform);
  busy=true;followBookFocus=stage.contains(document.activeElement);const focusedPanel=slots.includes(document.activeElement);if(focusedPanel)document.activeElement.blur();stage.classList.add('is-moving');index=modulo(index+delta,items.length);
  for(const node of slots)position(node,Number(node.dataset.offset)-delta);
  selection(true);
  if(focusedPanel)stage.querySelector('[data-offset="0"]').focus({preventScroll:true});
  if(reduce.matches)finish(delta);else{
   bookAnimations=slots.map((node,i)=>{const to=getComputedStyle(node).transform;return node.animate([{transform:from[i]},{transform:`${to} rotateZ(${-delta*2}deg) scale(1.018)`,offset:.76},{transform:to}],{duration:BOOK_MOTION.select,easing:'cubic-bezier(.2,.75,.22,1)'});});
   finishTimer=setTimeout(()=>finish(delta),BOOK_MOTION.select+24);
  }
 }
 function syncDateMarker(){const button=stage.querySelector('[data-date-offset][aria-pressed="true"]');if(button){const top=button.getBoundingClientRect().top-stage.getBoundingClientRect().top+parseFloat(getComputedStyle(button,'::before').top)-2.5;stage.style.setProperty('--date-marker-y',`${top}px`);}}
 render();
 // Both views already exist in this page. Keep their real URLs and browser
 // history, but do not depend on a browser's optional page-navigation effect.
 function finishView(){
  clearTimeout(viewTimer);main.classList.remove('is-news-leaving','is-news-arriving');
  if(!pendingView||reader.open)return;
  const {next,focus}=pendingView;pendingView=null;showView(next);syncDateMarker();
  window.scrollTo({top:0,behavior:'instant'});
  if(focus){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  if(!reduce.matches&&!document.hidden){main.classList.add('is-news-arriving');viewTimer=setTimeout(()=>main.classList.remove('is-news-arriving'),BOOK_MOTION.viewIn);}
 }
 function changeView(next,{push=false,focus=false}={}){
  if(reader.open){if(!push)pendingView={next,focus};return;}
  if(pendingView?.next===next)return;
  if(next===listView&&!pendingView)return;
  if(push){const url=new URL(window.location.href);if(next)url.searchParams.set('view','all');else url.searchParams.delete('view');window.history.pushState(null,'',url);}
  if(busy){queued=0;finish();}
  clearTimeout(viewTimer);main.classList.remove('is-news-arriving');pendingView={next,focus};
  if(reduce.matches||document.hidden)finishView();
  else{main.classList.add('is-news-leaving');viewTimer=setTimeout(finishView,BOOK_MOTION.viewOut);}
 }
 document.querySelectorAll('[data-news-view-all],[data-news-back]').forEach(link=>link.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
  const url=new URL(link.href);if(url.origin!==window.location.origin||url.pathname!==window.location.pathname)return;
  event.preventDefault();changeView(url.searchParams.get('view')==='all',{push:true,focus:true});
 }));
 window.addEventListener('popstate',()=>changeView(new URLSearchParams(window.location.search).get('view')==='all'));
 reduce.addEventListener('change',()=>{if(reduce.matches)finishView();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finishView();});
 if(!reduce.matches&&!document.hidden){main.classList.add('is-news-arriving');viewTimer=setTimeout(()=>main.classList.remove('is-news-arriving'),BOOK_MOTION.viewIn);}
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncDateMarker).observe(stage);else window.addEventListener('resize',syncDateMarker,{passive:true});
 document.querySelectorAll('[data-book-step]').forEach(b=>b.addEventListener('click',()=>rotate(Number(b.dataset.bookStep))));
 document.querySelectorAll('[data-date-offset]').forEach(b=>b.addEventListener('click',()=>{const target=Number(b.dataset.dateIndex);if(target===index)open(items[index].id,b);else{let delta=modulo(target-index,items.length);if(delta>items.length/2)delta-=items.length;rotate(delta);}}));
 stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();rotate(event.key==='ArrowRight'?1:-1);}});
 stage.addEventListener('pointerdown',event=>{if(event.button!==0||busy)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,velocity:0,lastX:event.clientX,lastTime:event.timeStamp,horizontal:false};});
 stage.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.horizontal&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){drag=null;return;}if(Math.abs(dx)>12){drag.horizontal=true;drag.dx=dx;drag.velocity=(event.clientX-drag.lastX)/Math.max(1,event.timeStamp-drag.lastTime);drag.lastX=event.clientX;drag.lastTime=event.timeStamp;stage.setPointerCapture(event.pointerId);if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(drag)stage.style.setProperty('--drag',`${Math.max(-96,Math.min(96,drag.dx))}px`);});}});
 function endDrag(event){if(!drag||event.pointerId!==drag.id)return;const state=drag,from=slots.map(node=>getComputedStyle(node).transform);drag=null;cancelAnimationFrame(dragFrame);dragFrame=0;stage.style.removeProperty('--drag');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);if(state.horizontal){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);if(event.type!=='pointercancel'&&(Math.abs(state.dx)>36||Math.abs(state.velocity)>.35))rotate(state.dx<0?1:-1,from);else if(!reduce.matches)slots.forEach((node,i)=>node.animate([{transform:from[i]},{transform:getComputedStyle(node).transform}],{duration:300,easing:'cubic-bezier(.2,.75,.22,1)'}));}}
 stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
 stage.addEventListener('wheel',event=>{if(reader.open||items.length<2||(!event.shiftKey&&Math.abs(event.deltaX)<=Math.abs(event.deltaY)))return;event.preventDefault();const now=performance.now();if(now-lastWheel>180)wheelDistance=0;lastWheel=now;wheelDistance+=(event.deltaX||event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?innerWidth:1);if(Math.abs(wheelDistance)>56){rotate(Math.sign(wheelDistance));wheelDistance=0;}},{passive:false});
 stage.addEventListener('click',event=>{if(suppressClick||busy)return;const book=event.target.closest('.news-book');if(!book)return;const offset=Number(book.dataset.offset);if(offset===1||offset===2)rotate(offset);else if(offset===0)open(book.dataset.bookId,book);});
 read.addEventListener('click',()=>{if(items[index])open(items[index].id,read);});
 document.querySelector('[data-news-list]').addEventListener('click',event=>{const row=event.target.closest('[data-story-id]');if(row)open(row.dataset.storyId,row);});
 function open(id,trigger){
  const item=allItems.find(i=>i.id===id);if(!item||reader.open)return;
  lastTrigger=trigger;queued=0;clearTimeout(closeTimer);clearTimeout(openingTimer);
  coverAnimation?.cancel();liftedBook=!listView&&items[index]?.id===id?slots.find(node=>Number(node.dataset.offset)===0):null;
  const sourceRect=liftedBook?.getBoundingClientRect();
  reader.classList.remove('is-closing','is-opening','is-ready','is-reduced');reader.classList.add('is-preparing');
  reader.classList.toggle('is-reduced',reduce.matches);
  const cover=resolveImage(item),coverArt=reader.querySelector('.opening-cover-art');
  coverArt.hidden=!cover;if(cover)coverArt.src=cover;else coverArt.removeAttribute('src');
  const coverTitle=reader.querySelector('.opening-cover-title');coverTitle.textContent=item.title;coverTitle.hidden=!!cover;
  reader.querySelector('.book-opening-cover').dataset.panelTone=item.category==='Product'?'forest':'ivory';
  const image=reader.querySelector('.reader-image');image.src=resolveImage(item);image.alt=item.title;
  const date=reader.querySelector('.reader-date');date.textContent=item.date.replaceAll('-','.');date.dateTime=item.date;
  reader.querySelector('.reader-category').textContent=item.category||'Update';
  reader.querySelector('#book-article-title').textContent=item.title;
  const body=reader.querySelector('.reader-body');body.replaceChildren();
  for(const paragraph of item.body.split(/\n\n+/)){const p=document.createElement('p');p.textContent=paragraph;body.append(p);}
  reader.showModal();reader.scrollTop=0;reader.querySelector('.reader-copy').scrollTop=0;document.body.classList.add('book-reader-open');reader.querySelector('.book-close').focus({preventScroll:true});
  const openingCover=reader.querySelector('.book-opening-cover'),base='translate3d(0,0,0)';
  // The all-story list opens the article directly. Only a Top News book keeps
  // its established travelling cover; the article's slow arrival is shared.
  openingCover.hidden=listView;reader.classList.toggle('is-list-reader',listView);
  flightFrom=sourceRect?bookFlightTransform(sourceRect,openingCover.getBoundingClientRect(),base):base;
  if(!reduce.matches){openingCover.style.transform=flightFrom;liftedBook?.classList.add('is-lifted');}
  // Background Safari can suspend animation frames even after showModal().
  // Static readers must never wait for those frames to reveal their content.
  if(reduce.matches||document.hidden){reader.classList.remove('is-preparing');reader.classList.add('is-ready');return;}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(!reader.open||reader.classList.contains('is-closing'))return;
   reader.classList.remove('is-preparing');reader.classList.add('is-opening');
   if(!reduce.matches&&!listView){openingCover.style.removeProperty('transform');coverAnimation=openingCover.animate([{transform:flightFrom,opacity:1,easing:'cubic-bezier(.22,.65,.18,1)'},{transform:base+' rotateY(-3deg)',opacity:1,offset:.55,easing:'ease-out'},{transform:base,opacity:.3,offset:.82},{transform:base,opacity:0}],{duration:BOOK_MOTION.open,easing:'linear',fill:'forwards'});}
   openingTimer=setTimeout(()=>{reader.classList.remove('is-opening');reader.classList.add('is-ready');},reduce.matches?220:BOOK_MOTION.open+24);
  }));
 }
 function close(){if(!reader.open||reader.classList.contains('is-closing'))return;clearTimeout(openingTimer);const cover=reader.querySelector('.book-opening-cover'),current=getComputedStyle(cover),from={transform:current.transform,opacity:current.opacity};coverAnimation?.cancel();cover.style.removeProperty('transform');if(liftedBook)flightFrom=bookFlightTransform(liftedBook.getBoundingClientRect(),cover.getBoundingClientRect(),'translate3d(0,0,0)');reader.classList.remove('is-ready','is-opening','is-preparing');reader.classList.add('is-closing');if(!reduce.matches&&!cover.hidden){coverAnimation=cover.animate([from,{transform:'translate3d(0,0,0)',opacity:1,offset:.48},{transform:flightFrom,opacity:1}],{duration:BOOK_MOTION.close,easing:'cubic-bezier(.3,0,.2,1)',fill:'forwards'});}closeTimer=setTimeout(()=>{coverAnimation?.cancel();coverAnimation=null;cover.style.removeProperty('transform');reader.close();reader.classList.remove('is-closing');liftedBook?.classList.remove('is-lifted');document.body.classList.remove('book-reader-open');if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});lastTrigger=null;if(pendingView)finishView();if(pendingContent){const data=pendingContent;pendingContent=null;updateContent(data);}},reduce.matches?0:BOOK_MOTION.close);}
 reader.querySelector('.book-close').addEventListener('click',close);
 reader.addEventListener('cancel',event=>{event.preventDefault();close();});
 reader.addEventListener('click',event=>{if(event.target!==reader)return;const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 function updateContent(data){
  if(!Array.isArray(data?.news))return;
  if(busy||reader.open){pendingContent=data;return;}
  const next=data.news.filter(x=>x&&typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&text(x.title)).sort((a,b)=>b.date.localeCompare(a.date)||String(a.id).localeCompare(String(b.id))).map(x=>({...x,title:text(x.title),body:text(x.body),image:x.image||''}));
  const current=items[index]?.id;
  const fallback=typeof data.newsFallbackImage==='string'?data.newsFallbackImage:'';
  if(JSON.stringify(allItems)===JSON.stringify(next)&&newsFallbackImage===fallback)return;
  newsFallbackImage=fallback;allItems=next;({top:items}=partitionNews(allItems));index=Math.max(0,items.findIndex(x=>x.id===current));render();
 }
 document.addEventListener('fde:news-content',event=>updateContent(event.detail));
 initInstagram({prefix,ui,reduce,reader});
}

function initInstagram({prefix,ui,reduce,reader}){
 const root=document.querySelector('.instagram-feed'),lanes=[...root.querySelectorAll('.bubble-lane')],pause=root.querySelector('.social-pause');
 let visible=false,paused=false,posts=[],frame=0,lastTime=0,offsets=[0,0],widths=[],nodes=[[],[]];
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'80px'});observer.observe(root);
 function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
 function sync(){stop();if(visible&&!document.hidden&&!paused&&!reduce.matches&&!reader.open&&posts.length)frame=requestAnimationFrame(tick);}
 function tick(now){const elapsed=lastTime?Math.min((now-lastTime)/1000,.05):0;lastTime=now;
  lanes.forEach((lane,row)=>{offsets[row]-=elapsed*(row?17:21);const first=nodes[row][0];if(first&&offsets[row]+widths[row][0]< -12){offsets[row]+=widths[row][0];nodes[row].push(nodes[row].shift());widths[row].push(widths[row].shift());lane.append(first);fillBubble(first,posts[Math.floor(Math.random()*posts.length)]);}lane.style.transform=`translate3d(${offsets[row]}px,0,0)`;});frame=requestAnimationFrame(tick);}
 function fillBubble(bubble,post){bubble.firstElementChild.textContent=post.caption.length>110?post.caption.slice(0,110)+'…':post.caption;bubble.lastElementChild.textContent=`@${post.author}`;bubble.lang=post.lang||'ja';}
 function paint(){
  root.querySelector('.instagram-empty').hidden=true;root.querySelector('.social-bubbles').hidden=false;root.dataset.feedState='connected';pause.hidden=false;
  const accessible=root.querySelector('.social-post-text');accessible.replaceChildren();
  for(const post of posts){const p=document.createElement('p');p.lang=post.lang||'ja';p.textContent=`Instagram @${post.author} — ${post.caption}`;accessible.append(p);}
  lanes.forEach((lane,row)=>{lane.replaceChildren();const order=shuffled(posts);for(let i=0;i<6;i++){const post=order[(i+row)%order.length];const bubble=document.createElement('span');bubble.className='social-bubble';bubble.append(document.createElement('span'),document.createElement('small'));fillBubble(bubble,post);lane.append(bubble);}nodes[row]=[...lane.children];widths[row]=nodes[row].map(()=>292);});sync();
 }
 pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?ui.resume:ui.pause;sync();});
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);reader.addEventListener('close',sync);
 new MutationObserver(sync).observe(reader,{attributes:true,attributeFilter:['open']});
 // This same-origin public file contains only approved published captions. Never tokens.
 let loaded=false;
 const loadObserver=new IntersectionObserver(async entries=>{
  if(!entries[0].isIntersecting||loaded)return;loaded=true;loadObserver.disconnect();
  const status=root.querySelector('.instagram-empty'),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
  status.textContent=ui.loading;root.dataset.feedState='loading';
  try{
   const response=await fetch(`${prefix}content/instagram-feed.json`,{credentials:'omit',cache:'default',signal:controller.signal});
   if(!response.ok)throw Error('feed unavailable');const data=await response.json();
   if(data.schemaVersion!==1||!Array.isArray(data.accounts))throw Error('invalid feed');
   posts=validInstagramFeed(data);
   if(posts.length)paint();
   else if(data.connectionStatus==='not-connected'){root.dataset.feedState='not-connected';status.textContent='';}
   else if(data.connectionStatus==='connected'){root.dataset.feedState='empty';status.textContent='';}
   else throw Error('feed unavailable');
  }catch{root.dataset.feedState='unavailable';status.textContent='';}
  finally{clearTimeout(timeout);}
 },{rootMargin:'200px'});loadObserver.observe(root);
}
