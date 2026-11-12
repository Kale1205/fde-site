import {motionPreference} from '../../motion-preferences.js';
const field=document.querySelector('#field'),canvas=document.querySelector('#canvas'),grid=document.querySelector('#storygrid'),detail=document.querySelector('#detail');let mode='archive',x=0,y=0,z=1,drag=null,moved=false,lastSelected=0;
function print(i){const s=studies[i];return `<div class="paper study-${s.style}"><small>[${String(i+1).padStart(2,'0')}] ${s.type}</small><div class="paperinside"><span>CONCEPT / NOT CLIENT WORK</span><strong>${s.line.replace('\n','<br>')}</strong><div class="shape" aria-hidden="true"></div><i>自主制作コンセプト</i></div><small>${s.title} / 架空案件</small></div>`}
const positions=[[40,40,-2],[390,0,1],[780,30,-1],[1160,20,2],[1500,60,-2],[1470,740,1],[1110,780,-1],[730,790,2],[350,760,-2],[0,710,1]];
studies.forEach((s,i)=>{let b=document.createElement('button');b.className='artifact';b.tabIndex=-1;b.innerHTML=print(i);b.style.left=positions[i][0]+'px';b.style.top=positions[i][1]+'px';b.style.width=(i===4||i===9?230:270)+'px';b.style.setProperty('--r',positions[i][2]+'deg');b.setAttribute('aria-label',s.title+'のデザイン案を見る');b.onclick=()=>{if(!moved)open(i)};canvas.append(b);let g=document.createElement('button');g.className='story';g.innerHTML=`<div class="mini single">${print(i)}</div><em>${s.en}</em><span>${String(i+1).padStart(2,'0')} / ${s.title}</span>`;g.onclick=()=>open(i);grid.append(g)});
let center=document.createElement('div');center.className='center';center.innerHTML='<h1>bakedkale<em>design archive</em></h1><p>あなたの事業に、ひとつのページを。</p><span>LP制作 50,000円〜 / 全国対応</span><a href="service.html">サービス・料金 ↗</a><a href="diagnosis.html" target="_blank" rel="noopener">12問の診断へ ↗</a>';field.append(center);
function update(){canvas.style.transform=`translate(${x}px,${y}px) scale(${z})`;}
function reset(){z=innerWidth<600?.48:innerWidth<1000?.58:.68;x=field.clientWidth/2-870*z;y=(field.clientHeight-900*z)/2;update()}
function setmode(m){mode=m;field.hidden=m!=='archive';grid.hidden=m!=='stories';detail.hidden=true;document.querySelectorAll('.lp-example-switch button').forEach(b=>{b.classList.toggle('on',b.id===m);b.setAttribute('aria-pressed',b.id===m)});if(m==='archive')reset();syncMotion();if(m==='stories'&&document.activeElement?.id==='all')grid.children[lastSelected]?.focus()}
function open(i){lastSelected=i;const s=studies[i];field.hidden=true;grid.hidden=true;detail.hidden=false;document.querySelector('#collage').innerHTML=print(i);document.querySelector('#copy').innerHTML=`<div class="storycount">${String(i+1).padStart(2,'0')} / 10 <button id="next" aria-label="次の制作例">→</button></div><em>${s.en}</em><h2>${s.title}</h2><p class="sample-status">自主制作予定 / 仮レイアウト</p><p>${s.purpose}</p><dl class="brief"><dt>雰囲気</dt><dd>${s.mood}</dd><dt>制作価格の目安</dt><dd>基本50,000円〜（税区分・追加費用は未確定）</dd><dt>オプション</dt><dd>原稿作成・画像選定などは別途確認</dd><dt>構成の想定</dt><dd>${s.composition}</dd></dl><p class="small">${s.note}</p><p class="small">これは業種と見せ方を検討する仮の紙面です。完成したLPや受注実績ではありません。今後、制作したLPの画面へ差し替えます。</p><a class="cta" href="diagnosis.html" target="_blank" rel="noopener">自分のLPを12問で考える ↗</a><a class="text-link" href="service.html">料金・制作範囲を確認 →</a>`;document.querySelector('#next').onclick=()=>open((i+1)%10);detail.scrollTop=0;document.querySelector('#all').focus({preventScroll:true});syncMotion()}
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
