// 地区图鉴（Master Plan §11）：按季节组织的「本季还能遇见谁」清单进度。
// 隐私边界：清单只由本机物种目录推导；地点进度只统计本机保存的私密足迹（visibility=private）。
// 不上传位置、不聚合他人的观察、不显示距离或坐标；没有记录时如实显示空进度，不编造数字。
const {realCards}=require('./collection-model');
const {normalizeLocation}=require('./location-privacy');
const ATLAS_LIMIT=24;
const SEASONS=['winter','spring','summer','autumn'];
const SEASON_LABEL={winter:'冬',spring:'春',summer:'夏',autumn:'秋'};
const seasonOfMonth=month=>SEASONS[Math.floor((Number(month)%12)/3)];
const canonicalId=value=>String(value==null?'':value).normalize('NFKC').trim();
// 把物种资料里的季节描述（"全年可见"/"春秋过境"/"11–3 月花期"/"5–9 月"/"留鸟"）解析成季节标签。
// 无法判定时返回空数组——宁可不上清单，也不猜一个季节。
function seasonTags(text){
 const source=String(text==null?'':text);
 if(!source)return [];
 if(/全年|终年|留鸟/.test(source))return [...SEASONS];
 const found=new Set();
 if(/春/.test(source))found.add('spring');
 if(/夏/.test(source))found.add('summer');
 if(/秋/.test(source))found.add('autumn');
 if(/冬/.test(source))found.add('winter');
 const range=source.match(/(\d{1,2})\s*[–\-~—至到]\s*(\d{1,2})\s*月/);
 const single=source.match(/(\d{1,2})\s*月/);
 if(range){
  let month=Number(range[1]);const end=Number(range[2]);
  if(month>=1&&month<=12&&end>=1&&end<=12)for(let step=0;step<12;step++){
   found.add(seasonOfMonth(month));
   if(month===end)break;
   month=month%12+1;
  }
 }else if(single&&Number(single[1])>=1&&Number(single[1])<=12)found.add(seasonOfMonth(Number(single[1])));
 return SEASONS.filter(s=>found.has(s));
}
// 本季清单：物种目录中季节匹配的条目，按目录顺序截取前 ATLAS_LIMIT 条。
function seasonalChecklist(catalog,season,limit=ATLAS_LIMIT){
 return Object.values(catalog||{})
  .filter(sp=>sp&&typeof sp==='object'&&sp.id&&seasonTags(sp.season).includes(season))
  .slice(0,limit)
  .map(sp=>({speciesId:String(sp.id),zh:sp.zh||String(sp.id),latin:sp.latin||'',habitat:sp.habitat||'',season:sp.season||''}));
}
function buildRegionAtlas(cards,{catalog={},now=Date.now(),limit=ATLAS_LIMIT}={}){
 const date=new Date(now),season=seasonOfMonth(date.getMonth()+1),seasonLabel=SEASON_LABEL[season];
 const real=realCards(cards);
 const owned=new Set(real.map(c=>canonicalId(c&&(c.canonicalSpeciesId||c.speciesId))).filter(Boolean));
 const checklist=seasonalChecklist(catalog,season,limit);
 const items=checklist.map(entry=>({...entry,found:owned.has(entry.speciesId)}));
 const places=new Map();
 for(const card of real){
  const raw=card&&card.location;
  if(!raw||raw.visibility!=='private')continue;
  const location=normalizeLocation(raw,raw.consentAt);
  if(!location)continue;
  const key=location.placeId,row=places.get(key)||{placeId:key,label:location.label,species:new Set()};
  const id=canonicalId(card.canonicalSpeciesId||card.speciesId);
  if(id)row.species.add(id);
  places.set(key,row);
 }
 const regions=[...places.values()]
  .sort((a,b)=>a.placeId<b.placeId?-1:a.placeId>b.placeId?1:0)
  .map(row=>({placeId:row.placeId,label:row.label,found:items.filter(i=>row.species.has(i.speciesId)).length,total:items.length,items:items.map(i=>({...i,here:row.species.has(i.speciesId)}))}));
 const found=items.filter(i=>i.found).length;
 return {season,seasonLabel,month:date.getMonth()+1,items,found,total:items.length,regions,speciesCount:owned.size,coverage:items.length?Math.round(found/items.length*100):0};
}
module.exports={buildRegionAtlas,seasonTags,seasonalChecklist,seasonOfMonth,ATLAS_LIMIT,SEASON_LABEL};
