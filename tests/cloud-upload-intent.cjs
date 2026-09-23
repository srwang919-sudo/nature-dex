const test=require('node:test'),assert=require('node:assert/strict');
test('upload metadata is registered before upload; failed durable write never grants ticket',async()=>{
 const {prepareUpload}=require('../cloudfunctions/recognizeObservation/upload-intent');
 const rows=new Map();let failWrite=false,charged=0;
 const db={collection:n=>({doc:id=>({get:async()=>{if(!rows.has(n+id))throw Error('not found');return {data:rows.get(n+id)}},set:async({data})=>{if(failWrite)throw Error('quota');rows.set(n+id,data)}})})};db.runTransaction=f=>f(db);
 const input={owner:'me',observationId:'obs',cloudPath:'observations/me/obs.jpg'};
 const metadata=async()=>({data:{fileId:'cloud://env/observations/me/obs.jpg',token:'never return'}});
 const ticket=await prepareUpload(db,input,metadata,async()=>charged++);assert.equal(ticket.cloudPath,input.cloudPath);assert.ok(!JSON.stringify(ticket).includes('never return'));
 assert.ok([...rows.values()].some(r=>r.fileId==='cloud://env/observations/me/obs.jpg'&&r.uploadPending===true));
 await prepareUpload(db,input,metadata,async()=>charged++);assert.equal(charged,1);
 failWrite=true;await assert.rejects(prepareUpload(db,{...input,observationId:'new',cloudPath:'observations/me/new.jpg'},async()=>({data:{fileId:'cloud://env/observations/me/new.jpg'}}),async()=>{}));
 await assert.rejects(prepareUpload(db,input,async()=>({data:{fileId:'cloud://env/observations/other/obs.jpg'}}),async()=>{}),/metadata_invalid/);
});
test('abandoned cleanup uses the identical fail-closed deletion boundary',()=>{
 const fs=require('node:fs'),path=require('node:path'),base=path.join(__dirname,'../cloudfunctions');
 assert.equal(fs.readFileSync(path.join(base,'cleanupObservationAssets/delete-observation.js'),'utf8'),fs.readFileSync(path.join(base,'deleteObservationAssets/index.js'),'utf8'));
});
