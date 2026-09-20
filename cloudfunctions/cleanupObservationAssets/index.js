let cloud;try{cloud=require('wx-server-sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV})}catch(e){}
async function main(event={},deps={}){
 const api=deps.cloud||cloud;if(!api)return {status:'failed',code:'runtime_unavailable'};
 const owner=api.getWXContext().OPENID;if(!owner||typeof event.observationId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(event.observationId))return {status:'failed',code:'invalid_request'};
 // Only the calling owner's explicitly abandoned temporary input is eligible.
 try{
  const db=api.database(),rows=await db.collection('assets').where({_openid:owner,observationId:event.observationId,purpose:'recognition'}).get();
  const eligible=rows.data.filter(x=>x.fileId&&x.fileId.endsWith('/observations/'+owner+'/'+event.observationId+'.jpg')&&!x.retained);
  for(const asset of eligible){
   const operations=await db.collection('artOperations').where({owner,photoFileId:asset.fileId}).get();
   for(const operation of operations.data){await db.collection('artOperations').doc(operation._id).update({data:{status:'cancelled'}});if(operation.assetFileId)await api.deleteFile({fileList:[operation.assetFileId]})}
  }
  if(eligible.length){const result=await api.deleteFile({fileList:eligible.map(x=>x.fileId)});if(result.fileList?.some(x=>x.status!==0&&x.status!==-1))return {status:'failed',code:'cleanup_failed'};for(const asset of eligible)await db.collection('assets').doc(asset._id).remove()}
  return {status:'cleaned'};
 }catch(e){return {status:'failed',code:'cleanup_failed'}}
}
module.exports={main};
