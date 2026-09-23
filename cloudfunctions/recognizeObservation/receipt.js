const {createHash}=require('crypto');
const receiptId=(owner,observationId)=>createHash('sha256').update(owner+'|'+observationId).digest('hex');
async function read(doc){try{return (await doc.get()).data}catch(e){const m=e.message||e.errMsg||'';if(!/collection/i.test(m)&&/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(m))return null;throw e}}
async function claimReceipt(db,input,charge,now=Date.now()){
 const key=receiptId(input.owner,input.observationId);
 return db.runTransaction(async tx=>{
  const tombstone=await read(tx.collection('observationDeletions').doc(key));
  if(tombstone&&['deleting','deleted'].includes(tombstone.status))throw Error('cancelled');
  const doc=tx.collection('recognitionReceipts').doc(key),old=await read(doc);
  if(old){
   if(old.owner!==input.owner||old.photoFileId!==input.photoFileId)throw Error('receipt_conflict');
   return {claimed:false,result:old.result||(old.leaseExpiresAt>now?{status:'processing',code:'recognition_pending',candidates:[],contractVersion:2}:{status:'failed',code:'recognition_expired',candidates:[],contractVersion:2})};
  }
  await charge(tx);
  await doc.set({data:{owner:input.owner,observationId:input.observationId,photoFileId:input.photoFileId,status:'processing',createdAt:now,leaseExpiresAt:now+90000,expiresAt:now+86400000}});
  return {claimed:true};
 });
}
async function completeReceipt(db,input,result){
 return db.runTransaction(async tx=>{
  const key=receiptId(input.owner,input.observationId),tombstone=await read(tx.collection('observationDeletions').doc(key));
  if(tombstone&&['deleting','deleted'].includes(tombstone.status))return {status:'failed',code:'cancelled',candidates:[],contractVersion:2};
  const doc=tx.collection('recognitionReceipts').doc(key),old=await read(doc);
  if(!old||old.owner!==input.owner||old.photoFileId!==input.photoFileId)throw Error('receipt_conflict');
  if(old.result)return old.result;
  await doc.update({data:{status:'complete',result,completedAt:Date.now(),leaseExpiresAt:0}});return result;
 });
}
module.exports={claimReceipt,completeReceipt,receiptId};
