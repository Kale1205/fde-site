// A01 presentation adapter. Authentication and all writes remain in the existing runtimes.
(()=>{
 const main=document.querySelector('.admin-main > .admin-shell');
 const tabs=document.getElementById('adminTabs');
 const select=document.getElementById('editNewsTarget');
 if(!main||!tabs||!select)return;
 const make=(tag,className,text)=>{const el=document.createElement(tag);el.className=className||'';if(text)el.textContent=text;return el};
 const button=(className,text)=>{const el=make('button',className,text);el.type='button';return el};
 const sidebar=make('aside','admin-sidebar');sidebar.setAttribute('aria-label','CMS管理');
 const header=document.querySelector('.admin-header');sidebar.append(header);
 const slot=make('div','admin-nav-slot');slot.append(tabs);sidebar.append(slot);
 const locked=make('p','admin-connection-note','GitHubへ接続すると、News・MediaとFAQを管理できます。');sidebar.append(locked);
 const mark=make('img','admin-sidebar-mark');mark.src='assets/baked-kale-mark.svg';mark.alt='';sidebar.append(mark);
 document.body.prepend(sidebar);
 const intro=document.querySelector('.admin-intro');
 const toolbar=make('div','admin-toolbar');toolbar.append(intro.querySelector('h1'));
 const menu=button('admin-button secondary admin-menu-toggle','メニュー');menu.setAttribute('aria-haspopup','dialog');menu.setAttribute('aria-controls','adminMenuSheet');toolbar.prepend(menu);
 const connection=make('details','admin-connection');
 const summary=make('summary','','接続設定');connection.append(summary);
 const connectionBody=make('div','admin-connection-body');
 const connectionCard=intro.nextElementSibling;connectionBody.append(intro,connectionCard);connection.append(connectionBody);connection.open=true;
 main.prepend(toolbar);toolbar.append(connection);
 const sheet=make('dialog','admin-menu-sheet');sheet.id='adminMenuSheet';
 const sheetHeader=make('div','admin-sheet-header');sheetHeader.append(make('h2','','メニュー'));
 const close=button('admin-button secondary','閉じる');sheetHeader.append(close);sheet.append(sheetHeader);document.body.append(sheet);
 const media=matchMedia('(max-width:760px)');
 function placeNavigation(){if(sheet.open)sheet.close();(media.matches?sheet:slot).append(tabs,locked)}
 media.addEventListener('change',placeNavigation);placeNavigation();
 menu.addEventListener('click',()=>sheet.showModal());close.addEventListener('click',()=>sheet.close());
 sheet.addEventListener('click',e=>{if(e.target===sheet){const box=sheet.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)sheet.close()}});
 tabs.querySelectorAll('button').forEach(tab=>tab.addEventListener('click',()=>{syncTabs();if(sheet.open)sheet.close()}));
 function syncTabs(){tabs.querySelectorAll('button').forEach(tab=>tab.setAttribute('aria-pressed',String(tab.classList.contains('active'))))}
 new MutationObserver(syncTabs).observe(tabs,{attributes:true,subtree:true,attributeFilter:['class']});
 let connected=false;
 function syncConnection(){const next=!tabs.classList.contains('hidden');locked.hidden=next;if(next&&!connected)connection.open=false;connected=next;syncTabs()}
 new MutationObserver(syncConnection).observe(tabs,{attributes:true,attributeFilter:['class']});syncConnection();
 const panel=document.getElementById('newsPanel');
 const workspace=make('div','admin-news-workspace');
 const listing=make('section','admin-article-list');listing.setAttribute('aria-labelledby','adminArticleHeading');
 const listHeader=make('div','admin-list-heading');const heading=make('h2','','記事一覧（News）');heading.id='adminArticleHeading';listHeader.append(heading);
 const create=button('admin-button secondary','新規作成');listHeader.append(create);listing.append(listHeader);
 const rows=make('div','admin-article-rows');listing.append(rows);
 const stage=make('div','admin-editor-stage');
 const createCard=document.getElementById('newsCreateCard'),editCard=document.getElementById('newsManageCard');
 stage.append(createCard,editCard);workspace.append(listing,stage);panel.prepend(workspace);
 const uploader=document.getElementById('uploaderCard');
 const common=make('details','admin-common-media');common.append(make('summary','','共通メディアを管理'),uploader);panel.append(common);
 const selectField=select.closest('.field');selectField.classList.add('admin-original-selector');selectField.hidden=true;select.tabIndex=-1;
 function showEditor(mode,focus=false){createCard.hidden=mode!=='create';editCard.hidden=mode!=='edit';if(focus){const target=mode==='create'?document.getElementById('createTitleJa'):document.getElementById('editTitleJa');target.focus();if(media.matches)target.scrollIntoView({block:'center',behavior:'instant'})}}
 function renderList(){
  rows.replaceChildren();
  if(!select.options.length){rows.append(make('p','admin-list-empty','記事はありません。新規作成から投稿できます。'));showEditor('create');return}
  for(const option of select.options){
   const row=button('admin-article-row','');row.dataset.articleId=option.value;row.setAttribute('aria-pressed',String(option.value===select.value));
   const parts=option.textContent.split(' — ');const date=make('time','',parts.shift()||'');if(/^\d{4}-\d{2}-\d{2}$/.test(date.textContent))date.dateTime=date.textContent;
   row.append(date,make('span','',parts.join(' — ')||option.textContent));row.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));showEditor('edit',true);syncSelection()});rows.append(row);
  }
  syncSelection();
 }
 function syncSelection(){rows.querySelectorAll('button').forEach(row=>row.setAttribute('aria-pressed',String(row.dataset.articleId===select.value)))}
 new MutationObserver(()=>{renderList();if(select.options.length)showEditor('edit')}).observe(select,{childList:true});
 select.addEventListener('change',()=>{syncSelection();showEditor('edit')});
 create.addEventListener('click',()=>showEditor('create',true));
 renderList();if(select.options.length)showEditor('edit');
})();
