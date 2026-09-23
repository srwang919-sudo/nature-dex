const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const root=path.join(__dirname,'..');
function harness(failure=''){
 const storage=new Map(),calls=[];let app,page,navigations=0;
 const wx={showModal:o=>o.success({confirm:failure!=='artConsent'}),getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>{if(failure==='storage'&&k==='nature.readyCards.v1')throw Error('quota');storage.set(k,structuredClone(v))},
 saveFile:o=>failure==='save'?o.fail({}):o.success({savedFilePath:'saved-original'}),getImageInfo:o=>failure==='resource'?o.fail({}):o.success({path:o.src,width:1024,height:1024}),
 navigateTo:()=>navigations++,cloud:{getTempFileURL:async()=>({fileList:[{tempFileURL:'https://example.invalid/art'}]}),callFunction:async({name})=>{calls.push(name);return {result:failure==='generation'?{status:'failed',code:'generation_failed'}:{status:'ready',assetFileId:'cloud://painting'}}}}};
 const read=wx.getStorageSync;wx.getStorageSync=k=>k==='nature.recognitionConsent.v1'?(failure==='consent'?null:{version:1,provider:'baidu',acceptedAt:1}):read(k);
 vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{App:a=>app=a,wx,Date,Math,Set,require:createRequire(path.join(root,'app.js'))});
 const realRequire=createRequire(path.join(root,'native/pages/observe/index.js'));
 vm.runInNewContext(fs.readFileSync(path.join(root,'native/pages/observe/index.js'),'utf8'),{Page:p=>page=p,getApp:()=>app,wx,setTimeout,clearTimeout,require:id=>id==='../../lib/observation-card'&&failure==='science'?{...realRequire(id),buildScience(){throw Error('science')}}:realRequire(id)});
 page.setData=function(v){Object.assign(this.data,v)};
 app.startObservation('temp-original');app.saveDraft({...app.getObservation(),photoFileId:'cloud://original',recognition:{status:failure==='recognition'?'failed':'recognized',candidates:[{speciesId:'ibis',source:'baidu'}]}});
 page.setData({species:app.getSpecies('ibis')});return {app,page,storage,calls,wx,navigations:()=>navigations};
}
(async()=>{
 for(const failure of ['consent','artConsent','recognition','generation','resource','save','storage','science']){
  const h=harness(failure);await h.page.confirm();assert.equal(h.app.getCards().length,0,failure);assert.equal(h.app.getDrafts().length,0,failure);assert.equal(h.app.getReadyCards().length,0,failure);assert.equal(h.navigations(),0,failure);assert.ok(!h.calls.includes('speciesIllustration'));assert.ok(![...h.storage.keys()].some(k=>/badge|achievement/.test(k)));
 }
 const h=harness();await h.page.confirm();assert.deepEqual(h.calls,['createArtCard']);const card=h.app.getReadyCards()[0];assert.equal(card.schemaVersion,2);assert.equal(card.artAsset.localPath,'cloud://painting');assert.equal(card.originalPhotoAsset.localPath,'saved-original');assert.equal(card.scienceSnapshot.status,'available');assert.equal(card.backAssetFileId,undefined);assert.equal(h.navigations(),1);assert.equal(h.app.getDrafts().length,0);await h.page.confirm();assert.equal(h.navigations(),1);
 const late=harness();let done;late.wx.cloud.callFunction=()=>new Promise(r=>done=r);const pending=late.page.confirm();await new Promise(r=>setImmediate(r));late.page.onHide();done({result:{status:'ready',assetFileId:'cloud://painting'}});await pending;assert.equal(late.app.getReadyCards().length,0);assert.equal(late.navigations(),0);
 const dynamic=harness();const sourceScience={speciesId:'海芋',status:'available',summary:'有来源的植物摘要',source:{provider:'baidu',route:'plant',retrievedAt:1}};
 dynamic.app.saveDraft({...dynamic.app.getObservation(),recognition:{status:'needs_confirmation',candidates:[{speciesId:'海芋',source:'baidu',category:'plant',sourceScience}]}});dynamic.page.setData({species:{id:'海芋',zh:'海芋'}});assert.ok(!JSON.stringify([...dynamic.storage.values()]).includes('有来源的植物摘要'));await dynamic.page.confirm();assert.equal(dynamic.app.getReadyCards()[0].scienceSnapshot.summary,'有来源的植物摘要');assert.equal(dynamic.app.getReadyCards()[0].knowledge,'有来源的植物摘要');assert.equal(dynamic.app.getReadyCards()[0].category,'plant');
 const {presentCard}=require('../native/lib/card-presentation');const p=presentCard(card);assert.equal(p.front.photo,'cloud://painting');assert.equal(p.back.illustration,'saved-original');assert.equal(p.back.kind,'original');assert.equal(p.back.locationLabel,'地点未公开');assert.equal(presentCard({schemaVersion:2,artAsset:{localPath:'/art'}}).back.illustration,'');
 console.log('PASS automatic art/original back, no shared generation, failure atomicity and stale response');
})().catch(e=>{console.error(e);process.exitCode=1});
