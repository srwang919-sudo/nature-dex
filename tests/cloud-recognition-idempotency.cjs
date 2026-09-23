const test=require('node:test'),assert=require('node:assert/strict');
test('one observation has one paid receipt despite changed client keys and late completion',async()=>{
 const {claimReceipt,completeReceipt,receiptId}=require('../cloudfunctions/recognizeObservation/receipt');
 const rows=new Map();let charges=0;
 const db={collection:name=>({doc:key=>{const id=name+'|'+key;return ({get:async()=>{if(!rows.has(id))throw Error('not found');return {data:rows.get(id)}},set:async({data})=>rows.set(id,data),update:async({data})=>rows.set(id,{...rows.get(id),...data})})}})};db.runTransaction=fn=>fn(db);
 const input={owner:'owner',observationId:'obs',photoFileId:'cloud://env/observations/owner/obs.jpg'};
 const first=await claimReceipt(db,input,async()=>charges++);assert.equal(first.claimed,true);
 const concurrent=await claimReceipt(db,{...input,idempotencyKey:'changed'},async()=>charges++);assert.equal(concurrent.claimed,false);assert.equal(concurrent.result.status,'processing');assert.equal(charges,1);
 await completeReceipt(db,input,{status:'needs_confirmation',candidates:[{speciesId:'egret',name:'白鹭'}]});
 const replay=await claimReceipt(db,input,async()=>charges++);assert.equal(replay.result.candidates[0].speciesId,'egret');assert.equal(charges,1);
 await assert.rejects(claimReceipt(db,{...input,photoFileId:'cloud://other'},async()=>charges++),/receipt_conflict/);
 const other=await claimReceipt(db,{...input,owner:'other'},async()=>charges++);assert.equal(other.claimed,true);assert.equal(charges,2);
 const expired=await claimReceipt(db,{...input,owner:'other'},async()=>charges++,Date.now()+100000);assert.equal(expired.result.code,'recognition_expired');assert.equal(charges,2);
 rows.set('observationDeletions|'+receiptId('other','obs'),{status:'deleting'});
 assert.equal((await completeReceipt(db,{...input,owner:'other'},{status:'recognized'})).code,'cancelled');
});
