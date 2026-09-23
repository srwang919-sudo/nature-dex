const {realCards,locationFreeCard}=require('./collection-model');
const day=d=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
function buildMuseumTimeline(cards,now=Date.now()){
 const current=new Date(now),all=realCards(cards).map(locationFreeCard),records=all.map(c=>({...c,createdAt:c.recoveredFromCloud?c.observedAt:(c.observedAt??c.createdAt)})).filter(c=>Number.isFinite(c.createdAt)&&c.createdAt>0&&c.createdAt<=now).sort((a,b)=>b.createdAt-a.createdAt),groups=new Map();
 for(const card of records){const d=new Date(card.createdAt),label=d.getFullYear()+'年'+(d.getMonth()+1)+'月';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(card)}
 return {dateLabel:(current.getMonth()+1)+'月'+current.getDate()+'日',seasonLabel:['冬','春','夏','秋'][Math.floor((current.getMonth()+1)%12/3)],worldCards:all.slice(-3).reverse(),today:records.filter(c=>day(new Date(c.createdAt))===day(current)).slice(0,6),recent:records.filter(c=>day(new Date(c.createdAt))!==day(current)).slice(0,6),memory:records.find(c=>{const d=new Date(c.createdAt);return d.getFullYear()<current.getFullYear()&&d.getMonth()===current.getMonth()&&d.getDate()===current.getDate()})||null,groups:[...groups].map(([label,cards])=>({label,cards}))};
}
module.exports={buildMuseumTimeline};
