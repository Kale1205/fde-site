import {withPageLoading,applyReviewedPageLoading} from './page_loading_template.mjs';
import {withCampaignPrices,applyReviewedCampaign} from './campaign_prices.mjs';
import {withSiteChrome} from './site_chrome.mjs';
import {renderBookNews} from './build_book_news.mjs';
import {renderStaticFaq} from './multilingual_content_copy.mjs';
export function pathFor(source,name){return (source.includes('<html lang="ja">')?'ja/':source.includes('<html lang="zh-CN">')?'zh/':'')+name;}
const reviewedNews=(file,source)=>/^(?:(?:ja|zh)\/)?news\.html$/.test(file)&&source.includes('book-news')?renderBookNews(source):/^(?:(?:ja|zh)\/)?contact\.html$/.test(file)?renderStaticFaq(source):source;
export const withPublicPresentation=(file,source)=>withPageLoading(file,withSiteChrome(file,withCampaignPrices(file,reviewedNews(file,source))));
export const applyReviewedPublicPresentation=(file,source)=>applyReviewedPageLoading(file,withSiteChrome(file,applyReviewedCampaign(file,reviewedNews(file,source))));
