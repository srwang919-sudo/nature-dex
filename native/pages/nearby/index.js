const app=getApp()
Page({data:{habitats:[]},onLoad(){this.setData({habitats:['egret','sparrow','camellia','moth'].map(id=>app.getSpecies(id))})},open(e){wx.navigateTo({url:'/native/pages/card/index?id=sample_'+e.currentTarget.dataset.id})},shoot(){wx.reLaunch({url:'/native/pages/observe/index'})}})
