const {chapter,computeChapterProgress}=require('./chapter-model');
function buildProfile(cards,state={}){
 const real=cards.filter(c=>c&&!c.sample&&c.kind!=='example'),species=new Set(real.map(c=>c.speciesId)).size,count=real.length,days=new Set(real.filter(c=>c.createdAt&&Number.isFinite(new Date(c.createdAt).getTime())).map(c=>new Date(c.createdAt).toDateString())).size,progress=computeChapterProgress(chapter,real);
 return {isDemo:false,name:state.name||'本地收藏',level:1,xp:progress.found,nextXp:progress.total,stats:{species,count,days,badges:0},points:0,dailyRecognition:'未设置额度',checkinCount:days};
}
function checkIn(state){return {pointsAdded:0,cumulativeDays:0,state}}
module.exports={buildProfile,checkIn};
