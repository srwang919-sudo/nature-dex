const app=getApp()
const {socialView}=require('../../lib/availability-model')
Page({
 ...require('../../lib/settings-services').serviceMethods(wx,app),
 data:{
   friendTab:'friend',
   inviteExpanded:false,
   friends:[],sharedSpecies:[],myCopyRequests:[],copyRequests:[],
   inviteCode:'',enteredInvite:'',inviteMessage:'',lastShareId:'',
   socialConnected:false,social:socialView(),serviceBusy:false,serviceError:''
 },
 onLoad(){},
 onShow(){this.setData({social:socialView()})},
 onHide(){this._serviceToken=(this._serviceToken||0)+1;this.setData({serviceBusy:false})},
 switchTab(e){this.setData({friendTab:e.currentTarget.dataset.tab})},
 toggleInvite(){this.setData({inviteExpanded:!this.data.inviteExpanded})},
 goSettings(){wx.navigateTo({url:'/native/pages/settings/index?section=friends'})},
 capture(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
})
