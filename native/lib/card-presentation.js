const {illustrationFor}=require('./species-illustration');
const craft={standard:['标准版',1,.72],holo:['闪卡版',2,.20],alt:['异画版',4,.07],numbered:['编号珍藏版',5,.01]};
function getCraftPresentation(key){const row=craft[key]||craft.standard;return {label:row[0],stars:row[1],probability:row[2],ariaLabel:row[0]+'，'+['零','一','二','三','四','五'][row[1]]+'星工艺'}}
function presentCard(card={}){const finish=getCraftPresentation(card.finishKey),level=Math.max(1,Math.min(5,Math.floor(Number(card.stars)||1))),starText='★'.repeat(level)+'☆'.repeat(5-level),habitatSeason=[card.habitat,card.season].filter(Boolean).join(' · '),source=card.recognitionSource||card.identification;return {starText,front:{photo:require('./card-image').frontSource(card),no:card.no||'',finish:card.finish||finish.label,finishKey:card.finishKey||'standard',name:card.zh||'',latin:card.latin||'',starText},back:{title:card.zh||'',latin:card.latin||'',artId:card.speciesId||card.id||'',illustration:card.backAssetFileId||illustrationFor(card.speciesId),shortFact:card.factTitle||card.tagline||'',family:card.family||'',tagline:card.tagline||'',facts:Array.isArray(card.facts)?card.facts.slice(0,3):[],knowledge:card.knowledge||card.know||'资料尚未补充',stats:Array.isArray(card.stats)?card.stats.slice(0,3):[],habitatSeason,habitat:card.habitat||'资料尚未补充',iucn:card.iucn||'暂无评估资料',protection:card.protection||'',no:card.no||'',date:card.createdAt&&!card.sample?card.date||'':'',verificationLabel:source==='service'?'真实服务鉴别':'用户确认 / 本地记录'}};}
function presentVersionedCard(card={}){
 const p=presentCard(card);
 const number=require('./v1-card-model').projectV1Card(card).discoveryNumber;
 p.front.no=p.back.no=number?'Discovery No. '+number:'';
 const recorded=card.recoveredFromCloud?card.observedAt:(card.observedAt??card.createdAt),date=new Date(recorded);
 p.front.date=Number.isFinite(recorded)&&recorded>0&&recorded<=Date.now()?date.getFullYear()+'.'+(date.getMonth()+1)+'.'+date.getDate():'';
 p.front.shortStory=String(card.tagline||card.factTitle||card.scienceSnapshot?.summary||'').trim().slice(0,90);
 const categories={plant:'植物',bird:'鸟类',insect:'昆虫',animal:'动物',mammal:'哺乳动物',fungi:'真菌'};
 p.front.secondaryName=card.latin||(card.scienceSnapshot?.status==='available'?card.scienceSnapshot.latin||'':'')||(card.scienceSnapshot?.status==='available'?card.scienceSnapshot.english||'':'');
 p.front.categoryLabel=categories[card.category]||'类别未提供';p.front.locationLabel='地点未公开';p.front.expanded=!card.sample;
 if(card.schemaVersion===2){
  const normalized=require('./observation-card').normalizeCard(card);
  p.front.photo=normalized.artAsset.localPath||normalized.artAsset.fileId||'';
  p.back.illustration=normalized.originalPhotoAsset.localPath||normalized.originalPhotoAsset.fileId||'';
  p.back.kind='original';p.back.locationLabel=require('./location-privacy').publicLocation(card.location).label;
 }
 return p;
}
module.exports={presentCard:presentVersionedCard,getCraftPresentation};
