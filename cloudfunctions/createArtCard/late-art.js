// Erasure-only write: a late private output must remain discoverable until storage confirms removal.
async function discardLateArt(api,id,owner,fileId){
 const db=api.database();
 const update=async data=>db.runTransaction(async tx=>{
  const doc=tx.collection('artOperations').doc(id);let row;
  try{row=(await doc.get()).data}catch(e){if(!/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||''))throw e}
  if(row&&row.owner!==owner)throw Error('forbidden');
  if(row)await doc.update({data});
  else{
   const key=require('crypto').createHash('sha256').update(owner).digest('hex');
   const marker=tx.collection('accountPrivacy').doc(key),account=(await marker.get()).data;
   if(!account||account.owner!==owner)throw Error('forbidden');
   await doc.set({data:{owner,...data}});
   await marker.update({data:{status:'erasing',phase:'private_operations',updatedAt:Date.now()}});
  }
 });
 await update({status:'cancelled',code:'account_erasing',assetFileId:fileId,leaseExpiresAt:0});
 try{
  const result=await api.deleteFile({fileList:[fileId]});
  if(result.fileList?.length===1&&result.fileList[0].status===0)await update({assetFileId:''});
 }catch(e){/* Persisted cancelled output is retried by the erasure worker. */}
}
module.exports={discardLateArt};
