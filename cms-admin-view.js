// Presentation only. The runtime preserves drafts and authorizes every route and write.
(()=>{
 const main=document.querySelector('.admin-main > .admin-shell'),tabs=document.getElementById('adminTabs'),select=document.getElementById('editNewsTarget');
 if(!main||!tabs||!select)return;
 const $=id=>document.getElementById(id),make=(tag,className='',text='')=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
 const button=(text,className='admin-button secondary')=>{const node=make('button',className,text);node.type='button';return node;};
 const visible=(node,show)=>{if(!node)return;node.hidden=!show;node.classList.toggle('hidden',!show);};
 const navigate=target=>window.FDE_CMS_NAVIGATE?.(target);
 const routeButton=(text,target,className)=>{const node=button(text,className);node.addEventListener('click',()=>navigate(target));return node;};
 document.body.classList.add('cms-menu-layout');
 const header=document.querySelector('.admin-header'),headerShell=header.querySelector('.admin-shell');
 header.querySelector('.admin-brand strong').textContent='Baked Kale';header.querySelector('.admin-brand small').textContent='CMS';
 headerShell.append(routeButton('メニュー',{section:null,screen:'menu'},'admin-button secondary cms-home-button'));
 const intro=document.querySelector('.admin-intro'),connectionCard=intro.nextElementSibling;
 const connection=make('details','admin-connection cms-connection');connection.id='cmsConnection';
 connection.append(make('summary','','接続設定'));const connectionBody=make('div','admin-connection-body');connectionBody.append(connectionCard);
 const safety=make('details','cms-safety-settings');safety.append(make('summary','','保存と公開について'),intro);connectionBody.append(safety);connection.append(connectionBody);headerShell.append(connection);
 connectionCard.querySelector('h2').textContent='GitHubへ接続';
 tabs.hidden=true;tabs.classList.add('hidden');
 const breadcrumb=make('nav','cms-breadcrumb');breadcrumb.id='cmsBreadcrumbs';breadcrumb.setAttribute('aria-label','現在地');const crumbs=make('ol');breadcrumb.append(crumbs);
 const toolbar=make('div','cms-page-heading'),back=button('戻る','cms-back-button'),title=make('h1','','メニュー');title.id='cmsScreenHeading';title.tabIndex=-1;toolbar.append(back,title);
 const status=$('adminStatus'),statusSlot=make('div','cms-status-slot');statusSlot.append(status);main.prepend(breadcrumb,toolbar,statusSlot);
 const menuScreen=make('section','cms-choice-screen');menuScreen.id='cmsMenuScreen';menuScreen.setAttribute('aria-label','メニュー');
 const menuChoices=make('div','cms-choices cms-section-choices');menuChoices.append(routeButton('お知らせ',{section:'news',screen:'actions'},'cms-choice'),routeButton('FAQ',{section:'faq',screen:'actions'},'cms-choice'));menuScreen.append(menuChoices);
 const actionsScreen=make('section','cms-choice-screen');actionsScreen.id='cmsActionsScreen';const actionChoices=make('div','cms-choices'),actionNote=make('p','cms-small-note');actionsScreen.append(actionChoices,actionNote);main.append(menuScreen,actionsScreen);
 const newsPanel=$('newsPanel'),workspace=make('div','admin-news-workspace'),listing=make('section','admin-article-list');listing.setAttribute('aria-labelledby','adminArticleHeading');
 const listHeader=make('div','admin-list-heading'),listHeading=make('h2','','記事一覧');listHeading.id='adminArticleHeading';listHeader.append(listHeading,routeButton('新規作成',{section:'news',screen:'editor',mode:'create'}));listing.append(listHeader);
 const rows=make('div','admin-article-rows');rows.id='cmsArticleRows';listing.append(rows);
 const stage=make('div','admin-editor-stage'),createCard=$('newsCreateCard'),editCard=$('newsManageCard');stage.append(createCard,editCard);workspace.append(listing,stage);newsPanel.prepend(workspace);
 const originalSelectField=select.closest('.field');originalSelectField.hidden=true;originalSelectField.classList.add('admin-original-selector');select.tabIndex=-1;
 const draftBar=newsPanel.querySelector('.cms-draft-bar'),draftSelect=$('localDrafts'),draftRows=make('div','cms-draft-rows');draftRows.id='cmsDraftRows';
 if(draftBar){draftBar.querySelector('h2').textContent='下書き';draftBar.querySelector('p').textContent='このブラウザに保存されています。';draftBar.append(draftRows);draftSelect.closest('.field').hidden=true;draftSelect.tabIndex=-1;}
 const outcome=make('section','cms-editor-outcome');outcome.setAttribute('aria-label','公開依頼の状況');outcome.append($('draftOperation'),$('publicationResult'));statusSlot.after(outcome);
 const options=make('details','cms-editor-options');options.append(make('summary','','その他'));
 const translationSettings=make('details','cms-translation-settings');translationSettings.append(make('summary','','翻訳設定'),$('adminKey').closest('.field'));
 const freshDraft=routeButton('別の下書きを作る',{section:'news',screen:'editor',mode:'create',fresh:true});freshDraft.id='cmsFreshDraft';
 options.append(translationSettings,$('backupDraft'),make('p','cms-small-note','バックアップはこの端末にダウンロードします。'),freshDraft);stage.append(options);
 const uploader=$('uploaderCard');newsPanel.append(uploader);
 const editorParts={};
 function prepareEditor(which,card){
  card.classList.add('cms-article-editor');card.querySelector('h2').tabIndex=-1;
  card.querySelector('h2').textContent=which==='create'?'新規作成':'記事を編集';card.querySelector('h2').hidden=true;card.querySelector(':scope > p').textContent='下書きは端末内。公開依頼は確認後。';if(which==='create')card.querySelector(':scope > p').hidden=true;
  const grid=$(which+'TitleJa').closest('.admin-form-grid'),imageSection=make('section','cms-image-section'),imageHeading=make('div','cms-section-heading');
  imageHeading.append(make('h3','','画像'),make('span','cms-small-note','カード・本文共通'));imageSection.append(imageHeading);
  const fileField=$(which+'ImageFile').closest('.field'),previewGrid=make('div','cms-image-grid');
  if(which==='edit'){
   const oldGrid=$('editCurrentImage').closest('.admin-grid');for(const node of [...oldGrid.children])previewGrid.append(node);oldGrid.remove();
   const labels=previewGrid.querySelectorAll('.current-image-note');if(labels[0])labels[0].textContent='現在';if(labels[1])labels[1].textContent='差し替え後';
  }else{previewGrid.classList.add('cms-image-single');previewGrid.append($('createPreview'));}
  imageSection.append(previewGrid,fileField);fileField.querySelector('label').textContent='画像を選ぶ';
  if(which==='edit'){const remove=$('removeNewsImageBtn');remove.textContent='画像を解除';fileField.append(remove);}
  card.insertBefore(imageSection,grid);
  const languageSection=make('section','cms-language-editor');languageSection.append(make('h3','','タイトルと本文'));
  const tablist=make('div','cms-language-tabs');tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','編集する言語');languageSection.append(tablist);
  const languageTabs=[],languagePanels=[];
  for(const [suffix,label,lang] of [['Ja','日本語','ja'],['En','English','en'],['Zh','简体中文','zh-CN']]){
   const tab=button(label,'cms-language-tab');tab.id=which+'Language'+suffix;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',which+'LanguagePanel'+suffix);tablist.append(tab);languageTabs.push(tab);
   const pane=make('div','cms-language-panel');pane.id=which+'LanguagePanel'+suffix;pane.lang=lang;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
   for(const field of ['Title','Body'])pane.append($(which+field+suffix).closest('.field'));
   if(suffix==='En'){pane.append($(which+'Translate'),make('p','cms-small-note','空欄だけ翻訳します。翻訳設定は「その他」へ。'));}
   languageSection.append(pane);languagePanels.push(pane);
   tab.addEventListener('click',()=>activate(languageTabs.indexOf(tab)));
   tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(languageTabs.indexOf(tab)+1)%3;else if(event.key==='ArrowLeft')next=(languageTabs.indexOf(tab)+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();activate(next);languageTabs[next].focus();});
  }
  function activate(index){languageTabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;languagePanels[i].hidden=i!==index;});}
  activate(0);grid.before(languageSection);
  const metadata=make('details','cms-metadata');metadata.append(make('summary','','記事設定'));const metadataGrid=make('div','admin-form-grid');for(const suffix of ['Category','Date','Featured'])metadataGrid.append($(which+suffix).closest('.field'));metadata.append(metadataGrid);grid.before(metadata);
  if(which==='edit'){const deletion=make('details','cms-delete-settings');deletion.append(make('summary','','削除'),make('p','cms-small-note','削除も下書きと公開依頼で進めます。'),$('deleteNewsBtn'));if($('cancelNewsDeleteBtn'))deletion.append($('cancelNewsDeleteBtn'));grid.before(deletion);}
  const steps=make('nav','cms-progress');steps.setAttribute('aria-label','作業の進捗');const stepButtons=[];
  for(const [index,label] of ['内容','翻訳','確認','公開依頼'].entries()){const step=index+1,node=button(`${['①','②','③','④'][index]}${label}`,'cms-progress-step');node.dataset.step=String(step);node.setAttribute('aria-current',step===1?'step':'false');node.addEventListener('click',()=>{if(step<=2)navigate({section:'news',screen:'editor',mode:which,step});else{const dialog=$('newsPreview');if(step===4)dialog.dataset.requestFocus='true';else delete dialog.dataset.requestFocus;$(which+'PreviewBtn').click();}});steps.append(node);stepButtons.push(node);}
  imageSection.before(steps);
  const footer=make('div','cms-editor-footer'),footerNote=make('p','cms-small-note','保存は端末内。プレビュー後に公開依頼（PR）。'),footerActions=make('div','actions');
  const save=$(which==='create'?'createNewsBtn':'saveNewsBtn'),preview=$(which+'PreviewBtn');save.textContent='下書き保存';preview.textContent='プレビュー';footerActions.append(save,preview);footer.append(footerNote,footerActions);card.append(footer);
  editorParts[which]={activate,imageSection,languageSection,stepButtons};
  // Keep the original wrapper without showing empty layout tracks.
  if(!grid.querySelector('input,textarea,select,button'))grid.hidden=true;
 }
 prepareEditor('create',createCard);prepareEditor('edit',editCard);
 const faqPanel=$('faqPanel'),faqSelect=$('editFaqTarget'),faqEditor=$('faqManageCard')||$('editFaqFields').closest('section'),faqCards=[...faqPanel.children];
 faqCards.forEach(card=>visible(card,false));faqEditor.querySelector('h2').textContent='FAQを確認';faqEditor.querySelector('h2').tabIndex=-1;faqEditor.querySelector('p').textContent='閲覧のみ。保存・公開は準備中です。';faqSelect.closest('.field').hidden=true;faqSelect.tabIndex=-1;
 const faqListing=make('section','admin-article-list cms-faq-list');faqListing.append(make('h2','','FAQ一覧'));const faqRows=make('div','admin-article-rows');faqRows.id='cmsFaqRows';faqListing.append(faqRows);faqPanel.prepend(faqListing);
 const faqEditorParts={};let faqUiReady=false,faqWorkspace,faqStage,faqCreateCard,faqDraftBar,faqDraftSelect,faqDraftRows,faqOptions,faqOutcome;
 const faqEditable=()=>faqUiReady&&faqPanel.dataset.faqWorkflow==='draft-pr';
 function prepareFaqWorkflow(){
  if(faqUiReady)return true;
  const required=['faqCreateCard','faqDraftBar','faqLocalDrafts','faqBackupDraft','faqFreshDraft','faqDraftOperation','faqPublicationResult','faqPreview'];
  for(const cap of ['Create','Edit'])for(const suffix of ['QJa','AJa','QEn','AEn','QZh','AZh','Translate','PreviewBtn'])required.push('faq'+cap+suffix);
  if(required.some(id=>!$(id)))return false;
  faqCreateCard=$('faqCreateCard');faqWorkspace=make('div','admin-news-workspace cms-faq-workspace');faqStage=make('div','admin-editor-stage cms-faq-stage');faqStage.append(faqCreateCard,faqEditor);faqWorkspace.append(faqListing,faqStage);faqPanel.prepend(faqWorkspace);
  const faqListHeader=make('div','admin-list-heading');faqListHeader.append(faqListing.querySelector('h2'),routeButton('新規作成',{section:'faq',screen:'editor',mode:'create'}));faqListing.prepend(faqListHeader);
  faqDraftBar=$('faqDraftBar');faqDraftSelect=$('faqLocalDrafts');faqDraftRows=make('div','cms-draft-rows');faqDraftRows.id='cmsFaqDraftRows';faqDraftBar.append(faqDraftRows);const draftField=faqDraftSelect.closest('.field');if(draftField)draftField.hidden=true;else faqDraftSelect.hidden=true;faqDraftSelect.tabIndex=-1;
  faqOutcome=make('section','cms-editor-outcome');faqOutcome.setAttribute('aria-label','FAQ公開依頼の状況');faqOutcome.append($('faqDraftOperation'),$('faqPublicationResult'));faqPanel.append(faqOutcome);
  faqOptions=make('details','cms-editor-options');faqOptions.append(make('summary','','その他'),$('faqBackupDraft'),make('p','cms-small-note','バックアップはこの端末にダウンロードします。'),$('faqFreshDraft'));faqStage.append(faqOptions);
  for(const [which,cap,card] of [['create','Create',faqCreateCard],['edit','Edit',faqEditor]]){
   card.classList.add('cms-article-editor','cms-faq-editor');card.querySelector('h2').hidden=true;const note=card.querySelector(':scope > p');if(note){note.textContent='下書きは端末内。公開依頼は確認後。';note.hidden=which==='create';}
   const grid=$('faq'+cap+'QJa').closest('.admin-form-grid'),language=make('section','cms-language-editor');language.append(make('h3','','質問と回答'));const tablist=make('div','cms-language-tabs');tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','編集する言語');language.append(tablist);const languageTabs=[],panels=[];
   for(const [suffix,label,lang]of [['Ja','日本語','ja'],['En','English','en'],['Zh','简体中文','zh-CN']]){
    const tab=button(label,'cms-language-tab');tab.id='faq'+cap+'Language'+suffix;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','faq'+cap+'LanguagePanel'+suffix);tablist.append(tab);languageTabs.push(tab);const pane=make('div','cms-language-panel');pane.id='faq'+cap+'LanguagePanel'+suffix;pane.lang=lang;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
    for(const field of ['Q','A']){const input=$('faq'+cap+field+suffix);pane.append(input.closest('.field'));}
    if(suffix==='En')pane.append($('faq'+cap+'Translate'),make('p','cms-small-note','空欄だけ翻訳します。中国語は直接入力。'));
    language.append(pane);panels.push(pane);tab.addEventListener('click',()=>activate(languageTabs.indexOf(tab)));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(languageTabs.indexOf(tab)+1)%3;else if(event.key==='ArrowLeft')next=(languageTabs.indexOf(tab)+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();activate(next);languageTabs[next].focus();});
   }
   function activate(index){languageTabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});}
   activate(0);grid.before(language);
   const settings=make('details','cms-metadata');settings.append(make('summary','','FAQ設定'));const settingsGrid=make('div','admin-form-grid');for(const suffix of ['Category','Subcategory','Frequent'])settingsGrid.append($('faq'+cap+suffix).closest('.field'));if(which==='edit'&&$('faqSearchTermsPreview'))settingsGrid.append($('faqSearchTermsPreview').closest('.field'));settings.append(settingsGrid);grid.before(settings);
   if(which==='edit'){const deletion=make('details','cms-delete-settings');deletion.append(make('summary','','削除'),make('p','cms-small-note','削除も下書きと公開依頼で進めます。'),$('deleteFaqBtn'));if($('cancelFaqDeleteBtn'))deletion.append($('cancelFaqDeleteBtn'));grid.before(deletion);}
   const steps=make('nav','cms-progress');steps.setAttribute('aria-label','作業の進捗');const stepButtons=[];for(const[index,label]of ['内容','翻訳','確認','公開依頼'].entries()){const step=index+1,node=button(`${['①','②','③','④'][index]}${label}`,'cms-progress-step');node.dataset.step=String(step);node.setAttribute('aria-current',step===1?'step':'false');node.addEventListener('click',()=>{if(step<=2)navigate({section:'faq',screen:'editor',mode:which,step});else{const dialog=$('faqPreview');if(step===4)dialog.dataset.requestFocus='true';else delete dialog.dataset.requestFocus;$('faq'+cap+'PreviewBtn').click();}});steps.append(node);stepButtons.push(node);}language.before(steps);
   const footer=make('div','cms-editor-footer'),actions=make('div','actions'),save=$(which==='create'?'createFaqBtn':'saveFaqBtn'),preview=$('faq'+cap+'PreviewBtn');save.textContent='下書き保存';preview.textContent='プレビュー';actions.append(save,preview);footer.append(make('p','cms-small-note','保存は端末内。プレビュー後に公開依頼（PR）。'),actions);card.append(footer);if(!grid.querySelector('input,textarea,select,button'))grid.hidden=true;
   faqEditorParts[which]={activate,languageSection:language,stepButtons};
  }
  new MutationObserver(renderFaqDrafts).observe(faqDraftSelect,{childList:true});new MutationObserver(renderFaqDrafts).observe(faqDraftBar,{attributes:true,attributeFilter:['data-draft-state']});
  const syncFaqDelete=()=>visible($('cancelFaqDeleteBtn'),!!$('faqDraftOperation').textContent.trim());new MutationObserver(syncFaqDelete).observe($('faqDraftOperation'),{childList:true,characterData:true,subtree:true});syncFaqDelete();faqUiReady=true;renderFaqDrafts();return true;
 }
 prepareFaqWorkflow();
 let route={section:null,screen:'menu'},previousConnection='idle';
 function renderNewsList(){
  rows.replaceChildren();const state=select.dataset.newsState||'idle',ready=state==='loaded';listing.setAttribute('aria-busy',String(state==='loading'));
  const messages={idle:'接続すると記事を表示します。',loading:'取得中…',error:'取得できませんでした。接続設定から再試行してください。'};
  rows.append(make('p','admin-list-state',ready?(select.options.length?`${select.options.length}件`:'記事はありません。'):messages[state]||messages.idle));
  if(!ready&&select.options.length)rows.append(make('p','cms-small-note','前回の一覧です。再接続後に選択できます。'));
  for(const option of select.options){const row=button('','admin-article-row');row.dataset.articleId=option.value;row.disabled=!ready;const parts=option.textContent.split(' — '),date=make('time','',parts.shift()||'');row.append(date,make('span','',parts.join(' — ')||option.textContent));row.addEventListener('click',()=>{if(select.dataset.newsState!=='loaded'||select.disabled)return;navigate({section:'news',screen:'editor',mode:'edit',articleId:option.value});});rows.append(row);}
  syncSelection();
 }
 function syncSelection(){rows.querySelectorAll('button').forEach(row=>row.setAttribute('aria-pressed',String(row.dataset.articleId===select.value)));}
 function renderDrafts(){if(!draftSelect)return;draftRows.replaceChildren();const entries=[...draftSelect.options].filter(option=>option.value);if(!entries.length)draftRows.append(make('p','admin-list-empty','下書きはありません。'));for(const option of entries){const row=button(option.textContent,'admin-article-row cms-draft-row');row.dataset.draftId=option.value;row.addEventListener('click',()=>{draftSelect.value=option.value;draftSelect.dispatchEvent(new Event('change',{bubbles:true}));});draftRows.append(row);}}
 function renderFaqDrafts(){if(!faqDraftSelect)return;faqDraftRows.replaceChildren();const state=faqDraftBar.dataset.draftState||'idle',entries=[...faqDraftSelect.options].filter(option=>option.value);faqDraftRows.setAttribute('aria-busy',String(state==='loading'));if(state!=='loaded'){faqDraftRows.append(make('p','admin-list-state',state==='error'?'下書きを読み込めませんでした。':state==='loading'?'読込中…':'下書きは未読込です。'));return;}if(!entries.length)faqDraftRows.append(make('p','admin-list-empty','下書きはありません。'));for(const option of entries){const row=button(option.textContent,'admin-article-row cms-draft-row');row.dataset.draftId=option.value;row.disabled=!faqEditable();row.addEventListener('click',()=>{if(!faqEditable())return;faqDraftSelect.value=option.value;faqDraftSelect.dispatchEvent(new Event('change',{bubbles:true}));});faqDraftRows.append(row);}}
 function renderFaqList(){
  faqRows.replaceChildren();const state=faqPanel.dataset.faqState||'idle',ready=state==='loaded';faqListing.setAttribute('aria-busy',String(state==='loading'));
  faqRows.append(make('p','admin-list-state',ready?(faqSelect.options.length?`${faqSelect.options.length}件${faqEditable()?'':'・閲覧のみ'}`:'FAQはありません。'):state==='loading'?'取得中…':state==='error'?'取得できませんでした。接続設定から再試行してください。':'接続するとFAQを表示します。'));
  if(faqEditable())faqRows.append(make('p','cms-small-note','追加ポリシーFAQは別管理です。'));
  for(const option of faqSelect.options){const row=button(option.textContent,'admin-article-row cms-faq-row');row.disabled=!ready;row.dataset.faqId=option.value;row.setAttribute('aria-pressed',String(option.value===faqSelect.value));row.addEventListener('click',()=>{if(faqPanel.dataset.faqState!=='loaded'||faqSelect.disabled)return;navigate({section:'faq',screen:'editor',mode:'edit',articleId:option.value});});faqRows.append(row);}
  syncFaqSelection();
 }
 function syncFaqSelection(){faqRows.querySelectorAll('button[data-faq-id]').forEach(row=>row.setAttribute('aria-pressed',String(row.dataset.faqId===faqSelect.value)));}
 function syncConnection(){const state=tabs.dataset.connectionState||'idle';connection.dataset.connectionState=state;if(state==='error'||(state!=='connected'&&route.screen==='list'))connection.open=true;else if(state==='connected'&&previousConnection!=='connected')connection.open=false;previousConnection=state;}
 function renderChoices(){
  actionChoices.replaceChildren();const faq=route.section==='faq';
  for(const [label,screen,mode] of [['新規作成','editor','create'],['既存編集','list'],['下書き','drafts']]){const disabled=faq&&!faqEditable()&&screen!=='list',node=routeButton(label,{section:route.section,screen,...(mode?{mode}:{})},'cms-choice');if(disabled){node.disabled=true;node.append(make('small','','準備中'));}actionChoices.append(node);}
  actionNote.replaceChildren();if(faq){if(!faqEditable())actionNote.textContent='現在は閲覧のみ利用できます。';}else actionNote.append(routeButton('共通画像',{section:'news',screen:'media'},'cms-text-button'));
 }
 function renderBreadcrumbs(){
  crumbs.replaceChildren();const steps=[{label:'メニュー',target:{section:null,screen:'menu'}}];if(route.section)steps.push({label:route.section==='news'?'お知らせ':'FAQ',target:{section:route.section,screen:'actions'}});
  if(!['menu','actions'].includes(route.screen)){if(route.screen==='editor'&&route.mode==='edit')steps.push({label:'既存編集',target:{section:route.section,screen:'list'}});steps.push({label:route.screen==='list'?'既存編集':route.screen==='drafts'?'下書き':route.screen==='media'?'共通画像':route.section==='faq'&&!faqEditable()?'確認':route.mode==='create'?'新規作成':'編集'});}
  steps.forEach((step,index)=>{const item=make('li');if(index===steps.length-1){const current=make('span','',step.label);current.setAttribute('aria-current','page');item.append(current);}else item.append(routeButton(step.label,step.target,'cms-text-button'));crumbs.append(item);});
  visible(back,steps.length>1);back.onclick=()=>navigate(steps.at(-2)?.target||{section:null,screen:'menu'});
 }
 function applyRoute(next,focus=true){
  route={...next};main.dataset.cmsSection=route.section||'';main.dataset.cmsScreen=route.screen;document.body.dataset.cmsScreen=route.screen;
  const news=route.section==='news',faq=route.section==='faq',editor=route.screen==='editor',faqSafe=faqEditable(),activeNews=news&&!['menu','actions'].includes(route.screen),activeFaq=faq&&(['list','editor'].includes(route.screen)||faqSafe&&route.screen==='drafts');
  visible(menuScreen,route.screen==='menu');visible(actionsScreen,route.screen==='actions');visible(newsPanel,activeNews);visible(faqPanel,activeFaq);visible(workspace,news&&['list','editor'].includes(route.screen));visible(listing,news&&(route.screen==='list'||(editor&&route.mode==='edit')));visible(stage,news&&editor);visible(createCard,news&&editor&&route.mode==='create');visible(editCard,news&&editor&&route.mode!=='create');visible(draftBar,news&&route.screen==='drafts');visible(uploader,news&&route.screen==='media');visible(outcome,news&&(editor||route.screen==='media'));visible(options,news&&(editor||route.screen==='media'));visible(faqListing,faq&&route.screen==='list');visible(faqEditor,faq&&editor);
  if(news&&route.screen==='media')uploader.after(options);else if(news&&editor)stage.append(options);
  if(news&&editor)options.prepend(translationSettings);else if(faq&&faqSafe&&editor)faqOptions.prepend(translationSettings);
  visible(translationSettings,editor&&(news||faq&&faqSafe));
  if(faqUiReady){visible(faqWorkspace,faq&&['list','editor'].includes(route.screen));visible(faqListing,faq&&(route.screen==='list'||faqSafe&&editor&&route.mode==='edit'));visible(faqStage,faq&&editor);visible(faqCreateCard,faq&&faqSafe&&editor&&route.mode==='create');visible(faqEditor,faq&&editor&&(!faqSafe||route.mode==='edit'));visible(faqDraftBar,faq&&faqSafe&&route.screen==='drafts');visible(faqOptions,faq&&faqSafe&&editor);visible(faqOutcome,faq&&faqSafe&&editor);visible($('faqFreshDraft'),faq&&faqSafe&&editor&&route.mode==='create');faqWorkspace.classList.toggle('cms-single-stage',route.screen==='list'||!faqSafe||route.mode!=='edit');faqWorkspace.dataset.screen=route.screen;}
  workspace.classList.toggle('cms-single-stage',route.screen==='list'||route.mode!=='edit');workspace.dataset.screen=route.screen;visible(freshDraft,news&&editor&&route.mode==='create');
  title.textContent=route.screen==='menu'?'メニュー':route.screen==='actions'?(news?'お知らせ':'FAQ'):route.screen==='list'?(news?'記事一覧':'FAQ一覧'):route.screen==='drafts'?'下書き':route.screen==='media'?'共通画像':faq?faqSafe?route.mode==='create'?'FAQを新規作成':'FAQを編集':'FAQを確認':route.mode==='create'?'新規作成':'記事を編集';
  if(news&&editor&&route.mode==='edit')editCard.querySelector(':scope > p').textContent=route.title||$('editTitleJa').value||'無題';
  if(faq&&faqSafe&&editor&&route.mode==='edit')faqEditor.querySelector(':scope > p').textContent=route.title||$('faqEditQJa').value||'無題';
  if(route.screen==='actions')renderChoices();renderBreadcrumbs();syncSelection();syncFaqSelection();syncConnection();
  if(faq&&route.screen==='list')document.dispatchEvent(new CustomEvent('fde:cms-faq-read'));
  if(focus){title.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  const parts=editor?(news?editorParts:faqSafe?faqEditorParts:{} )[route.mode]:null;
  if(focus&&news&&editor&&route.step!==2&&$('publicationResult').dataset.recovery==='true')outcome.scrollIntoView({block:'start'});
  else if(focus&&parts&&route.step===1)(parts.imageSection||parts.languageSection).scrollIntoView({block:'start'});
  else if(focus&&parts&&route.step===2){parts.activate(1);parts.languageSection.scrollIntoView({block:'start'});}
 }
 new MutationObserver(renderNewsList).observe(select,{childList:true,attributes:true,attributeFilter:['data-news-state']});select.addEventListener('change',syncSelection);
 if(draftSelect)new MutationObserver(renderDrafts).observe(draftSelect,{childList:true});
 new MutationObserver(renderFaqList).observe(faqSelect,{childList:true});faqSelect.addEventListener('change',syncFaqSelection);
 new MutationObserver(records=>{const becameReady=!faqUiReady&&prepareFaqWorkflow(),capabilityChanged=records.some(record=>record.attributeName==='data-faq-workflow');renderFaqList();renderFaqDrafts();if(route.section==='faq'&&(becameReady||capabilityChanged))applyRoute(route,false);}).observe(faqPanel,{attributes:true,attributeFilter:['data-faq-state','data-faq-workflow']});
 new MutationObserver(syncConnection).observe(tabs,{attributes:true,attributeFilter:['data-connection-state']});
 const syncDeleteAction=()=>visible($('cancelNewsDeleteBtn'),!!$('draftOperation').textContent.trim());
 new MutationObserver(syncDeleteAction).observe($('draftOperation'),{childList:true,characterData:true,subtree:true});syncDeleteAction();
 document.addEventListener('fde:cms-route',event=>applyRoute(event.detail));
 document.addEventListener('fde:cms-show-editor',event=>{if(['create','edit'].includes(event.detail)){createCard.dataset.active=String(event.detail==='create');editCard.dataset.active=String(event.detail==='edit');}});
 document.addEventListener('fde:cms-progress',event=>{const data=event.detail,section=data?.section||'news',parts=(section==='faq'?faqEditorParts:section==='news'?editorParts:{})[data?.which];if(!parts)return;parts.stepButtons.forEach((node,index)=>{node.setAttribute('aria-current',index+1===data.step?'step':'false');node.dataset.complete=String(index===2&&data.reviewed===true);});});
 document.addEventListener('fde:cms-dirty',event=>{const data=event.detail,section=data?.section||'news',parts=(section==='faq'?faqEditorParts:section==='news'?editorParts:{})[data?.which||route.mode];if(parts)parts.stepButtons.forEach((node,index)=>{node.dataset.complete='false';node.setAttribute('aria-current',index===0?'step':'false');});});
 renderNewsList();renderDrafts();renderFaqList();applyRoute({section:main.dataset.cmsSection||null,screen:main.dataset.cmsScreen||'menu',mode:newsPanel.dataset.editorMode||'create'},false);
})();
