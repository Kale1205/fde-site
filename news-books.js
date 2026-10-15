// W05: fixed-size circular bookshelf; no feed SDKs, credentials or social API calls.
export const modulo=(value,length)=>((value%length)+length)%length;
export const MAX_BOOKS=5;
export const INSTAGRAM_ACCOUNTS=['kale1999_','bakedkale'];
export function newsImagePath(item,prefix=''){
 if(item.id==='ims-license-updates-policy-20260819')return `${prefix}assets/ims-license-update.webp`;
 const value=String(item.image||'assets/news-fallback-user.svg');
 // CMS media must resolve to this project's public assets, never arbitrary
 // schemes, hosts, HTML metacharacters, query payloads or traversal segments.
 const match=/^(?:https:\/\/raw\.githubusercontent\.com\/Kale1205\/fde-site\/main\/|https:\/\/kale1205\.github\.io\/fde-site\/)?(assets\/[A-Za-z0-9_/-]+\.(?:png|jpe?g|webp|svg))$/.exec(value);
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
 const prefix=seed.locale==='en'?'':'../';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const stage=document.querySelector('.book-stage'),reader=document.querySelector('.book-reader'),read=document.querySelector('.book-read');
 const title=document.querySelector('#selected-story-title'),live=document.querySelector('.book-announcement');
 let items=seed.items,index=Math.max(0,items.findIndex(i=>i.featured)),busy=false,queued=0,finishTimer,closeTimer,lastTrigger=null,drag=null,dragFrame=0,suppressClick=false,pendingContent=null,followBookFocus=false;
 const slots=[...stage.querySelectorAll('.news-book')];
 const clone=slots[1].cloneNode(true);
 for(const offset of [-2,2]){const node=clone.cloneNode(true);node.dataset.offset=offset;node.tabIndex=-1;node.setAttribute('aria-hidden','true');stage.append(node);slots.push(node);}
 const resolveImage=item=>newsImagePath(item,prefix);
 const text=(v)=>typeof v==='string'?v:v?.[seed.locale==='zh'?'zh-CN':seed.locale]||v?.en||v?.ja||'';
 function fill(node,offset){
  const item=items[modulo(index+offset,items.length)];node.dataset.bookId=item.id;
  node.querySelector('.book-accessible').textContent=`${ui.read}: ${item.title} — ${item.date}`;
  node.querySelector('.book-art').src=resolveImage(item);
  for(const time of node.querySelectorAll('time')){time.dateTime=item.date;time.textContent=item.date.replaceAll('-','.');}
  node.querySelector('.book-stamp > span').textContent=ui.category[item.category]||item.category;
  node.querySelector('.book-spine > span').textContent=item.title;
 }
 function position(node,offset){node.dataset.offset=offset;node.tabIndex=offset===0?0:-1;node.setAttribute('aria-hidden',String(Math.abs(offset)>1));node.style.zIndex=String(10-Math.abs(offset));}
 function selection(announce=false){title.textContent=items[index].title;read.dataset.article=items[index].id;stage.dataset.index=index;stage.dataset.count=items.length;if(announce)live.textContent=`${index+1} / ${items.length} — ${items[index].title}`;}
 function render(){for(const node of slots){const offset=Number(node.dataset.offset);fill(node,offset);position(node,offset);}selection();document.querySelector('.book-controls').hidden=items.length<2;}
 function finish(delta){
  clearTimeout(finishTimer);
  for(const node of slots){let offset=Number(node.dataset.offset);if(offset< -2||offset>2){offset+=delta*MAX_BOOKS;node.classList.add('is-recycling');fill(node,offset);position(node,offset);requestAnimationFrame(()=>requestAnimationFrame(()=>node.classList.remove('is-recycling')));}}
  busy=false;stage.classList.remove('is-moving');
  if(followBookFocus&&stage.contains(document.activeElement))stage.querySelector('[data-offset="0"]').focus({preventScroll:true});
  if(pendingContent&&!reader.open){const data=pendingContent;pendingContent=null;updateContent(data);}
  if(queued){const step=Math.sign(queued);queued-=step;rotate(step);}
 }
 function rotate(delta){
  if(items.length<2||reader.open)return;
  if(busy){queued=Math.max(-8,Math.min(8,queued+delta));return;}
  busy=true;followBookFocus=stage.contains(document.activeElement);stage.classList.add('is-moving');index=modulo(index+delta,items.length);
  for(const node of slots)position(node,Number(node.dataset.offset)-delta);
  selection(true);
  if(reduce.matches)finish(delta);else finishTimer=setTimeout(()=>finish(delta),560);
 }
 render();read.hidden=false;
 document.querySelectorAll('[data-book-step]').forEach(b=>b.addEventListener('click',()=>rotate(Number(b.dataset.bookStep))));
 stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();rotate(event.key==='ArrowRight'?1:-1);}});
 stage.addEventListener('pointerdown',event=>{if(event.button!==0||busy)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false};});
 stage.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.horizontal&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){drag=null;return;}if(Math.abs(dx)>12){drag.horizontal=true;drag.dx=dx;stage.setPointerCapture(event.pointerId);if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(drag)stage.style.setProperty('--drag',`${Math.max(-48,Math.min(48,drag.dx))}px`);});}});
 function endDrag(event){if(!drag||event.pointerId!==drag.id)return;const state=drag;drag=null;cancelAnimationFrame(dragFrame);dragFrame=0;stage.style.removeProperty('--drag');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);if(state.horizontal){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);if(event.type!=='pointercancel'&&Math.abs(state.dx)>36)rotate(state.dx<0?1:-1);}}
 stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
 stage.addEventListener('click',event=>{if(suppressClick||busy)return;const book=event.target.closest('.news-book');if(book&&Math.abs(Number(book.dataset.offset))<=1)open(book.dataset.bookId,book);});
 read.addEventListener('click',()=>open(items[index].id,read));
 function open(id,trigger){
  const item=items.find(i=>i.id===id);if(!item||reader.open)return;
  lastTrigger=trigger;queued=0;reader.classList.remove('is-closing');clearTimeout(closeTimer);
  const image=reader.querySelector('.reader-image');image.src=resolveImage(item);image.alt=item.title;
  const date=reader.querySelector('.reader-date');date.textContent=item.date.replaceAll('-','.');date.dateTime=item.date;
  reader.querySelector('.reader-category').textContent=ui.category[item.category]||item.category;
  reader.querySelector('#book-article-title').textContent=item.title;
  const body=reader.querySelector('.reader-body');body.replaceChildren();
  for(const paragraph of item.body.split(/\n\n+/)){const p=document.createElement('p');p.textContent=paragraph;body.append(p);}body.scrollTop=0;
  if(matchMedia('(min-width: 700px)').matches){const paper=reader.querySelector('.book-paper');paper.src=paper.dataset.src;}
  reader.showModal();document.body.classList.add('book-reader-open');reader.querySelector('.book-close').focus({preventScroll:true});
 }
 function close(){if(!reader.open||reader.classList.contains('is-closing'))return;reader.classList.add('is-closing');closeTimer=setTimeout(()=>{reader.close();reader.classList.remove('is-closing');document.body.classList.remove('book-reader-open');if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});lastTrigger=null;if(pendingContent){const data=pendingContent;pendingContent=null;updateContent(data);}},reduce.matches?0:180);}
 reader.querySelector('.book-close').addEventListener('click',close);
 reader.addEventListener('cancel',event=>{event.preventDefault();close();});
 reader.addEventListener('click',event=>{if(event.target!==reader)return;const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 function updateContent(data){
  if(!Array.isArray(data?.news))return;
  if(busy||reader.open){pendingContent=data;return;}
  const next=data.news.filter(x=>x&&typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&text(x.title)).sort((a,b)=>b.date.localeCompare(a.date)).map(x=>({...x,title:text(x.title),body:text(x.body),image:x.image||data.newsFallbackImage}));
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
   else if(data.connectionStatus==='not-connected'){root.dataset.feedState='not-connected';status.textContent=ui.empty;}
   else if(data.connectionStatus==='connected'){root.dataset.feedState='empty';status.textContent=ui.noPosts;}
   else throw Error('feed unavailable');
  }catch{root.dataset.feedState='unavailable';status.textContent=ui.unavailable;}
  finally{clearTimeout(timeout);}
 },{rootMargin:'200px'});loadObserver.observe(root);
}
