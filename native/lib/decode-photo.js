const {decodeAsset}=require('./asset-decode');
function decodePhoto(canvas,src,isCurrent,timeoutMs){return decodeAsset(canvas,src,isCurrent,timeoutMs).then(result=>result.image)}
module.exports={decodePhoto,decodeAsset};
