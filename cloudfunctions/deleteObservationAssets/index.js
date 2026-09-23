let cloud;try{cloud=require('wx-server-sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV})}catch(e){}
const {createHash}=require('crypto');
const absent=e=>/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||'');
async function main(event={},deps={}){
 const fail=code=>({status:'failed',code}),api=deps.cloud||cloud;
 if(!api)return fail('runtime_unavailable');
 const owner=api.getWXContext().OPENID,observationId=event.observationId;
 if(!owner||typeof observationId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(observationId)||Object.keys(event).some(k=>k!=='observationId'))return fail('invalid_request');
 const db=api.database(),key=createHash('sha256').update(owner+'|'+observationId).digest('hex'),marker=db.collection('observationDeletions').doc(key);
 try{
  // A durable tombstone serializes registration, generation claims and publishing.
  const alreadyDeleted=await db.runTransaction(async tx=>{const d=tx.collection('observationDeletions').doc(key);let old;try{old=(await d.get()).data}catch(e){if(!absent(e))throw e}if(!old)await d.set({data:{owner,observationId,status:'deleting',createdAt:Date.now()}});return old?.status==='deleted'});
  const rows=(await db.collection('assets').where({_openid:owner,observationId,purpose:'recognition'}).limit(100).get()).data;
  // Missing registry cannot prove that a private source file is absent.
  if(!rows.length)return alreadyDeleted?{status:'deleted'}:fail('asset_registry_missing');
  if(rows.length===100)return fail('deletion_batch_limit');
  const files=[],operations=[];let pending=false;
  for(const asset of rows){
   if(typeof asset.fileId!=='string'||!asset.fileId.startsWith('cloud://')||!asset.fileId.endsWith('/observations/'+owner+'/'+observationId+'.jpg'))return fail('asset_invalid');
   files.push(asset.fileId);
   const arts=(await db.collection('artOperations').where({owner,photoFileId:asset.fileId}).limit(100).get()).data;
   if(arts.length===100)return fail('deletion_batch_limit');
   for(const op of arts){
    if(op.owner!==owner)return fail('asset_invalid');
    await db.collection('artOperations').doc(op._id).update({data:{status:'cancelled',cancelledAt:Date.now()}});
    if(op.leaseExpiresAt>Date.now())pending=true;
    if(op.assetFileId){if(!op.assetFileId.startsWith('cloud://')||!op.assetFileId.endsWith('/private-art/'+owner+'/'+op._id+'.jpg'))return fail('asset_invalid');files.push(op.assetFileId)}
    operations.push(op);
   }
  }
  if(pending)return fail('deletion_pending');
  for(const fileID of [...new Set(files)]){
   const result=await api.deleteFile({fileList:[fileID]}),row=result.fileList?.[0];
   // Do not interpret generic -1 as "already absent"; that can be a permission error.
   if(!row||row.status!==0)return fail('cloud_delete_failed');
  }
  for(const op of operations)await db.collection('artOperations').doc(op._id).update({data:{assetFileId:'',leaseExpiresAt:0,deletedAt:Date.now()}});
  await marker.update({data:{status:'deleted',deletedAt:Date.now()}});
  for(const asset of rows)await db.collection('assets').doc(asset._id).remove();
  return {status:'deleted'};
 }catch(e){return fail('cloud_delete_failed')}
}
module.exports={main};
