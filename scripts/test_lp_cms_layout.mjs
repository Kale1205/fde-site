import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LP_IDS,LP_MANIFEST,LP_ARCHIVE_SLOTS,LP_ARCHIVE_CASES,archiveEntry,validateMediaManifest} from '../ja/lp/media-schema.js';
import {prepareLpDraft,LpPublisher} from '../cms-lp-workflow.js';

const hex=n=>n.repeat(64);
const legacyPoster='assets/cases/03/'+hex('a')+'.jpg',legacyVideo='assets/cases/03/'+hex('b')+'.mp4';
const archivePhoto='assets/archive/00/'+hex('a')+'.jpg',archiveVideo='assets/archive/00/'+hex('b')+'.mp4';
const legacy={version:1,cases:{'03':{title:'旧案件',alt:'旧素材',poster:legacyPoster,video:legacyVideo}},order:[...LP_IDS].reverse()};
const inspect=async(_,kind)=>({bytes:new Uint8Array([1]),ext:kind==='video'?'mp4':'jpg',hash:hex(kind==='video'?'b':'a')});
const archiveDraft={scope:'archive',slot:'00',id:'03',alt:'新しい短いクリップ',files:{poster:1,video:2}};
const layers=Array.from({length:7},(_,i)=>({source:i%2?'archive:00':'case',visible:i!==3,x:i*3,y:10,width:30,rotate:i-5}));
const story={layers,cover:'archive:00',blocks:[
 {type:'text',heading:'制作の意図',text:'紹介の段落'},
 {type:'image',source:'archive:00',alt:'写真の説明',caption:'画像下の説明'}
]};

test('Archive layout matches the fixed 24-position contact sheet; defaults never auto-promote legacy video',()=>{
 assert.equal(LP_ARCHIVE_SLOTS.length,24);
 assert.equal(LP_ARCHIVE_SLOTS.includes('12'),false);
 assert.equal(LP_ARCHIVE_CASES['00'],'03');
 assert.deepEqual(archiveEntry(legacy,'00'),{caseId:'03',title:'旧案件',alt:'旧素材',photo:legacyPoster});
 assert.deepEqual(archiveEntry({...legacy,archive:{'00':{caseId:'03'}}},'00'),{caseId:'03'});
 assert.equal(archiveEntry(legacy,'12'),null);
 assert.deepEqual(validateMediaManifest(legacy),legacy);
});

test('Archive draft changes one tile with hashed local assets, preserving legacy content, order and other positions',async()=>{
 const baseline={...legacy,archive:{'01':{caseId:'09',title:'別の位置'}}};
 const next=await prepareLpDraft(archiveDraft,baseline,{inspect});
 assert.deepEqual(next.next.cases,legacy.cases);
 assert.deepEqual(next.next.order,legacy.order);
 assert.deepEqual(next.next.archive['01'],baseline.archive['01']);
 assert.deepEqual(next.next.archive['00'],{caseId:'03',title:'旧案件',alt:'新しい短いクリップ',photo:legacyPoster,poster:archivePhoto,video:archiveVideo});
 assert.deepEqual(next.assets.map(a=>a.path),[archivePhoto,archiveVideo]);
 assert.equal(archiveEntry(next.next,'00').video,archiveVideo);
 assert.equal(archiveEntry(next.next,'10').video,undefined);
 const edit=await prepareLpDraft({scope:'archive',slot:'00',id:'03',title:' 別の素材名 '},legacy,{inspect});
 assert.deepEqual(edit.next.archive['00'],{caseId:'03',title:'別の素材名',alt:'旧素材',photo:legacyPoster});
 assert.deepEqual(edit.assets,[]);
 const reassigned=await prepareLpDraft({scope:'archive',slot:'00',id:'04'},edit.next,{inspect});
 assert.equal(reassigned.next.archive['00'].photo,undefined);
 const removed=await prepareLpDraft({scope:'archive',slot:'00',id:'03',removeVideo:true},next.next,{inspect});
 assert.equal(removed.next.archive['00'].video,undefined);
 assert.equal(removed.next.archive['00'].poster,undefined);
 assert.equal(removed.next.cases['03'].video,legacyVideo);
 const reset=await prepareLpDraft({scope:'archive',slot:'00',id:'03',removePhoto:true},legacy,{inspect});
 assert.equal(archiveEntry(reset.next,'00').photo,undefined);
 await assert.rejects(prepareLpDraft({scope:'archive',slot:'00',id:'03'},legacy,{inspect}),/LP_NO_CHANGE/);
 await assert.rejects(prepareLpDraft({...archiveDraft,slot:'12'},legacy,{inspect}),/LP_MANIFEST/);
});

