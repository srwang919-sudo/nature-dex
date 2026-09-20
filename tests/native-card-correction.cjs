const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');let app;const data=new Map(),wx={getStorageSync:k=>data.get(k),setStorageSync:(k,v)=>data.set(k,structuredClone(v)),removeStorageSync:k=>data.delete(k)};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),{App:a=>app=a,wx,Date,Math,Set});
app.createDraft({photoPath:'saved'});const first=app.prepareCard('kingfisher');
const corrected=app.prepareCard('ibis',{correctPending:true});assert.equal(corrected.id,first.id);assert.equal(corrected.finishKey,first.finishKey);assert.equal(corrected.photoPath,first.photoPath);assert.equal(corrected.speciesId,'ibis');
app.saveCards([corrected]);assert.throws(()=>app.prepareCard('egret',{correctPending:true}));
assert.equal(app.getDraft().pendingCard.speciesId,'ibis');
console.log('PASS local correction preserves finish/photo/id and protects collected card');
