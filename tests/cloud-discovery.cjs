const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('crypto');
const {finalizeObservation}=require('../cloudfunctions/createArtCard/discovery');
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(){
 const rows=new Map(),versions=new Map();
 const db={async runTransaction(work){const snapshot=new Map([...rows].map(([k,v])=>[k,structuredClone(v)])),seen=new Map(versions),writes=new Map();
 const tx={collection:c=>({where(){throw Error('tx.where forbidden')},doc:id=>{const key=c+'/'+id;return {async get(){const data=writes.has(key)?writes.get(key):snapshot.get(key);if(!data)throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(data)}},async set({data}){writes.set(key,structuredClone(data))},async update({data}){writes.set(key,{...(writes.get(key)||snapshot.get(key)),...data})}}}})};
 const result=await work(tx);if(db.beforeCommit){const hook=db.beforeCommit;db.beforeCommit=null;await hook()}await new Promise(r=>setImmediate(r));for(const key of writes.keys())if((versions.get(key)||0)!==(seen.get(key)||0))throw Object.assign(Error('conflict'),{code:'DATABASE_TRANSACTION_CONFLICT'});for(const [k,v] of writes){rows.set(k,v);versions.set(k,(versions.get(k)||0)+1)}return result;
 }};
 function seed(owner,obs,operationId,speciesId='翠鸟'){
  if(!rows.has('natureSpecies/'+hash(speciesId)))rows.set('natureSpecies/'+hash(speciesId),{speciesId,lastDiscoveryNumber:0,counterStatus:'initialized',baselineVersion:'test-reviewed-empty-v1'});
  rows.set('artOperations/'+hash(owner+'|'+operationId),{owner,status:'ready',photoFileId:'cloud://env/observations/'+owner+'/'+obs+'.jpg',assetFileId:'cloud://env/private-art/'+owner+'/'+hash(owner+'|'+operationId)+'.jpg',speciesId});
  rows.set('recognitionReceipts/'+hash(owner+'|'+obs),{owner,observationId:obs,photoFileId:'cloud://env/observations/'+owner+'/'+obs+'.jpg',status:'complete',result:{candidates:[{speciesId,name:speciesId,confidence:.8,category:'bird'}]}});
 }
 return {db,rows,seed,write:(key,value)=>{rows.set(key,value);versions.set(key,(versions.get(key)||0)+1)},call:(owner,operationId)=>finalizeObservation({db,owner,operationId,now:()=>1,wait:async()=>{}})};
}
test('concurrent first saves serialize species counter; retries/repeats never allocate twice',async()=>{
 const f=fixture();f.seed('a','one','op1');f.seed('b','two','op2');
 const [a,b]=await Promise.all([f.call('a','op1'),f.call('b','op2')]);assert.deepEqual([a.discovery.number,b.discovery.number].sort(),[1,2]);
 assert.deepEqual(await f.call('a','op1'),a);f.seed('a','three','op3');const repeat=await f.call('a','op3');assert.equal(repeat.discovery.number,a.discovery.number);assert.equal(repeat.isFirstDiscovery,false);
 assert.equal([...f.rows.keys()].filter(k=>k.startsWith('natureObservations/')).length,3);assert.equal([...f.rows.values()].find(v=>v.lastDiscoveryNumber).lastDiscoveryNumber,2);
});
test('invalid, foreign, missing confirmation and erasure are rejected without domain records',async()=>{
 for(const kind of ['foreign','receipt','erasure','deleted']){const f=fixture();f.seed('a','one','op1');
  if(kind==='receipt')f.rows.delete('recognitionReceipts/'+hash('a|one'));
  if(kind==='erasure')f.rows.set('accountPrivacy/'+hash('a'),{status:'erasing'});
  if(kind==='deleted')f.rows.set('observationDeletions/'+hash('a|one'),{status:'deleted'});
  await assert.rejects(f.call(kind==='foreign'?'b':'a','op1'));assert.equal([...f.rows.keys()].filter(k=>k.startsWith('natureCards/')).length,0);
 }
});
test('deletion is idempotent, removes private domain assets and never recycles a discovery number',async()=>{
 const f=fixture();f.seed('a','one','op1');const first=await f.call('a','op1');
 await require('../cloudfunctions/deleteObservationAssets/domain').revokeDomain(f.db,'a','one');
 await require('../cloudfunctions/deleteObservationAssets/domain').revokeDomain(f.db,'a','one');
 assert.equal(f.rows.get('userSpeciesDiscoveries/'+hash('a|翠鸟')).activeObservationCount,0);
 assert.equal(f.rows.get('natureCards/'+first.cardId).originalPhotoFileId,undefined);
 f.seed('a','two','op2');assert.equal((await f.call('a','op2')).discovery.number,first.discovery.number);
 f.seed('b','three','op3');assert.equal((await f.call('b','op3')).discovery.number,2);
});
test('erasure/deletion inserted after snapshot force conflict then refusal without allocation',async()=>{
 for(const erasure of [true,false]){const f=fixture();f.seed('a','one','op1');
  f.db.beforeCommit=()=>{if(erasure)f.write('accountPrivacy/'+hash('a'),{status:'erasing',generation:1});else{f.write('observationDeletions/'+hash('a|one'),{status:'deleting'});f.write('trustedObservations/'+hash('a|one'),{status:'revoked'})}};
  await assert.rejects(f.call('a','op1'),new RegExp(erasure?'account_erasing':'cancelled'));
  assert.equal([...f.rows.keys()].filter(k=>k.startsWith('natureCards/')).length,0);assert.equal(f.rows.get('natureSpecies/'+hash('翠鸟')).lastDiscoveryNumber,0);
 }
});
test('unknown historical baseline never starts at zero or publishes a saved card',async()=>{
 const f=fixture();f.seed('a','one','op1');f.rows.delete('natureSpecies/'+hash('翠鸟'));
 await assert.rejects(f.call('a','op1'),/discovery_baseline_unavailable/);assert.equal(f.rows.has('natureCards/'+hash('a|one')),false);
 f.rows.set('natureSpecies/'+hash('翠鸟'),{speciesId:'翠鸟',lastDiscoveryNumber:50,counterStatus:'initialized',baselineVersion:'reviewed-migration-1'});
 assert.equal((await f.call('a','op1')).discovery.number,51);
});
test('finalize boundary rejects forged owner, gift, number and species fields',async()=>{
 const {main}=require('../cloudfunctions/createArtCard');
 for(const extra of [{owner:'other'},{cardType:'gifted_collection'},{number:7},{speciesId:'翠鸟'}]){
  const result=await main({action:'finalize',operationId:'op',...extra},{cloud:{getWXContext:()=>({OPENID:'a'})}});assert.equal(result.code,'invalid_request');
 }
});
