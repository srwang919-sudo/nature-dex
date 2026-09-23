const assert=require('node:assert/strict'),{createArtCard}=require('../native/lib/art-card');
(async()=>{
 const card={artConsent:{version:1,provider:'tencent-hunyuan',acceptedAt:Date.now(),operationId:'c',observationId:'d'},id:'c',speciesId:'ibis',photoObservationId:'d',photoPath:'local',photoFileId:'cloud://original'};
 let latest,calls=[];
 const failed=await createArtCard({card,api:{callFunction:async()=>{throw Error('-504003')}},onUpdate:c=>latest=c,wait:async()=>{}});
 assert.equal(failed.artStatus,'processing');assert.equal(failed.artCode,'generation_pending');assert.equal(latest.photoPath,'local');
 const api={uploadFile:async()=>({fileID:'cloud://original'}),callFunction:async({data})=>{calls.push(data);return {result:data.action==='upload_ticket'?{cloudPath:'private'}:data.action==='register_asset'?{status:'registered'}:data.action==='generate_submit'?{taskId:'task'}:{status:'ready',assetFileId:'cloud://art'}}}};
 const made=await createArtCard({card,api,wait:async()=>{}});
 assert.equal(made.photoPath,'local');assert.equal(made.artPhotoPath,'cloud://art');assert.ok(calls.every(c=>c.consent===true));assert.equal(calls[0].action,'generate');
 const {presentCard}=require('../native/lib/card-presentation');
 assert.equal(presentCard(made).front.photo,'cloud://art');
 assert.equal(presentCard({...made,frontMode:'art',artPhotoPath:''}).front.photo,'');
 const unchanged=await createArtCard({card,api:{callFunction:async()=>({result:{status:'ready',assetFileId:card.photoFileId}})}});
 assert.equal(unchanged.artStatus,'failed','original file must not be accepted as generated artwork');
 console.log('PASS AI explicit consent request, original preserved, service failure stops');
})().catch(e=>{console.error(e);process.exitCode=1});
