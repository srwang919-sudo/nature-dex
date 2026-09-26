const app=getApp(),{realCards,footprints,locationFreeCard}=require('../../lib/collection-model');
const stamp=c=>Number(c.recoveredFromCloud?c.observedAt:(c.observedAt??c.createdAt))||0;
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
// 地图上的节点沿一条蜿蜒小路分布：时间越早越靠左，最近一次在最右并高亮。
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
 data:{mapPoints:[],trace:[],places:[],activePoint:null,activeTraceId:'',meetingCount:0,dayCount:0,placeCount:0,reduceMotion:false},
 onShow(){
  const all=realCards(app.getCards()).map(locationFreeCard);
  const points=all.map(c=>{
   const time=stamp(c),d=new Date(time);
   return {id:c.id,name:c.zh||c.speciesId||'未命名物种',time,
    date:time>0?(d.getMonth()+1)+'月'+d.getDate()+'日':'日期未记录',
    tag:time>0?(d.getMonth()+1)+'/'+d.getDate():'—',
    place:(c.location&&c.location.label)||''};
  }).filter(p=>p.time>0).sort((a,b)=>a.time-b.time);
  const places=wx.getStorageSync('nature.showLocation')===true?footprints(all):[];
  this.setData({
   mapPoints:routePoints(points),
   trace:points.slice().reverse(),
   places,
   meetingCount:points.length,
   dayCount:new Set(points.map(p=>dayKey(p.time))).size,
   placeCount:places.length,
   reduceMotion:!!wx.getStorageSync('nature.reduceMotion')
  },()=>this.drawRoute());
 },
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
