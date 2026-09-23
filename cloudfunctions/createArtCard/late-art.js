// Erasure-only write: a late private output must remain discoverable until storage confirms removal.
async function discardLateArt(api,id,owner,fileId){
 const db=api.database();
 const update=async data=>db.runTransaction(async tx=>{
  const doc=tx.collection('artOperations').doc(id),row=(await doc.get()).data;
  if(!row||row.owner!==owner)throw Error('forbidden');
  await doc.update({data});
 });
 await update({status:'cancelled',code:'account_erasing',assetFileId:fileId,leaseExpiresAt:0});
 try{
  const result=await api.deleteFile({fileList:[fileId]});
  if(result.fileList?.length===1&&result.fileList[0].status===0)await update({assetFileId:''});
 }catch(e){/* Persisted cancelled output is retried by the erasure worker. */}
}
module.exports={discardLateArt};
