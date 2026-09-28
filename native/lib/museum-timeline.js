const {realCards,locationFreeCard}=require('./collection-model');
const day=d=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
// 四季与时间氛围（§40–41）：season 由当前月份推导，dayPhase 由当前小时推导。
// 均只作视觉氛围标记，不改变物种是否出现。
const seasonOf=m=>{const i=Math.floor((m%12)/3);return ['winter','spring','summer','autumn'][i]};
const dayPhaseOf=h=>h>=19||h<6?'night':(h>=17?'dusk':'day');
const stamp=c=>c.recoveredFromCloud?c.observedAt:(c.observedAt??c.createdAt);
const canonical=c=>String(c.canonicalSpeciesId||c.speciesId||'').normalize('NFKC').trim();
const compare=(a,b)=>a<b?-1:a>b?1:0;
const sceneZone=c=>c.category==='bird'?'canopy':c.category==='insect'?'branch':/水域|淡水|海洋|湿地/.test(c.habitat||'')?'water':'ground';
function buildMuseumTimeline(cards,now=Date.now()){
 const current=new Date(now),all=realCards(cards).map(locationFreeCard),records=all.map(c=>({...c,createdAt:c.recoveredFromCloud?c.observedAt:(c.observedAt??c.createdAt)})).filter(c=>Number.isFinite(c.createdAt)&&c.createdAt>0&&c.createdAt<=now).sort((a,b)=>b.createdAt-a.createdAt),groups=new Map();
 const species=new Map();for(const card of all){const key=canonical(card);if(!key)continue;if(!species.has(key))species.set(key,[]);species.get(key).push(card)}
 const journeys=[...species].sort(([a],[b])=>compare(a,b)).map(([speciesId,observations])=>{observations.sort((a,b)=>(Number(stamp(b))||0)-(Number(stamp(a))||0)||compare(a.id,b.id));return {speciesId,name:observations[0].zh||speciesId,card:observations[0],count:observations.length,observations:observations.map(c=>{const t=stamp(c),d=new Date(t);return {id:c.id,dateLabel:Number.isFinite(t)&&t>0&&t<=now?d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日':'拍摄日期未记录'}})}});
 // 场景容量有限，优先呈现最近真实相遇；完整物种目录仍由 journeys 提供。
 const recentJourneys=journeys.slice().sort((a,b)=>(Number(stamp(b.card))||0)-(Number(stamp(a.card))||0)||compare(a.speciesId,b.speciesId));
 const zones={};const worldCards=[];for(const j of recentJourneys){const zone=sceneZone(j.card),slot=zones[zone]||0;if(slot>=2||worldCards.length>=6)continue;zones[zone]=slot+1;worldCards.push({...j.card,worldZone:zone,worldSlot:slot})}
 for(const card of records){const d=new Date(card.createdAt),label=d.getFullYear()+'年'+(d.getMonth()+1)+'月';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(card)}
 const month=current.getMonth()+1;
 return {dateLabel:month+'月'+current.getDate()+'日',seasonLabel:['冬','春','夏','秋'][Math.floor(month%12/3)],season:seasonOf(month),dayPhase:dayPhaseOf(current.getHours()),worldCards,journeys,today:records.filter(c=>day(new Date(c.createdAt))===day(current)).slice(0,6),recent:records.filter(c=>day(new Date(c.createdAt))!==day(current)).slice(0,6),memory:records.find(c=>{const d=new Date(c.createdAt);return d.getFullYear()<current.getFullYear()&&d.getMonth()===current.getMonth()&&d.getDate()===current.getDate()})||null,groups:[...groups].map(([label,cards])=>({label,cards}))};
}
module.exports={buildMuseumTimeline};
