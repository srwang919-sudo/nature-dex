const {createHash}=require('crypto');
const {assertActive}=require('./account-gate');
const {confirmedCandidate,attestation}=require('./observation');
const hash=x=>createHash('sha256').update(x).digest('hex');
async function read(doc){try{return (await doc.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/DATABASE_DOCUMENT_NOT_EXIST|not found|not exist/i.test(e.message||''))return null;throw e}}
async function finalizeObservation({db,owner,operationId,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 if(!owner||typeof operationId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(operationId))throw Error('invalid_request');
 for(let attempt=0;;attempt++)try{
  const outcome=await db.runTransaction(async tx=>{
   await assertActive(tx,owner,true);
   const operationKey=hash(owner+'|'+operationId),operation=tx.collection('artOperations').doc(operationKey),op=await read(operation);
   if(!op||op.owner!==owner||op.status!=='ready'||typeof op.photoFileId!=='string'||typeof op.assetFileId!=='string'||!op.assetFileId.startsWith('cloud://')||!op.assetFileId.endsWith('/private-art/'+owner+'/'+operationKey+'.jpg'))throw Error('art_not_ready');
   const prefix='/observations/'+owner+'/',offset=op.photoFileId.lastIndexOf(prefix),observationId=offset<0?'':op.photoFileId.slice(offset+prefix.length,-4);
   if(!op.photoFileId.startsWith('cloud://')||!op.photoFileId.endsWith('.jpg')||!/^[a-zA-Z0-9_-]{1,100}$/.test(observationId))throw Error('asset_invalid');
   const key=hash(owner+'|'+observationId),event={photoObservationId:observationId,photoFileId:op.photoFileId,speciesId:op.speciesId};
   if(await read(tx.collection('observationDeletions').doc(key)))throw Error('cancelled');
   const candidate=await confirmedCandidate(tx,owner,event),obsDoc=tx.collection('natureObservations').doc(key),old=await read(obsDoc);
   // Also write the attestation shared with deletion, not just read its marker.
   await tx.collection('trustedObservations').doc(key).set({data:attestation(owner,event,candidate)});
   await operation.update({data:{generation:(op.generation||0)+1}});
   if(old){if(old.status!=='saved'||old.operationId!==operationId)throw Error('observation_conflict');return old.receipt}
   const speciesId=candidate.speciesId,speciesKey=hash(speciesId),discoveryKey=hash(owner+'|'+speciesId),speciesDoc=tx.collection('natureSpecies').doc(speciesKey),discoveryDoc=tx.collection('userSpeciesDiscoveries').doc(discoveryKey);
   const discovery=await read(discoveryDoc),species=await read(speciesDoc);let number=discovery?.number;
   // A zero baseline is an operator-reviewed migration fact, never inferred from
   // an absent counter: historical observations may predate this service.
   if(!species||species.counterStatus!=='initialized'||typeof species.baselineVersion!=='string'||!species.baselineVersion||!Number.isSafeInteger(species.lastDiscoveryNumber)||species.lastDiscoveryNumber<0)throw Error('discovery_baseline_unavailable');
   if(discovery&&(discovery.owner!==owner||discovery.speciesId!==speciesId||!species||!Number.isSafeInteger(species.lastDiscoveryNumber)||species.lastDiscoveryNumber<number))throw Error('counter_invalid');
   if(!discovery){const previous=species.lastDiscoveryNumber;if(previous>=Number.MAX_SAFE_INTEGER)throw Error('counter_invalid');number=previous+1;
    await speciesDoc.set({data:{...(species||{}),speciesId,name:candidate.name,lastDiscoveryNumber:number,updatedAt:now()}});
   }
   if(!Number.isSafeInteger(number)||number<1)throw Error('counter_invalid');
   await discoveryDoc.set({data:{owner,speciesId,number,status:'verified',firstObservedAt:discovery?.firstObservedAt||now(),activeObservationCount:(discovery?.activeObservationCount||0)+1,updatedAt:now()}});
   const receipt={status:'saved',observationId,cardId:key,discovery:{status:'verified',number},isFirstDiscovery:!discovery};
   await obsDoc.set({data:{owner,observationId,speciesId,operationId,status:'saved',originalPhotoFileId:op.photoFileId,confirmed:true,recognitionReceiptId:key,confidence:candidate.confidence,savedAt:now(),receipt}});
   await tx.collection('natureCards').doc(key).set({data:{owner,observationId,speciesId,status:'saved',cardType:'original_observation',artwork:{status:'candidate',isOfficial:false,fileId:op.assetFileId},originalPhotoFileId:op.photoFileId,discoveryKey,createdAt:now()}});
   return receipt;
  });return outcome?.result||outcome;
 }catch(e){if(attempt>=3||![e.code,e.errCode,e.message].includes('DATABASE_TRANSACTION_CONFLICT'))throw e;await wait(20*(attempt+1))}
}
module.exports={finalizeObservation};
