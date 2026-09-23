const {createHash}=require('crypto');
const hash=s=>createHash('sha256').update(s).digest('hex');
async function read(doc){try{return (await doc.get()).data}catch(e){const m=e.message||e.errMsg||'';if(!/collection/i.test(m)&&/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(m))return null;throw e}}
// wx-server-sdk's underlying pinned CloudBase SDK documents getUploadMetadata.
// Only its server-derived fileId is retained; upload tokens/URLs never leave here.
async function serverMetadata({cloudPath}){const tcb=require('@cloudbase/node-sdk');return tcb.init({env:tcb.SYMBOL_CURRENT_ENV}).getUploadMetadata({cloudPath})}
async function prepareUpload(db,{owner,observationId,cloudPath},metadata=serverMetadata,charge){
 const response=await metadata({cloudPath}),fileId=response?.data?.fileId;
 if(typeof fileId!=='string'||!fileId.startsWith('cloud://')||!fileId.endsWith('/'+cloudPath))throw Error('metadata_invalid');
 await db.runTransaction(async tx=>{
  if(await read(tx.collection('observationDeletions').doc(hash(owner+'|'+observationId))))throw Error('cancelled');
  const doc=tx.collection('assets').doc(hash(owner+'\n'+fileId)),old=await read(doc);
  if(old){if(old._openid!==owner||old.observationId!==observationId||old.fileId!==fileId)throw Error('metadata_invalid');return}
  await charge(tx);
  await doc.set({data:{_openid:owner,observationId,cloudPath,fileId,purpose:'recognition',uploadPending:true,createdAt:Date.now(),expiresAt:Date.now()+86400000}});
 });
 return {status:'ready',cloudPath,contractVersion:2};
}
module.exports={prepareUpload,serverMetadata};
