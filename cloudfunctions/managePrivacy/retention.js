const {createHash,timingSafeEqual}=require('crypto');
const sha=x=>createHash('sha256').update(x).digest();
async function sweepExpired(event,{db,token,deleteObservation,now=Date.now}){
 if(!token||typeof event.token!=='string'||!timingSafeEqual(sha(token),sha(event.token)))return {status:'failed',code:'operator_required'};
 if(Object.keys(event).some(k=>!['action','token'].includes(k)))return {status:'failed',code:'invalid_request'};
 let cleaned=0,retained=0,failed=0;
 try{
  const rows=(await db.collection('assets').where({purpose:'recognition',expiresAt:db.command.lt(now()),retentionExempt:db.command.neq(true)}).limit(20).get()).data||[];
  for(const row of rows){
   if(!row._openid||!row.observationId||!Number.isSafeInteger(row.createdAt)||!Number.isSafeInteger(row.expiresAt)||row.expiresAt<=row.createdAt){failed++;continue}
   const candidates=(await db.collection('artOperations').where({owner:row._openid,photoFileId:row.fileId}).limit(100).get()).data||[];
   const decision=await db.runTransaction(async tx=>{
    const operations=[];
    for(const candidate of candidates){const current=(await tx.collection('artOperations').doc(candidate._id).get()).data;if(current)operations.push({...current,_id:candidate._id})}
    if(operations.length===100||operations.some(op=>op.status==='processing'&&op.leaseExpiresAt>now()))return 'wait';
    if(operations.some(op=>op.status==='ready'))return 'retain';
    const id=createHash('sha256').update(row._openid+'|'+row.observationId).digest('hex');
    const receipt=tx.collection('recognitionReceipts').doc(id);let old;
    try{old=(await receipt.get()).data}catch(e){if(/collection/i.test(e.message||'')||!/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||''))throw e}
    await receipt.set({data:{owner:row._openid,observationId:row.observationId,status:'cancelled',generation:(old?.generation||0)+1}});
    for(const op of operations)await tx.collection('artOperations').doc(op._id).update({data:{status:'cancelled',cancelledAt:now()}});
    await tx.collection('observationDeletions').doc(id).set({data:{owner:row._openid,observationId:row.observationId,status:'deleting',reason:'expired_unfinished',createdAt:now()}});
    return 'delete';
   });
   if(decision==='wait'){failed++;continue}
   if(decision==='retain'){await db.collection('assets').doc(row._id).update({data:{retentionExempt:true}});retained++;continue}
   const result=await deleteObservation(row._openid,row.observationId);
   if(result.status==='deleted')cleaned++;else failed++;
  }
  return {status:failed?'partial':'ready',cleaned,retained,failed};
 }catch(e){return {status:'failed',code:'retention_unavailable',cleaned,retained,failed}}
}
module.exports={sweepExpired};
