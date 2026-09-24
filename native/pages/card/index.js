const app=getApp()
const cardExport=require('../../lib/card-export')
const {decodeAsset}=require('../../lib/asset-decode')
const {readableImage,readableFront,readableOriginal}=require('../../lib/card-image')
const {exportFailure}=require('../../lib/export-error')
const {localIllustrationFor}=require('../../lib/species-illustration')
const {locationFreeCard}=require('../../lib/collection-model')
async function decodeBack(canvas,card,current){
 if(card.schemaVersion===2){const info=await readableOriginal(wx,card);return decodeAsset(canvas,info.path,current)}
 let src=card.backAssetFileId||cardExport.illustrationFor(card.speciesId);
 try{const info=await readableImage(wx,src);return await decodeAsset(canvas,info.path,current)}catch(e){if(card.backAssetFileId)throw e;return decodeAsset(canvas,localIllustrationFor(card.speciesId),current).catch(()=>({image:null}))}
}
Page({
 copyScienceSource(){const url=this.data.science?.sourceUrl;if(url)wx.setClipboardData({data:url})},
 data:{card:null,back:false,rx:0,ry:0,turn:0,viewer:false,reduce:false,note:'',isSample:false,dragging:false,flipping:false,flipStage:'idle',exporting:false,exportPath:'',exportWidth:821,exportHeight:1121,exportMode:'',printQuality:'',saveDenied:false},
 onLoad(q){this._unloaded=false;const raw=q.id&&q.id.indexOf('sample_')===0?{id:q.id,speciesId:q.id.slice(7),sample:true}:app.findCard(q.id);this.id=q.id;if(raw)this.setData({card:app.decorate(locationFreeCard(raw)),science:require('../../lib/science-view').scienceView(app.decorate(locationFreeCard(raw))),locationLabel:raw.location?.visibility==='private'&&raw.location.consentAt?raw.location.label:'',locationInput:'',isSample:!!raw.sample,note:wx.getStorageSync('nature.note.'+q.id)||'',reduce:!!wx.getStorageSync('nature.reduceMotion')})},
 editLocation(e){this._locationToken=(this._locationToken||0)+1;this._pickedLocation=null;this.setData({locationInput:e.detail.value})},
 chooseLocation(){if(this.data.isSample||this._unloaded)return;const token=this._locationToken=(this._locationToken||0)+1,epoch=app.getDataEpoch();if(!wx.chooseLocation){wx.showToast({title:'可直接输入地点名称',icon:'none'});return}wx.chooseLocation({success:r=>{if(this._unloaded||token!==this._locationToken||epoch!==app.getDataEpoch())return;const label=(r.name||r.address||'').trim().slice(0,100);if(!label)return;this._pickedLocation={placeId:'place:'+label,label,latitude:r.latitude,longitude:r.longitude};this.setData({locationInput:label})},fail:()=>{if(!this._unloaded)wx.showToast({title:'未选择地点，可直接输入名称',icon:'none'})}})},
 saveLocation(){if(this.data.isSample)return;const label=(this.data.locationInput||'').trim().slice(0,100);if(!label){wx.showToast({title:'请先填写地点名称',icon:'none'});return}const input=Object.assign({},this._pickedLocation&&this._pickedLocation.label===label?this._pickedLocation:{placeId:'place:'+label,label},{consentAt:Date.now(),visibility:'private'});try{app.updateCardLocation(this.id,input);this._pickedLocation=null;this.setData({locationLabel:label,locationInput:''});wx.showToast({title:'地点仅保存在本机'})}catch(e){wx.showToast({title:'地点未保存，请重试',icon:'none'})}},
 removeLocation(){if(this.data.isSample)return;try{app.updateCardLocation(this.id,null);this._locationToken=(this._locationToken||0)+1;this._pickedLocation=null;this.setData({locationLabel:'',locationInput:''});wx.showToast({title:'地点已移除'})}catch(e){wx.showToast({title:'移除失败，请重试',icon:'none'})}},
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
 openScience(){if(!this.data.card)return;this.setData({scienceOpen:true},()=>{try{if(!this.data.isSample)app.recordScienceRead(this.data.card.canonicalSpeciesId||this.data.card.speciesId)}catch(e){wx.showToast({title:'资料已打开，阅读记录未保存',icon:'none'})}})},
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
 exportImage(mode){
  if(this.data.isSample){wx.showToast({title:'示例卡不可导出为我的卡',icon:'none'});return}
  if(this.data.exporting||!this.data.card)return;
  const card=this.data.card,plan=cardExport.exportPlan(card,mode),epoch=app.getDataEpoch(),token=this._exportToken=(this._exportToken||0)+1,current=()=>token===this._exportToken&&epoch===app.getDataEpoch()&&!this._unloaded;
  this.settle();
  this.setData({exporting:true,exportPath:'',exportWidth:plan.width,exportHeight:plan.height,exportMode:mode,printQuality:''},()=>wx.createSelectorQuery().in(this).select('#exportCanvas').fields({node:true,size:true}).exec(async result=>{
   let stage='canvas';
   try{
    const canvas=result&&result[0]&&result[0].node;if(!current())return;if(!canvas)throw Error('canvas unavailable');
    canvas.width=plan.width;canvas.height=plan.height;
    stage='back';const illustrationResult=mode==='printBack'||plan.backs?await decodeBack(canvas,card,current):{image:null};
    let photo={width:1,height:1};
    if(mode!=='printBack'){
     stage='front';const info=await readableFront(wx,card);const decoded=await decodeAsset(canvas,info.path,current);photo=decoded.image;
     if(!current())return;
     this.setData({printQuality:plan.print?cardExport.printQuality(info,mode).message:''});
    }
    if(!current())return;
    if(mode==='printBack'&&card.schemaVersion===2)this.setData({printQuality:cardExport.printQuality(illustrationResult.image,mode,card).message});
    stage='draw';cardExport.render(canvas.getContext('2d'),card,plan,photo,illustrationResult.image);
    wx.canvasToTempFilePath({canvas,x:0,y:0,width:plan.width,height:plan.height,destWidth:plan.width,destHeight:plan.height,fileType:'png',success:r=>{if(current())this.setData({exporting:false,exportPath:r.tempFilePath})},fail:()=>{if(current())this.exportFailed('draw',{code:'canvas_export'})}},this);
   }catch(error){if(current())this.exportFailed(stage,error)}
  }))
 },
 exportFailed(stage='front',error={}){
  this.setData({exporting:false,exportPath:''});
  const content=exportFailure(stage,error).message;
  wx.showModal({title:'图片未导出',content,showCancel:false,confirmText:'知道了'});
 },
 removeCard(){
  wx.showModal({title:'删除这张卡？',content:'删除本机卡片、笔记及此观察的私有云照片和彩绘。云端删除确认前会保留本机卡片以便重试。',confirmText:'删除',confirmColor:'#b03a26',success:async r=>{
    if(!r.confirm)return;
    try{await app.removeCard(this.id);wx.showToast({title:'已删除'});setTimeout(()=>wx.navigateBack(),600)}catch(e){wx.showToast({title:'删除未确认，请稍后重试',icon:'none'})}
  }})
 },
 previewExport(){if(this.data.exportPath)wx.previewImage({urls:[this.data.exportPath],current:this.data.exportPath})},
 saveExport(){if(!this.data.exportPath)return;wx.saveImageToPhotosAlbum({filePath:this.data.exportPath,success:()=>this.setData({saveDenied:false},()=>wx.showToast({title:'已保存图片'})),fail:()=>this.setData({saveDenied:true},()=>wx.showModal({title:'未保存到相册',content:'请允许保存图片权限后重试；生成的图片仍可预览。',confirmText:'打开设置',cancelText:'稍后',success:r=>{if(r.confirm)this.openPhotoSettings()}}))})},
 openPhotoSettings(){wx.openSetting({success:result=>{const allowed=result.authSetting&&result.authSetting['scope.writePhotosAlbum'];this.setData({saveDenied:!allowed});if(allowed)this.saveExport()}})},
 shoot(){wx.reLaunch({url:'/native/pages/observe/index'})}
})
