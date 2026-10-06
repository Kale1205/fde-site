import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codeWindow=/<div class="mission-code-window">[\s\S]*?<\/code><\/pre><\/div>/;

// Recompose existing HTML rather than substituting the mock's condensed copy.
export function renderQuietGoals(source) {
  if (source.includes('goals-renewal')) return source;
  let html=source.replace(' mission-page"', ' mission-page goals-renewal"');
  html=html.replace(/(      <header class="mission-hero section-frame">[\s\S]*?      <\/header>)/,
    '      <div class="mission-hero-band">\n$1\n      </div>');
  html=html.replace(/(<section id="(?:fde|approach)"[^>]*>)\n        (<p class="eyebrow">[^<]+<\/p>)\n        <div class="mission-text">(<h2[^>]*>[\s\S]*?<\/h2>)/g,
    '$1\n        <div class="mission-text"><div class="mission-chapter-heading">$2$3</div>');
  html=html.replace(/        (<figure class="mission-code">[\s\S]*?<\/figure>)\n        (<div class="mission-recording-intro">[\s\S]*?<\/div>)\n        (<figure class="mission-recording">[\s\S]*?<\/figure>)/,
    (_,code,intro,recording)=>`        <div class="mission-proof">\n          ${code}\n          ${recording.replace('<figcaption>', `<figcaption>${intro}`)}\n        </div>`);
  html=html.replace(/<div class="mission-actions">[\s\S]*?<\/div>/, '');
  // Source identifiers are not prose: use the real excerpt, also in Chinese.
  if (/<html lang="zh-CN">/.test(html)) {
    const label=html.match(/<pre[^>]*aria-label="([^"]+)"/)[1];
    const actual=readFileSync(path.join(root,'goals.html'),'utf8').match(codeWindow)[0]
      .replace(/(aria-label=")[^"]+/, `$1${label}`);
    html=html.replace(codeWindow,actual);
  }
  return html;
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  for(const file of ['goals.html','ja/goals.html','zh/goals.html']) {
    const source=readFileSync(path.join(root,file),'utf8');
    const output=renderQuietGoals(source);
    if(process.argv.includes('--check')) {
      if(source!==output)throw Error(`${file} is not composed`);
    } else {
      // Bulk, deterministic rewrite uses the normal patch mechanism.
      if(source!==output) {
        const patch=`*** Begin Patch\n*** Update File: ${path.join(root,file)}\n@@\n${source.split('\n').filter((_,i,a)=>i<a.length-1||a[i]).map(x=>'-'+x).join('\n')}\n${output.split('\n').filter((_,i,a)=>i<a.length-1||a[i]).map(x=>'+'+x).join('\n')}\n*** End Patch\n`;
        process.stdout.write(patch);
      }
    }
  }
  if(process.argv.includes('--check'))console.log('Quiet Form Our Goals composition is current.');
}
