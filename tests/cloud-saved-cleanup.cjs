const test=require('node:test'),assert=require('node:assert/strict');
test('automatic cleanup retains finalized cloud observations without touching files',async()=>{
 let writes=0,deletes=0;const tx={collection:name=>({doc:()=>({get:async()=>{if(name==='natureObservations')return {data:{owner:'me',status:'saved'}};throw Error('not found')},set:async()=>writes++})})};const db={...tx,runTransaction:f=>f(tx)};
 const cloud={getWXContext:()=>({OPENID:'me'}),database:()=>db,deleteFile:async()=>deletes++};
 const result=await require('../cloudfunctions/cleanupObservationAssets').main({observationId:'obs'},{cloud});
 assert.equal(result.status,'retained');assert.equal(writes,0);assert.equal(deletes,0);
});
