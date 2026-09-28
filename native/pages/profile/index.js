const app=getApp(),{buildProfile,checkIn}=require('../../lib/profile-model')
Page({
  openBadge(e){const id=e.currentTarget.dataset.id,badge=(app.getBadges().badges||[]).find(b=>b.id===id);if(!badge)return;this.setData({badgePreviewOpen:true,selectedBadge:Object.assign({},badge),previewImageFailed:false})},
  closeBadge(){this.setData({badgePreviewOpen:false,selectedBadge:null,previewImageFailed:false})},
  previewContent(){},
  previewBadgeError(){this.setData({previewImageFailed:true})},
  badgeError(e){this.setData({['badgeErrors.'+e.currentTarget.dataset.key]:true})},
  data:{profile:null,notes:[],showLocation:false,reduce:false},onShow(){this.refresh()},
  refresh(){const {realCards,locationFreeCard}=require('../../lib/collection-model'),cards=realCards(app.getCards()).map(c=>app.decorate(locationFreeCard(c))).filter(Boolean),state=wx.getStorageSync('nature.profile.v1')||{},preferences=wx.getStorageSync('nature.profile.v2')||{},profile=buildProfile(cards,Object.assign({},state,{name:preferences.nickname||state.name})),notes=cards.map(card=>({id:card.id,zh:card.zh,text:wx.getStorageSync('nature.note.'+card.id)||'',image:card.photoPath||card.image})).filter(n=>n.text.trim()).slice().reverse().slice(0,3),savedLocation=wx.getStorageSync('nature.showLocation'),badges=app.getBadges?app.getBadges().badges||[]:[];profile.stats.badges=badges.filter(b=>b.earned).length;profile.stats.notes=cards.filter(c=>String(wx.getStorageSync('nature.note.'+c.id)||'').trim()).length;if(!require('../../lib/recovery-consent').allowed(wx))notes.forEach(n=>{if(/^(cloud:\/\/|https?:\/\/)/.test(n.image||''))n.image=''});this.setData({profile,notes,avatarPath:preferences.avatarPath||'',showLocation:savedLocation===true,reduce:!!wx.getStorageSync('nature.reduceMotion'),badges,badgeEarned:badges.filter(b=>b.earned).length,badgeTotal:badges.length})},
  async chooseAvatar(e){const path=e.detail&&e.detail.avatarUrl;if(!path||this.data.avatarSaving)return;const epoch=app.getDataEpoch();this.setData({avatarSaving:true});try{await app.saveAvatar(path);if(epoch===app.getDataEpoch())this.refresh()}catch(e){wx.showToast({title:'头像未更新，请重试',icon:'none'})}finally{this.setData({avatarSaving:false})}},
  openSettings(e){const section=e.currentTarget.dataset.section;wx.navigateTo({url:'/native/pages/settings/index?section='+section})},
  chooseNote(){wx.reLaunch({url:'/native/pages/library/index'})},
  openNotes(){wx.navigateTo({url:'/native/pages/note/index'})},
  openPhotos(){wx.reLaunch({url:'/native/pages/journey/index'})},
  openBadges(){wx.navigateTo({url:'/native/pages/badges/index'})},
  checkin(){const state=wx.getStorageSync('nature.profile.v1')||{},result=checkIn(state,new Date().toDateString());wx.setStorageSync('nature.profile.v1',result.state);this.refresh();wx.showToast({title:result.pointsAdded?'打卡 +2':'今天已打卡'})},
  toggleLocation(){const next=!this.data.showLocation;wx.setStorageSync('nature.showLocation',next);this.setData({showLocation:next})},toggleMotion(){const next=!this.data.reduce;wx.setStorageSync('nature.reduceMotion',next);this.setData({reduce:next})},settings(){wx.navigateTo({url:'/native/pages/settings/index'})},openNote(e){const id=e.currentTarget.dataset.id;if(id.indexOf('-note')===-1&&id!=='red-bellied-pheasant')wx.navigateTo({url:'/native/pages/card/index?id='+id})}
})
