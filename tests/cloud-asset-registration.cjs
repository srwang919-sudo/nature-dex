const assert=require('node:assert/strict'),{main}=require('../cloudfunctions/recognizeObservation');
process.env.BAIDU_API_KEY='test';process.env.BAIDU_SECRET_KEY='test';
const writes=new Map();let downloads=0;
const api={
 getWXContext:()=>({OPENID:'owner1'}),
 downloadFile:async()=>{downloads++;return {fileContent:Buffer.from('photo')}},
 database:()=>({collection:name=>{
  assert.equal(name,'assets');
  return {doc:id=>({set:async({data})=>writes.set(id,data)})};
 }})
};
const event={action:'register_asset',consent:true,observationId:'draft1',idempotencyKey:'draft1',cloudPath:'observations/owner1/draft1.jpg',photoFileId:'cloud://env.bucket/observations/owner1/draft1.jpg',purpose:'recognition'};
(async()=>{
 const first=await main(event,{cloud:api});assert.equal(first.status,'registered');assert.equal(writes.size,1);
 const record=[...writes.values()][0];assert.equal(record._openid,'owner1');assert.equal(record.fileId,event.photoFileId);assert.equal(record.purpose,'recognition');
 await main(event,{cloud:api});assert.equal(writes.size,1,'registration retries are idempotent');
 for(const bad of [{owner:'victim'},{_openid:'victim'},{purpose:'illustration'},{cloudPath:'observations/victim/draft1.jpg'},{photoFileId:'cloud://env.bucket/observations/victim/draft1.jpg'}])assert.equal((await main({...event,...bad},{cloud:api})).code,'forbidden');
 assert.equal(downloads,2,'invalid owner and path are rejected before download');
 const denied=await main(event,{cloud:{...api,database:()=>{throw Error('private detail')}}});assert.equal(denied.code,'asset_registry');assert.ok(!JSON.stringify(denied).includes('private detail'));
 console.log('PASS server-owned registration, path/purpose checks, spoof rejection and retry idempotency');
})().catch(e=>{console.error(e);process.exitCode=1});
