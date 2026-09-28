const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function page(name,app,wx){let def;const file=path.join(root,'native/pages',name,'index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{getApp:()=>app,Page:d=>def=d,wx,require:id=>require(path.resolve(path.dirname(file),id)),Date,Map,Set,Number,String,JSON});const ctx={...def,data:JSON.parse(JSON.stringify(def.data)),setData(v,cb){Object.assign(this.data,v);if(cb)cb()}};return ctx}
test('latest species enters bounded world while full journeys retain complete distinct count',()=>{
 const {buildMuseumTimeline}=require('../native/lib/museum-timeline');
 const cards=Array.from({length:9},(_,i)=>({id:'c'+i,speciesId:'a'+i,category:'plant',createdAt:i+1}));
 cards.push({id:'latest',speciesId:'z-new',category:'plant',createdAt:99});
 const result=buildMuseumTimeline(cards,100);assert.equal(result.journeys.length,10);assert.equal(result.worldCards[0].id,'latest');assert.ok(result.worldCards.length<=6);
});
test('explore popup gets actual repeat count and recorded dates',()=>{
 const cards=[{id:'a',speciesId:'bird',createdAt:1,zh:'鸟'},{id:'b',speciesId:'bird',createdAt:2,zh:'鸟'}];
 const p=page('home',{getCards:()=>cards,decorate:c=>c},{getStorageSync:()=>false,setStorageSync(){}});p.refresh();p.tapWorld({currentTarget:{dataset:{id:'b'}}});assert.equal(p.data.worldPick.count,2);assert.match(p.data.worldPick.firstLabel,/1970/);assert.equal(p.data.speciesCount,1);
});
test('journey groups only actual observations, respects location switch, and clears stale detail on return',()=>{
 const time=Date.now()-10000,location={placeId:'park',label:'我的公园',visibility:'private',consentAt:1,latitude:30,longitude:120};
 const cards=[{id:'a',speciesId:'bird',createdAt:time,location},{id:'b',speciesId:'plant',createdAt:time,location},{id:'undated',speciesId:'bird'},{id:'sample',sample:true}];let show=true;
 const p=page('journey',{getCards:()=>cards,decorate:c=>c},{getStorageSync:key=>key==='nature.showLocation'?show:key==='nature.note.a'?'在树下看见它':''});
 p.onShow();assert.equal(p.data.meetingCount,3);assert.equal(p.data.journeys.length,2);assert.equal(p.data.journeys[0].count,2);assert.equal(p.data.journeys[0].speciesCount,2);assert.equal(p.data.journeys[0].place,'我的公园');assert.ok(!JSON.stringify(p.data).includes('latitude'));
 p.openJourney({currentTarget:{dataset:{index:0}}});assert.equal(p.data.activeJourney.items.length,2);show=false;p.onShow();assert.equal(p.data.activeJourney,null);assert.equal(p.data.activePoint,null);assert.equal(p.data.places.length,0);assert.ok(!JSON.stringify(p.data).includes('我的公园'));
});
test('collection category and text filters compose, including explicitly other and unknown categories',()=>{
 const p=page('library',{},{}),cards=[{id:'a',category:'other',zh:'甲'},{id:'b',category:'unknown',zh:'乙'},{id:'c',category:'bird',zh:'丙'}];p.data.category='other';assert.deepEqual(p.filterCards(cards,'').map(c=>c.id),['a','b']);assert.deepEqual(p.filterCards(cards,'乙').map(c=>c.id),['b']);p.data.category='bird';assert.deepEqual(p.filterCards(cards,'').map(c=>c.id),['c']);
});
test('journey original-photo presentation never substitutes a legacy illustration on image failure',()=>{
 const file=path.join(root,'native/components/collectible/index.js');let component;const wx={getStorageSync:()=>false};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:c=>component=c,wx,getCurrentPages:()=>[{route:'native/pages/card/index'}],require:require('node:module').createRequire(file)});
 const card={id:'legacy',speciesId:'bird',photoPath:'/private/original.jpg'},instance={data:{card},properties:{originalPhoto:true},setData(v){Object.assign(this.data,v)},...component.methods};
 component.observers.card.call(instance,card);assert.equal(instance.data.imageUnavailable,false);assert.equal(instance.data.backUnavailable,false);assert.equal(instance.data.presentation.front.expanded,true);assert.equal(instance.data.presentation.back.illustration,'/private/original.jpg');assert.equal(instance.data.presentation.back.kind,'original');instance.artError();assert.equal(instance.data.backUnavailable,true);assert.equal(instance.data.presentation.back.illustration,'/private/original.jpg');
});
test('capture category uses the existing provider route and cancelling new camera restores the pinned hint',async()=>{
 let draft={id:'observation',photoPath:'/photo',photoFileId:'cloud://owned',photoUploadVersion:2},calls=[];
 const app={finishes:[],getDraft:()=>draft,getDataEpoch:()=>1,saveDraft:v=>draft=v,getSpecies:()=>null};
 const wx={getStorageSync:key=>key==='nature.recognitionConsent.v1'?{version:1,provider:'baidu',acceptedAt:1}:null,cloud:{callFunction:async args=>{calls.push(args);return {result:{contractVersion:2,status:'unknown',candidates:[]}}}}};
 const p=page('observe',app,wx);p.data.photoPath='/photo';p.selectCaptureHint({currentTarget:{dataset:{hint:'plant'}}});await p.identifyConsented();assert.equal(calls[0].data.kind,'plant');assert.equal(draft.recognitionKind,'plant');
 p.openCamera();p.selectCaptureHint({currentTarget:{dataset:{hint:'animal'}}});assert.equal(p.data.captureHint,'animal');p.closeCamera();assert.equal(p.data.captureHint,'plant');await p.identifyConsented();assert.equal(calls[1].data.kind,'plant');
 app.globalData={species:{}};p.onLoad({source:'dock'});p.onReady();assert.equal(p.data.cameraOpen,true,'center camera entry opens camera without another tap');
});
test('settings section is reachable rather than silently redirecting to privacy',()=>{
 const p=page('settings',{},{});p.changeSection({currentTarget:{dataset:{section:'settings'}}});assert.equal(p.data.section,'settings');
});
test('export front keeps specimen identity and date without a craft badge or rarity stars',()=>{
 const {render,exportPlan}=require('../native/lib/card-export'),texts=[],fills=[],ctx={setFillStyle:v=>fills.push(v),setFontSize(){},setTextBaseline(){},fillRect(){},save(){},restore(){},beginPath(){},rect(){},clip(){},drawImage(){},measureText:s=>({width:String(s).length*10}),fillText:s=>texts.push(String(s))};
 const card={id:'a',zh:'真实物种',latin:'Species example',finishKey:'numbered',finish:'编号珍藏版',serverCardId:'server',discovery:{status:'verified',number:42},createdAt:1};render(ctx,card,exportPlan(card,'share'),{width:821,height:855},null);
 assert.ok(texts.includes('Discovery No. 42'));assert.ok(texts.includes('1970.1.1'));assert.ok(!texts.some(t=>/[★☆]|编号珍藏版/.test(t)));assert.equal(fills[0],'#FCFAF5');
});
