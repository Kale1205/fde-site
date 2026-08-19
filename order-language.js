(()=>{
function render(){
  const grid=document.querySelector('.quote-grid');if(!grid)return;
  let doc=document.getElementById('quoteDocumentLanguageCell');if(!doc){doc=document.createElement('div');doc.id='quoteDocumentLanguageCell';doc.className='quote-cell';doc.innerHTML='<small>Document language</small><strong>English</strong>';grid.appendChild(doc)}
  const old=document.getElementById('quoteDisplayLanguageCell');if(old)old.remove();
  const note=document.getElementById('documentLanguageNotice');if(note)note.textContent='Official document language: English.';
  document.body.dataset.orderLanguage='en';document.body.dataset.documentLanguage='en';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
