const app=getApp()
const {createRevealMachine}=require('../../lib/reveal-machine')
const {firstUnlockedBadge}=require('../../lib/badge-model')
Page({
 data:{intro:false,discoveryTitle:'',discoveryReward:'',discoveryImage:'',card:null,opened:false,opening:false,holding:false,direct:false,saved:false,duplicate:0,progress:0,reduce:false,back:false,revealStage:'sealed'},
 onLoad(q){this.id=q.id;this.load(true);this.setData({reduce:!!wx.getStorageSync('nature.reduceMotion')})},
load(initial=false){const raw=app.findCard(this.id);if(!raw){wx.showToast({title:'没有找到这张卡',icon:'none'});return}const matches=app.getCards().filter(c=>c.speciesId===raw.speciesId&&c.id!==raw.id).length;this.setData({...(initial?{intro:!raw.revealed}:{}),card:app.decorate(raw),opened:!!raw.revealed,saved:app.getCards().some(c=>c.id===raw.id),duplicate:matches,discoveryTitle:matches?'又遇见了':'新物种发现',discoveryReward:matches?'观察记录 +1':'探索经验 +1',discoveryImage:(app.decorate(raw).artPhotoPath||app.decorate(raw).photoPath||app.decorate(raw).image||''),progress:Math.min((matches+1)/5*100,100)})},
 release(){clearTimeout(this._hold);this._hold=null;if(!this.data.opening)this.setData({holding:false})},
 machine(){if(this._machine)return this._machine;this._machine=createRevealMachine({reducedMotion:this.data.reduce,onStage:stage=>{if(stage==='settled'){this.setData({opened:true,opening:false,holding:false,revealStage:stage});return}this.setData({opening:stage!=='sealed',holding:false,revealStage:stage})}});return this._machine},
 open(){if(this.data.intro||this.data.opened||this.data.opening)return;this.release();const raw=app.findCard(this.id);if(!raw)return;try{raw.revealed=true;app.updateCard(raw);if(!this.data.reduce&&wx.vibrateShort)wx.vibrateShort({type:'light',fail:()=>{}});this.machine().start()}catch(e){wx.showToast({title:'保存失败，请重试',icon:'none'})}},
 flip(){if(this.data.opened)this.setData({back:!this.data.back})},
 view(){wx.navigateTo({url:'/native/pages/card/index?id='+this.id})},
 collect(){if(this.data.intro||!this.data.opened)return;if(this.data.saved){wx.reLaunch({url:'/native/pages/library/index'});return}try{const c=app.findCard(this.id);if(!require('../../lib/collection-model').realCards([c]).length)return;const before=app.getCards().slice(),context=app.achievementContext?app.achievementContext():{};app.addCard(c);const unlockedBadge=firstUnlockedBadge(before,app.getCards(),context);this.setData({saved:true,unlockedBadge,badgeRevealed:!!unlockedBadge});app.clearFiledDraft(c.id);if(!unlockedBadge){wx.showToast({title:'已收入馆藏'});this.finishBadge()}}catch(e){wx.showToast({title:'未能入册，请重试',icon:'none'})}},
 finishBadge(){this.setData({badgeRevealed:false});wx.reLaunch({url:'/native/pages/home/index'})},
 badgeError(){this.setData({badgeImageFailed:true})},
 again(){wx.reLaunch({url:'/native/pages/observe/index'})},
 cancelReveal(){clearTimeout(this._hold);if(this._machine)this._machine.cancel();if(!this.data.opened)this.setData({holding:false,opening:false,revealStage:'sealed'})},
 onHide(){clearTimeout(this._direct);this.cancelReveal()},
 onUnload(){this.onHide()},
 continueDiscovery(){if(!this.data.intro)return;this.setData({intro:false});this.open()},
 onShow(){if(this.id)this.load();if(!this.data.intro&&!this.data.opened&&!this.data.opening)this.open()}
})
