const {createHash}=require('crypto'),{trustedSpecies}=require('./species');
const key=x=>createHash('sha256').update(x).digest('hex');
async function read(doc){try{return (await doc.get()).data}catch(e){if(!/collection/i.test(e.message||'')&&/DATABASE_DOCUMENT_NOT_EXIST|not found|not exist/i.test(e.message||''))return null;throw e}}
async function officialArtwork(tx,speciesId){
 const canonical=trustedSpecies(speciesId).id,index=await read(tx.collection('officialSpeciesArtworks').doc(key(canonical)));
 if(!index?.artworkId)return null;
 const row=await read(tx.collection('speciesArtworks').doc(index.artworkId));
 return row?.speciesId===canonical&&row.status==='approved'&&row.is_official===true&&typeof row.assetFileId==='string'&&row.assetFileId.startsWith('cloud://')?{...row,id:index.artworkId}:null;
}
async function reviewArtwork(tx,{reviewer,artworkId,decision,now=Date.now()}){
 if(!reviewer||typeof artworkId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(artworkId)||!['approve','reject','deprecate'].includes(decision))throw Error('invalid_request');
 const staffDoc=tx.collection('artworkReviewers').doc(key(reviewer)),staff=await read(staffDoc);if(staff?.active!==true)throw Error('review_forbidden');
 await staffDoc.set({data:{...staff,generation:(staff.generation||0)+1}});
 const doc=tx.collection('speciesArtworks').doc(artworkId),row=await read(doc);
 if(!row||!row.speciesId||!row.styleVersion||row.source!=='platform_generated'||typeof row.assetFileId!=='string'||!row.assetFileId.startsWith('cloud://'))throw Error('artwork_invalid');
 const canonical=trustedSpecies(row.speciesId).id,indexDoc=tx.collection('officialSpeciesArtworks').doc(key(canonical)),index=await read(indexDoc);
 const revision=(row.reviewRevision||0)+1,status={approve:'approved',reject:'rejected',deprecate:'deprecated'}[decision];
 if(decision==='approve'&&index?.artworkId&&index.artworkId!==artworkId){const oldDoc=tx.collection('speciesArtworks').doc(index.artworkId),old=await read(oldDoc);if(old)await oldDoc.set({data:{...old,is_official:false,is_default:false}})}
 await doc.set({data:{...row,status,is_official:decision==='approve',is_default:decision==='approve',reviewRevision:revision,reviewedAt:now}});
 if(decision==='approve'||index?.artworkId===artworkId)await indexDoc.set({data:{speciesId:canonical,artworkId:decision==='approve'?artworkId:'',updatedAt:now}});
 await tx.collection('artworkReviewEvents').doc(artworkId+'_'+revision).set({data:{artworkId,reviewerKey:key(reviewer),decision,revision,createdAt:now}});
 return {status,artworkId};
}
module.exports={officialArtwork,reviewArtwork};
