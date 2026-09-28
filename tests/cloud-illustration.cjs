const test=require('node:test'),assert=require('node:assert/strict');
test('retired AI endpoints never invoke paid providers even with old consent fields',async()=>{
 for(const name of ['natureAI2','generateIllustration'])for(const action of ['recognize','species_info','generate_submit','generate_poll']){
  const result=await require('../cloudfunctions/'+name).main({action,consent:true,confirmed:true},{cloud:new Proxy({},{get(){throw Error('must not access cloud')}}),request(){throw Error('must not call provider')}});
  assert.deepEqual(result,{status:'failed',code:'legacy_endpoint_retired'});
 }
});
