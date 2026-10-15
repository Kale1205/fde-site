import {readFileSync} from 'node:fs';
import {newsImagePath,newsCoverPath} from '../news-books.js';
const content=JSON.parse(readFileSync(new URL('../content/site-content.json',import.meta.url),'utf8'));
const build=readFileSync(new URL('../build-version.txt',import.meta.url),'utf8').trim();
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const NEWS_UI={
 en:{updates:'Updates',previous:'Previous story',next:'Next story',read:'Read story',close:'Close story',social:'Social',intro:'Want to know more? Explore our official and personal accounts.',instagram:'Open Instagram (external site)',linkedin:'Open LinkedIn (external site)',loading:'Loading posts…',pause:'Pause posts',resume:'Resume posts',stories:'News stories',all:'Stories',category:{Product:'Product',Development:'Development',Social:'Social'}},
 ja:{updates:'アップデート情報',previous:'前の記事',next:'次の記事',read:'記事を読む',close:'記事を閉じる',social:'SNS',intro:'もう少し詳しく知りたい方へ。公式・個人アカウントはこちら。',instagram:'Instagramを開く（外部サイト）',linkedin:'LinkedInを開く（外部サイト）',loading:'投稿を読み込んでいます。',pause:'投稿の動きを止める',resume:'投稿の動きを再開する',stories:'お知らせ記事',all:'記事一覧',category:{Product:'製品',Development:'開発',Social:'ソーシャル'}},
 zh:{updates:'更新信息',previous:'上一篇',next:'下一篇',read:'阅读消息',close:'关闭消息',social:'社交媒体',intro:'想了解更多？欢迎访问官方及个人账号。',instagram:'打开 Instagram（外部网站）',linkedin:'打开 LinkedIn（外部网站）',loading:'正在加载动态。',pause:'暂停动态滚动',resume:'继续动态滚动',stories:'消息',all:'消息列表',category:{Product:'产品',Development:'开发',Social:'社交'}}
};
export function localNews(locale){const key=locale==='zh'?'zh-CN':locale;return [...content.news].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id))).map(x=>({...x,title:typeof x.title==='string'?x.title:x.title[key]||x.title.en,body:typeof x.body==='string'?x.body:x.body[key]||x.body.en}));}
export function storyImage(item,prefix=''){
 return newsImagePath({...item,image:item.image||content.newsFallbackImage},prefix);
}
export function renderBookNews(source){
 const locale=source.includes('<html lang="ja"')?'ja':source.includes('<html lang="zh-CN"')?'zh':'en';
 const prefix=locale==='en'?'':'../', ui=NEWS_UI[locale],items=localNews(locale);
 const active=Math.max(0,items.findIndex(x=>x.featured));
 const book=(item,offset)=>`<button type="button" class="news-book" data-offset="${offset}" data-book-id="${escape(item.id)}" aria-haspopup="dialog" tabindex="${offset===0?0:-1}"><span class="book-accessible sr-only">${escape(ui.read+': '+item.title+' — '+item.date)}</span>
            <img class="book-skin book-skin-side book-skin-left" src="${prefix}assets/news-book-spine-left.webp" width="360" height="738" alt="" decoding="async">
            <img class="book-skin book-skin-side book-skin-right" src="${prefix}assets/news-book-spine-right.webp" width="360" height="738" alt="" decoding="async">
            <img class="book-skin book-skin-forest" src="${prefix}assets/news-book-forest.webp" width="640" height="800" alt="" decoding="async">
            <span class="book-face" aria-hidden="true"><img class="book-art"${newsCoverPath(item,prefix)?` src="${escape(newsCoverPath(item,prefix))}"`:' hidden'} width="320" height="320" alt="" decoding="async"><span class="book-cover-title"${newsCoverPath(item,prefix)?' hidden':''}>${escape(item.title)}</span><span class="book-stamp"><time datetime="${escape(item.date)}">${escape(item.date.replaceAll('-','.'))}</time><span>${escape(ui.category[item.category]||item.category)}</span></span></span>
            <span class="book-spine" aria-hidden="true"><time datetime="${escape(item.date)}">${escape(item.date.replaceAll('-','.'))}</time><span class="book-spine-rule"></span><span class="book-spine-title">${escape(item.title)}</span></span>
          </button>`;
 const selected=items[active];
 const fallback=items.map(item=>`<article data-static-news-id="${escape(item.id)}"><h2>${escape(item.title)}</h2><time datetime="${escape(item.date)}">${escape(item.date.replaceAll('-','.'))}</time>${item.body.split(/\n\n+/).map(p=>`<p>${escape(p).replaceAll('\n','<br>')}</p>`).join('')}</article>`).join('\n');
 const section=`      <section class="news-library section-frame" aria-labelledby="news-updates-title">
        <div class="news-library-heading"><h2 id="news-updates-title">${ui.updates}</h2><div class="book-controls" hidden><button type="button" data-book-step="-1" aria-label="${ui.previous}"><img class="arrow-previous" src="${prefix}assets/phosphor-arrow-right.svg" width="22" height="22" alt=""></button><button type="button" data-book-step="1" aria-label="${ui.next}"><img src="${prefix}assets/phosphor-arrow-right.svg" width="22" height="22" alt=""></button></div></div>
        <div class="book-stage" role="region" aria-roledescription="carousel" aria-label="${ui.stories}">
          ${[-1,0,1].map(offset=>book(items[(active+offset+items.length)%items.length],offset)).join('\n          ')}
        </div>
        <div class="book-selection"><h3 id="selected-story-title">${escape(selected.title)}</h3><button type="button" class="book-read" aria-haspopup="dialog" hidden>${ui.read}<img src="${prefix}assets/phosphor-arrow-right.svg" width="20" height="20" alt=""></button></div>
        <p class="book-announcement sr-only" aria-live="polite" aria-atomic="true"></p>
        <noscript><section class="news-without-js" aria-label="${ui.all}">${fallback}</section></noscript>
      </section>
      <section class="news-social section-frame" aria-labelledby="news-social-title">
        <h2 id="news-social-title">${ui.social}</h2>
        <p class="social-intro">${ui.intro}</p>
        <div class="social-directory">
          <div class="social-network social-network-instagram">
            <a class="social-app-link" id="cmsInstagram" href="https://www.instagram.com/kale1999_/" target="_blank" rel="noopener noreferrer" aria-label="${ui.instagram}"><img src="${prefix}assets/instagram-app.webp" width="56" height="56" alt="Instagram" loading="lazy"></a>
            <ul class="social-profiles">
              <li><a class="social-profile" href="https://www.instagram.com/kale1999_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @kale1999_"><img class="social-avatar" src="${prefix}assets/instagram-kale1999-profile.jpg" width="100" height="100" alt="" loading="lazy"><span>@kale1999_</span><img class="social-profile-arrow" src="${prefix}assets/phosphor-arrow-right.svg" width="22" height="22" alt=""></a></li>
              <li><a class="social-profile" href="https://www.instagram.com/bakedkale/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @bakedkale"><img class="social-avatar" src="${prefix}assets/instagram-bakedkale-profile.jpg" width="100" height="100" alt="" loading="lazy"><span>@bakedkale</span><img class="social-profile-arrow" src="${prefix}assets/phosphor-arrow-right.svg" width="22" height="22" alt=""></a></li>
            </ul>
          </div>
          <div class="social-network social-network-linkedin">
            <a class="social-app-link" href="https://www.linkedin.com/in/okumoto-kakeru-326a49429/" target="_blank" rel="noopener noreferrer" aria-label="${ui.linkedin}"><img src="${prefix}assets/linkedin-app.webp" width="56" height="56" alt="LinkedIn" loading="lazy"></a>
            <a class="social-profile" href="https://www.linkedin.com/in/okumoto-kakeru-326a49429/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Kakeru Okumoto"><span>Kakeru Okumoto</span><img class="social-profile-arrow" src="${prefix}assets/phosphor-arrow-right.svg" width="22" height="22" alt=""></a>
          </div>
        </div>
        <div class="instagram-feed" data-feed-state="not-connected"><p class="instagram-empty sr-only" role="status"></p><div class="social-bubbles" hidden aria-hidden="true"><div class="bubble-lane"></div><div class="bubble-lane"></div></div><div class="social-post-text sr-only"></div><button type="button" class="social-pause" aria-pressed="false" hidden>${ui.pause}</button></div>
      </section>
      <dialog class="book-reader" aria-labelledby="book-article-title"><button type="button" class="book-close" aria-label="${ui.close}"><img src="${prefix}assets/phosphor-x.svg" width="24" height="24" alt=""></button><article class="book-spread"><img class="book-paper" data-src="${prefix}assets/news-book-open.webp" width="1280" height="720" alt=""><div class="book-page book-page-image"><img class="reader-image" width="480" height="480" alt=""><time class="reader-date"></time></div><div class="book-page book-page-detail"><div class="reader-copy" role="region" aria-labelledby="book-article-title" tabindex="0"><p class="reader-category"></p><h2 id="book-article-title"></h2><div class="reader-body"></div></div></div></article><div class="book-opening-cover" aria-hidden="true"><img class="opening-cover-skin" src="${prefix}assets/news-book-forest.webp" width="640" height="800" alt=""><img class="opening-cover-art" width="320" height="320" alt="" hidden><span class="opening-cover-title" hidden></span></div></dialog>
      <script type="application/json" id="book-news-data">${JSON.stringify({locale,ui,items,profileUrl:'https://www.instagram.com/kale1999_/'}).replaceAll('<','\\u003c')}</script>
`;
 const start=source.indexOf('      <section class="news-library section-frame"')>=0?source.indexOf('      <section class="news-library section-frame"'):source.indexOf('      <section class="content-section news-desk section-frame"');
 const end=source.indexOf('    </main>',start);
 if(start<0||end<0)throw Error('W05 News section not found');
 let html=source.slice(0,start)+section+source.slice(end);
 if(!html.includes('news-renewal book-news'))html=html.replace(' cms-news-page news-renewal',' cms-news-page news-renewal book-news');
 html=html.replace(/^  <link rel="stylesheet" href="(?:\.\.\/)?news-books\.css[^\"]*">\n/m,'').replace(/^  <script type="module" src="(?:\.\.\/)?news-books\.(?:mjs|js)[^\"]*"><\/script>\n/m,'');
 html=html.replace('</head>',`  <link rel="stylesheet" href="${prefix}news-books.css?v=${build}">\n  <script type="module" src="${prefix}news-books.js?v=${build}"></script>\n</head>`);
 return html;
}
