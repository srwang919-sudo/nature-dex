const {createHash}=require('crypto');
const key=x=>createHash('sha256').update(x).digest('hex');
const {cachedCostConfig}=require('./cost-config');
const hunyuanCost=()=>cachedCostConfig().hunyuan;
const read=async doc=>{try{return (await doc.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/DATABASE_DOCUMENT_NOT_EXIST|not found|not exist/i.test(e.message||''))return null;throw e}};
const checked=n=>{if(!Number.isSafeInteger(n)||n<0)throw Error('wallet_invalid');return n};
async function settleCreation(tx,{owner,operationId,attempt,outcome,now=Date.now()}){
 if(!['commit','release'].includes(outcome))throw Error('invalid_outcome');
 const id=key(owner+'|'+operationId),doc=tx.collection('creationReservations').doc(id),row=await read(doc);
 if(!row||row.owner!==owner||row.attempt!==attempt)throw Error('reservation_stale');
 if(row.status===(outcome==='commit'?'committed':'released'))return row;
 if(row.status!=='reserved')throw Error('reservation_stale');
 if(outcome==='commit'&&row.expiresAt<=now)throw Error('reservation_expired');
 const bucket=tx.collection(row.source==='bonus'?'creationBonuses':'creationMonths').doc(row.bucketId),value=await read(bucket);
 if(!value||value.owner!==owner||checked(value.reserved)<1)throw Error('wallet_invalid');
 await bucket.set({data:{...value,reserved:value.reserved-1,used:checked(value.used)+(outcome==='commit'?1:0)}});
 const next={...row,status:outcome==='commit'?'committed':'released',settledAt:now};await doc.set({data:next});
 await tx.collection('aiUsageEvents').doc(id+'_'+attempt).set({data:{owner,operationId,attempt,status:next.status,units:outcome==='commit'?1:0,provider:'hunyuan',model:'HY-Image-3.0-Plus-4090-Tob-v1.0',cost:outcome==='commit'?hunyuanCost():0,createdAt:row.createdAt,settledAt:now}});
 return next;
}
async function reserveCreation(tx,{owner,operationId,now=Date.now()}){
 if(!owner||typeof operationId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(operationId))throw Error('invalid_request');
 const id=key(owner+'|'+operationId),doc=tx.collection('creationReservations').doc(id);let old=await read(doc);
 if(old&&old.owner!==owner)throw Error('reservation_stale');
 if(old?.status==='committed'||old?.status==='reserved'&&old.expiresAt>now)return old;
 if(old?.status==='reserved'){await settleCreation(tx,{owner,operationId,attempt:old.attempt,outcome:'release',now});old={...old,status:'released'}}
 const bonusId=key(owner),bonusDoc=tx.collection('creationBonuses').doc(bonusId),bonus=await read(bonusDoc)||{owner,used:0,reserved:0};
 let source='bonus',bucketId=bonusId,bucket=bonusDoc,value=bonus;
 if(checked(bonus.used)+checked(bonus.reserved)>=10){
  source='monthly';const month=new Date(now).toISOString().slice(0,7);bucketId=key(owner+'|'+month);bucket=tx.collection('creationMonths').doc(bucketId);value=await read(bucket)||{owner,month,used:0,reserved:0};
  const membership=await read(tx.collection('membershipEntitlements').doc(owner));
  const limit=membership?.owner===owner&&membership.status==='ACTIVE'&&membership.expiresAt>now?30:5;
  if(checked(value.used)+checked(value.reserved)>=limit)throw Error('creation_quota_exhausted');
 }
 if(value.owner!==owner)throw Error('wallet_invalid');
 await bucket.set({data:{...value,reserved:checked(value.reserved)+1}});
 const row={owner,operationId,attempt:(old?.attempt||0)+1,status:'reserved',source,bucketId,createdAt:now,expiresAt:now+180000};await doc.set({data:row});
 await tx.collection('aiUsageEvents').doc(id+'_'+row.attempt).set({data:{owner,operationId,attempt:row.attempt,status:'reserved',units:0,provider:'hunyuan',model:'HY-Image-3.0-Plus-4090-Tob-v1.0',cost:0,createdAt:now}});
 return row;
}
module.exports={reserveCreation,settleCreation};
