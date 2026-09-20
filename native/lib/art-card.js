// Explicit art selection only. Failure is never a successful original-image card.
async function createArtCard({api,card,onUpdate=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 let next=Object.assign({},card,{artStatus:'generating'});onUpdate(next);
 try{
  if(!api||!card.photoFileId)throw Error('photo_missing');
  const data={action:'submit',operationId:card.id,consent:true,confirmed:true,photoFileId:card.photoFileId,photoObservationId:card.photoObservationId,speciesId:card.speciesId};
  let result;
  try{result=(await api.callFunction({name:'createArtCard',data})).result}catch(e){result={status:'processing'}}
  for(let i=0;result?.status==='processing'&&i<12;i++){
   await wait(3000);result=(await api.callFunction({name:'createArtCard',data:{action:'status',operationId:card.id}})).result;
  }
  if(result?.status!=='ready'||!result.assetFileId)throw Error('art_failed');
  next=Object.assign({},next,{artStatus:'ready',artPhotoPath:result.assetFileId});onUpdate(next);return next;
 }catch(e){next=Object.assign({},next,{artStatus:'failed',artPhotoPath:'',artMessage:'艺术图未完成，请重试，或主动选择用原图制卡。'});onUpdate(next);return next}
}
module.exports={createArtCard};
