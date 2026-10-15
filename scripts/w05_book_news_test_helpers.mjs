import {renderQuietNews} from './build_quiet_news.mjs';
// Rebase only historical News presentation fixtures onto the explicitly
// approved W05 layout. Business data and all other routes remain untouched.
export const applyW05BookNews=(file,source)=>/^(?:ja\/|zh\/)?news\.html$/.test(file)?renderQuietNews(source):source;
export const withoutW05CmsBridge=source=>source
 .replace("if (!CMS || document.body.classList.contains('book-news')) return;",'if (!CMS) return;')
 .replace("    if (document.body.classList.contains('book-news')) {\n      document.dispatchEvent(new CustomEvent('fde:news-content', { detail: CMS }));\n      return;\n    }\n",'');
