const {createHash}=require('crypto');
const key=owner=>createHash('sha256').update(owner).digest('hex');
const absent=e=>!/collection/i.test(e.message||'')&&/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||'');
// Fixed owner-derived fields only. Finance and public watercolor are deliberately absent.
const PERSONAL=Object.freeze([
 ['natureFriendInvites','issuer'],['natureFriendInvites','recipient'],['natureFriendEdges','owner'],['natureSpeciesCards','owner'],
 ['natureSpeciesShares','owner'],['natureSpeciesShares','recipient'],['natureCopyRequests','owner'],
 ['natureCopyRequests','requester'],['natureCopySlots','requester'],['natureMemorialCopies','recipient'],
 ['natureMemorialCopies','sourceOwner'],['recognitionReceipts','owner'],['trustedObservations','owner'],
 ['natureObservations','owner'],['natureCards','owner'],['userSpeciesDiscoveries','owner']
]);
function createPrivacyService({db,deleteObservation,deletePrivateArt,now=Date.now}){
 const read=async id=>{try{return (await db.collection('accountPrivacy').doc(id).get()).data}catch(e){if(absent(e))return;throw e}};
 const rows=async(c,q)=>(await db.collection(c).where(q).limit(20).get()).data||[];
 const projection=row=>({status:row.status==='erased'?'erased':row.status==='failed'?'failed':'processing',phase:row.phase||'private_assets',code:row.code||'',updatedAt:row.updatedAt});
 async function continueJob(owner,id){
  const marker=db.collection('accountPrivacy').doc(id),job=await read(id);if(!job||job.status==='active')return {status:'failed',code:'erasure_not_requested'};
  if(job.status==='erased')return projection(job);
  try{
   const assets=await rows('assets',{_openid:owner});
   if(assets.length){
    for(const observationId of new Set(assets.map(a=>a.observationId))){
     if(typeof observationId!=='string')throw Error('unregistered_asset');
     const result=await deleteObservation(owner,observationId);
     if(result.status!=='deleted')throw Error(result.code==='deletion_pending'?'generation_pending':'private_delete_failed');
    }
    await marker.update({data:{status:'erasing',phase:'private_assets',code:'',updatedAt:now()}});return {status:'processing',phase:'private_assets'};
   }
   const operations=await rows('artOperations',{owner});
   if(operations.length){
    for(const operation of operations){
     // Metadata with unconfirmed private storage must not disappear or be called erased.
     if(operation.leaseExpiresAt>now())throw Error('generation_pending');
     if(operation.assetFileId){
      if(!operation.assetFileId.startsWith('cloud://')||!operation.assetFileId.endsWith('/private-art/'+owner+'/'+operation._id+'.jpg'))throw Error('private_art_remaining');
      if(!deletePrivateArt||!await deletePrivateArt(operation.assetFileId))throw Error('private_art_remaining');
     }
     await db.collection('artOperations').doc(operation._id).remove();
    }
    return {status:'processing',phase:'private_operations'};
   }
   // Edges supply relationship IDs without scanning another owner's data.
   const edges=await rows('natureFriendEdges',{owner});
   for(const edge of edges){if(edge.relationshipId){
    const related=await rows('natureFriendEdges',{relationshipId:edge.relationshipId});
    for(const row of related)await db.collection('natureFriendEdges').doc(row._id).remove();
    if(related.length===20){await db.collection('natureFriendEdges').doc(edge._id).set({data:{owner,relationshipId:edge.relationshipId}});return {status:'processing',phase:'relationships'}}
    await db.collection('natureFriendships').doc(edge.relationshipId).remove();
   }}
   for(const [collection,field] of PERSONAL){
    const found=await rows(collection,{[field]:owner});
    if(found.length){for(const row of found)await db.collection(collection).doc(row._id).remove();await marker.update({data:{status:'erasing',phase:'personal_records',code:'',updatedAt:now()}});return {status:'processing',phase:'personal_records'}}
   }
   // Marker retained to prevent account resurrection. Financial data still reconciles separately.
   const fence=await read(id),pendingAssets=await rows('assets',{_openid:owner}),pendingArt=await rows('artOperations',{owner});
   const complete=await db.runTransaction(async tx=>{
    const doc=tx.collection('accountPrivacy').doc(id),latest=(await doc.get()).data;
    const pending=pendingAssets.length||pendingArt.length||(latest.generation||0)!==(fence.generation||0);
    const result={status:pending?'erasing':'erased',phase:pending?'private_assets':'complete',code:'',generation:(latest.generation||0)+1,updatedAt:now()};
    await doc.update({data:result});return result;
   });return projection(complete);
  }catch(e){const code=['unregistered_asset','generation_pending','private_delete_failed','private_art_remaining'].includes(e.message)?e.message:'erasure_unavailable';await marker.update({data:{status:'failed',code,updatedAt:now()}});return {status:'failed',code,retryable:true}}
 }
 return {async execute(owner,event={}){
  if(!owner)return {status:'failed',code:'unauthenticated'};
  if(Object.keys(event).some(k=>k!=='action')||!['requestErasure','continueErasure','status'].includes(event.action))return {status:'failed',code:'invalid_request'};
  const id=key(owner);
  try{
   if(event.action==='requestErasure'){
    await db.runTransaction(async tx=>{const doc=tx.collection('accountPrivacy').doc(id);let old;try{old=(await doc.get()).data}catch(e){if(!absent(e))throw e}if(!old||old.status==='active')await doc.set({data:{status:'erasing',generation:(old?.generation||0)+1,phase:'private_assets',requestedAt:now(),updatedAt:now()}})});
    return projection(await read(id));
   }
   if(event.action==='status'){const job=await read(id);return job&&job.status!=='active'?projection(job):{status:'active'}}
   return await continueJob(owner,id);
  }catch(e){return {status:'failed',code:'erasure_unavailable',retryable:true}}
 }};
}
module.exports={createPrivacyService,PERSONAL};
