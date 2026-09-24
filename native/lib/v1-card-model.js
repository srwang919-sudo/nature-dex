// Read projection only. Global numbers and approval are server-owned facts.
function projectV1Card(card={}){
 const gift=card.cardType==='gifted_collection'||card.kind==='memorial_copy'||card.sourceType==='friend_copy';
 const countsAsDiscovery=!gift&&!card.sample&&!card.isExample&&!card.example&&card.kind!=='example'&&card.isObservation!==false&&card.countsAsDiscovery!==false&&card.countsForAchievements!==false;
 const artwork=card.artwork||{},discovery=card.discovery||{};
 const official=artwork.status==='approved'&&artwork.isOfficial===true;
 const hasArt=card.artPhotoPath||card.artAssetFileId||(card.artAsset&&(card.artAsset.localPath||card.artAsset.fileId));
 const artworkState=official?'official':artwork.status==='candidate'?'candidate':hasArt?'legacy_private':'missing';
 const number=discovery.number;
 return {cardType:gift?'gifted_collection':'original_observation',artworkState,countsAsDiscovery,
  discoveryNumber:!!card.serverCardId&&countsAsDiscovery&&discovery.status==='verified'&&Number.isSafeInteger(number)&&number>0?number:null};
}
module.exports={projectV1Card};
