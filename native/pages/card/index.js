const app=getApp()
const cardExport=require('../../lib/card-export')
const {decodeAsset}=require('../../lib/asset-decode')
const {localIllustrationFor}=require('../../lib/species-illustration')
async function decodeBack(canvas,card,current){
 let src=card.backAssetFileId||cardExport.illustrationFor(card.speciesId);
 if(src.startsWith('cloud://')){const r=await wx.cloud.getTempFileURL({fileList:[src]});src=r.fileList?.[0]?.tempFileURL;if(!src)throw Error('watercolor unavailable')}
 try{return await decodeAsset(canvas,src,current)}catch(e){if(card.backAssetFileId)throw e;return decodeAsset(canvas,localIllustrationFor(card.speciesId),current).catch(()=>({image:null}))}
}
Page({
 data:{card:null,back:false,rx:0,ry:0,turn:0,viewer:false,reduce:false,note:'',isSample:false,dragging:false,flipping:false,flipStage:'idle',exporting:false,exportPath:'',exportWidth:821,exportHeight:1121,exportMode:'',printQuality:'',saveDenied:false},
 onLoad(q){const raw=q.id&&q.id.indexOf('sample_')===0?{id:q.id,speciesId:q.id.slice(7),sample:true}:app.findCard(q.id);this.id=q.id;if(raw)this.setData({card:app.decorate(raw),isSample:!!raw.sample,note:wx.getStorageSync('nature.note.'+q.id)||'',reduce:!!wx.getStorageSync('nature.reduceMotion')})},
 start(e){if(this._flipping||!e.touches.length)return;const t=e.touches[0];this._start={x:t.clientX,y:t.clientY};this._moved=false;this._lastFrame=0;this.setData({dragging:true})},
 move(e){if(!this._start||this._flipping||!e.touches.length)return;const t=e.touches[0],dx=t.clientX-this._start.x,dy=t.clientY-this._start.y;if(Math.hypot(dx,dy)>8)this._moved=true;if(this.data.reduce)return;this._pendingTilt={rx:Math.round(Math.max(-16,Math.min(16,-dy/6))*2)/2,ry:Math.round(Math.max(-20,Math.min(20,dx/6))*2)/2};const elapsed=Date.now()-(this._lastFrame||0);if(elapsed>=16)this.flushTilt();else if(!this._frame)this._frame=setTimeout(()=>{this._frame=null;this.flushTilt()},16-elapsed)},
 flushTilt(){const p=this._pendingTilt;this._pendingTilt=null;if(!p||!this._start||this._flipping)return;this._lastFrame=Date.now();if(p.rx!==this.data.rx||p.ry!==this.data.ry)this.setData(p)},
 end(){clearTimeout(this._frame);this._frame=null;this._pendingTilt=null;this._start=null;this.setData({dragging:false,rx:0,ry:0})},
 cancel(){this._moved=true;this.end()},
 tap(){if(this._moved){this._moved=false;return}this.flip()},
 flip(){if(this._flipping)return;this.end();if(this.data.reduce){this.setData({back:!this.data.back,turn:0,flipStage:'idle'});return}this._flipping=true;this._targetBack=!this.data.back;const token=this._flipToken=(this._flipToken||0)+1;this.setData({flipping:true,flipStage:'out',turn:90});this._mid=setTimeout(()=>{if(token!==this._flipToken)return;this.setData({back:this._targetBack,flipStage:'edge',turn:-90},()=>{if(token!==this._flipToken)return;this._resume=setTimeout(()=>{if(token!==this._flipToken)return;this.setData({flipStage:'in',turn:0});this._finish=setTimeout(()=>{if(token!==this._flipToken)return;this._flipping=false;this.setData({flipping:false,flipStage:'idle'})},220)},32)})},180)},
 settle(){this._flipToken=(this._flipToken||0)+1;clearTimeout(this._mid);clearTimeout(this._resume);clearTimeout(this._finish);this.cancel();const back=this._flipping?this._targetBack:this.data.back;this._flipping=false;this.setData({back,flipping:false,flipStage:'idle',turn:0})},
 onHide(){this.settle()},
 onUnload(){this._unloaded=true;this._exportToken=(this._exportToken||0)+1;this.settle()},
 details(){this.settle();this.setData({viewer:false})},
 noop(){},
 view(){this.setData({viewer:true})},
 close(){this.details()},
 backToLibrary(){this.settle();if(getCurrentPages().length>1)wx.navigateBack();else wx.reLaunch({url:'/native/pages/library/index'})},
 edit(e){this.setData({note:e.detail.value})},
 save(){try{wx.setStorageSync('nature.note.'+this.id,this.data.note);app.cloudSyncNote(this.id,this.data.note);wx.showToast({title:'笔记已保存'})}catch(e){wx.showToast({title:'保存失败，请重试',icon:'none'})}},
 onShareAppMessage(){return this.data.card?cardExport.publicShare(this.data.card):{title:'去大自然里',path:'/native/pages/home/index'}},
 enrich(){this.setData({back:true,viewer:true})},
 checkArt(){this.setData({back:true,viewer:true})},
 exportMenu(){if(this.data.exporting)return;wx.showActionSheet({itemList:['生成含照片分享图（保护物种含卡背）','打印模式：正面 PNG','打印模式：卡背 PNG'],success:r=>this.exportImage(['share','printFront','printBack'][r.tapIndex])})},
 exportImage(mode){if(this.data.isSample){wx.showToast({title:'示例卡不可导出为我的卡',icon:'none'});return}if(this.data.exporting||!this.data.card)return;const card=this.data.card,plan=cardExport.exportPlan(card,mode),epoch=app.getDataEpoch(),token=this._exportToken=(this._exportToken||0)+1,current=()=>token===this._exportToken&&epoch===app.getDataEpoch()&&!this._unloaded;this.settle();this.setData({exporting:true,exportPath:'',exportWidth:plan.width,exportHeight:plan.height,exportMode:mode,printQuality:''},()=>wx.createSelectorQuery().in(this).select('#exportCanvas').fields({node:true,size:true}).exec(async result=>{try{const canvas=result&&result[0]&&result[0].node;if(!canvas||!current())throw Error('stale export');canvas.width=plan.width;canvas.height=plan.height;const illustrationResult=await decodeBack(canvas,card,current);let photo={width:1,height:1};if(mode!=='printBack'){let photoSrc=card.artPhotoPath||card.photoPath||card.image;if(photoSrc.indexOf('cloud://')===0){const t=await wx.cloud.getTempFileURL({fileList:[photoSrc]});if(!t.fileList||!t.fileList[0]||!t.fileList[0].tempFileURL)throw Error('asset url failed');photoSrc=t.fileList[0].tempFileURL}const info=await new Promise((resolve,reject)=>wx.getImageInfo({src:photoSrc,success:resolve,fail:reject}));const photoResult=await decodeAsset(canvas,photoSrc,current);photo=Object.assign(photoResult.image,{width:info.width,height:info.height});this.setData({printQuality:plan.print?cardExport.printQuality(info,mode).message:''})}if(!current())throw Error('stale export');cardExport.render(canvas.getContext('2d'),card,plan,photo,illustrationResult.image);wx.canvasToTempFilePath({canvas,x:0,y:0,width:plan.width,height:plan.height,destWidth:plan.width,destHeight:plan.height,fileType:'png',success:result=>current()?this.setData({exporting:false,exportPath:result.tempFilePath}):this.exportFailed(),fail:()=>this.exportFailed()},this)}catch(error){this.exportFailed()}}))},
 exportFailed(){this.setData({exporting:false,exportPath:''});wx.showModal({title:'图片未导出',content:'照片无法读取。请重新选择照片，或在原设备恢复这张旧照片后重试。',confirmText:'重新选择',cancelText:'稍后再试',success:result=>{if(result.confirm)wx.reLaunch({url:'/native/pages/observe/index'})}})},
 removeCard(){
  wx.showModal({title:'删除这张卡？',content:'卡片、笔记和云端照片都会删除，无法恢复。',confirmText:'删除',confirmColor:'#b03a26',success:r=>{
    if(!r.confirm)return;
    try{app.removeCard(this.id);wx.showToast({title:'已删除'});setTimeout(()=>wx.navigateBack(),600)}catch(e){wx.showToast({title:'删除失败，请重试',icon:'none'})}
  }})
 },
 previewExport(){if(this.data.exportPath)wx.previewImage({urls:[this.data.exportPath],current:this.data.exportPath})},
 saveExport(){if(!this.data.exportPath)return;wx.saveImageToPhotosAlbum({filePath:this.data.exportPath,success:()=>this.setData({saveDenied:false},()=>wx.showToast({title:'已保存图片'})),fail:()=>this.setData({saveDenied:true},()=>wx.showModal({title:'未保存到相册',content:'请允许保存图片权限后重试；生成的图片仍可预览。',confirmText:'打开设置',cancelText:'稍后',success:r=>{if(r.confirm)this.openPhotoSettings()}}))})},
 openPhotoSettings(){wx.openSetting({success:result=>{const allowed=result.authSetting&&result.authSetting['scope.writePhotosAlbum'];this.setData({saveDenied:!allowed});if(allowed)this.saveExport()}})},
 shoot(){wx.reLaunch({url:'/native/pages/observe/index'})}
})
