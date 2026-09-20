const app=getApp()
const {hasConsent,setConsent}=require('../../lib/recognition-consent')
Page({
 data:{count:0,species:0,days:0,reduce:false,drafts:[],recent:[],notes:[],cleanup:0,clearing:false,exportPath:'',exportBusy:false},
 onShow(){this.setData({recognitionConsent:hasConsent(wx)});this.refresh();if(app.syncCards)app.syncCards().then(()=>this.refresh()).catch(()=>{})},
 recognitionConsentChange(e){try{setConsent(!!e.detail.value,wx);this.setData({recognitionConsent:!!e.detail.value})}catch(e){wx.showToast({title:'设置未保存',icon:'none'})}},
 refresh(){const cards=app.getCards().filter(c=>c&&c.kind!=='example'&&!c.sample).map(c=>app.decorate(c)).filter(Boolean),cleanup=app.getCleanup().length;this.setData({count:cards.length,species:new Set(cards.map(c=>c.speciesId)).size,days:new Set(cards.filter(c=>c.createdAt).map(c=>c.date)).size,reduce:!!wx.getStorageSync('nature.reduceMotion'),drafts:app.getDrafts().slice().reverse().map(d=>({id:d.id,photoPath:d.photoPath,status:d.pendingCard?'待入册卡片':d.mode==='unknown'?'待确认物种':'待鉴别照片'})),recent:cards.slice().reverse().slice(0,12),notes:cards.map(c=>({id:c.id,zh:c.zh,text:wx.getStorageSync('nature.note.'+c.id)||''})).filter(n=>n.text),cleanup,cleanupState:cleanup?'等待清理':'无待清理文件'})},
 motion(e){try{wx.setStorageSync('nature.reduceMotion',e.detail.value);this.setData({reduce:e.detail.value})}catch(e){wx.showToast({title:'设置未保存',icon:'none'})}},
 resume(e){try{app.selectDraft(e.currentTarget.dataset.id);wx.reLaunch({url:'/native/pages/observe/index'})}catch(e){wx.showToast({title:'恢复失败',icon:'none'})}},
 open(e){wx.navigateTo({url:'/native/pages/card/index?id='+e.currentTarget.dataset.id})},
 removeDraft(e){
  const id=e.currentTarget.dataset.id;
  wx.showModal({title:'删除这份草稿？',content:'未入册内容会删除，未被收藏引用的本地照片也会清理。',confirmText:'删除草稿',success:async r=>{
   if(!r.confirm)return;
   try{const failed=await app.deleteDraft(id);this.refresh();wx.showToast({title:failed.length?'草稿已删，照片稍后重试清理':'草稿已删除',icon:'none'})}
   catch(e){wx.showToast({title:'删除失败，请重试',icon:'none'})}
  }});
 },
 async retry(){try{await app.retryCleanup();this.refresh();wx.showToast({title:this.data.cleanup?'仍有文件待清理':'照片清理完成',icon:'none'})}catch(e){wx.showToast({title:'清理失败，请重试',icon:'none'})}},
 clear(){if(this.data.clearing)return;wx.showModal({title:'清除全部本地数据？',content:'会删除收藏、笔记、草稿和本地照片；此操作无法撤销。你可以先导出备份。',confirmText:'继续',success:r=>{if(!r.confirm)return;wx.showModal({title:'再次确认：永久清除',content:'确认删除本设备的全部自然观察记录及照片？其他应用数据不受影响。',confirmText:'永久清除',confirmColor:'#b03a26',success:async final=>{if(!final.confirm)return;this._exportToken=(this._exportToken||0)+1;this._exportText='';this.setData({clearing:true,exportPath:'',exportBusy:false});try{const failed=await app.clearLocalData();this._exportText='';this.setData({exportPath:''});this.refresh();wx.showToast({title:failed.length?'数据已清除，部分照片待重试':'本地数据已清除',icon:'none'})}catch(e){wx.showToast({title:'清除未完成，请重试',icon:'none'})}finally{this.setData({clearing:false})}}})}})},
 exportData(){if(this.data.clearing||this.data.exportBusy)return;const epoch=app.getDataEpoch(),token=this._exportToken=(this._exportToken||0)+1;this.setData({exportBusy:true});try{const contents=JSON.stringify(app.exportLocalData(),null,2);const filePath=wx.env.USER_DATA_PATH+'/nature-observations-'+Date.now()+'.json';wx.getFileSystemManager().writeFile({filePath,data:contents,encoding:'utf8',success:()=>{if(epoch!==app.getDataEpoch()||token!==this._exportToken||this.data.clearing){wx.getFileSystemManager().unlink({filePath});return;}this.setData({exportBusy:false});try{wx.setStorageSync('nature.export.files',(wx.getStorageSync('nature.export.files')||[]).concat([filePath]));this._exportText=contents;this.setData({exportPath:filePath});wx.showToast({title:'JSON备份已生成'})}catch(e){wx.getFileSystemManager().unlink({filePath});wx.showToast({title:'记录导出失败',icon:'none'})}},fail:()=>{this.setData({exportBusy:false});wx.showToast({title:'导出失败，请检查空间',icon:'none'})}})}catch(e){this.setData({exportBusy:false});wx.showToast({title:'导出失败，请重试',icon:'none'})}},
 saveBackup(){if(this.data.clearing||!this.data.exportPath)return;if(wx.shareFileMessage)wx.shareFileMessage({filePath:this.data.exportPath,fileName:'自然观察备份.json',fail:()=>wx.showToast({title:'未发送，文件仍在本机',icon:'none'})});else wx.showToast({title:'当前微信不支持文件发送，可复制JSON',icon:'none'})},
 copyBackup(){if(!this.data.clearing&&this._exportText)wx.setClipboardData({data:this._exportText})}
})
