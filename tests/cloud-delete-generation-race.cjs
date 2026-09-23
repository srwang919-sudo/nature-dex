const test=require('node:test'),assert=require('node:assert/strict');
// The active generation/deletion interleavings are covered by cloud-artwork-flow
// and cloud-artwork-snapshot. The retired I2I endpoint must never start work.
test('legacy custom generation cannot restart after deletion or burn quota',async()=>{
 let calls=0;const cloud={getWXContext:()=>({OPENID:'me'}),database:()=>{calls++;throw Error('unexpected')}};
 for(const operationId of ['old','new']){const result=await require('../cloudfunctions/createArtCard').main({action:'submit',operationId,confirmed:true,consent:true},{cloud,generate:async()=>calls++});assert.equal(result.code,'custom_art_unavailable')}
 assert.equal(calls,0);
});
