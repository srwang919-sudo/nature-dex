const app=getApp(),{chapter}=require('../../lib/chapter-model'),{buildExploration}=require('../../lib/exploration-model')
Page({
 data:{task:null,today:[],found:0,total:7,reduceMotion:false},
 onShow(){this.refresh();if(app.syncCards)app.syncCards().then(()=>this.refresh()).catch(()=>{})},
 refresh(){
  const cards=app.getCards().filter(c=>c&&!c.sample&&c.kind!=='example').map(c=>app.decorate(c)).filter(Boolean);
  this.setData(Object.assign(buildExploration(cards,chapter.cells.map(x=>x.speciesId),Date.now()),{reduceMotion:!!wx.getStorageSync('nature.reduceMotion')}));
 },
 observe(){wx.navigateTo({url:'/native/pages/observe/index'})},
 album(){wx.navigateTo({url:'/native/pages/observe/index?source=album'})},
 nearby(){wx.navigateTo({url:'/native/pages/nearby/index'})},
 library(){wx.reLaunch({url:'/native/pages/library/index'})},
 openCard(e){wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(e.currentTarget.dataset.id)})}
})
