import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {JPY_CAMPAIGN,USD_CAMPAIGN,priceBook,money,campaignCopy,approveFaqDocument} from '../price-policy.js';
import {applyReviewedCampaign} from './campaign_prices.mjs';
const root=new URL('../',import.meta.url),read=f=>readFileSync(new URL(f,root),'utf8');
const before=f=>execFileSync('git',['show',`a52d75361a28381a4196eb798ee360c443444bb6:${f}`],{cwd:root});
test('approved JPY and USD planned books distinguish unknown tax and actual dates',()=>{
 assert.deepEqual(JPY_CAMPAIGN.license,{standard:74800,launch:49800});assert.deepEqual(JPY_CAMPAIGN.plus,{standard:149800,launch:99800});
 assert.deepEqual(USD_CAMPAIGN.license,{standard:521,launch:349});assert.deepEqual(USD_CAMPAIGN.plus,{standard:1043,launch:699});
 assert.deepEqual(USD_CAMPAIGN.updates,[31,62]);assert.deepEqual(JPY_CAMPAIGN.updates,[4900,9800]);assert.equal(USD_CAMPAIGN.taxIncluded,null);assert.equal(JPY_CAMPAIGN.taxIncluded,true);
 for(const book of [JPY_CAMPAIGN,USD_CAMPAIGN]){assert.equal(book.durationMonths,6);for(const key of ['actualLaunchDate','startDate','endDate'])assert.equal(book[key],null);for(const key of ['license','plus'])assert.equal(Math.round((book[key].standard-book[key].launch)/book[key].standard*100),33);}
 for(const copy of Object.values(campaignCopy))assert(!/\b20\d\d[-/年]/.test(copy.terms));
});
test('every active pricing surface uses the owner-approved locale book and relative campaign conditions',()=>{
 for(const [prefix,locale]of [['','en'],['ja/','ja'],['zh/','zh']])for(const name of ['index','quiet-form','order','license']){
  const html=read(prefix+name+'.html'),book=priceBook(locale);
  for(const price of [book.license.standard,book.license.launch,book.plus.standard,book.plus.launch])assert(html.includes(money(price,locale))||locale==='ja'&&html.includes(money(price,locale,{word:true})),prefix+name+price);
  assert.equal((html.match(/data-campaign-terms/g)||[]).length,1);assert(html.includes(campaignCopy[locale].terms));
  if(locale!=='ja'){assert(!/[¥￥]|\d[\d,]*円/.test(html));assert(!/tax incl\.|日本円|含税/.test(html));}
 }
});
test('JPY Updates markup, historical article data, existing images and unrelated interaction engines remain exact',()=>{
 for(const name of ['index','order']){const selector=name==='index'?/<div class="updates-strip">[\s\S]*?<\/section>/:/<section class="order-updates"[\s\S]*?<\/section>/;assert.equal(read('ja/'+name+'.html').match(selector)[0],before('ja/'+name+'.html').toString().match(selector)[0]);}
 for(const f of ['assets/instagram-bakedkale-profile-20261110.jpg','assets/social/baked-kale-instagram-share-36bd831a4bf1.png','content/site-content.json','content/instagram-feed.json','gallery-ui.js','quiet-form.js','sculpture-motion.js','motion-preferences.js','goals02-scene.js','demo-v1.js','quiet-pages.css','quiet-form.css','news-books.css'])assert.deepEqual(readFileSync(new URL(f,root)),before(f),f);
});
test('current FAQs keep Japanese answers and IDs while disclosing approved USD and unknown tax',()=>{
 for(const f of ['content/faq-content.json','content/faq-policy-additions.json']){
  const source=read(f),data=JSON.parse(source),old=JSON.parse(before(f));assert.equal(approveFaqDocument(f,source),source);assert.deepEqual(data.faq.map(x=>x.id),old.faq.map(x=>x.id));
  for(const item of data.faq){const prior=old.faq.find(x=>x.id===item.id);assert.equal(item.answer.ja,prior.answer.ja);for(const locale of ['en','zh-CN'])if(/\$|美元/.test(item.answer[locale])){assert(!/unapproved|未批准|候选/.test(item.answer[locale]));assert(/tax treatment|税务处理/i.test(item.answer[locale]));}}
 }
});
test('historical adaptation cannot approve an unknown amount or conceal a changed destination',()=>{
 const original=before('index.html').toString(),unknown=original.replace('class="plan-price">¥49,800','class="plan-price">¥50,000');assert.equal(applyReviewedCampaign('index.html',unknown),unknown);
 const route=original.replace('href="license.html#comparison"','href="changed.html"');assert(applyReviewedCampaign('index.html',route).includes('href="changed.html"'));assert.equal(applyReviewedCampaign('unrelated.html',original),original);
});
