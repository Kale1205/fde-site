import {motionPreference} from '../../motion-preferences.js';
const field=document.querySelector('#field'),canvas=document.querySelector('#canvas'),grid=document.querySelector('#storygrid'),detail=document.querySelector('#detail');let mode='archive',x=0,y=0,z=1,drag=null,moved=false,lastSelected=0;
const photoNames=['コーヒーと朝の光','ラベンダー色のスタジオ','木のある住まい','花と陶器の花器','革の小物','机上の図面','金属のパーツ','陶器と土','ノートと鉛筆','撮影用カメラ','緑色のガラス','植物の影'];
function photo(i,extra=''){return `<div class="concept-photo ${extra}" role="img" aria-label="${photoNames[i%12]}・架空の生成イメージ" style="--px:${(i%4)*100/3}%;--py:${Math.floor(i/4)*50}%"></div>`}
function print(i){const s=studies[i];return `<div class="paper study-${s.style}"><small>[${String(i+1).padStart(2,'0')}] ${s.type} / FICTIONAL</small><div class="paperinside"><span>DESIGN STUDY / ${s.type}</span><strong>${s.line.replace('\n','<br>')}</strong>${photo(i)}<i>自主制作コンセプト</i></div><small>${s.title} / 架空案件</small></div>`}
const positions=[[70,70,-5],[450,290,4],[820,30,-3],[1220,270,5],[1570,20,-4],[30,670,3],[420,900,-4],[800,620,3],[1180,950,-3],[1550,640,4]];
studies.forEach((s,i)=>{
 let b=document.createElement('button');b.className='artifact '+(i%3===1?'material-photo':'material-layout');b.tabIndex=-1;b.innerHTML=i%3===1?`${photo(i)}<small>${String(i+1).padStart(2,'0')} / ${s.type}</small>`:print(i);b.style.left=positions[i][0]+'px';b.style.top=positions[i][1]+'px';b.style.width=(i%3===1?300:260)+'px';b.style.setProperty('--r',positions[i][2]+'deg');b.setAttribute('aria-label',s.title+'の架空LPを見る');b.onclick=()=>{if(!moved)open(i)};canvas.append(b);
 let g=document.createElement('button');g.className='story';g.innerHTML=`<div class="story-visual"><div class="story-sheet sheet-back">${print(i)}</div>${photo(i,'stack-photo stack-one')}${photo((i+10)%12,'stack-photo stack-two')}<div class="story-swatch" aria-hidden="true"></div><div class="story-sheet sheet-front"><span>${s.type}</span><strong>${s.line.replace('\n','<br>')}</strong><small>FICTIONAL DESIGN STUDY</small></div><span class="story-view">LPを見る ↗</span></div><div class="story-meta"><span>${String(i+1).padStart(2,'0')} / ${s.type}</span><span>架空の制作例</span></div><strong>${s.title}</strong><em>${s.en}</em>`;g.onclick=()=>open(i);grid.append(g)
});
[[330,40,10],[1030,520,11],[150,1150,10]].forEach(([left,top,i],n)=>{const el=document.createElement('div');el.className='material-fragment';el.setAttribute('aria-hidden','true');el.style.cssText=`left:${left}px;top:${top}px;--r:${n%2?7:-6}deg`;el.innerHTML=photo(i);canvas.append(el)});
function update(){canvas.style.transform=`translate(${x}px,${y}px) scale(${z})`;}
function reset(){z=innerWidth<600?.58:innerWidth<1000?.65:.72;x=field.clientWidth/2-920*z;y=innerWidth<600?80:30;update()}
function setmode(m){document.body.classList.remove('lp-detail-open');const returning=detail.contains(document.activeElement);mode=m;field.hidden=m!=='archive';grid.hidden=m!=='stories';detail.hidden=true;document.querySelectorAll('.lp-example-switch button').forEach(b=>{b.classList.toggle('on',b.id===m);b.setAttribute('aria-pressed',b.id===m)});if(m==='archive')reset();syncMotion();if(m==='stories'&&returning)grid.children[lastSelected]?.focus()}
function open(i){document.body.classList.add('lp-detail-open');lastSelected=i;const s=studies[i];field.hidden=true;grid.hidden=true;detail.hidden=false;document.querySelector('#collage').innerHTML=`<div class="sample-browser"><span>CONCEPT LP / ${s.type}</span><span>架空の制作例</span></div>${print(i)}<div class="sample-lp-body"><small>ABOUT THIS CONCEPT</small><h3>${s.en}</h3><p>${s.purpose}</p><div class="sample-lp-columns"><div><small>01 / MESSAGE</small><p>${s.line.replace('\n','')}</p></div><div><small>02 / CONTENTS</small><p>${s.composition}</p></div></div><div class="sample-lp-end">${s.title}<span>架空のLPレイアウト / 送信・予約機能なし</span></div></div>`;document.querySelector('#copy').innerHTML=`<div class="storycount">${String(i+1).padStart(2,'0')} / 10 <button id="next" aria-label="次の制作例">→</button></div><em>${s.en}</em><h2>${s.title}</h2><p class="sample-status">架空の制作例 / LPレイアウト</p><p>${s.purpose}</p><dl class="brief"><dt>雰囲気</dt><dd>${s.mood}</dd><dt>制作価格の目安</dt><dd>基本50,000円〜（税区分・追加費用は未確定）</dd><dt>オプション</dt><dd>原稿作成・画像選定などは別途確認</dd><dt>構成の想定</dt><dd>${s.composition}</dd></dl><p class="small">${s.note}</p><p class="small">写真はこの架空例のために生成したイメージです。実在する顧客・施設・製品や受注実績ではありません。完成したLPや受注実績ではありません。LPはデザインを検討する仮レイアウトで、予約・購入・送信はできません。</p><a class="cta" href="diagnosis.html" target="_blank" rel="noopener">自分のLPを12問で考える ↗</a><a class="text-link" href="service.html">料金・制作範囲を確認 →</a>`;document.querySelector('#next').onclick=()=>open((i+1)%10);detail.scrollTop=0;document.querySelector('#all').focus({preventScroll:true});syncMotion()}
document.querySelector('#archive').onclick=()=>setmode('archive');document.querySelector('#stories').onclick=()=>setmode('stories');document.querySelector('#all').onclick=()=>setmode('stories');window.addEventListener('resize',()=>{if(mode==='archive')reset()});reset();

