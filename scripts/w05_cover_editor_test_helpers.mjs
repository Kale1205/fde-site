// Historical contracts still verify all pre-existing CMS behavior verbatim.
// Exclude only the explicitly requested independent book-cover additions.
// test_w05_cover_editor.mjs independently checks these exact additions and
// verifies that stripping them reproduces the pre-revision commit byte-for-byte.
export function withoutW05BookCoverEditor(file,source){
 if(file==='cms-admin.html')return source.replace(/<section class="field field-full cms-book-cover-settings" data-cms-book-cover-editor="(?:create|edit)">[\s\S]*?<\/section>/g,'');
 if(file==='cms-admin.js')return source
  .replace(/\/\* W05 cover \*\/[\s\S]*?\/\* W05 cover end \*\//g,'')
  .replace(/\/\* W05_COVER_EDITOR_START \*\/[\s\S]*?\/\* W05_COVER_EDITOR_END \*\/\n/,'')
  .replace('function init(){\n \n','function init(){\n');
 return source;
}
