import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyReleaseNoticePolicy} from './release_notice_policy.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildVersion=readFileSync(path.join(root,'build-version.txt'),'utf8').trim();
// Recompose existing markup only: commercial copy, links and metadata remain source-owned.
export function renderQuietLicense(source, prefix='') {
  const finalize = html => applyReleaseNoticePolicy(html,'license').replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>')
    .replace(/(quiet-pages\.css|gallery-ui\.js)\?v=[0-9A-Za-z._-]+/g, `$1?v=${buildVersion}`);
  if(source.includes('license-renewal')) return finalize(source);
  const take=expression=>{const match=source.match(expression);if(!match)throw new Error(`Missing License region: ${expression}`);return match[0];};
  const index=take(/      <aside class="license-index"[\s\S]*?<\/aside>/);
  const switcher=take(/        <div class="license-plan-switcher"[\s\S]*?\n        <\/div>/);
  const summary=take(/        <section class="license-decision"[\s\S]*?\n        <\/section>/);
  const boundary=take(/        <h2 class="license-callout">[\s\S]*?<\/p>/);
  const icon=name=>`${prefix}assets/${name}.webp`;
  const updatedSwitcher=switcher
    .replace('aria-pressed="false">License</button>', `aria-pressed="false"><img src="${icon('ims-license-update')}" alt="" width="32" height="32">License</button>`)
    .replace('aria-pressed="true">License Plus</button>', `aria-pressed="true"><img src="${icon('ims-license-plus-customize')}" alt="" width="32" height="32">License Plus</button>`);
  const spotlight=summary.replace(' data-license-summary>',` data-license-summary>\n${updatedSwitcher}\n          <figure class="license-spotlight-art" aria-hidden="true">\n            <img data-license-art="license" src="${icon('ims-license-update')}" alt="" width="960" height="960" decoding="async">\n            <img data-license-art="plus" src="${icon('ims-license-plus-customize')}" alt="" width="960" height="960" decoding="async" fetchpriority="high">\n          </figure>`);
  let result=source.replace(' license-page"',' license-page license-renewal"').replace(index+'\n\n','').replace(switcher+'\n\n','').replace(summary+'\n\n','').replace(boundary+'\n\n','');
  result=result.replace(/(        <header class="license-intro"[\s\S]*?        <\/header>)/, `$1\n\n${spotlight}`);
  result=result.replace(/(<caption id="license-matrix-[^"]+") class="sr-only"/,'$1');
  result=result.replace('\n\n      </article>',`\n\n${boundary}\n\n      </article>`);
  return finalize(result);
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  for(const locale of ['', 'ja/']) {
    const filename=path.join(root,locale,'license.html');
    const original=readFileSync(filename,'utf8');
    const rendered=renderQuietLicense(original,locale?'../':'');
    if(process.argv.includes('--check')){if(original!==rendered)throw new Error(`${locale}license.html is not composed`);}
    else writeFileSync(filename,rendered);
  }
  console.log('Quiet Form License pages are composed.');
}