// Only visible, unpaused work moves. Answer data is never involved.
const pause=document.querySelector('[data-lp-pause]');
let manualPaused=false,hovered=false,focused=false,frame=0,lastTime=0;
function syncMotion(){
 cancelAnimationFrame(frame);frame=0;lastTime=0;
 const reduced=motionPreference.matches;
 pause.disabled=reduced;pause.setAttribute('aria-pressed',String(reduced||manualPaused));pause.textContent=reduced?'静止設定で表示中':manualPaused?'動きを再開する':'動きを止める';
 if(!reduced&&!manualPaused&&!hovered&&!focused&&!document.hidden&&!field.hidden&&mode==='archive')frame=requestAnimationFrame(drift);
}
function drift(time){
 if(lastTime){const elapsed=Math.min(time-lastTime,50);canvas.querySelectorAll('.artifact').forEach(el=>{let pos=parseFloat(el.style.left)-elapsed*.018;if(pos < -280)pos+=2060;el.style.left=pos+'px';});}
 lastTime=time;frame=requestAnimationFrame(drift);
}
pause.addEventListener('click',()=>{manualPaused=!manualPaused;syncMotion();});
field.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;syncMotion();}});
field.addEventListener('pointerleave',()=>{hovered=false;syncMotion();});
field.addEventListener('focusin',()=>{focused=true;syncMotion();});
field.addEventListener('focusout',()=>queueMicrotask(()=>{focused=field.contains(document.activeElement);syncMotion();}));
field.addEventListener('keydown',event=>{if(event.target===field&&['Enter',' '].includes(event.key)){event.preventDefault();setmode('stories');grid.children[lastSelected]?.focus();}});
motionPreference.addEventListener('change',syncMotion);
document.addEventListener('visibilitychange',syncMotion);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});
window.addEventListener('pageshow',syncMotion);
syncMotion();
if(location.pathname.endsWith('/examples.html'))setmode('stories');
