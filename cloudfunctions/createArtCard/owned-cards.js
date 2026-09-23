const {createHash,createHmac,timingSafeEqual}=require('crypto'),{assertActive}=require('./account-gate');
const hash=x=>createHash('sha256').update(x).digest('hex');
const {assertRecoveryConsent}=require('./recovery-consent');
// Cursor integrity is owner-bound; authorization always comes from OPENID plus
// the owner query below, never from possession of this opaque pagination token.
const signature=(owner,id)=>createHmac('sha256',owner).update('owned-card-page-v1|'+id).digest('hex');
const encodeCursor=(owner,id)=>Buffer.from(id+'.'+signature(owner,id)).toString('base64url');
function decodeCursor(owner,value){if(!value)return '';if(typeof value!=='string'||value.length>200)throw Error('invalid_request');const [id,sig]=Buffer.from(value,'base64url').toString().split('.');if(!/^[a-f0-9]{64}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(sig||'')||!timingSafeEqual(Buffer.from(sig),Buffer.from(signature(owner,id))))throw Error('invalid_request');return id}
async function read(d){try{return (await d.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST/.test(e.message||''))return null;throw e}}
async function ownedCards(api,event){
 const owner=api.getWXContext().OPENID,db=api.database();if(!owner)throw Error('unauthenticated');await assertActive(db,owner);await assertRecoveryConsent(db,owner);
 const resource=event.action==='card_resource';
 if(Object.keys(event).some(k=>!(resource?['action','cardId','side']:['action','cursor']).includes(k))||resource&&(!/^[a-f0-9]{64}$/.test(event.cardId||'')||!['original','art'].includes(event.side)))throw Error('invalid_request');
 const cursor=resource?'':decodeCursor(owner,event.cursor);
 async function checked(id){return db.runTransaction(async tx=>{await assertActive(tx,owner,true);await assertRecoveryConsent(tx,owner,true);const card=await read(tx.collection('natureCards').doc(id));if(!card||card.owner!==owner||card.status!=='saved'||id!==hash(owner+'|'+card.observationId))return null;const obs=await read(tx.collection('natureObservations').doc(id));if(!obs||obs.owner!==owner||obs.status!=='saved'||await read(tx.collection('observationDeletions').doc(id)))return null;
  const fence=tx.collection('trustedObservations').doc(id),old=await read(fence);await fence.set({data:{...old,owner,observationId:card.observationId,generation:(old?.generation||0)+1,status:old?.status||'verified'}});
  const receipt=await read(tx.collection('recognitionReceipts').doc(id)),candidate=receipt?.owner===owner?receipt.result?.candidates?.find(c=>c.speciesId===card.speciesId):null;
  if(!candidate||obs.receipt?.discovery?.status!=='verified')return null;
  return {id,observationId:card.observationId,speciesId:card.speciesId,name:candidate.name,category:candidate.category||'other',sourceScience:candidate.sourceScience||null,artwork:card.artwork,originalPhotoFileId:card.originalPhotoFileId,createdAt:card.createdAt,discovery:obs.receipt.discovery,isFirstDiscovery:obs.receipt.isFirstDiscovery===true};
 })}
 if(resource){const raw=await checked(event.cardId),card=raw?.result||raw;if(!card)throw Error('card_unavailable');let fileID=card.originalPhotoFileId;
  if(event.side==='art'){const art=await read(db.collection('speciesArtworks').doc(card.artwork?.id));if(!art||!(art.status==='approved'&&art.is_official===true||art.status==='candidate'&&art.owner===owner))throw Error('card_resource_unavailable');fileID=art.assetFileId}
  else if(typeof fileID!=='string'||!fileID.startsWith('cloud://')||!fileID.endsWith('/observations/'+owner+'/'+card.observationId+'.jpg'))throw Error('card_resource_unavailable');
  const urls=await api.getTempFileURL({fileList:[{fileID,maxAge:600}]}),url=urls.fileList?.[0]?.tempFileURL;if(!url?.startsWith('https://'))throw Error('card_resource_unavailable');const fresh=await checked(event.cardId);if(!(fresh?.result||fresh))throw Error('card_unavailable');return {status:'ready',url,expiresAt:Date.now()+600000};
 }
 const query={owner,status:'saved'};if(cursor)query._id=db.command.gt(cursor);
 const rows=(await db.collection('natureCards').where(query).orderBy('_id','asc').limit(20).get()).data||[],cards=[];
 for(const row of rows){const raw=await checked(row._id),card=raw?.result||raw;if(card)cards.push(card)}await assertActive(db,owner);await assertRecoveryConsent(db,owner);
 return {status:'ready',cards,nextCursor:rows.length===20?encodeCursor(owner,rows[rows.length-1]._id):''};
}
module.exports={ownedCards};
