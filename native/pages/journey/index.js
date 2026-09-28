const app=getApp(),{realCards,footprints,locationFreeCard}=require('../../lib/collection-model');
const stamp=c=>Number(c.recoveredFromCloud?c.observedAt:(c.observedAt??c.createdAt))||0;
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
// 时间线示意布局，不代表 GPS、距离或真实行走路线。
function routePoints(list,limit=12){
 const picked=list.slice(-limit),count=picked.length;
 return picked.map((item,i)=>{
  const t=count===1?0.5:i/(count-1);
  return Object.assign({},item,{
   x:Number((10+t*80).toFixed(2)),
   y:Number((54-Math.sin(t*Math.PI*2.4)*26).toFixed(2)),
   latest:i===count-1
  });
 });
}
Page({
 data:{mapPoints:[],trace:[],journeys:[],activeJourney:null,places:[],activePoint:null,activeTraceId:'',meetingCount:0,dayCount:0,placeCount:0,reduceMotion:false},
 onShow(){
  const all=realCards(app.getCards()),showLocation=wx.getStorageSync('nature.showLocation')===true;
  const points=all.map(c=>{
   const time=stamp(c),d=new Date(time);
   const valid=time>0&&time<=Date.now();
   return {id:c.id,name:c.zh||c.speciesId||'未命名物种',speciesId:c.canonicalSpeciesId||c.speciesId||c.id,time:valid?time:0,card:app.decorate(locationFreeCard(c)),note:String(wx.getStorageSync('nature.note.'+c.id)||'').trim(),
    date:valid?d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日':'日期未记录',
    tag:time>0?(d.getMonth()+1)+'/'+d.getDate():'—',
    place:showLocation?(footprints([c])[0]?.label||''):''};
  }).sort((a,b)=>a.time-b.time);
  const dated=points.filter(p=>p.time>0),places=showLocation?footprints(all):[];
  // 同一天、同一已授权地点形成一页手记；未公开地点只按日期组织。
  const groups=new Map();for(const point of points.slice().reverse()){
   const key=JSON.stringify([point.time?dayKey(point.time):'undated',point.place]);
   if(!groups.has(key))groups.set(key,{id:key,date:point.date,place:point.place,cover:point.card,items:[]});
   groups.get(key).items.push(point);
  }
  const journeys=[...groups.values()].map(j=>({...j,count:j.items.length,speciesCount:new Set(j.items.map(p=>p.speciesId)).size,note:j.items.find(p=>p.note)?.note||''}));
  this.setData({
   journeys,activeJourney:null,
   mapPoints:routePoints(dated),activePoint:null,activeTraceId:'',
   trace:points.slice().reverse(),
   places,
   meetingCount:points.length,
   dayCount:new Set(dated.map(p=>dayKey(p.time))).size,
   placeCount:places.length,
   reduceMotion:!!wx.getStorageSync('nature.reduceMotion')
 },()=>this.drawRoute());
 },
 openJourney(e){const journey=this.data.journeys[Number(e.currentTarget.dataset.index)];if(!journey)return;this.setData({activeJourney:journey,activePoint:null,mapPoints:routePoints(journey.items.filter(p=>p.time).slice().reverse())},()=>{wx.pageScrollTo&&wx.pageScrollTo({scrollTop:0,duration:0});this.drawRoute()})},
 closeJourney(){this.setData({activeJourney:null,activePoint:null});wx.pageScrollTo&&wx.pageScrollTo({scrollTop:0,duration:0})},
 // 旅程页只回答「在哪儿」：点节点就地弹地点，不进卡片详情。
 showPlace(e){
  const index=Number(e.currentTarget.dataset.index),point=this.data.mapPoints[index];
  if(!point)return;
  this.setData({activePoint:Object.assign({},point,{side:point.x>55?'side-left':'side-right'})});
 },
 closePlace(){this.setData({activePoint:null})},
 showTracePlace(e){const id=e.currentTarget.dataset.id;this.setData({activeTraceId:this.data.activeTraceId===id?'':id})},
 // 轨迹曲线画在 canvas 上：虚线小路 + 节点光晕；节点本身是可点击的 view。
 drawRoute(){
  const points=this.data.mapPoints||[];
  if(!points.length||!wx.createSelectorQuery)return;
  wx.createSelectorQuery().in(this).select('#journey-canvas').fields({node:true,size:true}).exec(res=>{
   const info=res&&res[0];if(!info||!info.node)return;
   const canvas=info.node,ctx=canvas.getContext&&canvas.getContext('2d');if(!ctx)return;
   const dpr=(wx.getWindowInfo&&wx.getWindowInfo().pixelRatio)||2,w=info.width||300,h=info.height||320;
   canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
   const at=p=>[p.x/100*w,p.y/100*h];
   ctx.strokeStyle='rgba(74,124,89,.55)';ctx.lineWidth=2.5;ctx.setLineDash([8,6]);ctx.lineCap='round';
   ctx.beginPath();
   points.forEach((p,i)=>{const [x,y]=at(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
   ctx.stroke();
   ctx.setLineDash([]);
   points.forEach(p=>{const [x,y]=at(p);
    ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);
    ctx.fillStyle=p.latest?'rgba(212,165,116,.35)':'rgba(255,255,255,.75)';ctx.fill();
   });
  });
 },
 open(e){const id=e.currentTarget.dataset.id;if(!id)return;wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(id)})},
 capture(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
});
