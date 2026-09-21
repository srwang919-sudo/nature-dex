const {realCards}=require('./collection-model');
const {dateOf,keyOf}=require('./badge-model');
function profileLevel(speciesCount){const current=Math.max(0,Number(speciesCount)||0);const rows=[{min:0,level:1,label:'初识自然',next:3},{min:3,level:2,label:'细心观察者',next:6},{min:6,level:3,label:'自然探访者',next:7},{min:7,level:4,label:'章节收藏家',next:null}];return Object.assign({},rows.filter(r=>current>=r.min).pop(),{current})}
function buildProfile(cards,state={}){
 const real=realCards(cards),species=new Set(real.map(keyOf).filter(Boolean)).size,count=real.length,days=new Set(real.map(dateOf).filter(Boolean)).size,level=profileLevel(species);
 return {isDemo:false,name:state.name||'本地收藏',level:level.level,xp:species,nextXp:level.next,levelPercent:level.next?Math.min(100,species/level.next*100):100,localLevel:level.label,stats:{species,count,days,badges:0,repeat:Math.max(0,count-species),notes:0},points:0,dailyRecognition:'未设置额度',checkinCount:days};
}
function checkIn(state){return {pointsAdded:0,cumulativeDays:0,state}}
module.exports={buildProfile,profileLevel,checkIn};
