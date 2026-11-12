import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {campaign,campaignCopy,applyReviewedCampaign} from './campaign_prices.mjs';
import {stripLoadingHead} from './page_loading_template.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
const before=file=>execFileSync('git',['show',`01010c0cc7a4e03594338d6bd6f0c7fd7bf546fa:${file}`],{cwd:root,encoding:'utf8'});
test('approved yen amounts, tax and relative duration never invent actual dates or USD conversion',()=>{
 assert.deepEqual(campaign.license,{standard:74800,launch:49800});assert.deepEqual(campaign.plus,{standard:149800,launch:99800});assert.equal(campaign.durationMonths,6);assert.equal(campaign.taxIncluded,true);assert.equal(campaign.currency,'JPY');for(const key of ['actualLaunchDate','startDate','endDate'])assert.equal(campaign[key],null);
 for(const key of ['license','plus'])assert.equal(Math.round((campaign[key].standard-campaign[key].launch)/campaign[key].standard*100),33);
 for(const c of Object.values(campaignCopy)){assert(!/\b20\d\d[-/年]/.test(c.terms));assert(!/\$\d/.test(c.terms));}
});
test('every yen price surface presents planned standard and planned launch prices with clear conditions',()=>{
 for(const prefix of ['', 'ja/','zh/'])for(const name of ['index','quiet-form','order']){const html=read(prefix+name+'.html');for(const value of ['74,800','49,800','149,800','99,800'])assert(html.includes(value),prefix+name+value);assert.equal((html.match(/class="handdrawn-price hp-combined"/g)||[]).length,2);assert.equal((html.match(/data-campaign-terms/g)||[]).length,1);assert(html.includes(campaignCopy[prefix==='ja/'?'ja':prefix==='zh/'?'zh':'en'].terms));}
 const ja=read('ja/license.html');assert(ja.includes('data-campaign-standard="74,800円"'));assert(ja.includes('data-campaign-standard="149,800円"'));assert(ja.includes('data-campaign-standard-value'));assert(ja.includes(campaignCopy.ja.terms));
});
test('international candidate price books and every Updates section remain exact',()=>{
 const strip=source=>stripLoadingHead(source).replace(/<!-- FDE loading panel -->\n[\s\S]*?<!-- End FDE loading panel -->\n/g,'');
 for(const file of ['license.html','zh/license.html'])assert.equal(strip(read(file)),before(file),file);
 for(const prefix of ['', 'ja/','zh/']){const home=read(prefix+'index.html'),old=before(prefix+'index.html');assert.equal(home.match(/<div class="updates-strip">[\s\S]*?<\/section>/)[0],old.match(/<div class="updates-strip">[\s\S]*?<\/section>/)[0]);const order=read(prefix+'order.html');assert.equal(order.match(/<section class="order-updates"[\s\S]*?<\/section>/)[0],before(prefix+'order.html').match(/<section class="order-updates"[\s\S]*?<\/section>/)[0]);}
});
test('existing media, OGP image, article/feed data and interaction engines remain byte-identical',()=>{
 for(const file of ['assets/instagram-bakedkale-profile-20261110.jpg','assets/social/baked-kale-instagram-share-36bd831a4bf1.png','content/site-content.json','content/instagram-feed.json','gallery-ui.js','news-books.js','quiet-form.js','sculpture-motion.js','motion-preferences.js','goals02-scene.js','demo-v1.js','quiet-pages.css','quiet-form.css'])assert.deepEqual(readFileSync(new URL(file,root)),execFileSync('git',['show',`01010c0cc7a4e03594338d6bd6f0c7fd7bf546fa:${file}`],{cwd:root}),file);
});
test('historical adaptation cannot replace an unapproved price or unrelated body changes',()=>{
 const source=before('index.html'),unknown=source.replace('class="plan-price">¥49,800','class="plan-price">¥50,000');assert.equal(applyReviewedCampaign('index.html',unknown),unknown);assert.equal(applyReviewedCampaign('unrelated.html',source),source);const route=source.replace('href="license.html#comparison"','href="changed.html"');assert(applyReviewedCampaign('index.html',route).includes('href="changed.html"'));
});
