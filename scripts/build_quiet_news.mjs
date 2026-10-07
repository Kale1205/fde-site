import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyReleaseNoticePolicy} from './release_notice_policy.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Preserve existing articles, SEO, navigation and CMS anchors; only recompose
// the selected Soft Dispatch layout and translate the approved section label.
export function renderQuietNews(source) {
  if(source.includes('news-renewal'))return applyReleaseNoticePolicy(source,'news');
  const prefix=/<html lang="en">/.test(source)?'':'../';
  const heading=/<html lang="ja">/.test(source)?'アップデート情報':/<html lang="zh-CN">/.test(source)?'更新信息':'Updates';
  let html=source.replace(' cms-news-page"',' cms-news-page news-renewal"');
  html=html.replace(/(<section class="page-hero compact-hero news-page-hero section-frame">)/,
    `$1\n        <img class="news-hero-mark" src="${prefix}assets/baked-kale-mark.svg" width="220" height="220" alt="" aria-hidden="true">`);
  html=html.replace(/        (<div class="news-desk-label news-top-label">[\s\S]*?<\/a>)\n\n        (<h2 class="news-desk-label news-section-rule">[^<]+<\/h2>\n        <div id="cmsLatestList"[\s\S]*?        <\/div>)\n\n        (<h2 class="news-desk-label news-section-rule">[^<]+<\/h2>\n        <div id="cmsNewsWire"[\s\S]*?        <\/div>)/,
    (_,feature,latest,archive)=>`        <section class="news-featured" aria-labelledby="news-featured-title">\n          ${feature.replace('<div class="news-desk-label news-top-label">','<h2 id="news-featured-title" class="news-desk-label news-top-label">').replace('</div>','</h2>')}\n        </section>\n        <div class="news-supporting">\n          <section class="news-updates" aria-labelledby="news-updates-title">\n            ${latest.replace(/<h2 class="news-desk-label news-section-rule">[^<]+<\/h2>/,`<h2 id="news-updates-title" class="news-desk-label news-section-rule">${heading}</h2>`)}\n          </section>\n          <section class="news-archive" aria-labelledby="news-archive-title">\n            ${archive.replace('<h2 class="news-desk-label news-section-rule">','<h2 id="news-archive-title" class="news-desk-label news-section-rule">')}\n          </section>\n        </div>`);
  if(!html.includes('news-supporting'))throw Error('News composition anchors not found');
  return applyReleaseNoticePolicy(html,'news');
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  for(const file of ['news.html','ja/news.html','zh/news.html']){
    const source=readFileSync(path.join(root,file),'utf8');
    const output=renderQuietNews(source);
    if(process.argv.includes('--check')){
      if(source!==output)throw Error(`${file} is not composed`);
    }else if(source!==output){
      process.stdout.write(`*** Begin Patch\n*** Update File: ${path.join(root,file)}\n@@\n${source.trimEnd().split('\n').map(x=>'-'+x).join('\n')}\n${output.trimEnd().split('\n').map(x=>'+'+x).join('\n')}\n*** End Patch\n`);
    }
  }
  if(process.argv.includes('--check'))console.log('Quiet Form News composition is current.');
}
