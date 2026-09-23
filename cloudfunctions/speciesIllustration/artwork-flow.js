const {createHash}=require('crypto'),{assertActive}=require('./account-gate'),{confirmedCandidate}=require('./observation');
const {officialArtwork}=require('./artwork-repository'),{reserveCreation,settleCreation}=require('./creation-wallet');
const {buildPublicSpeciesPrompt}=require('./prompt');
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=async d=>{try{return (await d.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/DATABASE_DOCUMENT_NOT_EXIST|not found|not exist/i.test(e.message||''))return null;throw e}};
async function observationFence(tx,owner,observationId){const key=hash(owner+'|'+observationId);if(await read(tx.collection('observationDeletions').doc(key)))throw Error('cancelled');const doc=tx.collection('trustedObservations').doc(key),old=await read(doc);await doc.set({data:{...old,owner,observationId,status:old?.status||'pending',generation:(old?.generation||0)+1}})}
async function transaction(db,work){for(let i=0;;i++)try{return await db.runTransaction(work)}catch(e){if(i>=3||![e.code,e.errCode,e.message].includes('DATABASE_TRANSACTION_CONFLICT'))throw e;await new Promise(r=>setTimeout(r,10*(i+1)))}}
async function artworkFlow(api,event,deps={}){
 const owner=api.getWXContext().OPENID,db=api.database(),now=deps.now||Date.now;
 if(!owner)throw Error('unauthenticated');await assertActive(db,owner);
 if(event.action==='resource'){
  if(Object.keys(event).some(k=>!['action','artworkId'].includes(k))||!/^[-a-zA-Z0-9_]{1,100}$/.test(event.artworkId||''))throw Error('invalid_request');
  const art=await read(db.collection('speciesArtworks').doc(event.artworkId));
  if(!art||!(art.status==='approved'&&art.is_official===true||art.status==='candidate'&&art.owner===owner))throw Error('artwork_forbidden');
  if(art.status==='candidate'&&await read(db.collection('observationDeletions').doc(hash(owner+'|'+art.observationId))))throw Error('artwork_forbidden');
  const urls=await api.getTempFileURL({fileList:[{fileID:art.assetFileId,maxAge:600}]});const url=urls.fileList?.[0]?.tempFileURL;if(!url?.startsWith('https://'))throw Error('artwork_resource_unavailable');
  return {status:'ready',url,expiresAt:now()+600000};
 }
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(event.operationId||''))throw Error('invalid_request');
 const id=hash(owner+'|'+event.operationId),opDoc=db.collection('artOperations').doc(id);
 const result=async op=>{
  if(!op)return {status:'failed',code:'not_found'};
  if(op.status!=='ready')return {status:op.status,code:op.code||''};
  const art=await read(db.collection('speciesArtworks').doc(op.artworkId));
  if(!art||!(art.status==='approved'&&art.is_official||art.status==='candidate'&&art.owner===owner))return {status:'failed',code:'artwork_unavailable'};
  return {status:'ready',artworkId:op.artworkId,assetFileId:art.assetFileId,artworkStatus:art.status,isOfficial:art.status==='approved'&&art.is_official===true};
 };
 if(event.action==='status'){
  if(Object.keys(event).some(k=>!['action','operationId'].includes(k)))throw Error('invalid_request');
  const old=await read(opDoc);if(old?.status==='processing'&&old.leaseExpiresAt<=now())await transaction(db,async tx=>{await assertActive(tx,owner,true);const d=tx.collection('artOperations').doc(id),op=await read(d);if(op?.status==='processing'&&op.leaseExpiresAt<=now()){await settleCreation(tx,{owner,operationId:event.operationId,attempt:op.walletAttempt,outcome:'release',now:now()});await d.set({data:{...op,status:'failed',code:'generation_timeout',leaseExpiresAt:0}});const attempt=tx.collection('artOperations').doc(op.artworkId),row=await read(attempt);if(row?.status==='processing')await attempt.update({data:{status:'cancelled',code:'generation_timeout',leaseExpiresAt:0}})}});
  return result(await read(opDoc));
 }
 if(!['resolve','generate'].includes(event.action)||event.confirmed!==true||Object.keys(event).some(k=>!['action','operationId','photoObservationId','speciesId','confirmed','consent','artConsent'].includes(k)))throw Error('invalid_request');
 const claim=await transaction(db,async tx=>{
  await assertActive(tx,owner,true);const observationKey=hash(owner+'|'+event.photoObservationId),receiptDoc=tx.collection('recognitionReceipts').doc(observationKey),receipt=await read(receiptDoc);
  await observationFence(tx,owner,event.photoObservationId);
  const candidate=await confirmedCandidate(tx,owner,{...event,photoFileId:receipt?.photoFileId});
  const baseline=await read(tx.collection('natureSpecies').doc(hash(candidate.speciesId)));if(baseline?.counterStatus!=='initialized'||!baseline.baselineVersion||!Number.isSafeInteger(baseline.lastDiscoveryNumber))throw Error('discovery_baseline_unavailable');
  await receiptDoc.set({data:{...receipt,generation:(receipt.generation||0)+1}});
  const doc=tx.collection('artOperations').doc(id),old=await read(doc);
  if(old&&(old.speciesId!==candidate.speciesId||old.photoFileId!==receipt.photoFileId))throw Error('operation_conflict');
  if(old?.status==='ready'||old?.status==='processing'&&old.leaseExpiresAt>now())return old;
  const official=await officialArtwork(tx,candidate.speciesId),base={owner,speciesId:candidate.speciesId,photoFileId:receipt.photoFileId,photoObservationId:event.photoObservationId};
  if(official){const op={...base,status:'ready',artworkId:official.id,leaseExpiresAt:0};await doc.set({data:op});return op}
  if(event.action==='resolve')return {status:'needs_creation'};
  if(event.consent!==true||!require('./consent').validConsent(event.artConsent,event))throw Error('art_consent_required');
  const reservation=await reserveCreation(tx,{owner,operationId:event.operationId,now:now()}),artworkId=id+'_'+reservation.attempt;
  const op={...base,status:'processing',artworkId,walletAttempt:reservation.attempt,leaseExpiresAt:reservation.expiresAt};await doc.set({data:op});
  await tx.collection('artOperations').doc(artworkId).set({data:{...op,parentOperationId:id,isAttempt:true}});
  return {...op,claimed:true};
 });
 const op=claim?.result||claim;if(!op.claimed)return result(op);
 const attemptDoc=db.collection('artOperations').doc(op.artworkId);let fileId='';
 try{
  const path='private-art/'+owner+'/'+op.artworkId+'.jpg',metadata=deps.metadata||(async({cloudPath})=>{const tcb=require('@cloudbase/node-sdk');return tcb.init({env:tcb.SYMBOL_CURRENT_ENV}).getUploadMetadata({cloudPath})});
  const intended=(await metadata({cloudPath:path}))?.data?.fileId;if(!intended?.startsWith('cloud://')||!intended.endsWith('/'+path))throw Error('asset_invalid');
  await transaction(db,async tx=>{await assertActive(tx,owner,true);await observationFence(tx,owner,op.photoObservationId);const d=tx.collection('artOperations').doc(op.artworkId),current=await read(d);if(current?.status!=='processing')throw Error('cancelled');await d.set({data:{...current,assetFileId:intended,uploadPending:true}})});
  fileId=intended;
  const generated=await (deps.generate||require('./provider').generate)(api,{prompt:buildPublicSpeciesPrompt(op.speciesId),path});if(generated!==intended)throw Error('asset_invalid');
  await transaction(db,async tx=>{
   await assertActive(tx,owner,true);const d=tx.collection('artOperations').doc(id),live=await read(d);
   await observationFence(tx,owner,op.photoObservationId);
   if(live?.status!=='processing'||live.walletAttempt!==op.walletAttempt)throw Error('cancelled');
   await settleCreation(tx,{owner,operationId:event.operationId,attempt:op.walletAttempt,outcome:'commit',now:now()});
   await tx.collection('speciesArtworks').doc(op.artworkId).set({data:{owner,observationId:op.photoObservationId,speciesId:op.speciesId,status:'candidate',is_official:false,is_default:false,source:'user_first_unlock',styleVersion:'museum-pencil-watercolor-v1',assetFileId:fileId,createdAt:now()}});
   await d.set({data:{...live,status:'ready',leaseExpiresAt:0}});await tx.collection('artOperations').doc(op.artworkId).set({data:{...op,claimed:false,isAttempt:true,status:'ready',assetFileId:fileId,leaseExpiresAt:0}});
  });return result(await read(opDoc));
 }catch(e){
  try{await transaction(db,async tx=>{await assertActive(tx,owner,true);const d=tx.collection('artOperations').doc(id),live=await read(d);if(live?.status==='processing'&&live.walletAttempt===op.walletAttempt){await settleCreation(tx,{owner,operationId:event.operationId,attempt:op.walletAttempt,outcome:'release',now:now()});await d.set({data:{...live,status:'failed',code:'generation_failed',leaseExpiresAt:0}})}await tx.collection('artOperations').doc(op.artworkId).set({data:{...op,isAttempt:true,status:'cancelled',assetFileId:fileId,leaseExpiresAt:0}})})}catch(cleanupError){if(fileId&&cleanupError.message==='account_erasing')await require('./late-art').discardLateArt(api,op.artworkId,owner,fileId);return {status:'failed',code:'account_erasing'}}
  if(fileId)try{const removed=await api.deleteFile({fileList:[fileId]});if(removed.fileList?.[0]?.status===0)await attemptDoc.update({data:{assetFileId:''}})}catch(ignore){}
  return {status:'failed',code:e.message==='reservation_expired'?'generation_timeout':'generation_failed'};
 }
}
module.exports={artworkFlow};