test('Stories drafts independently save layout, cover and detail blocks without modifying historical video or Archive',async()=>{
 const original={...legacy,archive:{'00':{caseId:'03',alt:'Archive 画像',photo:archivePhoto}}};
 const draft={scope:'stories',id:'03',title:'リニューアル',description:'新しい紹介文',order:LP_IDS,story,
  // Legacy/stale media-picker input cannot modify clips through Stories.
  removeVideo:true,files:{video:2,poster:1}};
 const {next,assets}=await prepareLpDraft(draft,original,{inspect:()=>{throw Error('unexpected upload');}});
 assert.deepEqual(assets,[]);
 assert.deepEqual(next.archive,original.archive);
 assert.equal(next.cases['03'].video,legacyVideo);
 assert.equal(next.cases['03'].poster,legacyPoster);
 assert.equal(next.cases['03'].description,'新しい紹介文');
 assert.deepEqual(next.cases['03'].story,story);
 assert.equal(next.order,undefined);
 const normalized=await prepareLpDraft({scope:'stories',id:'03',story:{blocks:[
  {type:'text',heading:' ',text:' 新しい説明 '},{type:'image',source:'case',alt:'',caption:' 説明文 '}
 ]}},next,{inspect});
 assert.deepEqual(normalized.next.cases['03'].story.blocks,[
  {type:'text',text:'新しい説明'},{type:'image',source:'case',caption:'説明文'}
 ]);
 await assert.rejects(prepareLpDraft({scope:'stories',id:'03',story:{blocks:[{type:'text',text:' '}]}},next,{inspect}),/LP_MANIFEST/);
 const restored=await prepareLpDraft({scope:'stories',id:'03',story:{}},next,{inspect});
 assert.equal(restored.next.cases['03'].story,undefined);
 assert.equal(restored.next.cases['03'].title,'リニューアル');
});

test('Manifest does not accept wrong ownership, uncontrolled paths, non-local sources, invalid placement or blocks',()=>{
 const checks=[
  {...legacy,archive:{'12':{caseId:'03'}}},
  {...legacy,archive:{'00':{caseId:'99'}}},
  {...legacy,archive:{'00':{caseId:'04',alt:'説明',photo:legacyPoster}}},
  {...legacy,archive:{'00':{caseId:'03',alt:'説明',photo:archivePhoto.replace('/00/','/00/../00/')}}},
  {...legacy,archive:{'00':{caseId:'03',alt:'説明',video:archiveVideo}}},
  {...legacy,archive:{'00':{caseId:'03',alt:'説明',video:legacyVideo,poster:legacyPoster}}},
  ...[
   {cover:'archive:12'},
   {cover:'https://example.com/a.jpg'},
   {cover:'archive:0'},
   {layers:layers.slice(1)},
   {layers:layers.map(l=>({...l,visible:false}))},
   {layers:layers.map(l=>({...l,width:'10'}))},
   {layers:layers.map(l=>({...l,rotate:46}))},
   {layers:layers.map(l=>({...l,x:Infinity}))},
   {layers:layers.map(l=>({...l,y:101}))},
   {layers:layers.map(l=>({...l,html:'<img>'}))},
   {blocks:Array.from({length:13},()=>({type:'text',text:'長い'}))},
   {blocks:[{type:'image',source:'archive:12'}]},
   {blocks:[{type:'text',text:' '} ]},
   {blocks:[{type:'text',text:'a'.repeat(2001)}]},
   {blocks:[{type:'video',source:'case'}]}
  ].map(value=>({...legacy,cases:{'03':{story:value}}}))
 ];
 for(const example of checks)assert.throws(()=>validateMediaManifest(example),/LP_MANIFEST/,JSON.stringify(example).slice(0,160));
});

