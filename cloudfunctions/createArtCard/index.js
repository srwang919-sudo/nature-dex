let cloud;try{cloud=require('wx-server-sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV,timeout:150000})}catch(e){}
const {generate}=require('./provider'),{createHash}=require('crypto');
const valid=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
async function main(event={},deps={}){
 const api=deps.cloud||cloud,fail=code=>({status:'failed',code,retryable:['generation_failed','busy','runtime_unavailable'].includes(code)});
 if(!api)return fail('runtime_unavailable');
 const owner=api.getWXContext().OPENID;if(!owner)return fail('unauthenticated');
 if(!valid(event.operationId))return fail('invalid_request');
 const id=createHash('sha256').update(owner+'|'+event.operationId).digest('hex'),db=api.database(),doc=db.collection('artOperations').doc(id);
 try{
  let current;try{current=(await doc.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw e}
  if(event.action==='status')return current&&current.owner===owner?{status:current.status,assetFileId:current.assetFileId||'',code:current.code||''}:fail('not_found');
  if(event.action!=='submit'||event.consent!==true||event.confirmed!==true)return fail('confirmation_required');
  if(!valid(event.photoObservationId)||!event.speciesId||typeof event.speciesId!=='string'||event.speciesId.length>100)return fail('invalid_request');
  if(typeof event.photoFileId!=='string'||!event.photoFileId.startsWith('cloud://')||!event.photoFileId.endsWith('/observations/'+owner+'/'+event.photoObservationId+'.jpg'))return fail('forbidden');
  if(current&&(current.photoFileId!==event.photoFileId||current.speciesId!==event.speciesId))return fail('operation_conflict');
  if(current&&current.status==='ready')return {status:'ready',assetFileId:current.assetFileId};
  const owned=await db.collection('assets').where({_openid:owner,fileId:event.photoFileId,observationId:event.photoObservationId}).get();if(!owned.data?.length)return fail('forbidden');
  const lease=Date.now()+180000;
  const claimed=await db.runTransaction(async tx=>{
   const entry=tx.collection('artOperations').doc(id);let old;try{old=(await entry.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw e}
   if(old&&(old.status==='ready'||old.leaseExpiresAt>Date.now()&&old.status==='processing'))return false;
   await entry.set({data:{owner,status:'processing',photoFileId:event.photoFileId,speciesId:event.speciesId,leaseExpiresAt:lease,expiresAt:Date.now()+86400000}});return true;
  });
  if(!claimed)return {status:'processing'};
  try{
   const photo=await api.downloadFile({fileID:event.photoFileId});
   const assetFileId=await (deps.generate||generate)(api,{reference:photo.fileContent,path:'private-art/'+owner+'/'+id+'.jpg',prompt:'保留参考照片主体的真实物种形态、颜色和解剖结构，提取主体，艺术摄影构图，自然光，干净背景，不加文字。已确认物种：'+event.speciesId+'。艺术图不作为鉴别依据。'});
   const live=(await doc.get()).data;if(live?.status==='cancelled'){await api.deleteFile({fileList:[assetFileId]});return fail('cancelled')}
   await doc.update({data:{status:'ready',assetFileId,leaseExpiresAt:0}});return {status:'ready',assetFileId};
  }catch(e){await doc.update({data:{status:'failed',code:'generation_failed',leaseExpiresAt:0}});return fail('generation_failed')}
 }catch(e){return fail('service_unavailable')}
}
module.exports={main};
