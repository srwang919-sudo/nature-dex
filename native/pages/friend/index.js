const app=getApp()
const {socialView}=require('../../lib/availability-model')
Page({
 ...require('../../lib/settings-services').serviceMethods(wx,app),
 data:{
   friendTab:'discover',
   inviteExpanded:false,
   friends:[],sharedSpecies:[],myCopyRequests:[],copyRequests:[],
   inviteCode:'',enteredInvite:'',inviteMessage:'',lastShareId:'',
   socialConnected:false,social:socialView(),serviceBusy:false,serviceError:'',
   suggestions:[
     {id:'s1',name:'林间漫步',desc:'记录城市里的植物日常 · 32 个共同兴趣',avatar:'plant'},
     {id:'s2',name:'山野小鹿',desc:'热爱昆虫与苔藓蘑菇 · 18 个共同兴趣',avatar:'insect'},
     {id:'s3',name:'Ocean',desc:'海洋生物爱好者 · 12 个共同兴趣',avatar:'aqua'}
   ],
   feed:[
     {id:'f1',name:'夏天的风',time:'2 小时前',place:'杭州西湖',text:'在西湖遇见了一只夜鹭，很安静的清晨。',likes:36,comments:4,image:'bird',liked:false},
     {id:'f2',name:'林间漫步',time:'5 小时前',place:'植物园',text:'银杏开始变黄了。',likes:12,comments:1,image:'plant',liked:false}
   ]
 },
 onLoad(){},
 onShow(){this.setData({social:socialView()})},
 onHide(){this._serviceToken=(this._serviceToken||0)+1;this.setData({serviceBusy:false})},
 switchTab(e){this.setData({friendTab:e.currentTarget.dataset.tab})},
 followSuggest(e){
   const id=e.currentTarget.dataset.id
   wx.showToast({title:'已关注 '+id,icon:'none'})
 },
 toggleFeedLike(e){
   const id=e.currentTarget.dataset.id
   const feed=this.data.feed.map(item=>item.id===id?Object.assign({},item,{liked:!item.liked,likes:item.liked?item.likes-1:item.likes+1}):item)
   this.setData({feed})
 },
 toggleInvite(){this.setData({inviteExpanded:!this.data.inviteExpanded})},
 goSettings(){wx.navigateTo({url:'/native/pages/settings/index?section=friends'})},
 capture(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
})
