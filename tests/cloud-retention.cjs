const test=require('node:test'),assert=require('node:assert/strict'),{sweepExpired}=require('../cloudfunctions/managePrivacy/retention');
test('retention requires operator auth, only uses server rows, and preserves ready or ambiguous assets',async()=>{
 let calls=0,marked=0;const assets=[{_id:'a',_openid:'me',observationId:'old',fileId:'one',createdAt:1,expiresAt:2},{_id:'b',_openid:'me',observationId:'saved',fileId:'two',createdAt:1,expiresAt:2}];
 const db={command:{lt:x=>x,neq:x=>x},collection:c=>({where:q=>({limit(){return this},get:async()=>({data:c==='assets'?assets:q.photoFileId==='two'?[{_id:'ready',status:'ready'}]:[]})}),doc:()=>({get:async()=>({data:c==='artOperations'?{status:'ready'}:undefined}),update:async()=>marked++,set:async()=>{}})})};db.runTransaction=fn=>fn({collection:c=>({doc:id=>db.collection(c).doc(id)})});
 const deps={db,token:'operator-test-value',now:()=>3,deleteObservation:async(owner,id)=>{calls++;assert.equal(id,'old');return {status:'failed',code:'cloud_delete_failed'}}};
 assert.equal((await sweepExpired({action:'sweepExpired',token:'wrong'},deps)).code,'operator_required');assert.equal(calls,0);
 assert.equal((await sweepExpired({action:'sweepExpired',token:deps.token,collection:'assets'},deps)).code,'invalid_request');
 const result=await sweepExpired({action:'sweepExpired',token:deps.token},deps);assert.equal(result.status,'partial');assert.equal(result.failed,1);assert.equal(result.retained,1);assert.equal(marked,1);
});
