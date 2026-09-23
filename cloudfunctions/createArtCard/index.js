let cloud;try{cloud=require('./sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV,timeout:150000})}catch(e){}
const {generate}=require('./provider'),{createHash}=require('crypto');
const {buildNaturalHistoryPrompt,NATURAL_HISTORY_STYLE_VERSION}=require('./natural-history-prompt');
const {validConsent}=require('./consent');
const {reserveQuota}=require('./quota');
const {buildPrivateArtPrompt,PRIVATE_STYLE_VERSION}=require('./prompt');
const {trustedSpecies}=require('./species');
const valid=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
async function main(event={},deps={}){
 const api=deps.cloud||cloud,fail=code=>({status:'failed',code,retryable:['generation_failed','busy','runtime_unavailable'].includes(code)});
 if(!api)return fail('runtime_unavailable');
 const owner=api.getWXContext().OPENID;if(!owner)return fail('unauthenticated');
 if(!valid(event.operationId))return fail('invalid_request');
 if(Object.prototype.hasOwnProperty.call(event,'prompt'))return fail('invalid_request');
 const id=createHash('sha256').update(owner+'|'+event.operationId).digest('hex'),db=api.database(),doc=db.collection('artOperations').doc(id);
 try{
  let current;try{current=(await doc.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw e}
  if(event.action==='status')return current&&current.owner===owner?{status:current.status,assetFileId:current.assetFileId||'',code:current.code||''}:fail('not_found');
  if(event.action!=='submit'||event.consent!==true||event.confirmed!==true)return fail('confirmation_required');
  if(!validConsent(event.artConsent,event))return fail('art_consent_required');
  let species,artPrompt;try{species=trustedSpecies(event.speciesId);artPrompt=buildPrivateArtPrompt(species.id)}catch(e){return fail('invalid_species')}
  if(!valid(event.photoObservationId))return fail('invalid_request');
  const deletionId=createHash('sha256').update(owner+'|'+event.photoObservationId).digest('hex');
  const deleted=async store=>{try{return !!(await store.collection('observationDeletions').doc(deletionId).get()).data}catch(e){const message=e.message||e.errMsg||'';if(!/collection/i.test(message)&&/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(message))return false;throw e}};
  if(await deleted(db))return fail('cancelled');
  if(typeof event.photoFileId!=='string'||!event.photoFileId.startsWith('cloud://')||!event.photoFileId.endsWith('/observations/'+owner+'/'+event.photoObservationId+'.jpg'))return fail('forbidden');
  if(current&&(current.photoFileId!==event.photoFileId||trustedSpecies(current.speciesId).id!==species.id))return fail('operation_conflict');
  if(current&&current.status==='ready')return {status:'ready',assetFileId:current.assetFileId};
  const styleVersion=current?(current.styleVersion||'legacy'):NATURAL_HISTORY_STYLE_VERSION;
  if(styleVersion===NATURAL_HISTORY_STYLE_VERSION)artPrompt=buildNaturalHistoryPrompt({speciesId:species.id});
  const owned=await db.collection('assets').where({_openid:owner,fileId:event.photoFileId,observationId:event.photoObservationId}).get();if(!owned.data?.length)return fail('forbidden');
  const lease=Date.now()+180000;
  const claimed=await db.runTransaction(async tx=>{
   if(await deleted(tx))throw Error('cancelled');
   const entry=tx.collection('artOperations').doc(id);let old;try{old=(await entry.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw e}
   if(old&&(old.status==='ready'||old.leaseExpiresAt>Date.now()&&old.status==='processing'))return false;
   await reserveQuota(tx,owner,'art');
   await entry.set({data:{owner,status:'processing',styleVersion,photoFileId:event.photoFileId,speciesId:species.id,artConsent:{version:1,provider:event.artConsent.provider,acceptedAt:event.artConsent.acceptedAt,operationId:event.operationId,observationId:event.photoObservationId},leaseExpiresAt:lease,expiresAt:Date.now()+86400000}});return true;
  });
  if(!claimed)return {status:'processing'};
  let generatedFileId='';
  try{
   const photo=await api.downloadFile({fileID:event.photoFileId});
   const assetFileId=await (deps.generate||generate)(api,{reference:photo.fileContent,path:'private-art/'+owner+'/'+id+'.jpg',prompt:artPrompt});
   generatedFileId=assetFileId;
   const published=await db.runTransaction(async tx=>{const entry=tx.collection('artOperations').doc(id),live=(await entry.get()).data;if(await deleted(tx)||live?.status==='cancelled')return false;await entry.update({data:{status:'ready',assetFileId,styleVersion,leaseExpiresAt:0}});return true});
   if(!published){await doc.update({data:{status:'cancelled',assetFileId}});const removed=await api.deleteFile({fileList:[assetFileId]});if(removed.fileList?.[0]?.status===0)await doc.update({data:{assetFileId:'',leaseExpiresAt:0}});return fail('cancelled')}
   return {status:'ready',assetFileId};
  }catch(e){await db.runTransaction(async tx=>{const entry=tx.collection('artOperations').doc(id),live=(await entry.get()).data;await entry.update({data:{status:live?.status==='cancelled'?'cancelled':'failed',code:'generation_failed',leaseExpiresAt:0,...(generatedFileId?{assetFileId:generatedFileId}:{})}})});return fail('generation_failed')}
 }catch(e){return fail(['daily_limit','quota_unavailable'].includes(e.message)?e.message:'service_unavailable')}
}
module.exports={main};
