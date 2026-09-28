Component({
 data:{visible:false,contractName:'隐私保护指引'},
 lifetimes:{detached(){this.settle('disagree')}},
 pageLifetimes:{hide(){this.settle('disagree')}},
 methods:{
  request(resolve){
   this._pending=(this._pending||[]).concat(resolve);
   this.setData({visible:true});
   if(wx.getPrivacySetting)wx.getPrivacySetting({success:r=>{if(this._pending?.length)this.setData({contractName:r.privacyContractName||'隐私保护指引'})},fail:()=>{}});
  },
  settle(event){const pending=this._pending||[];this._pending=[];this.setData({visible:false});pending.forEach(resolve=>resolve(event==='agree'?{event,buttonId:'nature-privacy-agree'}:{event:'disagree'}))},
  agree(){this.settle('agree')},
  decline(){this.settle('disagree')},
  contract(){wx.openPrivacyContract({fail:()=>wx.showToast({title:'隐私指引暂时无法打开，请稍后重试',icon:'none'})})},
  stop(){}
 }
});
