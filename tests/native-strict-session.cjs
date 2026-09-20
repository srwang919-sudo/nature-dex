const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');let app;const store=new Map(),wx={getStorageSync:k=>store.get(k),setStorageSync:(k,v)=>store.set(k,structuredClone(v))};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8'),{App:a=>app=a,wx,Date,Math,Set});
const s=app.startObservation('temp');app.saveDraft({...s,recognition:{status:'failed',candidates:[]}});
assert.throws(()=>app.prepareCard('kingfisher'));assert.equal(store.size,0);
app.discardObservation();assert.equal(app.getObservation(),null);
assert.throws(()=>app.commitObservationCard({photoPath:'temp'}));assert.equal(store.size,0);
console.log('PASS failed recognition and incomplete faces write no cards or drafts');
