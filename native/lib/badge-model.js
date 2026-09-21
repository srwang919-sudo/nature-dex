const {realCards,footprints}=require('./collection-model');
const rows=[
 ['first','初识自然',1,'收藏 1 种真实物种','red-fox'],
 ['plants','三叶档案',3,'收藏 3 种植物','ginkgo'],
 ['birds','飞羽来信',3,'收藏 3 种鸟','red-crowned-crane'],
 ['insects','微观访客',3,'收藏 3 种昆虫','monarch-butterfly'],
 ['repeat','重逢之约',3,'同一物种观察 3 次','sika-deer'],
 ['notes','细察之心',3,'为 3 条观察写下笔记','fly-agaric'],
 ['dates','四时相逢',4,'在 4 个不同日期观察','golden-pheasant'],
 ['places','山野行者',3,'主动保存 3 个不同地点','snow-leopard'],
 ['ten','风物成册',10,'收藏 10 种真实物种','common-kingfisher'],
 ['twenty','博物志人',20,'收藏 20 种真实物种','giant-panda'],
 ['puzzle','拼图成画',1,'使用一次卡架布局（原拼图布局）','chinese-alligator'],
 ['read','守护目光',10,'主动阅读 10 种物种科普','ibis']
];
const definitions=Object.freeze(rows.map(([id,name,target,desc,asset])=>Object.freeze({id,key:id,name,target,desc,asset:'/assets/badges/'+asset+'.png'})));
const keyOf=c=>String(c.canonicalSpeciesId||c.speciesId||'').trim();
const known={kingfisher:'bird',egret:'bird',ibis:'bird',pheasant:'bird',sparrow:'bird',moth:'insect',camellia:'plant'};
function dateOf(c){const value=c.localDate||(c.observedAt!==undefined?c.observedAt:c.createdAt);if(value===undefined||value===null||value==='')return '';const d=new Date(value);return Number.isFinite(d.getTime())?d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate():''}
function buildAchievements(cards,context={}){
 const real=realCards(cards).filter(c=>keyOf(c)),species=new Set(real.map(keyOf)),notes=context.notesByCard||{},events=context.events||{},counts=new Map();
 real.forEach(c=>counts.set(keyOf(c),(counts.get(keyOf(c))||0)+1));
 const category=n=>new Set(real.filter(c=>(known[keyOf(c)]||c.category)===n).map(keyOf)).size;
 const reads=new Set((Array.isArray(events.scienceReadSpecies)?events.scienceReadSpecies:[]).filter(id=>species.has(id)));
 const values={first:species.size,plants:category('plant'),birds:category('bird'),insects:category('insect'),repeat:Math.max(0,...counts.values()),notes:real.filter(c=>typeof notes[c.id]==='string'&&notes[c.id].trim()).length,dates:new Set(real.map(dateOf).filter(Boolean)).size,places:footprints(real).length,ten:species.size,twenty:species.size,puzzle:real.length&&(events.puzzleUsed===true||events.shelfUsed===true)?1:0,read:reads.size};
 return definitions.map(d=>Object.assign({},d,{progress:Math.min(d.target,values[d.id]),earned:values[d.id]>=d.target}));
}
function firstUnlockedBadge(before,after,context={}){const earned=new Set(buildAchievements(before,context).filter(b=>b.earned).map(b=>b.id));return buildAchievements(after,context).find(b=>b.earned&&!earned.has(b.id))||null}
module.exports={definitions,buildAchievements,firstUnlockedBadge,dateOf,keyOf};
