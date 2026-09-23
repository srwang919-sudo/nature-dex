const {createHash}=require('crypto'),{trustedSpecies}=require('./species');
const observationKey=(owner,id)=>createHash('sha256').update(owner+'|'+id).digest('hex');
async function confirmedCandidate(db,owner,event){
 let receipt;try{receipt=(await db.collection('recognitionReceipts').doc(observationKey(owner,event.photoObservationId)).get()).data}catch(e){throw Error('candidate_unverified')}
 if(!receipt||receipt.owner!==owner||receipt.observationId!==event.photoObservationId||receipt.photoFileId!==event.photoFileId||receipt.status!=='complete')throw Error('candidate_unverified');
 const canonical=trustedSpecies(event.speciesId).id;
 const candidate=(receipt.result?.candidates||[]).find(c=>{try{return trustedSpecies(c.speciesId).id===canonical&&Number.isFinite(c.confidence)&&c.confidence>=0&&c.confidence<=1}catch(e){return false}});
 if(!candidate||typeof candidate.name!=='string'||!candidate.name.trim()||candidate.name.length>80||/[\u0000-\u001f\u007f<>]/.test(candidate.name))throw Error('candidate_unverified');
 return {...candidate,speciesId:canonical};
}
function attestation(owner,event,candidate){return {owner,observationId:event.photoObservationId,status:'verified',speciesId:candidate.speciesId,canonicalSpeciesId:candidate.speciesId,speciesName:candidate.name.trim(),scientificName:'',category:['plant','animal','bird','insect','other'].includes(candidate.category)?candidate.category:'other',rarity:'',confirmed:true,verifiedAt:Date.now(),sourceFunction:'createArtCard',attestationVersion:1}}
module.exports={confirmedCandidate,attestation,observationKey};
