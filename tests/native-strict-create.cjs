const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');const root=path.join(__dirname,'..');let app,page,artFails=true,backFails=false,navigated=0,saves=0;const storage=new Map();
const wx={getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,structuredClone(v)),navigateTo:()=>navigated++,saveFile:o=>{saves++;o.success({savedFilePath:'saved'})},getImageInfo:o=>o.success({width:1024,height:1280}),cloud:{getTempFileURL:async()=>({fileList:[{tempFileURL:'https://example.invalid/image'}]}),callFunction:async({name})=>({result:name==='createArtCard'?(artFails?{status:'failed'}:{status:'ready',assetFileId:'cloud://art'}):(backFails?{status:'failed',code:'reference_unavailable'}:{status:'ready',assetFileId:'cloud://back',styleVersion:'watercolor-v1'})})}};
const read=wx.getStorageSync;wx.getStorageSync=k=>k==='nature.recognitionConsent.v1'?{version:1,provider:'baidu',acceptedAt:1}:read(k);
vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{App:a=>app=a,wx,Date,Math,Set});
vm.runInNewContext(fs.readFileSync(path.join(root,'native/pages/observe/index.js'),'utf8'),{Page:p=>page=p,getApp:()=>app,wx,require:require('module').createRequire(path.join(root,'native/pages/observe/index.js')),setTimeout,clearTimeout});
page.setData=function(v){Object.assign(this.data,v)};
function start(status){app.startObservation('temp');app.saveDraft({...app.getObservation(),photoFileId:'cloud://input',recognition:{status,candidates:[{speciesId:'ibis'}]}});page.setData({species:app.getSpecies('ibis'),busy:false})}
(async()=>{
 start('failed');await page.confirm();assert.equal(storage.size,0);assert.equal(saves,0);
 start('recognized');await page.confirm();assert.equal(page.data.artFailed,true);assert.equal(storage.size,0);assert.equal(navigated,0);
 backFails=true;artFails=false;await page.confirm();assert.equal(saves,1);assert.equal(navigated,1);assert.equal(app.getCards().length,0);assert.equal(app.getDrafts().length,0);assert.equal(app.getReadyCards().length,1);assert.equal(app.getReadyCards()[0].frontMode,'art');assert.equal(app.getReadyCards()[0].originalPhotoAsset.localPath,'saved');
 start('recognized');let resolveGeneration;wx.cloud.callFunction=()=>new Promise(resolve=>{resolveGeneration=resolve});const pending=page.confirm();await new Promise(resolve=>setImmediate(resolve));page.onHide();resolveGeneration({result:{status:'ready',assetFileId:'cloud://late-art'}});await pending;assert.equal(navigated,1);assert.equal(app.getReadyCards().length,1,'hidden page cannot commit a late generated card');
 console.log('PASS strict UI failures persist nothing; automatic art independent of shared back; hidden-page generation ignored');
})().catch(e=>{console.error(e);process.exitCode=1});
