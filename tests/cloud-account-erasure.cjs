const test=require('node:test'),assert=require('node:assert/strict');
function fixture(){
 const tables={};const bucket=c=>tables[c]||(tables[c]={});
 const db={collection:c=>({
  doc:id=>({get:async()=>{if(!bucket(c)[id])throw Error('not found');return {data:{...bucket(c)[id]}}},set:async({data})=>bucket(c)[id]={...data},update:async({data})=>Object.assign(bucket(c)[id],data),remove:async()=>delete bucket(c)[id]}),
  where:q=>({limit(n){this.n=n;return this},async get(){return {data:Object.entries(bucket(c)).filter(([,row])=>Object.entries(q).every(([k,v])=>row[k]===v)).slice(0,this.n||20).map(([id,row])=>({_id:id,...row}))}}})
 })};db.runTransaction=fn=>fn({collection:c=>({doc:id=>db.collection(c).doc(id)})});
 return {tables,bucket,db};
}
test('owner erasure is idempotent, preserves failures, excludes shared art and financial data',async()=>{
 const {createPrivacyService}=require('../cloudfunctions/managePrivacy/core');const f=fixture();let fail=true,calls=0;
 f.bucket('assets').a={_openid:'me',observationId:'obs',fileId:'private'};f.bucket('assets').b={_openid:'other',observationId:'foreign'};
 f.bucket('speciesWatercolors').x={status:'ready'};f.bucket('membershipOrders').x={openid:'me',status:'PAID'};
 f.bucket('recognitionReceipts').r={owner:'me'};f.bucket('natureSpeciesShares').s={owner:'me',recipient:'other'};
 for(const name of ['natureObservations','natureCards','userSpeciesDiscoveries'])f.bucket(name).mine={owner:'me'};
 const service=createPrivacyService({db:f.db,deleteObservation:async(owner,id)=>{calls++;assert.equal(owner,'me');assert.equal(id,'obs');if(fail)return {status:'failed',code:'cloud_delete_failed'};delete f.tables.assets.a;return {status:'deleted'}}});
 assert.equal((await service.execute('me',{action:'requestErasure',owner:'other'})).code,'invalid_request');
 assert.equal((await service.execute('me',{action:'requestErasure'})).status,'processing');
 assert.equal(Object.values(f.tables.accountPrivacy)[0].owner,undefined,'tombstone identity exists only as SHA-256 document key');
 assert.equal((await service.execute('me',{action:'continueErasure'})).status,'failed');assert.ok(f.tables.assets.a);
 fail=false;let result;for(let i=0;i<8;i++){result=await service.execute('me',{action:'continueErasure'});if(result.status==='erased')break}
 assert.equal(result.status,'erased');assert.ok(f.tables.assets.b);assert.ok(f.tables.speciesWatercolors.x);assert.ok(f.tables.membershipOrders.x);assert.equal(Object.keys(f.tables.recognitionReceipts).length,0);assert.equal(Object.keys(f.tables.natureSpeciesShares).length,0);
 assert.equal((await service.execute('me',{action:'requestErasure'})).status,'erased');assert.equal(calls,2);
 for(const name of ['natureObservations','natureCards','userSpeciesDiscoveries'])assert.equal(Object.keys(f.bucket(name)).length,0);
});
test('an active write guard is not an erasure request',async()=>{
 const {createPrivacyService}=require('../cloudfunctions/managePrivacy/core'),f=fixture(),id=require('crypto').createHash('sha256').update('me').digest('hex');let removed=0;
 f.bucket('accountPrivacy')[id]={status:'active',generation:1};f.bucket('assets').a={_openid:'me',observationId:'obs'};
 const service=createPrivacyService({db:f.db,deleteObservation:async()=>{removed++;return {status:'deleted'}}});
 assert.equal((await service.execute('me',{action:'continueErasure'})).code,'erasure_not_requested');assert.equal(removed,0);
});
test('erasure removes recipient invites and both relationship edges beyond a twenty-row page',async()=>{
 const {createPrivacyService}=require('../cloudfunctions/managePrivacy/core'),f=fixture();
 for(let i=0;i<25;i++){f.bucket('natureFriendInvites')['i'+i]={issuer:'other',recipient:'me'};f.bucket('natureFriendEdges')['mine'+i]={owner:'me',relationshipId:'rel'+i};f.bucket('natureFriendEdges')['other'+i]={owner:'other',relationshipId:'rel'+i};f.bucket('natureFriendships')['rel'+i]={members:['me','other']}}
 const service=createPrivacyService({db:f.db,deleteObservation:async()=>({status:'deleted'})});await service.execute('me',{action:'requestErasure'});let result;
 for(let i=0;i<20;i++){result=await service.execute('me',{action:'continueErasure'});if(result.status==='erased')break}
 assert.equal(result.status,'erased');for(const name of ['natureFriendInvites','natureFriendEdges','natureFriendships'])assert.equal(Object.keys(f.tables[name]).length,0);
});
