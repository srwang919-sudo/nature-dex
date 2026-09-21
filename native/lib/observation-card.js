// Read adapter only: never promotes legacy cards or persists migrations.
function asset(value,localPath,fileId){return {localPath:value&&typeof value.localPath==='string'?value.localPath:localPath||'',fileId:value&&typeof value.fileId==='string'?value.fileId:fileId||''}}
function normalizeCard(card={}){
 const id=card.canonicalSpeciesId||card.speciesId||'';
 return Object.assign({},card,{canonicalSpeciesId:id,speciesId:id,
  originalPhotoAsset:asset(card.originalPhotoAsset,card.photoPath,card.photoFileId),
  artAsset:asset(card.artAsset,card.artPhotoPath,card.artAssetFileId)});
}
function buildScience(species={}){
 const fields={};
 for(const key of ['family','habitat','season','iucn','protection'])if(typeof species[key]==='string'&&species[key].trim())fields[key]=species[key];
 const knowledge=species.knowledge||species.know;
 if(typeof knowledge==='string'&&knowledge.trim())fields.knowledge=knowledge;
 if(Array.isArray(species.facts)){
  const facts=species.facts.filter(f=>f&&typeof f.title==='string'&&typeof f.detail==='string'&&(f.title.trim()||f.detail.trim())).map(f=>({title:f.title,detail:f.detail}));
  if(facts.length)fields.facts=facts;
 }
 const available=Object.keys(fields).length>0;
 return {status:available?'available':'missing',source:available?'project-species-data':'',version:'local-species-v1',fields};
}
module.exports={normalizeCard,buildScience};
