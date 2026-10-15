// Historical contracts still verify all pre-existing CMS behavior verbatim.
// Exclude only the explicitly requested independent book-cover additions.
// test_w05_cover_editor.mjs independently checks these exact additions and
// verifies that stripping them reproduces the pre-revision commit byte-for-byte.
export function withoutW05BookCoverEditor(file,source){
 if(file==='cms-admin.html')return source.replace(/<section class="field field-full cms-book-cover-settings" data-cms-book-cover-editor="(?:create|edit)">[\s\S]*?<\/section>/g,'');
 if(file==='cms-admin.js')return source
  .replace(/\/\* W05 cover \*\/[\s\S]*?\/\* W05 cover end \*\//g,'')
  .replace(/\/\* W05_COVER_EDITOR_START \*\/[\s\S]*?\/\* W05_COVER_EDITOR_END \*\/\n/,'')
  .replace('function init(){\n \n','function init(){\n')
  .replace(/\/\* W05_SAFE_ARTICLE_PREVIEW_START \*\/[\s\S]*?\/\* W05_SAFE_ARTICLE_PREVIEW_END \*\//,legacyArticlePreview)
  .replace(/\/\* W05_SAFE_FILE_PREVIEW_START \*\/[\s\S]*?\/\* W05_SAFE_FILE_PREVIEW_END \*\//,legacyFilePreview);
 return source;
}
const legacyArticlePreview="function renderCurrentImage(src){const box=$('#editCurrentImage');if(!box)return;box.innerHTML=src?`<img src=\"${src}\" alt=\"current News image\">`:'<div class=\"preview-placeholder\">個別画像は未設定です。公開ページではNewsデフォルト画像が使われます。</div>'}";
const legacyFilePreview="function previewFile(inputSelector,boxSelector,emptyText='画像を選択すると、ここにプレビューが表示されます。'){const file=$(inputSelector)?.files?.[0];const box=$(boxSelector);if(!box)return;if(!file){box.innerHTML=`<div class=\"preview-placeholder\">${emptyText}</div>`;return}try{validateImage(file)}catch(e){status(e.message,'error');$(inputSelector).value='';return}const u=URL.createObjectURL(file);box.innerHTML=`<img src=\"${u}\" alt=\"preview\">`}";
