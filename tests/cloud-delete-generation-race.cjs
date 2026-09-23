const assert=require('node:assert/strict'),{main:create}=require('../cloudfunctions/createArtCard'),{main:remove}=require('../cloudfunctions/deleteObservationAssets');
const tables={usageQuotas:{},assets:{a:{_openid:'me',purpose:'recognition',observationId:'obs',fileId:'cloud://env/observations/me/obs.jpg'}},artOperations:{},observationDeletions:{}};
const db={collection:name=>({
 doc:id=>({get:async()=>{if(!tables[name][id])throw Error('not found');return {data:{...tables[name][id]}}},set:async({data})=>tables[name][id]={...data},update:async({data})=>Object.assign(tables[name][id],data),remove:async()=>delete tables[name][id]}),
 where:q=>({get:async()=>({data:Object.entries(tables[name]).filter(([,v])=>Object.entries(q).every(([k,x])=>v[k]===x)).map(([id,v])=>({_id:id,...v}))}),limit(){return this}})
})};db.runTransaction=fn=>fn(db);
let release;const api={getWXContext:()=>({OPENID:'me'}),database:()=>db,downloadFile:async()=>({fileContent:Buffer.from('photo')}),deleteFile:async({fileList})=>({fileList:fileList.map(fileID=>({fileID,status:0}))})};
const event={action:'submit',operationId:'op',consent:true,confirmed:true,speciesId:'kingfisher',photoObservationId:'obs',photoFileId:'cloud://env/observations/me/obs.jpg'};
(async()=>{
 event.artConsent={version:1,provider:'tencent-hunyuan',acceptedAt:Date.now(),operationId:event.operationId,observationId:event.photoObservationId};
 const generating=create(event,{cloud:api,generate:async(api,{path})=>{await new Promise(r=>release=r);return 'cloud://env/'+path}});
 await new Promise(r=>setImmediate(r));assert.equal(typeof release,'function');
 assert.equal((await remove({observationId:'obs'},{cloud:api})).code,'deletion_pending');
 release();assert.equal((await generating).code,'cancelled');
 assert.equal((await remove({observationId:'obs'},{cloud:api})).status,'deleted');
 assert.equal((await create({...event,operationId:'another',artConsent:{...event.artConsent,operationId:'another'}},{cloud:api})).code,'cancelled');
 assert.ok(Object.values(tables.artOperations).every(x=>x.status==='cancelled'&&!x.assetFileId));
 console.log('PASS pending generation cannot publish after observation deletion or restart with new operation id');
})().catch(e=>{console.error(e);process.exitCode=1});
