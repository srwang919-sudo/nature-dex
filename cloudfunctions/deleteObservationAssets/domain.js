const {createHash}=require('crypto');
async function revokeDomain(db,owner,observationId){
 const hash=x=>createHash('sha256').update(x).digest('hex'),key=hash(owner+'|'+observationId);
 const read=async doc=>{try{return (await doc.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/DATABASE_DOCUMENT_NOT_EXIST|not exist|not found/i.test(e.message||''))return null;throw e}};
 await db.runTransaction(async tx=>{
  const observation=tx.collection('natureObservations').doc(key),row=await read(observation);
  if(!row||row.status==='deleted')return;
  if(row.owner!==owner)throw Error('forbidden');
  const discovery=tx.collection('userSpeciesDiscoveries').doc(hash(owner+'|'+row.speciesId)),value=await read(discovery);
  if(value){if(value.owner!==owner)throw Error('forbidden');await discovery.update({data:{activeObservationCount:Math.max(0,(value.activeObservationCount||0)-1)}})}
  // Keep only the idempotent deletion marker; private image references are removed.
  await observation.set({data:{owner,observationId,status:'deleted'}});
  await tx.collection('natureCards').doc(key).set({data:{owner,observationId,status:'deleted'}});
 });
}
module.exports={revokeDomain};
