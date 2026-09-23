// Persist file IDs, resolve local readable files at use time. Never substitute
// an original photo for an unavailable generated artwork.
function frontSource(card){return card.artPhotoPath||(card.frontMode==='art'?'':card.photoPath||card.photoFileId||card.image||'')}
async function readableImage(api,src){
 const error=code=>Object.assign(Error(code),{code});
 if(!src)throw error('image_missing');
 if(src.startsWith('cloud://')){try{const result=await api.cloud.downloadFile({fileID:src});src=result.tempFilePath;if(!src)throw Error('missing')}catch(e){throw error('cloud_download')}}
 return new Promise((resolve,reject)=>{try{api.getImageInfo({src,success:info=>resolve(Object.assign({},info,{path:info.path||src})),fail:()=>reject(error('getImageInfo'))})}catch(e){reject(error('getImageInfo'))}});
}
async function readableFront(api,card){
 if(card.serverCardId)return readableOwnedSide(api,card,'art',frontSource(card));
 if(card.artworkId){const response=await api.cloud.callFunction({name:'speciesIllustration',data:{action:'resource',artworkId:card.artworkId}});if(response.result?.status!=='ready'||!response.result.url)throw Object.assign(Error('cloud_download'),{code:'cloud_download'});return readableImage(api,response.result.url)}
 const src=frontSource(card);
 try{return await readableImage(api,src)}catch(error){
  if(!card.artPhotoPath&&card.frontMode!=='art'&&card.photoFileId&&card.photoFileId!==src)return readableImage(api,card.photoFileId);
  throw error;
 }
}
async function readableOwnedSide(api,card,side,local){
 if(local&&!/^(cloud:\/\/|https?:\/\/)/.test(local)){try{return await readableImage(api,local)}catch(e){}}
 if(!require('./recovery-consent').allowed(api))throw Object.assign(Error('sync_consent_required'),{code:'sync_consent_required'});
 const response=await api.cloud.callFunction({name:'createArtCard',data:{action:'card_resource',cardId:card.serverCardId,side}});
 if(!require('./recovery-consent').allowed(api)||response.result?.status!=='ready'||!response.result.url)throw Object.assign(Error('cloud_download'),{code:'cloud_download'});
 return readableImage(api,response.result.url);
}
async function readableOriginal(api,card){const a=card.originalPhotoAsset||{},local=a.localPath||card.photoPath;if(card.serverCardId)return readableOwnedSide(api,card,'original',local);try{return await readableImage(api,local||a.fileId)}catch(e){if(!a.fileId||a.fileId===local)throw e;return readableImage(api,a.fileId)}}
module.exports={frontSource,readableImage,readableFront,readableOriginal};