test('Reviewed Archive draft uses the existing draft-PR gate, with no unrelated writes',async()=>{
 const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),writes=[];
 const api={
  api:async(path,token,options)=>{
   assert.equal(token,'fixture-not-a-real-token');
   if(path==='/git/ref/heads/main')return {object:{sha:a}};
   if(path.startsWith('/git/ref/heads/cms/lp/'))throw Object.assign(Error('missing'),{status:404});
   if(path==='/user')return {id:1,login:'fixture'};
   if(path==='/git/commits/'+a)return {tree:{sha:b}};
   assert.equal(options.method,'POST');
   writes.push([path,JSON.parse(options.body)]);
   return path==='/pulls'?{number:18}:{sha:c};
  },
  file:async path=>{assert.equal(path,LP_MANIFEST);return {sha:b,text:JSON.stringify(legacy)};},
  findPR:async()=>null
 };
 const publisher=new LpPublisher(api),token='fixture-not-a-real-token',base=await publisher.snapshot(token);
 const draft={scope:'archive',slot:'00',id:'03',title:'アーカイブの位置'};
 const reviewed=await prepareLpDraft(draft,base.data);
 await assert.rejects(publisher.publish(token,{...draft,title:'別の内容'},base,reviewed.fingerprint),error=>error.code==='REVIEW');
 assert.deepEqual(writes,[]);
 assert.equal((await publisher.publish(token,draft,base,reviewed.fingerprint)).number,18);
 assert.deepEqual(writes.map(([path])=>path),['/git/blobs','/git/trees','/git/commits','/git/refs','/pulls']);
 assert.deepEqual(writes[1][1].tree.map(file=>file.path),[LP_MANIFEST]);
 assert.equal(writes[4][1].draft,true);
 assert.deepEqual(JSON.parse(Buffer.from(writes[0][1].content,'base64')).archive,{'00':{caseId:'03',title:'アーカイブの位置',alt:'旧素材',photo:legacyPoster}});
});

test('optional Story detail copy is curated, trimmed, additive and resettable',async()=>{
 const archived={...legacy,archive:{'00':{caseId:'03',photo:legacyPoster,alt:'写真'}}};
 const draft={scope:'stories',id:'03',story:{...story,detail:{
  headline:'  新しい見出し\n二行目  ',subtitle:'　　',eyebrow:' 見出し上 ',
  mood:' やわらかな色 ',composition:' 導入、本文、締め ',note:' 補足 '
 }}};
 const expected={headline:'新しい見出し\n二行目',eyebrow:'見出し上',mood:'やわらかな色',composition:'導入、本文、締め',note:'補足'};
 const {next}=await prepareLpDraft(draft,archived,{inspect});
 assert.deepEqual(next.cases['03'].story,{...story,detail:expected});
 assert.deepEqual(next.archive,archived.archive);
 assert.equal(next.cases['03'].video,legacyVideo);
 const reset=await prepareLpDraft({...draft,story:{...story,detail:{headline:'   '}}},next,{inspect});
 assert.deepEqual(reset.next.cases['03'].story,story);
 for(const detail of [{headline:4},{headline:'a'.repeat(181)},{html:'<img>'},JSON.parse('{"__proto__":"ignored?"}'),null,[]]){
  const unsafe={...draft,story:{...story,detail}};
  await assert.rejects(prepareLpDraft(unsafe,archived,{inspect}),/LP_MANIFEST/);
 }
});
