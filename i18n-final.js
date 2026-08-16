(()=>{
const add=(lang,values)=>{if(window.FDE_I18N&&window.FDE_I18N[lang])Object.assign(window.FDE_I18N[lang],values)};
add('ja',{
  productsHero:'Business Software, Where You Need It',
  plansTitle:'Plans',coverageTitle:'Coverage',howTitle:'How It Works',demoTitle:'Demo & Updates',
  whyHero:'Forward Deployed Engineering, Beyond Implementation',fdeRoleTitle:'What Is FDE?',backgroundTitle:'Background',whyClosing:'Why It Matters',
  aboutHero:'Kale’s Goals',goalDiagramTitle:'Business Model',approachTitle:'Approach',principlesTitle:'Principles',
  contactTitle:'Contact',faqTitle:'FAQ',formTitle:'Inquiry Form',businessProfileTitle:'Business Profile',
  instagramBody:'写真・映像・小説を中心とした個人のクリエイティブ活動を発信しています。FDEの業務情報とは分け、作品や制作活動を掲載しています。'
});
add('en',{
  tradeNameLabel:'Business name',
  instagramBody:'A personal creative account focused on photography, short-form video and literary writing. It is kept separate from Kale’s FDE business updates.'
});
})();