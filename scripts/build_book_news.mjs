import {readFileSync} from 'node:fs';
import {NEWS_UI,localNews as local,storyImage as image,renderNewsPage} from '../news-renderer.js';
const content=JSON.parse(readFileSync(new URL('../content/site-content.json',import.meta.url),'utf8'));
const build=readFileSync(new URL('../build-version.txt',import.meta.url),'utf8').trim();
export {NEWS_UI};
export const localNews=locale=>local(content,locale);
export const storyImage=(item,prefix='')=>image(content,item,prefix);
export const renderBookNews=source=>renderNewsPage(source,content,build);
