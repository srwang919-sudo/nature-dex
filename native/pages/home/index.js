const app=getApp()
Page({
 onPageScroll(e){const show=e.scrollTop>360;if(show!==this.data.showReturnTop)this.setData({showReturnTop:show})},
 returnTop(){wx.pageScrollTo({scrollTop:0,duration:this.data.reduceMotion?0:200})},
 data:{showReturnTop:false,today:[],worldCards:[],reduceMotion:false},
 onShow(){this._navigating=false;this.refresh();if(app.syncCards)app.syncCards().then(()=>this.refresh()).catch(()=>{})},
 refresh(){
  const cards=app.getCards().filter(c=>c&&!c.sample&&c.kind!=='example').map(c=>app.decorate(c)).filter(Boolean);
  const timeline=require('../../lib/museum-timeline').buildMuseumTimeline(cards,Date.now());
  this.setData({...timeline,reduceMotion:!!wx.getStorageSync('nature.reduceMotion')});
 },
 capture(source){if(this._navigating)return;this._navigating=true;try{wx.navigateTo({url:'/native/pages/observe/index?source='+source,fail:()=>{this._navigating=false}})}catch(e){this._navigating=false}},
 observe(){this.capture('camera')},
 album(){this.capture('album')},
 async loadFriendRecent(){if(this.data.friendBusy)return;const token=this._friendToken=(this._friendToken||0)+1;this.setData({friendBusy:true,friendError:'',friendRecent:[]});try{const r=await require('../../lib/account-services').socialCall(wx,'listSharedSpecies');if(token===this._friendToken)this.setData({friendRecent:(r.species||[]).sort((a,b)=>(b.sharedAt||0)-(a.sharedAt||0)||a.shareId.localeCompare(b.shareId)).slice(0,3),friendLoaded:true})}catch(e){if(token===this._friendToken)this.setData({friendError:e.message,friendRecent:[]})}finally{if(token===this._friendToken)this.setData({friendBusy:false})}},
 openFriendMuseum(e){wx.navigateTo({url:'/native/pages/friend-museum/index?relationshipId='+encodeURIComponent(e.currentTarget.dataset.id)})},
 onHide(){this._friendToken=(this._friendToken||0)+1;this.setData({friendBusy:false,friendRecent:[],friendLoaded:false})},
 library(){wx.reLaunch({url:'/native/pages/library/index'})},
 openCard(e){wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(e.currentTarget.dataset.id)})}
})
