// Opening the calendar date never connects an unfinished service.
export const LP_ACCEPTANCE_START='2026-12-01T00:00:00+09:00';
export const LP_FEATURES=Object.freeze({quoteSubmission:false,statistics:false,payments:false,formalEstimate:false});
export const LP_RECEPTION_NOTICE='受付開始予定：2026年12月1日。現在は参考プレビューです。正規見積の受付・送信は準備中のため利用できません。';
export function canAcceptLpRequests(now=new Date()){
 const time=new Date(now).getTime();
 return Number.isFinite(time)&&time>=Date.parse(LP_ACCEPTANCE_START)&&LP_FEATURES.quoteSubmission&&LP_FEATURES.formalEstimate;
}
