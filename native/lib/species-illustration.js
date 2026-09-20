const localPaths=Object.freeze({kingfisher:'assets/illustrations/kingfisher.png',egret:'assets/illustrations/egret.png',ibis:'assets/illustrations/ibis.png',pheasant:'assets/illustrations/pheasant.png',sparrow:'assets/illustrations/sparrow.png',moth:'assets/illustrations/moth.png',camellia:'assets/illustrations/camellia.png'});
function assetUrlFor(cloudPath){
  try{
    const urls=wx.getStorageSync('nature.assets.urls')||{};
    if(urls[cloudPath])return urls[cloudPath];
    const map=wx.getStorageSync('nature.assets.fileIds')||{};
    if(map[cloudPath])return map[cloudPath];
  }catch(e){}
  return '';
}
// Curated shared landscape illustration, never a user's photograph or old private AI result.
function illustrationFor(speciesId){return localIllustrationFor(speciesId);}
function localIllustrationFor(speciesId){return '/assets/illustrations/home-ink-hero.jpg';}
module.exports={illustrationFor,localIllustrationFor,paths:localPaths,assetUrlFor};
