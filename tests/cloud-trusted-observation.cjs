const test=require('node:test'),assert=require('node:assert/strict');
test('art requires an owner/file-bound provider candidate; attestation excludes private fields',async()=>{
 const {confirmedCandidate,attestation}=require('../cloudfunctions/createArtCard/observation');
 const event={photoObservationId:'obs',photoFileId:'cloud://private/original',speciesId:'海芋'};
 let receipt={owner:'me',observationId:'obs',photoFileId:event.photoFileId,status:'complete',result:{candidates:[{speciesId:'海芋',name:'海芋',category:'plant',confidence:.57}]}};
 const db={collection:()=>({doc:()=>({get:async()=>({data:receipt})})})};
 const choice=await confirmedCandidate(db,'me',event);assert.equal(choice.speciesId,'海芋');
 const projection=attestation('me',event,choice);assert.equal(projection.status,'verified');assert.equal(projection.speciesName,'海芋');assert.equal(projection.scientificName,'');assert.equal(projection.photoFileId,undefined);assert.equal(projection.location,undefined);
 await assert.rejects(confirmedCandidate(db,'foreign',event),/candidate_unverified/);
 await assert.rejects(confirmedCandidate(db,'me',{...event,speciesId:'朱鹮'}),/candidate_unverified/);
 receipt={...receipt,photoFileId:'cloud://wrong'};await assert.rejects(confirmedCandidate(db,'me',event),/candidate_unverified/);
});
test('memorial copies never count as observed species',()=>{
 const {realCards}=require('../native/lib/collection-model');
 assert.equal(realCards([{id:'copy',kind:'memorial_copy',speciesId:'ibis'},{id:'copy2',countsForAchievements:false},{id:'copy3',countsAsDiscovery:false},{id:'real',speciesId:'egret'}]).length,1);
});
