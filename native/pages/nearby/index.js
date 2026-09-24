const app=getApp()
const {buildRegionAtlas}=require('../../lib/region-atlas')
Page({
 data:{habitats:[],atlas:null,atlasBusy:false},
 onLoad(){const ids=['egret','sparrow','camellia','moth'];this.setData({habitats:ids.map(id=>app.getSpecies(id)).filter(Boolean)})},
 onShow(){this.refreshAtlas()},
 // 地区图鉴只读本机数据：物种目录 + 本机私密足迹。任何异常都退回「暂无图鉴」，不显示假进度。
 refreshAtlas(){
  try{
   const cards=(app.getCards?app.getCards():[]).map(c=>app.decorate?app.decorate(c):c).filter(Boolean);
   const catalog=(app.globalData&&app.globalData.species)||{};
   this.setData({atlas:buildRegionAtlas(cards,{catalog,now:Date.now()})});
  }catch(e){this.setData({atlas:null})}
 },
 open(e){wx.navigateTo({url:'/native/pages/card/index?id=sample_'+e.currentTarget.dataset.id})},
 shoot(){wx.reLaunch({url:'/native/pages/observe/index'})}
})
