const {createHash,timingSafeEqual}=require('crypto'),{settleCreation}=require('./creation-wallet');
const digest=x=>createHash('sha256').update(x).digest();
const read=async d=>{try{return (await d.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/DATABASE_DOCUMENT_NOT_EXIST|not found|not exist/i.test(e.message||''))return null;throw e}};
async function reconcile(api,event,deps={}){
 const token=deps.jobToken||process.env.NATURE_ARTWORK_JOB_TOKEN;
 if(!token||typeof event.token!=='string'||!timingSafeEqual(digest(token),digest(event.token)))throw Error('operator_required');
 if(Object.keys(event).some(k=>!['action','token'].includes(k)))throw Error('invalid_request');
 const db=api.database(),now=(deps.now||Date.now)();let released=0,cleaned=0,failed=0;
 const pending=(await db.collection('creationReservations').where({status:'reserved',expiresAt:db.command.lte(now)}).limit(20).get()).data||[];
 for(const row of pending)try{await db.runTransaction(async tx=>{await require('./account-gate').assertActive(tx,row.owner,true);const current=(await tx.collection('creationReservations').doc(row._id).get()).data;if(current.status==='reserved'&&current.expiresAt<=now){await settleCreation(tx,{owner:current.owner,operationId:current.operationId,attempt:current.attempt,outcome:'release',now});const id=digest(current.owner+'|'+current.operationId).toString('hex');for(const key of [id,id+'_'+current.attempt]){const d=tx.collection('artOperations').doc(key),op=await read(d);if(op?.status==='processing'&&op.walletAttempt===current.attempt)await d.update({data:{status:key===id?'failed':'cancelled',code:'generation_timeout',leaseExpiresAt:0}})}}});released++}catch(e){failed++}
 const attempts=(await db.collection('artOperations').where({isAttempt:true,status:'cancelled',assetFileId:db.command.neq('')}).limit(20).get()).data||[];
 for(const row of attempts)try{
  if(typeof row.owner!=='string'||!row.assetFileId?.startsWith('cloud://')||!row.assetFileId.endsWith('/private-art/'+row.owner+'/'+row._id+'.jpg'))throw Error('asset_invalid');
  const result=await api.deleteFile({fileList:[row.assetFileId]});if(result.fileList?.[0]?.status!==0)throw Error('delete_failed');
  await db.runTransaction(async tx=>{const d=tx.collection('artOperations').doc(row._id),live=(await d.get()).data;if(live.status==='cancelled'&&live.assetFileId===row.assetFileId)await d.update({data:{assetFileId:''}})});cleaned++;
 }catch(e){failed++}
 const jobs=(await db.collection('artworkReviewJobs').where({status:db.command.in(['pending','cleaning']),expiresAt:db.command.lte(now)}).limit(20).get()).data||[];
 for(const row of jobs)try{
  const claim=await db.runTransaction(async tx=>{const jobDoc=tx.collection('artworkReviewJobs').doc(row._id),job=(await jobDoc.get()).data;if(!['pending','cleaning'].includes(job.status)||job.expiresAt>now)return false;const artDoc=tx.collection('speciesArtworks').doc(row.artworkId),art=await read(artDoc);if(art?.status==='approved'&&art.assetFileId===row.assetFileId)return false;if(art)await artDoc.update({data:{generation:(art.generation||0)+1}});await jobDoc.update({data:{status:'cleaning'}});return true});
  if(!(claim?.result??claim))continue;
  if(!row.assetFileId?.endsWith('/official-artworks/'+row.artworkId+'.jpg'))throw Error('asset_invalid');
  const result=await api.deleteFile({fileList:[row.assetFileId]});if(result.fileList?.[0]?.status!==0)throw Error('delete_failed');await db.collection('artworkReviewJobs').doc(row._id).update({data:{status:'cleaned'}});cleaned++;
 }catch(e){failed++}
 return {status:failed?'partial':'ready',released,cleaned,failed};
}
module.exports={reconcile};
