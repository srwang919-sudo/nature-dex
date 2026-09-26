const app=getApp(),{buildMuseumTimeline}=require('../../lib/museum-timeline'),{footprints}=require('../../lib/collection-model');
Page({
 data:{journeys:[],places:[],totalMeetings:0,speciesCount:0,placeCount:0,reduceMotion:false},
 onShow(){
  const cards=app.getCards(),timeline=buildMuseumTimeline(cards);
  // 路线按相遇次数排序：走得最远的旅程排在地图最前，最新一次作为路线端点。
  const journeys=timeline.journeys.map(g=>Object.assign({},g,{card:app.decorate(g.card),latest:(g.observations[0]||{}).dateLabel||''}))
   .sort((a,b)=>b.count-a.count||String(a.name).localeCompare(String(b.name),'zh'));
  const places=wx.getStorageSync('nature.showLocation')===true?footprints(cards):[];
  this.setData({journeys,places,speciesCount:journeys.length,totalMeetings:journeys.reduce((sum,j)=>sum+j.count,0),placeCount:places.length,reduceMotion:!!wx.getStorageSync('nature.reduceMotion')});
 },
 open(e){const id=e.currentTarget.dataset.id;if(!id)return;wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(id)})},
 capture(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
});
