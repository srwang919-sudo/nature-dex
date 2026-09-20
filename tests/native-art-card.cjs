const assert=require('node:assert/strict'),{createArtCard}=require('../native/lib/art-card');
(async()=>{
 const card={id:'c',speciesId:'ibis',photoObservationId:'d',photoPath:'local',photoFileId:'cloud://original'};
 let latest,calls=[];
 const failed=await createArtCard({card,api:{callFunction:async()=>{throw Error('-504003')}},onUpdate:c=>latest=c,wait:async()=>{}});
 assert.equal(failed.artStatus,'failed');assert.equal(latest.photoPath,'local');
 const api={uploadFile:async()=>({fileID:'cloud://original'}),callFunction:async({data})=>{calls.push(data);return {result:data.action==='upload_ticket'?{cloudPath:'private'}:data.action==='register_asset'?{status:'registered'}:data.action==='generate_submit'?{taskId:'task'}:{status:'ready',assetFileId:'cloud://art'}}}};
 const made=await createArtCard({card,api,wait:async()=>{}});
 assert.equal(made.photoPath,'local');assert.equal(made.artPhotoPath,'cloud://art');assert.ok(calls.every(c=>c.consent===true));assert.equal(calls[0].action,'submit');
 console.log('PASS AI explicit consent request, original preserved, service failure stops');
})().catch(e=>{console.error(e);process.exitCode=1});
