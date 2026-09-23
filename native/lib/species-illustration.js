const localPaths=Object.freeze({});
function assetUrlFor(cloudPath){
  try{
    const urls=wx.getStorageSync('nature.assets.urls')||{};
    if(urls[cloudPath])return urls[cloudPath];
    const map=wx.getStorageSync('nature.assets.fileIds')||{};
    if(map[cloudPath])return map[cloudPath];
  }catch(e){}
  return '';
}
function illustrationFor(speciesId){return localIllustrationFor(speciesId);}
function localIllustrationFor(speciesId){return '/assets/theme/share-safe-leaf.png';}
module.exports={illustrationFor,localIllustrationFor,paths:localPaths,assetUrlFor};
