const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{createRequire}=require('module'),path=require('path');
const file=path.resolve(__dirname,'../app.js'),store=new Map(),calls=[];let app,failed=false,mode='deleted';
const card={id:'one',photoFileId:'cloud://original',photoObservationId:'obs'};
const reset=()=>{store.clear();calls.length=0;store.set('nature.cards.v2',[Object.assign({},card)]);store.set('nature.note.one','private note')};
const wx={getStorageSync:k=>store.get(k),setStorageSync:(k,v)=>store.set(k,v),removeStorageSync:k=>store.delete(k),cloud:{callFunction:async input=>{calls.push(input);if(failed)throw Error('FunctionName parameter could not be found');return {result:{status:mode}}}}};
vm.runInNewContext(fs.readFileSync(file,'utf8'),{App:x=>app=x,wx,require:createRequire(file),console});
app.cleanupPaths=async()=>{};
const queued=()=>store.get('nature.cloudCleanup.v1')||[];
(async()=>{
 // A card that never uploaded anything is deleted locally without a cloud call.
 reset();store.set('nature.cards.v2',[{id:'local',photoPath:'/tmp/a.jpg'}]);
 const local=await app.removeCard('local');
 assert.equal(local.status,'deleted');assert.equal(local.mode,'local_only');assert.equal(calls.length,0);assert.equal(app.getCards().length,0);
 // Cloud confirmation deletes the local card, its note and only sends the observation id.
 reset();const done=await app.removeCard('one');
 assert.equal(done.status,'deleted');assert.equal(app.getCards().length,0);assert.equal(store.has('nature.note.one'),false);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{name:'deleteObservationAssets',data:{observationId:'obs'}});
 // A cloud failure keeps the local card and note, and queues the observation for retry.
 reset();mode='failed';const blocked=await app.removeCard('one');
 assert.equal(blocked.status,'blocked');assert.equal(blocked.code,'cloud_delete_failed');assert.equal(blocked.queued,true);
 assert.equal(app.getCards().length,1);assert.equal(store.get('nature.note.one'),'private note');assert.deepEqual(queued(),['obs']);
 // The escape hatch removes local data and still keeps the cleanup queued.
 await app.forceRemoveCard('one');
 assert.equal(app.getCards().length,0);assert.equal(store.has('nature.note.one'),false);assert.deepEqual(queued(),['obs']);
 // An undeployed cloud function is reported as its own code, not a generic failure.
 reset();failed=true;const missing=await app.removeCard('one');
 assert.equal(missing.status,'blocked');assert.equal(missing.code,'function_not_found');assert.equal(app.getCards().length,1);
 // A retained observation blocks deletion with a dedicated reason.
 reset();failed=false;mode='retained';const retained=await app.removeCard('one');
 assert.equal(retained.status,'blocked');assert.equal(retained.code,'observation_saved');assert.equal(app.getCards().length,1);
 console.log('PASS cloud confirmation deletes locally; failures keep the card, queue retry and name the reason; force removal works')
})().catch(e=>{console.error(e);process.exitCode=1});
