const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');const root=path.join(__dirname,'..');let app,page,artFails=true,backFails=false,navigated=0,saves=0;const storage=new Map();
const wx={getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,structuredClone(v)),navigateTo:()=>navigated++,saveFile:o=>{saves++;o.success({savedFilePath:'saved'})},getImageInfo:o=>o.success({width:1024,height:1280}),cloud:{getTempFileURL:async()=>({fileList:[{tempFileURL:'https://example.invalid/image'}]}),callFunction:async({name})=>({result:name==='createArtCard'?(artFails?{status:'failed'}:{status:'ready',assetFileId:'cloud://art'}):(backFails?{status:'failed',code:'reference_unavailable'}:{status:'ready',assetFileId:'cloud://back',styleVersion:'watercolor-v1'})})}};
vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{App:a=>app=a,wx,Date,Math,Set});
vm.runInNewContext(fs.readFileSync(path.join(root,'native/pages/observe/index.js'),'utf8'),{Page:p=>page=p,getApp:()=>app,wx,require:require('module').createRequire(path.join(root,'native/pages/observe/index.js')),setTimeout,clearTimeout});
page.setData=function(v){Object.assign(this.data,v)};
function start(status){app.startObservation('temp');app.saveDraft({...app.getObservation(),photoFileId:'cloud://input',recognition:{status,candidates:[{speciesId:'ibis'}]}});page.setData({species:app.getSpecies('ibis'),busy:false})}
(async()=>{
 start('failed');await page.confirmArt();assert.equal(storage.size,0);assert.equal(saves,0);
 start('recognized');await page.confirmArt();assert.equal(page.data.artFailed,true);assert.equal(storage.size,0);assert.equal(navigated,0);
 backFails=true;await page.useOriginal();assert.equal(storage.size,0);assert.equal(saves,0);
 backFails=false;await page.confirm(false);assert.equal(saves,1);assert.equal(navigated,1);assert.equal(app.getCards().length,0);assert.equal(app.getDrafts().length,0);assert.equal(app.getReadyCards().length,1);assert.equal(app.getReadyCards()[0].frontMode,'original');
 console.log('PASS strict UI failures persist nothing; explicit original commits only after watercolor succeeds');
})().catch(e=>{console.error(e);process.exitCode=1});
