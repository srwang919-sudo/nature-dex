const assert=require('node:assert/strict');
const {normalizeRecognition}=require('../cloudfunctions/recognizeObservation');
assert.deepEqual(normalizeRecognition({candidates:[]}),{status:'unknown',candidates:[]});
assert.throws(()=>normalizeRecognition({candidates:[{speciesId:'egret'}]}),/confidence/);
assert.equal(normalizeRecognition({candidates:[{speciesId:'egret',confidence:.91,source:'baidu'}]}).status,'recognized');
console.log('PASS: cloud recognition normalization');
const {main}=require('../cloudfunctions/recognizeObservation');
process.env.BAIDU_API_KEY='test-key';process.env.BAIDU_SECRET_KEY='test-secret';
const calls=[],records=new Map();let owns=true;
const api={getWXContext:()=>({OPENID:'u1'}),downloadFile:async()=>({fileContent:Buffer.from('photo')}),database:()=>{const db={collection:name=>({where:q=>({get:async()=>({data:owns?[q]:[]})}),doc:id=>({get:async()=>{const data=records.get(name+id);if(!data)throw Error('not found');return {data}},set:async({data})=>records.set(name+id,data),update:async({data})=>records.set(name+id,{...records.get(name+id),...data})})})};db.runTransaction=fn=>fn(db);return db}};
(async()=>{
 assert.equal((await main({})).code,'consent_required');
 const input={consent:true,observationId:'o1',idempotencyKey:'o1',photoFileId:'cloud://env.bucket/observations/u1/o1.jpg'};
 const request=async(url,opts)=>{calls.push({url,opts});return {status:200,json:()=>url.includes('oauth')?{access_token:'fake-token'}:{result:url.includes('animal')?[{name:'白鹭',score:.7}]:[]}}};
 const result=await main(input,{cloud:api,request});assert.equal(result.status,'needs_confirmation');assert.equal(result.candidates[0].source,'baidu');
 assert.equal(calls.length,4);assert.ok(calls[0].opts.body.includes('grant_type=client_credentials'));
 const replay=await main({...input,idempotencyKey:'different-client-key'},{cloud:api,request});assert.deepEqual(replay,result);assert.equal(calls.length,4,'replay must not call any provider again');
 assert.ok(calls[1].opts.body.includes('image='));
 const responseRequest=error=>async(url)=>({status:200,json:()=>url.includes('oauth')?{access_token:'mock'}:url.includes('animal')?{error_code:error,error_msg:'DO_NOT_EXPOSE'}:{result:[{name:'山茶',score:.95}]}});
 records.clear();const partial=await main(input,{cloud:api,request:responseRequest(6)});
 // 山茶 .95 达到通用路阈值 .90，即使动物路失败也应直通判定；失败仍以 warning 带上，不暴露 provider 细节。
 assert.equal(partial.status,'recognized');assert.equal(partial.warnings[0].code,'provider_permission');assert.equal(partial.warnings[0].providerCode,6);assert.ok(!JSON.stringify(partial).includes('DO_NOT_EXPOSE'));
 records.clear();const quota=await main({...input,kind:'animal'},{cloud:api,request:responseRequest(17)});assert.equal(quota.code,'provider_quota');
 records.clear();const badAuth=await main(input,{cloud:api,request:async()=>({status:400,json:()=>({error:'invalid_client',error_description:'never show'})})});assert.equal(badAuth.code,'provider_auth_failed');assert.ok(!JSON.stringify(badAuth).includes('never show'));
 const missingAsset=await main(input,{cloud:{...api,database:()=>{throw Error('private detail')}}});assert.equal(missingAsset.code,'asset_registry');
 owns=false;assert.equal((await main(input,{cloud:api,request})).code,'forbidden');
 assert.equal((await main({...input,photoFileId:'cloud://env.bucket/observations/other/o1.jpg'},{cloud:api,request})).code,'forbidden');
 console.log('PASS Baidu token, animal/plant routing, low confidence and private owner checks');
})().catch(e=>{console.error(e);process.exitCode=1});
