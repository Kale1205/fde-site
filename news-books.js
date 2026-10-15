// W05: fixed-size circular bookshelf; no feed SDKs, credentials or social API calls.
export const modulo=(value,length)=>((value%length)+length)%length;
export const MAX_BOOKS=5;
export const BOOK_MOTION={select:680,open:1120,close:680};
export function bookFlightTransform(source,target,base=''){
 if(![source.left,source.top,source.width,source.height,target.left,target.top,target.width,target.height].every(Number.isFinite)||target.width<=0||target.height<=0)return base;
 return `translate3d(${source.left-target.left}px,${source.top+source.height/2-target.top-target.height/2}px,0) ${base} scale(${source.width/target.width},${source.height/target.height})`;
}
export const INSTAGRAM_ACCOUNTS=['kale1999_','bakedkale'];
export function newsImagePath(item,prefix=''){
 if(item.id==='ims-license-updates-policy-20260819')return `${prefix}assets/ims-license-update.webp`;
 const value=String(item.image||'assets/news-fallback-user.svg');
 // CMS media must resolve to this project's public assets, never arbitrary
 // schemes, hosts, HTML metacharacters, query payloads or traversal segments.
 const match=/^(?:https:\/\/raw\.githubusercontent\.com\/Kale1205\/fde-site\/main\/|https:\/\/kale1205\.github\.io\/fde-site\/)?(assets\/[A-Za-z0-9_/-]+\.(?:png|jpe?g|webp|gif|svg))$/.exec(value);
 if(!match)return `${prefix}assets/news-fallback-user.svg`;
 const asset=match[1];
 if(asset.endsWith('20260816-193614-ChatGPT-Image-Aug-16-2026-06_24_32-PM-bca22a.png'))return `${prefix}assets/news-demo-cover.webp`;
 if(asset.endsWith('20260816-211414-ChatGPT-Image-Aug-16-2026-08_58_09-PM-1f5fe7.png'))return `${prefix}assets/news-site-cover.webp`;
 return prefix+asset.split('/').map(encodeURIComponent).join('/');
}
export function newsCoverPath(item,prefix=''){
 // Cover artwork is independent of the image displayed inside the article.
 // Existing featured artwork is a cover default only until the owner sets one.
 const cover=Object.hasOwn(item,'coverImage')?item.coverImage:(item.id==='ims-license-updates-policy-20260819'?'assets/ims-license-update.webp':'');
 if(!cover)return '';
 const image=newsImagePath({image:cover},prefix);
 return image===`${prefix}assets/news-fallback-user.svg`?'':image;
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
 const prefix=seed.locale==='en'?'':'../';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const stage=document.querySelector('.book-stage'),reader=document.querySelector('.book-reader'),read=document.querySelector('.book-read');
 const title=document.querySelector('#selected-story-title'),live=document.querySelector('.book-announcement');
 let items=seed.items,index=Math.max(0,items.findIndex(i=>i.featured)),busy=false,queued=0,finishTimer,closeTimer,openingTimer,lastTrigger=null,drag=null,dragFrame=0,suppressClick=false,pendingContent=null,followBookFocus=false,bookAnimations=[],coverAnimation=null,liftedBook=null,flightFrom='',wheelDistance=0,lastWheel=0;
 document.body.dataset.bookInput='pointer';
 document.addEventListener('pointerdown',()=>{document.body.dataset.bookInput='pointer';},{passive:true});
 document.addEventListener('keydown',event=>{if(['Tab','Enter',' ','ArrowLeft','ArrowRight'].includes(event.key))document.body.dataset.bookInput='keyboard';});
 const slots=[...stage.querySelectorAll('.news-book')];
 const clone=slots[1].cloneNode(true);
 for(const offset of [-2,2]){const node=clone.cloneNode(true);node.dataset.offset=offset;node.tabIndex=-1;node.setAttribute('aria-hidden','true');stage.append(node);slots.push(node);}
 const resolveImage=item=>newsImagePath(item,prefix);
 const text=(v)=>typeof v==='string'?v:v?.[seed.locale==='zh'?'zh-CN':seed.locale]||v?.en||v?.ja||'';
 function fill(node,offset){
  const item=items[modulo(index+offset,items.length)];node.dataset.bookId=item.id;
  node.querySelector('.book-accessible').textContent=`${ui.read}: ${item.title} — ${item.date}`;
  const cover=newsCoverPath(item,prefix),art=node.querySelector('.book-art');
  art.hidden=!cover;if(cover)art.src=cover;else art.removeAttribute('src');
  const coverTitle=node.querySelector('.book-cover-title');coverTitle.textContent=item.title;coverTitle.hidden=!!cover;
  for(const time of node.querySelectorAll('time')){time.dateTime=item.date;time.textContent=item.date.replaceAll('-','.');}
  node.querySelector('.book-stamp > span').textContent=ui.category[item.category]||item.category;
  node.querySelector('.book-spine-title').textContent=item.title;
 }
 function position(node,offset){node.dataset.offset=offset;node.tabIndex=offset===0?0:-1;node.setAttribute('aria-hidden',String(Math.abs(offset)>1));node.setAttribute('aria-label',`${offset===0?ui.read:offset<0?ui.previous:ui.next}: ${node.querySelector('.book-spine-title').textContent}`);if(offset===0)node.setAttribute('aria-haspopup','dialog');else node.removeAttribute('aria-haspopup');node.style.zIndex=String(10-Math.abs(offset));}
 function selection(announce=false){title.textContent=items[index].title;read.dataset.article=items[index].id;stage.dataset.index=index;stage.dataset.count=items.length;if(announce){live.textContent=`${index+1} / ${items.length} — ${items[index].title}`;if(!reduce.matches)title.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'ease-out'});}}
 function render(){for(const node of slots){const offset=Number(node.dataset.offset);fill(node,offset);position(node,offset);}selection();document.querySelector('.book-controls').hidden=items.length<2;}
 function finish(delta){
  clearTimeout(finishTimer);
  for(const animation of bookAnimations)animation.cancel();bookAnimations=[];
  for(const node of slots){let offset=Number(node.dataset.offset);if(offset< -2||offset>2){offset+=delta*MAX_BOOKS;node.classList.add('is-recycling');fill(node,offset);position(node,offset);requestAnimationFrame(()=>requestAnimationFrame(()=>node.classList.remove('is-recycling')));}}
  busy=false;stage.classList.remove('is-moving');
  if(followBookFocus&&stage.contains(document.activeElement))stage.querySelector('[data-offset="0"]').focus({preventScroll:true});
  if(pendingContent&&!reader.open){const data=pendingContent;pendingContent=null;updateContent(data);}
  if(queued){const step=Math.sign(queued);queued-=step;rotate(step);}
 }
 function rotate(delta,fromTransforms){
  if(items.length<2||reader.open)return;
  if(busy){queued=Math.sign(delta);return;}
  const from=fromTransforms||slots.map(node=>getComputedStyle(node).transform);
  busy=true;followBookFocus=stage.contains(document.activeElement);stage.classList.add('is-moving');index=modulo(index+delta,items.length);
  for(const node of slots)position(node,Number(node.dataset.offset)-delta);
  selection(true);
  if(reduce.matches)finish(delta);else{
   bookAnimations=slots.map((node,i)=>{const to=getComputedStyle(node).transform;return node.animate([{transform:from[i]},{transform:`${to} rotateZ(${-delta*2}deg) scale(1.018)`,offset:.76},{transform:to}],{duration:BOOK_MOTION.select,easing:'cubic-bezier(.2,.75,.22,1)'});});
   finishTimer=setTimeout(()=>finish(delta),BOOK_MOTION.select+24);
  }
 }
 render();read.hidden=false;
 document.querySelectorAll('[data-book-step]').forEach(b=>b.addEventListener('click',()=>rotate(Number(b.dataset.bookStep))));
 stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();rotate(event.key==='ArrowRight'?1:-1);}});
 stage.addEventListener('pointerdown',event=>{if(event.button!==0||busy)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,velocity:0,lastX:event.clientX,lastTime:event.timeStamp,horizontal:false};});
 stage.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.horizontal&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){drag=null;return;}if(Math.abs(dx)>12){drag.horizontal=true;drag.dx=dx;drag.velocity=(event.clientX-drag.lastX)/Math.max(1,event.timeStamp-drag.lastTime);drag.lastX=event.clientX;drag.lastTime=event.timeStamp;stage.setPointerCapture(event.pointerId);if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(drag)stage.style.setProperty('--drag',`${Math.max(-96,Math.min(96,drag.dx))}px`);});}});
 function endDrag(event){if(!drag||event.pointerId!==drag.id)return;const state=drag,from=slots.map(node=>getComputedStyle(node).transform);drag=null;cancelAnimationFrame(dragFrame);dragFrame=0;stage.style.removeProperty('--drag');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);if(state.horizontal){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);if(event.type!=='pointercancel'&&(Math.abs(state.dx)>36||Math.abs(state.velocity)>.35))rotate(state.dx<0?1:-1,from);else if(!reduce.matches)slots.forEach((node,i)=>node.animate([{transform:from[i]},{transform:getComputedStyle(node).transform}],{duration:300,easing:'cubic-bezier(.2,.75,.22,1)'}));}}
 stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
 stage.addEventListener('wheel',event=>{if(reader.open||items.length<2||(!event.shiftKey&&Math.abs(event.deltaX)<=Math.abs(event.deltaY)))return;event.preventDefault();const now=performance.now();if(now-lastWheel>180)wheelDistance=0;lastWheel=now;wheelDistance+=(event.deltaX||event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?innerWidth:1);if(Math.abs(wheelDistance)>56){rotate(Math.sign(wheelDistance));wheelDistance=0;}},{passive:false});
 stage.addEventListener('click',event=>{if(suppressClick||busy)return;const book=event.target.closest('.news-book');if(!book)return;const offset=Number(book.dataset.offset);if(Math.abs(offset)===1)rotate(offset);else if(offset===0)open(book.dataset.bookId,book);});
 read.addEventListener('click',()=>open(items[index].id,read));
 function open(id,trigger){
  const item=items.find(i=>i.id===id);if(!item||reader.open)return;
  lastTrigger=trigger;queued=0;clearTimeout(closeTimer);clearTimeout(openingTimer);
  coverAnimation?.cancel();liftedBook=slots.find(node=>Number(node.dataset.offset)===0);
  const sourceRect=liftedBook?.getBoundingClientRect();
  reader.classList.remove('is-closing','is-opening','is-ready','is-reduced');reader.classList.add('is-preparing');
  reader.classList.toggle('is-reduced',reduce.matches);
  const cover=newsCoverPath(item,prefix),coverArt=reader.querySelector('.opening-cover-art');
  coverArt.hidden=!cover;if(cover)coverArt.src=cover;else coverArt.removeAttribute('src');
  const coverTitle=reader.querySelector('.opening-cover-title');coverTitle.textContent=item.title;coverTitle.hidden=!!cover;
  let stamp=reader.querySelector('.opening-cover-stamp');if(!stamp){stamp=document.createElement('span');stamp.className='opening-cover-stamp';stamp.append(document.createElement('time'),document.createElement('span'));reader.querySelector('.book-opening-cover').append(stamp);}stamp.firstElementChild.textContent=item.date.replaceAll('-','.');stamp.lastElementChild.textContent=ui.category[item.category]||item.category;
  const image=reader.querySelector('.reader-image');image.src=resolveImage(item);image.alt=item.title;
  const date=reader.querySelector('.reader-date');date.textContent=item.date.replaceAll('-','.');date.dateTime=item.date;
  reader.querySelector('.reader-category').textContent=ui.category[item.category]||item.category;
  reader.querySelector('#book-article-title').textContent=item.title;
  const body=reader.querySelector('.reader-body');body.replaceChildren();
  for(const paragraph of item.body.split(/\n\n+/)){const p=document.createElement('p');p.textContent=paragraph;body.append(p);}reader.querySelector('.reader-copy').scrollTop=0;
  if(matchMedia('(min-width: 700px)').matches){const paper=reader.querySelector('.book-paper');paper.src=paper.dataset.src;}
  reader.showModal();reader.scrollTop=0;document.body.classList.add('book-reader-open');reader.querySelector('.book-close').focus({preventScroll:true});
  const openingCover=reader.querySelector('.book-opening-cover'),mobile=matchMedia('(max-width: 699px)').matches,base=mobile?'translateY(-50%)':'translateX(-50%)';
  flightFrom=sourceRect?bookFlightTransform(sourceRect,openingCover.getBoundingClientRect(),base):base;
  if(!reduce.matches){openingCover.style.transform=flightFrom;liftedBook?.classList.add('is-lifted');}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(!reader.open||reader.classList.contains('is-closing'))return;
   reader.classList.remove('is-preparing');reader.classList.add('is-opening');
   if(!reduce.matches){openingCover.style.removeProperty('transform');const hinge=mobile?base:'translateX(0)';coverAnimation=openingCover.animate([{transform:flightFrom,opacity:1,easing:'cubic-bezier(.22,.65,.18,1)'},{transform:base+' rotateY(-8deg)',opacity:1,offset:.32,easing:'ease-in-out'},{transform:hinge+' rotateY(-72deg)',opacity:1,offset:.61,easing:'ease-out'},{transform:hinge+' rotateY(-168deg)',opacity:.8,offset:.91},{transform:hinge+' rotateY(-178deg)',opacity:0}],{duration:BOOK_MOTION.open,easing:'linear',fill:'forwards'});}
   openingTimer=setTimeout(()=>{reader.classList.remove('is-opening');reader.classList.add('is-ready');},reduce.matches?220:BOOK_MOTION.open+24);
  }));
 }
 function close(){if(!reader.open||reader.classList.contains('is-closing'))return;clearTimeout(openingTimer);const cover=reader.querySelector('.book-opening-cover'),current=getComputedStyle(cover),from={transform:current.transform,opacity:current.opacity};coverAnimation?.cancel();reader.classList.remove('is-ready','is-opening','is-preparing');reader.classList.add('is-closing');if(!reduce.matches){const base=matchMedia('(max-width: 699px)').matches?'translateY(-50%)':'translateX(-50%)';coverAnimation=cover.animate([from,{transform:base,opacity:1,offset:.48},{transform:flightFrom,opacity:1}],{duration:BOOK_MOTION.close,easing:'cubic-bezier(.3,0,.2,1)',fill:'forwards'});}closeTimer=setTimeout(()=>{coverAnimation?.cancel();coverAnimation=null;cover.style.removeProperty('transform');reader.close();reader.classList.remove('is-closing');liftedBook?.classList.remove('is-lifted');document.body.classList.remove('book-reader-open');if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});lastTrigger=null;if(pendingContent){const data=pendingContent;pendingContent=null;updateContent(data);}},reduce.matches?0:BOOK_MOTION.close);}
 reader.querySelector('.book-close').addEventListener('click',close);
 reader.addEventListener('cancel',event=>{event.preventDefault();close();});
 reader.addEventListener('click',event=>{if(event.target!==reader)return;const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 function updateContent(data){
  if(!Array.isArray(data?.news))return;
  if(busy||reader.open){pendingContent=data;return;}
  const next=data.news.filter(x=>x&&typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&text(x.title)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id))).map(x=>({...x,title:text(x.title),body:text(x.body),image:x.image||data.newsFallbackImage}));
  if(!next.length)return;const current=items[index]?.id;
  if(JSON.stringify(items)===JSON.stringify(next))return;
  items=next;index=Math.max(0,items.findIndex(x=>x.id===current));render();
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
