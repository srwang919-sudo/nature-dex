const {createHash}=require('crypto'),{assertActive}=require('./account-gate');
const hash=value=>createHash('sha256').update(value).digest('hex');
const SKU=Object.freeze({id:'nature-24-v1',cardCount:24,totalFen:5990,currency:'CNY',widthMm:63,heightMm:88,bleedMm:3,dpi:300});
async function read(doc){try{return (await doc.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST/.test(e.message||''))return null;throw e}}
const validId=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function publicResult(items,quoteHash){return {status:'ready',skuId:SKU.id,totalFen:SKU.totalFen,currency:SKU.currency,cardCount:24,quoteHash,paymentAvailable:false,productionStatus:'not_submitted',items:items.map(({cardId,position,speciesId,name,number,date,kind,originalDiscoverer,giftedFrom,locationLabel})=>({cardId,position,speciesId,name,number,date,kind,originalDiscoverer,giftedFrom,locationLabel}))}}
async function printOrder({db,owner,event,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 if(!owner)throw Error('unauthenticated');
 const draft=event.action==='print_draft',allowed=draft?['action','cardIds','quoteHash','idempotencyKey']:['action','cardIds'];
 if(!['print_quote','print_draft'].includes(event.action)||Object.keys(event).some(k=>!allowed.includes(k))||!Array.isArray(event.cardIds)||event.cardIds.length!==24||!event.cardIds.every(validId)||new Set(event.cardIds).size!==24||draft&&(!validId(event.quoteHash)||!/^[A-Za-z0-9_-]{16,100}$/.test(event.idempotencyKey||'')))throw Error('invalid_request');
 for(let attempt=0;;attempt++)try{const raw=await db.runTransaction(async tx=>{
  await assertActive(tx,owner,true);const items=[];
  for(const [position,id] of event.cardIds.entries()){
   const copyDoc=tx.collection('natureMemorialCopies').doc(id),copy=await read(copyDoc);
   let sourceOwner=owner,sourceId=id,kind='original_observation';
   if(copy){if(copy.recipient!==owner||copy.status==='removed'||copy.cardType!=='gifted_collection'||copy.printAuthorization?.version!=='gift-print-v1'||!Number.isFinite(copy.printAuthorization.grantedAt)||!validId(copy.sourceCardId)||!copy.sourceOwner)throw Error('card_unavailable');sourceOwner=copy.sourceOwner;sourceId=copy.sourceCardId;kind='gifted_collection';await assertActive(tx,sourceOwner,true);await copyDoc.set({data:{...copy,generation:(copy.generation||0)+1}})}
   const card=await read(tx.collection('natureCards').doc(sourceId)),obs=await read(tx.collection('natureObservations').doc(sourceId)),fenceDoc=tx.collection('trustedObservations').doc(sourceId),fence=await read(fenceDoc);
   if(!card||card.owner!==sourceOwner||card.status!=='saved'||card.cardType!=='original_observation'||sourceId!==hash(sourceOwner+'|'+card.observationId)||!obs||obs.owner!==sourceOwner||obs.status!=='saved'||obs.confirmed!==true||!fence||fence.owner!==sourceOwner||fence.status!=='verified'||await read(tx.collection('observationDeletions').doc(sourceId)))throw Error('card_unavailable');
   if(copy&&copy.species?.speciesId!==card.speciesId)throw Error('card_unavailable');
   const number=obs.receipt?.discovery?.number;if(obs.receipt?.discovery?.status!=='verified'||!Number.isSafeInteger(number)||number<1)throw Error('card_unavailable');
   const original=card.originalPhotoFileId;if(typeof original!=='string'||!original.startsWith('cloud://')||!original.endsWith('/observations/'+sourceOwner+'/'+card.observationId+'.jpg'))throw Error('print_asset_unavailable');
   const artDoc=tx.collection('speciesArtworks').doc(card.artwork?.id||'missing'),art=await read(artDoc);
   if(!art||art.speciesId!==card.speciesId||!(art.status==='approved'&&art.is_official===true||art.status==='candidate'&&art.owner===sourceOwner)||typeof art.assetFileId!=='string'||!art.assetFileId.startsWith('cloud://'))throw Error('print_asset_unavailable');
   const receipt=await read(tx.collection('recognitionReceipts').doc(sourceId)),candidate=receipt?.owner===sourceOwner?receipt.result?.candidates?.find(c=>c.speciesId===card.speciesId):null;
   if(!candidate||typeof candidate.name!=='string')throw Error('card_unavailable');
   await fenceDoc.set({data:{...fence,generation:(fence.generation||0)+1}});await artDoc.set({data:{...art,generation:(art.generation||0)+1}});
   const profileDoc=tx.collection('natureSocialProfiles').doc(hash(sourceOwner)),profile=await read(profileDoc);
   if(profile)await profileDoc.set({data:{...profile,generation:(profile.generation||0)+1}});
   const signature=profile?.enabled===true&&typeof profile.nickname==='string'?profile.nickname.slice(0,24):'';
   items.push({cardId:id,sourceCardId:sourceId,kind,position,speciesId:card.speciesId,name:candidate.name.slice(0,80),number,date:Number(card.createdAt)||0,originalDiscoverer:signature||'匿名发现者',giftedFrom:copy?signature||'匿名赠予者':'',artworkId:card.artwork.id,frontAsset:art.assetFileId,backAsset:original,observationId:card.observationId,locationLabel:'地点未公开'});
  }
  const quoteHash=hash(JSON.stringify({sku:SKU,items})),result=publicResult(items,quoteHash);if(!draft)return result;
  if(event.quoteHash!==quoteHash)throw Error('quote_changed');
  const draftId=hash(owner+'|print|'+event.idempotencyKey),doc=tx.collection('printOrderDrafts').doc(draftId),old=await read(doc);
  if(old){if(old.owner!==owner||old.status!=='draft')throw Error('draft_closed');if(old.quoteHash!==quoteHash)throw Error('idempotency_conflict');return {...result,draftId,draftStatus:'draft',createdAt:old.createdAt}}
  const quotaDoc=tx.collection('usageQuotas').doc(hash(owner+'|print-draft|'+Math.floor(now()/86400000))),quota=await read(quotaDoc);if((quota?.count||0)>=10)throw Error('print_draft_limit');
  await quotaDoc.set({data:{owner,count:(quota?.count||0)+1,purpose:'print_draft',updatedAt:now()}});
  await doc.set({data:{owner,status:'draft',paymentStatus:'not_configured',productionStatus:'not_submitted',sku:SKU,quoteHash,items,snapshotVersion:1,createdAt:now()}});
  return {...result,draftId,draftStatus:'draft',createdAt:now()};
 });return raw?.result||raw}catch(e){if(attempt>=3||![e.code,e.errCode,e.message].includes('DATABASE_TRANSACTION_CONFLICT'))throw e;await wait(20*(attempt+1))}
}
module.exports={printOrder,SKU};
