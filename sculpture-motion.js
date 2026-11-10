// Decorative clay illustrations. Each moving object is a separate SVG layer;
// the original images remain the no-JavaScript presentation.
const artFiles = new Map([
  ['ims-license-update.webp', 'license'],
  ['ims-license-plus-customize.webp', 'plus'],
  ['goals-understand-work.png', 'understand'],
  ['goals-open-system.png', 'assemble'],
  ['goals-partner-dialogue.png', 'partner'],
]);

export function illustration(kind, id) {
  const paint = name => `url(#${id}-${name})`;
  const green = paint('green'), cream = paint('cream'), shadow = paint('shadow');
  const card = (x, y, w, h, content = '', tone = cream) => `<g filter="${shadow}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${tone}" stroke="#fff8" stroke-width="2"/>${content}</g>`;
  const rows = (x, y, width, tone = green) => [0, 1, 2].map(i => `<g class="art-row" style="--step:${i}"><rect x="${x}" y="${y + i * 35}" width="17" height="17" rx="6" fill="${tone}"/><rect x="${x + 29}" y="${y + i * 35}" width="${width}" height="17" rx="8" fill="${tone}"/></g>`).join('');
  const app = (x, y, w, h, extra = '') => card(x, y, w, h, `<rect x="${x + 13}" y="${y + 39}" width="${w - 26}" height="${h - 52}" rx="15" fill="${green}"/>${[0, 1, 2].map(i => `<circle cx="${x + 25 + i * 23}" cy="${y + 21}" r="6" fill="${green}"/>`).join('')}${extra}`);
  const wrench = (x, y, angle = -35) => `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="art-wrench" filter="${shadow}"><path d="M-27-47C-48-33-51-5-38 15L-17 38V146a20 20 0 0 0 40 0V38L43 15C56-7 49-35 28-47L27-10 1 5-25-10Z" fill="${cream}" stroke="#fff9" stroke-width="2"/><rect x="-6" y="54" width="17" height="83" rx="8" fill="${green}"/></g></g>`;
  const sparks = (x, y) => `<g transform="translate(${x} ${y})"><g class="art-sparks" fill="none" stroke="#98ad68" stroke-width="5" stroke-linecap="round"><path d="M-21-15-32-26M0-22V-38M21-15 32-26"/></g></g>`;
  const levels = (x, y) => `<g transform="translate(${x} ${y})"><g class="art-levels" fill="none" stroke="${green}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path class="art-level art-level-one" d="m-19 8 19-18L19 8"/><path class="art-level art-level-two" d="m-19-16 19-18 19 18"/></g></g>`;
  let scene;
  if (kind === 'license') {
    scene = `<ellipse cx="240" cy="420" rx="134" ry="12" fill="#073e2c12"/>
      <g class="art-license-body"><circle cx="240" cy="243" r="166" fill="${cream}" stroke="#fff8" stroke-width="2" filter="${shadow}"/>
      ${card(152, 139, 160, 178, '', cream)}${card(139, 169, 176, 178, rows(164, 207, 87), cream)}</g>
      <g class="art-update-ring" filter="${shadow}"><path d="M125 315C80 245 118 122 221 111c110-13 179 102 129 192-36 65-115 91-181 51" fill="none" stroke="${green}" stroke-width="27" stroke-linecap="round"/><path d="m326 102 47 20-40 35Z" fill="${green}"/></g>
      ${levels(358, 95)}`;
  } else if (kind === 'plus') {
    scene = `<ellipse cx="240" cy="404" rx="166" ry="12" fill="#073e2c12"/>
      <g class="art-tool-panel">${app(62, 132, 317, 237, `${card(87, 202, 70, 126, rows(99, 222, 20))}${rows(184, 213, 122, cream)}`)}</g>
      ${sparks(301, 222)}${wrench(330, 236)}`;
  } else if (kind === 'understand') {
    scene = `<ellipse cx="365" cy="399" rx="271" ry="15" fill="#073e2c0d"/>
      ${card(60, 218, 142, 135, '<path d="M70 245h120M132 222v124" stroke="#b7a786" stroke-width="7"/>')}
      ${card(181, 113, 143, 235, rows(202, 169, 64))}<rect x="219" y="99" width="66" height="37" rx="12" fill="${green}"/>
      <g class="art-discover-arrow" fill="${green}"><path d="M353 238h44v-16l32 28-32 28v-16h-44a12 12 0 0 1 0-24Z"/></g>
      <g transform="translate(565 250)"><g class="art-discovered">${app(-118, -116, 238, 230, rows(-85, -41, 116, cream))}</g></g>
      <g class="art-magnifier" filter="${shadow}"><circle cx="221" cy="283" r="65" fill="#d7eee83b" stroke="${green}" stroke-width="22"/><path d="m269 332 43 44" stroke="${green}" stroke-width="32" stroke-linecap="round"/><path d="M184 252a46 46 0 0 1 43-13" stroke="#fffffcad" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
  } else if (kind === 'assemble') {
    scene = `<ellipse cx="353" cy="405" rx="259" ry="14" fill="#073e2c0d"/>
      <g class="art-system-frame">${app(133, 111, 371, 273)}</g>
      <g class="art-layer-back">${card(159, 161, 320, 197, '', green)}</g>
      <g class="art-layer-middle">${card(168, 170, 304, 186, '', green)}</g>
      <g class="art-layer-front">${card(179, 181, 286, 174, rows(212, 209, 170, cream), green)}</g>
      ${sparks(492, 229)}${wrench(538, 250, -32)}`;
  } else if (kind === 'partner') {
    const bubble = (x, y, flip) => `<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="M-82-46Q-82-77-49-77H49Q82-77 82-44V27Q82 60 49 60H-34L-62 88l5-32Q-82 52-82 27Z" fill="${cream}" stroke="#fff8" stroke-width="2"/><path d="M-44-28h88M-44-3h70M-44 22h79" stroke="${green}" stroke-width="12" stroke-linecap="round"/></g>`;
    scene = `<ellipse cx="361" cy="405" rx="268" ry="14" fill="#073e2c0d"/>
      <g class="art-dialogue-left" filter="${shadow}">${bubble(112, 262, 1)}</g>
      <g class="art-partner-core">${app(234, 145, 257, 229, rows(265, 217, 136, cream))}${levels(361, 126)}</g>
      <g class="art-dialogue-right" filter="${shadow}">${bubble(607, 262, -1)}</g>`;
  } else {
    throw new Error(`Unknown illustration: ${kind}`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${kind === 'license' || kind === 'plus' ? '480 480' : '720 480'}" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}-green" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#398568"/><stop offset=".2" stop-color="#0b6045"/><stop offset=".7" stop-color="#07422f"/><stop offset="1" stop-color="#032d21"/></linearGradient>
    <linearGradient id="${id}-cream" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#fffef5"/><stop offset=".48" stop-color="#f3efdf"/><stop offset="1" stop-color="#d4cab1"/></linearGradient>
    <filter id="${id}-shadow" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#052c20" flood-opacity=".22"/></filter></defs>${scene}</svg>`;
}

export function motionState({ visible, hidden, reduced, paused }) {
  return visible && !hidden && !reduced && !paused ? 'running' : 'paused';
}

if (typeof document !== 'undefined') {
  const images = [...document.querySelectorAll('img.sculpture, img.comparison-sculpture, img.mission-art')];
  const art = [];
  for (const image of images) {
    const kind = artFiles.get(image.getAttribute('src').split('/').pop());
    if (!kind) continue;
    const wrapper = document.createElement('span');
    wrapper.className = `${image.className} animated-sculpture art-${kind}`;
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.dataset.motionState = 'paused';
    wrapper.innerHTML = illustration(kind, `sculpture-${art.length}`);
    image.replaceWith(wrapper);
    art.push({ element: wrapper, visible: false });
  }
  if (art.length) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const locale = document.documentElement.lang;
    const labels = locale === 'ja' ? ['動きを止める', '動きを再開'] : locale.startsWith('zh') ? ['暂停动画', '播放动画'] : ['Pause illustrations', 'Play illustrations'];
    let paused = false;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'art-motion-toggle';
    const host = document.querySelector('.sculpture-pair, .mission-hero');
    host.after(button);
    const sync = () => {
      for (const item of art) item.element.dataset.motionState = motionState({ visible: item.visible, hidden: document.hidden, reduced: reduced.matches, paused });
      button.hidden = reduced.matches;
      button.setAttribute('aria-pressed', String(paused));
      button.setAttribute('aria-label', labels[paused ? 1 : 0]);
      button.textContent = `${paused ? '▶' : 'Ⅱ'}  ${labels[paused ? 1 : 0]}`;
    };
    button.addEventListener('click', () => { paused = !paused; sync(); });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) art.find(item => item.element === entry.target).visible = entry.isIntersecting;
        sync();
      }, { rootMargin: '40px' });
      art.forEach(item => observer.observe(item.element));
    } else {
      art.forEach(item => { item.visible = true; });
    }
    sync();
  }
}
