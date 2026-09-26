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
 // 2026-09-26 语义变更（用户反馈删不掉）：云端清理无法确认时不再保留本机卡片，
// 删除立即生效并把云端清理转后台队列，用户永远删得掉自己的卡。
 reset();mode='failed';const failedDelete=await app.removeCard('one');
 assert.equal(failedDelete.status,'deleted');assert.equal(failedDelete.mode,'local_first');assert.equal(failedDelete.cloudCleanupPending,true);
 assert.equal(app.getCards().length,0);assert.equal(store.has('nature.note.one'),false);assert.deepEqual(queued(),['obs']);
 // The escape hatch still works for the explicit confirmation path.
 reset();await app.forceRemoveCard('one');
 assert.equal(app.getCards().length,0);assert.equal(store.has('nature.note.one'),false);assert.deepEqual(queued(),['obs']);
 // An undeployed cloud function no longer blocks: local data goes, cleanup is queued.
 reset();failed=true;const missing=await app.removeCard('one');
 assert.equal(missing.status,'deleted');assert.equal(missing.cloudCleanupPending,true);assert.equal(app.getCards().length,0);
 // A retained observation is the only case that asks for one more confirmation.
 reset();failed=false;mode='retained';const retained=await app.removeCard('one');
 assert.equal(retained.status,'needs_confirm');assert.equal(retained.code,'observation_saved');assert.equal(app.getCards().length,1);
 console.log('PASS local deletion always wins; cloud cleanup falls back to a retry queue; only retained observations ask again')
})().catch(e=>{console.error(e);process.exitCode=1});
