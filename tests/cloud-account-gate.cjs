const test=require('node:test'),assert=require('node:assert/strict');
test('transactional account gate rejects new and late writes, fails closed on unavailable collection',async()=>{
 const {guardDatabase}=require('../cloudfunctions/recognizeObservation/account-gate');let tombstone,broken=false,writes=0;
 const db={collection:name=>({doc:()=>({get:async()=>{if(broken)throw Error('collection unavailable');if(name==='accountPrivacy'){if(!tombstone)throw Error('not found');return {data:tombstone}}return {data:{}}},set:async()=>writes++,update:async()=>writes++,remove:async()=>writes++}),where:()=>({get:async()=>({data:[]})})})};db.runTransaction=fn=>fn(db);
 const guarded=guardDatabase(db,'me');await guarded.assertActive();await guarded.collection('artOperations').doc('op').set({data:{}});assert.equal(writes,1);
 tombstone={status:'erasing'};await assert.rejects(guarded.runTransaction(async tx=>tx.collection('artOperations').doc('op').set({data:{}})),/account_erasing/);assert.equal(writes,1);
 await assert.rejects(guarded.collection('artOperations').doc('op').update({data:{}}),/account_erasing/);
 broken=true;tombstone=null;await assert.rejects(guarded.assertActive(),/collection unavailable/);
});
