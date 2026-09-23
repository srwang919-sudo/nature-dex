const test=require('node:test'),assert=require('node:assert/strict');
const {saveObservation}=require('../native/lib/save-observation');
test('only saved service receipt passes; unavailable, fake number and stale fail closed',async()=>{
 const receipt={status:'saved',cardId:'key',observationId:'obs',discovery:{status:'verified',number:1}};
 const api={callFunction:async input=>{assert.deepEqual(input,{name:'createArtCard',data:{action:'finalize',operationId:'op'}});return {result:receipt}}};
 assert.deepEqual(await saveObservation({api,operationId:'op'}),receipt);
 await assert.rejects(saveObservation({operationId:'op'}));await assert.rejects(saveObservation({api,operationId:'op',isCurrent:()=>false}));
 receipt.discovery.number=0;await assert.rejects(saveObservation({api,operationId:'op'}));receipt.status='ready';await assert.rejects(saveObservation({api,operationId:'op'}));
});
