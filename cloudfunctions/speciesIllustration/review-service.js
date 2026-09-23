const {createHash}=require('crypto'),{assertActive}=require('./account-gate'),{reviewArtwork}=require('./artwork-repository');
const hash=x=>createHash('sha256').update(x).digest('hex');
async function reviewService(api,event,deps={}){
 const owner=api.getWXContext().OPENID,db=api.database();if(!owner)throw Error('unauthenticated');
 if(Object.keys(event).some(k=>!['action','artworkId','decision'].includes(k))||!/^[-a-zA-Z0-9_]{1,100}$/.test(event.artworkId||''))throw Error('invalid_request');
 await assertActive(db,owner);let staff;try{staff=(await db.collection('artworkReviewers').doc(hash(owner)).get()).data}catch(e){}if(staff?.active!==true)throw Error('review_forbidden');
 if(event.decision!=='approve')return db.runTransaction(async tx=>{await assertActive(tx,owner,true);return reviewArtwork(tx,{reviewer:owner,artworkId:event.artworkId,decision:event.decision})});
 const art=(await db.collection('speciesArtworks').doc(event.artworkId).get()).data;
 if(!art||!['platform_generated','user_first_unlock'].includes(art.source)||!['candidate','approved','deprecated'].includes(art.status))throw Error('artwork_invalid');
 const cloudPath='official-artworks/'+event.artworkId+'.jpg',metadata=deps.metadata||(async({cloudPath})=>{const tcb=require('@cloudbase/node-sdk');return tcb.init({env:tcb.SYMBOL_CURRENT_ENV}).getUploadMetadata({cloudPath})});
 const fileId=(await metadata({cloudPath}))?.data?.fileId;if(!fileId?.startsWith('cloud://')||!fileId.endsWith('/'+cloudPath))throw Error('artwork_invalid');
 await db.runTransaction(async tx=>{await assertActive(tx,owner,true);const job=tx.collection('artworkReviewJobs').doc(event.artworkId);let old;try{old=(await job.get()).data}catch(e){if(!/DATABASE_DOCUMENT_NOT_EXIST|not found|not exist/.test(e.message||''))throw e}if(old?.status==='cleaning')throw Error('artwork_resource_unavailable');await job.set({data:{artworkId:event.artworkId,assetFileId:fileId,status:'pending',expiresAt:Date.now()+180000}})});
 try{
 const bytes=(await api.downloadFile({fileID:art.assetFileId})).fileContent;if(!require('./provider').isImage(Buffer.from(bytes)))throw Error('artwork_invalid');
 const uploaded=await api.uploadFile({cloudPath,fileContent:bytes});if(uploaded.fileID!==fileId)throw Error('artwork_invalid');
 const result=await db.runTransaction(async tx=>{
  await assertActive(tx,owner,true);const current=(await tx.collection('speciesArtworks').doc(event.artworkId).get()).data;
  const currentJob=(await tx.collection('artworkReviewJobs').doc(event.artworkId).get()).data;if(currentJob.status!=='pending'||currentJob.assetFileId!==fileId)throw Error('artwork_invalid');
  if(current.assetFileId!==art.assetFileId||current.reviewRevision!==art.reviewRevision)throw Error('artwork_invalid');
  const approved=await reviewArtwork(tx,{reviewer:owner,artworkId:event.artworkId,decision:'approve',publishedAssetFileId:fileId});
  await tx.collection('artworkReviewJobs').doc(event.artworkId).set({data:{artworkId:event.artworkId,assetFileId:fileId,status:'complete'}});return approved;
 });return result?.result||result;
 }catch(error){
  // Revoke the pending derivative before cleanup. An already approved version
  // belongs to the public library and must never be removed by a failed caller.
  try{const cleanup=await db.runTransaction(async tx=>{const doc=tx.collection('speciesArtworks').doc(event.artworkId);let live;try{live=(await doc.get()).data}catch(e){if(!/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST/.test(e.message||''))throw e}if(live?.status==='approved'&&live.assetFileId===fileId)return false;if(live)await doc.set({data:{...live,generation:(live.generation||0)+1}});await tx.collection('artworkReviewJobs').doc(event.artworkId).set({data:{artworkId:event.artworkId,assetFileId:fileId,status:'cleaning',expiresAt:Date.now()}});return true});
   if(cleanup?.result??cleanup){const removed=await api.deleteFile({fileList:[fileId]});if(removed.fileList?.[0]?.status===0)await db.collection('artworkReviewJobs').doc(event.artworkId).update({data:{status:'cleaned'}})}
  }catch(ignore){} // Durable review job remains for the bounded reconciler.
  throw error;
 }
}
module.exports={reviewService};
