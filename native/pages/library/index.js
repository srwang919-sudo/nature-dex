const app=getApp(),{realCards,footprints,locationFreeCard}=require('../../lib/collection-model');
Page({
 data:{cards:[],footprints:[],ownedCount:0,speciesCount:0,layout:'neat',reduceMotion:false},
 onShow(){this.refresh();if(app.syncCards)app.syncCards().then(()=>this.refresh()).catch(()=>{})},
 refresh(){const owned=realCards(app.getCards()),preference=wx.getStorageSync('nature.collection.v1')||{};this.setData({cards:owned.map(c=>app.decorate(locationFreeCard(c))).filter(Boolean).reverse(),footprints:footprints(owned),ownedCount:owned.length,speciesCount:new Set(owned.map(c=>c.canonicalSpeciesId||c.speciesId).filter(Boolean)).size,layout:preference.layout==='puzzle'?'puzzle':'neat',reduceMotion:!!wx.getStorageSync('nature.reduceMotion')})},
 setCollectionLayout(e){const layout=e.currentTarget.dataset.layout;if(!['neat','puzzle'].includes(layout))return;const old=wx.getStorageSync('nature.collection.v1')||{};try{wx.setStorageSync('nature.collection.v1',Object.assign({},old,{layout}));this.setData({layout},()=>{if(layout==='puzzle'&&this.data.cards.length){try{wx.setStorageSync('nature.collection.v1',Object.assign({},wx.getStorageSync('nature.collection.v1')||{},{layout,puzzleUsed:true}))}catch(e){wx.showToast({title:'布局已切换，使用记录未保存',icon:'none'})}}})}catch(e){wx.showToast({title:'布局设置未保存，请重试',icon:'none'})}},
 open(e){const id=e.currentTarget.dataset.id;if(!this.data.cards.some(c=>c.id===id))return;wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(id)})},
 explore(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
});
