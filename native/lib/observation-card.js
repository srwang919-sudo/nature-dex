// Read adapter only: never promotes legacy cards or persists migrations.
const {projectV1Card}=require('./v1-card-model');
function asset(value,localPath,fileId){return {localPath:value&&typeof value.localPath==='string'?value.localPath:localPath||'',fileId:value&&typeof value.fileId==='string'?value.fileId:fileId||''}}
function normalizeCard(card={}){
 const id=card.canonicalSpeciesId||card.speciesId||'';
 return Object.assign({},card,projectV1Card(card),{canonicalSpeciesId:id,speciesId:id,
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
function scienceForConfirmedCandidate(candidate,confirmedSpeciesId,localScience){
 if(!candidate||candidate.speciesId!==confirmedSpeciesId)throw Error('science_identity_mismatch');
 const raw=candidate.sourceScience,base=localScience||buildScience({});if(!raw)return base;
 if(raw.speciesId!==confirmedSpeciesId||!['available','missing'].includes(raw.status))throw Error('science_identity_mismatch');
 if(raw.source?.provider!=='baidu')throw Error('science_source_invalid');
 const summary=typeof raw.summary==='string'?Array.from(raw.summary.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim()).slice(0,1200).join(''):'';
 const fields=Object.assign({},base.fields);if(summary&&!fields.knowledge)fields.knowledge=summary;
 const url=raw.source.url,source={provider:'baidu',route:['animal','plant','general'].includes(raw.source.route)?raw.source.route:'unknown',retrievedAt:Number.isFinite(raw.source.retrievedAt)?raw.source.retrievedAt:null};
 if(typeof url==='string'&&url.length<=2048&&/^https:\/\/baike\.baidu\.com\/item\/[^\s?#@\\<>]+$/u.test(url))source.url=url;
 return {status:Object.keys(fields).length?'available':'missing',confirmedSpeciesId,source,version:'confirmed-baidu-v1',summary,fields,localSource:base.source||''};
}
module.exports={normalizeCard,buildScience,scienceForConfirmedCandidate};
