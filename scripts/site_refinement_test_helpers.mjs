import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {applyReviewedShareImage} from './social_share_metadata.mjs';
const approved=JSON.parse(readFileSync(new URL('./site_refinement_fixtures.json',import.meta.url),'utf8'));
const digest=source=>createHash('sha256').update(source).digest('hex');
const cssBlocks=Object.fromEntries(Object.entries(approved.css).map(([file,hash])=>{
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8'),block=source.slice(source.indexOf('\n/* Open layout:'));
 if(digest(block)!==hash)throw Error(`Unreviewed open-layout CSS: ${file}`);
 return[file,block];
}));
const manualRuntime=readFileSync(new URL('../quiet-form.js',import.meta.url),'utf8');
if(digest(manualRuntime)!==approved.manualRuntimeSha256)throw Error('Unreviewed manual-demo runtime');
export const sharedMenuIcon='<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M224 128a8 8 0 0 1-8 8H40a8 8 0 0 1 0-16h176a8 8 0 0 1 8 8ZM40 72h176a8 8 0 0 0 0-16H40a8 8 0 0 0 0 16Zm176 112H40a8 8 0 0 0 0 16h176a8 8 0 0 0 0-16Z"/></svg>';
// Only the approved menu glyph and the three exact retired demo controls.
export function applyRefinedHtml(source){
 let value=source.replace(/(<button class="menu-button"[^>]*>)<span aria-hidden="true">☰<\/span>/g,'$1'+sharedMenuIcon);
 for(const [play,pause,replay]of[['操作例を再生','一時停止','もう一度見る'],['Play example','Pause','Replay example'],['播放操作示例','暂停','重新播放']])value=value.replace(`<button class="motion-toggle" type="button" aria-controls="imsDemoRoot" data-play="${play}" data-pause="${pause}" data-replay="${replay}">${play}</button>`,'');
 return value.replace('<p class="visually-hidden" id="motion-announcement" role="status" aria-live="polite"></p>','');
}
export function applyReviewedSiteRefinement(file,source){
 source=applyReviewedShareImage(file,source);
 if(/^(?:(?:ja|zh)\/)?(?:goals|index|quiet-form)\.html$/.test(file))return applyRefinedHtml(source);
 const block=cssBlocks[file];
 if(block&&!source.includes('/* Open layout:')&&source.startsWith(file==='news-books.css'?'/* W05':file==='quiet-form.css'?'/* Approved Quiet Form':'/* Quiet Form:'))return source+block;
 if(file==='quiet-form.js'&&approved.oldRuntimeHashes.includes(digest(source)))return manualRuntime;
 return source;
}
