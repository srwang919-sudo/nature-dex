const app=getApp(),{realCards,footprints,locationFreeCard}=require('../../lib/collection-model');
const stamp=c=>Number(c.recoveredFromCloud?c.observedAt:(c.observedAt??c.createdAt))||0;
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
Page({
 data:{segments:[],places:[],meetingCount:0,dayCount:0,placeCount:0,reduceMotion:false},
 onShow(){
  const all=realCards(app.getCards()).map(locationFreeCard);
  // 旅程只呈现「走过的轨迹」：按时间正序串成一条路，不重复图鉴里的物种卡片。
  const points=all.map(c=>{
   const time=stamp(c),d=new Date(time);
   return {id:c.id,zh:c.zh||c.speciesId||'未命名物种',time,
    dateLabel:time>0?(d.getMonth()+1)+'月'+d.getDate()+'日':'日期未记录',
    month:d.getFullYear()+'年'+(d.getMonth()+1)+'月',
    place:(c.location&&c.location.label)||''};
  }).filter(p=>p.time>0).sort((a,b)=>a.time-b.time);
  const segments=[];
  for(const point of points){
   let segment=segments[segments.length-1];
   if(!segment||segment.month!==point.month){segment={month:point.month,label:point.month,nodes:[]};segments.push(segment)}
   segment.nodes.push(point);
  }
  const places=wx.getStorageSync('nature.showLocation')===true?footprints(all):[];
  this.setData({segments,places,meetingCount:points.length,dayCount:new Set(points.map(p=>dayKey(p.time))).size,placeCount:places.length,reduceMotion:!!wx.getStorageSync('nature.reduceMotion')});
 },
 open(e){const id=e.currentTarget.dataset.id;if(!id)return;wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(id)})},
 capture(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
});
