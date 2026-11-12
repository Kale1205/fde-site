import {withPageLoading,applyReviewedPageLoading} from './page_loading_template.mjs';
import {withCampaignPrices,applyReviewedCampaign} from './campaign_prices.mjs';
export function pathFor(source,name){return (source.includes('<html lang="ja">')?'ja/':source.includes('<html lang="zh-CN">')?'zh/':'')+name;}
export const withPublicPresentation=(file,source)=>withPageLoading(file,withCampaignPrices(file,source));
export const applyReviewedPublicPresentation=(file,source)=>applyReviewedPageLoading(file,applyReviewedCampaign(file,source));
