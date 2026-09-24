const assert=require('node:assert/strict');
const {projectV1Card}=require('../native/lib/v1-card-model');
const {normalizeCard}=require('../native/lib/observation-card');
assert.equal(projectV1Card({number:12}).discoveryNumber,null);
assert.equal(projectV1Card({isExample:true}).countsAsDiscovery,false);
assert.deepEqual(normalizeCard(normalizeCard({})),normalizeCard({}));
for(const status of ['ready','candidate','rejected','deprecated'])assert.notEqual(projectV1Card({artwork:{status,isOfficial:true}}).artworkState,'official');
assert.equal(projectV1Card({artwork:{status:'approved',isOfficial:true}}).artworkState,'official');
assert.equal(projectV1Card({artwork:{status:'candidate'}}).artworkState,'candidate');
assert.equal(projectV1Card({discovery:{status:'verified',number:7}}).discoveryNumber,null);
assert.equal(projectV1Card({serverCardId:'saved',discovery:{status:'verified',number:7}}).discoveryNumber,7);
for(const number of [0,-1,1.5,Infinity,'7'])assert.equal(projectV1Card({discovery:{status:'verified',number}}).discoveryNumber,null);
for(const input of [{kind:'memorial_copy'},{cardType:'gifted_collection'},{sourceType:'friend_copy'},{countsAsDiscovery:false}]){
 const value=projectV1Card({...input,discovery:{status:'verified',number:3}});assert.equal(value.discoveryNumber,null);assert.equal(value.countsAsDiscovery,false);
}
const raw={speciesId:'kingfisher',photoPath:'/original',artPhotoPath:'/art'};
assert.equal(normalizeCard(raw).originalPhotoAsset.localPath,'/original');assert.equal(normalizeCard(raw).artAsset.localPath,'/art');assert.equal(raw.cardType,undefined);assert.equal(normalizeCard(raw).artworkState,'legacy_private');
console.log('PASS compatible V1 projection, no invented official/global state, gift exclusion');
