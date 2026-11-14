import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadingHead,loadingBody} from './page_loading_template.mjs';
import {withSharedImage} from './social_share_metadata.mjs';
import {showcaseBody,showcaseCaseBody,showcaseCases} from './lp_showcase.mjs';
import {LP_RECEPTION_NOTICE} from '../ja/lp/lp-policy.js';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const pages=JSON.parse(read('content/lp-pages.json'));
const metadata={
 index:{title:'LP制作・デザイン例 | Baked Kale',description:'Baked Kaleの日本語LP制作。50,000円〜の予定開始価格、架空のデザイン例と12問の参考診断をご案内します。受付開始予定は2026年12月1日です。',robots:'index,follow'},
 examples:{title:'架空のデザイン例10件 | Baked Kale LP制作',description:'業種と見せ方を考える10件の架空LP・生成素材です。実際の受注実績ではありません。',robots:'noindex,follow'},
 service:{title:'LP制作のサービス・予定料金 | Baked Kale',description:'日本語LP制作の範囲と予定料金、制作の流れをご案内します。50,000円〜。税区分・追加費用・契約の未確定事項を明記しています。',robots:'index,follow'},
 diagnosis:{title:'12問のLP参考診断 | Baked Kale',description:'連絡先なしでLPの方向性と参考見積を確認するプレビューです。回答は外部へ送信・永続保存しません。',robots:'noindex,nofollow,noarchive'},
};
// LP-only presentation options; never alter the shared loader generated elsewhere.
const lpLoadingHead=(prefix,version)=>loadingHead(prefix,version).replace('const remaining=2000-', 'const remaining=1000-');
const lpLoadingBody=local=>loadingBody('ja/index.html')
 .replace('../assets/instagram-bakedkale-profile-20261110.jpg',local+'assets/bakedkale-character.png')
 .replace('<span data-page-loading-count></span>','<span data-page-loading-count hidden></span>')
 .replace('<button type="button" data-page-loading-skip>ページを表示</button>','');
function renderShowcase(name,version){
 const i=showcaseCases.findIndex(c=>name==='cases/'+c.num),isCase=i>=0;
 // The global cache-version workflow only rewrites top-level LP routes.
 // Case pages are generated with a cache key derived from their actual assets.
 if(isCase)version=createHash('sha256').update(['page-loading.css','page-loading.js','ja/lp/showcase.css'].map(read).join('\0')).digest('hex').slice(0,12);
 const prefix=isCase?'../../../':'../../', local=isCase?'../':'./';
 const c=isCase?showcaseCases[i]:null;
 const meta=isCase?{title:c.title+'の制作例 | Baked Kale',description:'Baked Kaleによる架空のLP制作例です。受注実績ではありません。',robots:'noindex,follow'}:metadata[name];
 const canonical='https://kale1205.github.io/fde-site/ja/lp/'+(name==='index'?'':name+'.html');
 const brand=`<img src="${local}assets/bakedkale-character.png" width="38" height="38" alt=""><span>Baked Kale</span>`;
 const content=isCase?`<a class="skip skip-link" href="#main-content">本文へスキップ</a><header class="sitehead"><a class="brand" href="../index.html">${brand}</a><nav aria-label="LPメニュー"><a href="../index.html#works">制作例</a><a href="../service.html#schedule">制作の流れ</a><a class="estimate-link" href="../diagnosis.html" target="_blank" rel="noopener">12問簡易見積 ↗</a></nav></header>${showcaseCaseBody(i)}`:showcaseBody();
 return withSharedImage(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="${meta.robots}"><meta name="theme-color" content="#e8ede2">
<title>${meta.title}</title><meta name="description" content="${meta.description}">
<link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="ja_JP"><meta property="og:title" content="${meta.title}"><meta property="og:description" content="${meta.description}"><meta property="og:url" content="${canonical}">
<link rel="icon" type="image/svg+xml" href="${prefix}assets/baked-kale-mark.svg">
${lpLoadingHead(prefix,version)}
<link rel="stylesheet" href="${local}showcase.css?v=${version}">
${isCase?'':`<link rel="stylesheet" href="${local}parallel.css?v=${version}"><script defer src="${local}parallel.js?v=${version}"></script>`}
</head><body class="${isCase?'page-case':'parallel-page'}">
${lpLoadingBody(local)}
<div class="site-shell">${content}</div>
</body></html>
`);
}
export function renderLpPage(name){
 if(name==='index'||name==='examples'||showcaseCases.some(c=>name==='cases/'+c.num))return renderShowcase(name,read('build-version.txt').trim());
 if(!Object.hasOwn(pages,name))throw Error('Unknown LP page');
 const page=pages[name],meta=metadata[name],version=read('build-version.txt').trim();
 const canonical='https://kale1205.github.io/fde-site/ja/lp/'+(name==='index'?'':name+'.html');
 const nav=[['../index.html','FDE製品'],['examples.html','制作例'],['service.html#schedule','制作の流れ'],['diagnosis.html','12問の簡易見積り ↗']].map(([href,label])=>`<a href="${href}"${href.split('#')[0]===name+'.html'?' aria-current="page"':href==='diagnosis.html'?' target="_blank" rel="noopener"':''}>${label}</a>`).join('');
 const scripts=['../../gallery-ui.js','lp-chrome.js'].map(path=>`<script defer src="${path}?v=${version}"></script>`).join('\n');
 const runtime=name==='service'?'':`<script src="studies.js?v=${version}"></script>\n<script type="module" src="${name==='diagnosis'?'diagnosis':'archive'}.js?v=${version}"></script>`;
 const html=`<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="${meta.robots}"><meta name="theme-color" content="#073e2c">\n<title>${meta.title}</title><meta name="description" content="${meta.description}">\n<link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="ja_JP"><meta property="og:title" content="${meta.title}"><meta property="og:description" content="${meta.description}"><meta property="og:url" content="${canonical}">\n<link rel="icon" type="image/svg+xml" href="../../assets/baked-kale-mark.svg">\n${lpLoadingHead('../../',version)}${['../../gallery-ui.css','../../gallery-pages.css','../../quiet-pages.css','lp.css'].map(path=>`<link rel="stylesheet" href="${path}?v=${version}">`).join('\n')}\n${scripts}\n</head><body class="${page.bodyClass}">\n${lpLoadingBody('')}<a class="skip-link" href="#main-content">本文へスキップ</a>\n<div class="site-shell language-ja">\n<header class="editorial-header"><a href="index.html" class="editorial-brand"><img src="assets/bakedkale-character.png" width="42" height="42" alt=""><span class="brand-copy"><b>Baked Kale</b><em>小さな事業に、ひとつのページを。</em></span></a><nav aria-label="LPメニュー">${nav}</nav></header>\n<p class="lp-reception-banner" data-lp-reception>${LP_RECEPTION_NOTICE}</p>\n${page.main}\n<footer class="editorial-footer"><a href="../index.html">BAKEDKALE · FDE製品</a><span>架空のデザイン例 / 参考診断 / 受付準備中</span><a href="index.html">作品へ戻る ↑</a></footer>\n<div class="toast" role="status" aria-live="polite"></div>\n</div>\n${runtime}\n</body></html>\n`;
 return withSharedImage(html);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 let stale=false;for(const name of [...Object.keys(pages),...showcaseCases.map(c=>'cases/'+c.num)]){const path=new URL(`ja/lp/${name}.html`,root),html=renderLpPage(name);if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==html){console.error('Stale LP page: '+name);stale=true;}}else {mkdirSync(new URL('.',path),{recursive:true});writeFileSync(path,html);}}
 if(stale)process.exit(1);console.log('LP pages are current.');
}
