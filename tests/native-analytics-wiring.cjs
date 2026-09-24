const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{createRequire}=require('module');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),QUEUE='nature.analyticsQueue.v1';
const store=new Map();
global.wx={getStorageSync:k=>store.has(k)?store.get(k):'',setStorageSync:(k,v)=>{store.set(k,v)},removeStorageSync:k=>{store.delete(k)}};
const queue=()=>{const raw=store.get(QUEUE);return Array.isArray(raw)?raw:[]};
const events=()=>queue().map(e=>e.event);
const clear=()=>{store.delete(QUEUE)};
function loadPage(rel,extra={}){
 const file=path.join(root,rel);let page;
 vm.runInNewContext(read(rel),{Page:x=>page=x,wx:global.wx,getApp:()=>({}),require:createRequire(file),setTimeout:()=>0,clearTimeout:()=>{},console,...extra});
 if(!page)throw Error('page not registered: '+rel);
 page.setData=function(patch,cb){Object.assign(this.data,patch);if(typeof cb==='function')cb()};
 return page;
}

test('every tracked event name stays inside the analytics whitelist',()=>{
 const known=require('../native/lib/analytics')._KNOWN_EVENTS;
 const files=['native/pages/observe/index.js','native/pages/home/index.js','native/pages/friend-museum/index.js','native/pages/print/index.js','native/pages/settings/index.js'];
 let seen=0;
 for(const rel of files){
  const src=read(rel);
  assert.match(src,/require\('\.\.\/\.\.\/lib\/analytics'\)/,rel+' must require the shared analytics module');
  for(const m of src.matchAll(/track\('([a-z_]+)'/g)){seen++;assert.ok(known.has(m[1]),rel+' tracks unknown event '+m[1])}
 }
 assert.ok(seen>=16,'key funnel nodes must be instrumented');
});

test('observe page reports capture, recognition outcome and card creation',async()=>{
 clear();
 const page=loadPage('native/pages/observe/index.js',{getApp:()=>({startObservation(){}})});
 page.persist('/tmp/nature.jpg','album');
 assert.deepEqual(events(),['photo_captured']);
 assert.equal(queue()[0].props.source,'album');

 clear();
 store.set('nature.recognitionConsent.v1',{version:1,provider:'baidu',acceptedAt:1});
 const cloud={uploadFile:async()=>({fileID:'cloud://env/observations/draft_1.jpg'}),callFunction:async({name,data})=>{
  if(name==='recognizeObservation'&&data.action==='upload_ticket')return {result:{status:'ready',contractVersion:2,cloudPath:'observations/draft_1.jpg'}};
  if(name==='recognizeObservation'&&data.action==='register_asset')return {result:{status:'registered'}};
  if(name==='recognizeObservation')return {result:{contractVersion:2,status:'recognized',candidates:[{speciesId:'egret',name:'白鹭',confidence:.91}],warnings:[]}};
  return {result:{}};
 }};
 page.data.photoPath='/tmp/nature.jpg';page.data.busy=false;page.data.aiBusy=false;
 page._token=1;page.data.mode='ready';
 const draft={id:'draft_1',photoPath:'/tmp/nature.jpg'};
 const identifying=loadPage('native/pages/observe/index.js',{getApp:()=>{
  const app={globalData:{species:{}},getDataEpoch:()=>1,getDraft:()=>draft,getObservation:()=>draft,saveDraft(){},getSpecies:()=>null,finishes:[]};
  return app;
 },wx:Object.assign({},global.wx,{cloud})});
 await identifying.identifyConsented();
 assert.ok(events().includes('recognition_started'),'recognition_started');
 assert.ok(events().includes('recognition_success'),'recognition_success');
 assert.equal(events().includes('recognition_failed'),false);
});

test('home page reports world taps, world growth and one info sheet per tap',()=>{
 clear();
 const page=loadPage('native/pages/home/index.js',{getApp:()=>({getCards:()=>[],syncCards:null})});
 page.data.worldCards=[{id:'c1',speciesId:'egret',canonicalSpeciesId:'egret',zh:'白鹭',latin:'Egretta garzetta',worldZone:'water'}];
 page.data.journeys=[{speciesId:'egret',count:3,observations:[{dateLabel:'2026年9月20日'},{dateLabel:'2026年9月2日'},{dateLabel:'2026年8月11日'}]}];
 page.tapWorld({currentTarget:{dataset:{id:'c1'}}});
 assert.deepEqual(events(),['nature_world_species_tapped']);
 assert.equal(page.data.worldPick.zh,'白鹭');
 assert.equal(page.data.worldPick.count,3);
 assert.equal(page.data.worldPick.firstLabel,'2026年8月11日');
 assert.equal(page.data.worldPick.lastLabel,'2026年9月20日');
 page.closeWorldPick();assert.equal(page.data.worldPick,null);

 clear();
 page.noticeWorldGrowth([{speciesId:'egret'}]);
 assert.deepEqual(events(),[],'first sight is a baseline, not growth');
 page.noticeWorldGrowth([{speciesId:'egret'},{speciesId:'ibis'}]);
 assert.deepEqual(events(),['nature_world_species_added']);
 assert.equal(queue()[0].props.speciesId,'ibis');
 page.noticeWorldGrowth([{speciesId:'egret'},{speciesId:'ibis'}]);
 assert.deepEqual(events(),['nature_world_species_added'],'unchanged world reports nothing new');
});

test('friend museum reports likes and copy requests only after the server agrees',async()=>{
 clear();
 const page=loadPage('native/pages/friend-museum/index.js',{wx:Object.assign({},global.wx,{cloud:{callFunction:async({data})=>({result:{status:'ready',liked:true,state:'pending',[data.action==='getFriendMuseum'?'cards':'ignored']:[],profile:{enabled:true}}})}})});
 page.data.cards=[{shareId:'s1',liked:false}];
 await page.like({currentTarget:{dataset:{id:'s1'}}});
 assert.deepEqual(events(),['friend_like']);
 assert.equal(queue()[0].props.liked,true);

 clear();
 await page.request({currentTarget:{dataset:{id:'s1'}}});
 assert.deepEqual(events(),['card_requested']);
 assert.equal(queue()[0].props.state,'pending');
});

test('print page reports funnel entry, selection, preview and draft creation',async()=>{
 clear();
 const cards=[];
 const page=loadPage('native/pages/print/index.js',{getApp:()=>({getCards:()=>cards,decorate:c=>c})});
 const model=require('../native/lib/print-order');
 page.data.rows=model.printCandidates([]).map(r=>({...r,selected:false}));
 page.onShow();
 assert.deepEqual(events(),['print_flow_started']);
 const eligible=page.data.rows.find(r=>r.eligible);
 if(eligible){page.toggle({currentTarget:{dataset:{id:eligible.id}}});assert.ok(events().includes('print_card_selected'))}
 assert.ok(events().every(e=>require('../native/lib/analytics')._KNOWN_EVENTS.has(e)));
 const source=read('native/pages/print/index.js');
 assert.match(source,/track\('print_preview_viewed'/);
 assert.match(source,/track\('print_order_created'/);
});

test('settings reports the subscription page exactly when that section opens',()=>{
 clear();
 const membership=loadPage('native/pages/settings/index.js');
 membership.onLoad({section:'membership'});
 assert.deepEqual(events(),['subscription_page_viewed']);
 assert.equal(membership.data.section,'membership');
 clear();
 membership.onLoad({section:'privacy'});
 assert.deepEqual(events(),[]);
});

test('analytics wiring never blocks the main flow when storage or cloud fails',async()=>{
 const analytics=require('../native/lib/analytics');
 const broken=Object.assign({},global.wx,{getStorageSync:()=>{throw Error('storage_full')},setStorageSync:()=>{throw Error('storage_full')}});
 const original=global.wx;
 global.wx=broken;
 try{
  assert.equal(typeof analytics.track('card_created',{speciesId:'egret'}),'boolean','storage failure must never throw into the main flow');
  await analytics.flush();
 }finally{global.wx=original}
 assert.equal(analytics.track('not_a_real_event',{}),false);
 assert.equal(analytics.track('card_created',{speciesId:'egret'}),true);
 assert.equal(store.get(QUEUE).at(-1).props.speciesId,'egret');
 assert.equal(Object.keys(store.get(QUEUE).at(-1).props).every(k=>typeof store.get(QUEUE).at(-1).props[k]!=='object'),true,'props stay privacy-safe primitives');
});
