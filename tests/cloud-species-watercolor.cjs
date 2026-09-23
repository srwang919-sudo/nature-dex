const assert=require('node:assert/strict'),{main}=require('../cloudfunctions/speciesIllustration'),{main:front}=require('../cloudfunctions/createArtCard');
const rows=new Map();let owner='u1',generated=0,chain=Promise.resolve();
function collection(name){return {doc:id=>({get:async()=>{const data=rows.get(name+id);if(!data)throw Error('not found');return {data}},set:async({data})=>rows.set(name+id,data),update:async({data})=>rows.set(name+id,{...rows.get(name+id),...data})}),where:filter=>{const get=async()=>({data:[...rows].filter(([key,value])=>key.startsWith(name)&&Object.entries(filter).every(([k,v])=>value[k]===v)).map(([,v])=>v)});return {get,limit:()=>({get})}}}}
const db={collection,runTransaction:fn=>{const run=chain.then(()=>fn(db));chain=run.catch(()=>{});return run}};
const api={getWXContext:()=>({OPENID:owner}),database:()=>db,downloadFile:async()=>({fileContent:Buffer.from('official fixture')})};
const deps={cloud:api,generate:async(api,input)=>{generated++;assert.ok(!input.path.includes('u1'));assert.equal(input.reference,undefined);return 'cloud://public/watercolor'}};
(async()=>{
 assert.equal((await main({action:'ensure',speciesId:'ibis',confirmed:true,photoFileId:'private'},deps)).code,'invalid_request');
 assert.equal((await main({action:'ensure',speciesId:'ibis',confirmed:true,prompt:'override'},deps)).code,'invalid_request');
 assert.equal((await main({action:'ensure',speciesId:'unknown',name:'unknown',confirmed:true},deps)).code,'invalid_species');
 const results=await Promise.all([main({action:'ensure',speciesId:'ibis',confirmed:true},deps),main({action:'ensure',speciesId:'ibis',confirmed:true},deps)]);
 assert.equal(generated,1);assert.ok(results.some(x=>x.status==='ready'));
 owner='u2';const cached=await main({action:'ensure',speciesId:'ibis',confirmed:true},deps);assert.equal(cached.status,'ready');assert.equal(generated,1);
 assert.equal(cached.styleVersion,'watercolor-t2i-v2');
 const dynamic=await main({action:'ensure',speciesId:'海芋',name:'incorrect client name',confirmed:true},{cloud:api,generate:async(api,input)=>{assert.match(input.prompt,/海芋/);assert.ok(!input.prompt.includes('incorrect client name'));return 'cloud://public/dynamic'}});assert.equal(dynamic.status,'ready');
 assert.ok(!JSON.stringify([...rows]).includes('private-user-photo'));
 const event={action:'submit',operationId:'op1',consent:true,confirmed:true,photoObservationId:'obs1',photoFileId:'cloud://env/observations/u2/obs1.jpg',speciesId:'ibis'};
 event.artConsent={version:1,provider:'tencent-hunyuan',acceptedAt:Date.now(),operationId:event.operationId,observationId:event.photoObservationId};
 assert.equal((await front(event,{cloud:api})).code,'forbidden');
 assert.equal((await front({...event,prompt:'override'},{cloud:api})).code,'invalid_request');
 rows.set('assetsphoto',{_openid:'u2',fileId:event.photoFileId,observationId:'obs1'});
 rows.set('recognitionReceipts'+require('crypto').createHash('sha256').update('u2|obs1').digest('hex'),{owner:'u2',observationId:'obs1',photoFileId:event.photoFileId,status:'complete',result:{candidates:[{speciesId:'ibis',name:'朱鹮',confidence:.9,category:'bird'}]}});
 let count=0;const frontDeps={cloud:api,generate:async()=>{count++;return 'cloud://private/art'}};
 assert.equal((await front(event,frontDeps)).status,'ready');
 assert.equal((await front(event,frontDeps)).status,'ready');assert.equal(count,1);
 owner='u1';assert.equal((await front(event,frontDeps)).code,'forbidden');
 console.log('PASS public cache concurrency/reuse, private reference rejection, front owner and idempotency');
})().catch(e=>{console.error(e);process.exitCode=1});
