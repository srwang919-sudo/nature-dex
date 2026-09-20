const app=getApp()
const {createRevealMachine}=require('../../lib/reveal-machine')
Page({
 data:{card:null,opened:false,opening:false,holding:false,direct:false,saved:false,duplicate:0,progress:0,reduce:false,back:false,revealStage:'sealed'},
 onLoad(q){this.id=q.id;this.load();this.setData({reduce:!!wx.getStorageSync('nature.reduceMotion')});this._direct=setTimeout(()=>this.setData({direct:true}),3000)},
 load(){const raw=app.findCard(this.id);if(!raw){wx.showToast({title:'没有找到这张卡',icon:'none'});return}const matches=app.getCards().filter(c=>c.speciesId===raw.speciesId&&c.id!==raw.id).length;this.setData({card:app.decorate(raw),opened:!!raw.revealed,saved:app.getCards().some(c=>c.id===raw.id),duplicate:matches,progress:Math.min((matches+1)/5*100,100)})},
 hold(){if(this.data.opened||this.data.opening)return;this.setData({holding:true});this._hold=setTimeout(()=>this.open(),700)},
 release(){clearTimeout(this._hold);this._hold=null;if(!this.data.opening)this.setData({holding:false})},
 machine(){if(this._machine)return this._machine;this._machine=createRevealMachine({reducedMotion:this.data.reduce,onStage:stage=>{if(stage==='settled'){this.setData({opened:true,opening:false,holding:false,revealStage:stage});return}this.setData({opening:stage!=='sealed',holding:false,revealStage:stage})}});return this._machine},
 open(){if(this.data.opened||this.data.opening)return;this.release();const raw=app.findCard(this.id);if(!raw)return;try{raw.revealed=true;app.updateCard(raw);if(!this.data.reduce&&wx.vibrateShort)wx.vibrateShort({type:'light',fail:()=>{}});this.machine().start()}catch(e){wx.showToast({title:'保存失败，请重试',icon:'none'})}},
 flip(){if(this.data.opened)this.setData({back:!this.data.back})},
 view(){wx.navigateTo({url:'/native/pages/card/index?id='+this.id})},
 collect(){if(!this.data.opened)return;try{const c=app.findCard(this.id);if(!c)return;app.addCard(c);this.setData({saved:true});app.clearFiledDraft(c.id);wx.showToast({title:'已收入图鉴'});wx.reLaunch({url:'/native/pages/library/index'})}catch(e){wx.showToast({title:'未能入册，请重试',icon:'none'})}},
 again(){wx.reLaunch({url:'/native/pages/observe/index'})},
 cancelReveal(){clearTimeout(this._hold);if(this._machine)this._machine.cancel();if(!this.data.opened)this.setData({holding:false,opening:false,revealStage:'sealed'})},
 onHide(){clearTimeout(this._direct);this.cancelReveal()},
 onUnload(){this.onHide()},
 onShow(){if(this.id)this.load();clearTimeout(this._direct);if(this.data.reduce)this.setData({direct:true});else if(!this.data.opened)this._direct=setTimeout(()=>this.setData({direct:true}),3000)}
})
