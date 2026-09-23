const test=require('node:test'),assert=require('node:assert/strict');
function fixture(){
 const tables={};const bucket=c=>tables[c]||(tables[c]={});
 const db={collection:c=>({
  doc:id=>({get:async()=>{if(!bucket(c)[id])throw Error('not found');return {data:{...bucket(c)[id]}}},set:async({data})=>bucket(c)[id]={...data},update:async({data})=>Object.assign(bucket(c)[id],data),remove:async()=>delete bucket(c)[id]}),
  where:q=>({limit(){return this},get:async()=>({data:Object.entries(bucket(c)).filter(([,row])=>Object.entries(q).every(([k,v])=>row[k]===v)).map(([id,row])=>({_id:id,...row}))})})
 })};db.runTransaction=fn=>fn(db);
 return {tables,bucket,db};
}
test('owner erasure is idempotent, preserves failures, excludes shared art and financial data',async()=>{
 const {createPrivacyService}=require('../cloudfunctions/managePrivacy/core');const f=fixture();let fail=true,calls=0;
 f.bucket('assets').a={_openid:'me',observationId:'obs',fileId:'private'};f.bucket('assets').b={_openid:'other',observationId:'foreign'};
 f.bucket('speciesWatercolors').x={status:'ready'};f.bucket('membershipOrders').x={openid:'me',status:'PAID'};
 f.bucket('recognitionReceipts').r={owner:'me'};f.bucket('natureSpeciesShares').s={owner:'me',recipient:'other'};
 const service=createPrivacyService({db:f.db,deleteObservation:async(owner,id)=>{calls++;assert.equal(owner,'me');assert.equal(id,'obs');if(fail)return {status:'failed',code:'cloud_delete_failed'};delete f.tables.assets.a;return {status:'deleted'}}});
 assert.equal((await service.execute('me',{action:'requestErasure',owner:'other'})).code,'invalid_request');
 assert.equal((await service.execute('me',{action:'requestErasure'})).status,'processing');
 assert.equal((await service.execute('me',{action:'continueErasure'})).status,'failed');assert.ok(f.tables.assets.a);
 fail=false;let result;for(let i=0;i<8;i++){result=await service.execute('me',{action:'continueErasure'});if(result.status==='erased')break}
 assert.equal(result.status,'erased');assert.ok(f.tables.assets.b);assert.ok(f.tables.speciesWatercolors.x);assert.ok(f.tables.membershipOrders.x);assert.equal(Object.keys(f.tables.recognitionReceipts).length,0);assert.equal(Object.keys(f.tables.natureSpeciesShares).length,0);
 assert.equal((await service.execute('me',{action:'requestErasure'})).status,'erased');assert.equal(calls,2);
});
