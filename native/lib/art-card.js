// Explicit art selection only. Failure is never a successful original-image card.
const {pollGeneration}=require('./generation-poll');
async function createArtCard({api,card,onUpdate=()=>{},isCurrent=()=>true,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 let next=Object.assign({},card,{artStatus:'generating'});onUpdate(next);
 try{
  if(!api||!card.photoFileId)throw Error('photo_missing');
  const data={action:'submit',operationId:card.id,consent:true,confirmed:true,photoFileId:card.photoFileId,photoObservationId:card.photoObservationId,speciesId:card.speciesId};
  const result=await pollGeneration({api,name:'createArtCard',submit:data,status:{action:'status',operationId:card.id},wait,isCurrent});
  if(!isCurrent()||result.status==='cancelled')return Object.assign({},next,{artStatus:'cancelled'});
  if(result.status!=='ready'){next=Object.assign({},next,{artStatus:result.status==='processing'?'processing':'failed',artPhotoPath:'',artCode:result.code,artMessage:result.status==='processing'?'艺术图仍在生成，请稍后重试查看同一任务；未保存卡片。':result.code==='not_found'?'未找到艺术生成任务，请重试；未保存卡片。':'艺术图生成失败，请重试；未保存卡片。'});onUpdate(next);return next}
  if(result?.status!=='ready'||!result.assetFileId||result.assetFileId===card.photoFileId)throw Error('art_failed');
  next=Object.assign({},next,{artStatus:'ready',artPhotoPath:result.assetFileId});onUpdate(next);return next;
 }catch(e){next=Object.assign({},next,{artStatus:'failed',artPhotoPath:'',artMessage:'艺术图未完成，请重试；未保存卡片。'});if(isCurrent())onUpdate(next);return next}
}
module.exports={createArtCard};
