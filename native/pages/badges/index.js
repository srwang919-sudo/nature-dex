const app=getApp()
Page({
  data:{badges:[],filter:'all',selectedBadge:null,badgePreviewOpen:false,reduce:false},
  onLoad(){this.refresh()},
  onShow(){this.refresh()},
  refresh(){
    const badges=(app.getBadges?app.getBadges().badges:[])||[]
    this.setData({badges,reduce:!!wx.getStorageSync('nature.reduceMotion')})
  },
  setFilter(e){this.setData({filter:e.currentTarget.dataset.filter})},
  openBadge(e){
    const id=e.currentTarget.dataset.id
    const badge=this.data.badges.find(b=>b.id===id)
    if(!badge)return
    this.setData({badgePreviewOpen:true,selectedBadge:Object.assign({},badge)})
  },
  closeBadge(){this.setData({badgePreviewOpen:false,selectedBadge:null})},
  previewContent(){},
  back(){if(getCurrentPages().length>1)wx.navigateBack();else wx.reLaunch({url:'/native/pages/profile/index'})}
})
