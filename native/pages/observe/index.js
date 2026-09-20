const app=getApp()
const {resolve}=require('../../lib/asset-resolver')
const {recognition}=require('../../contracts/services')
const {classifyRecognition}=require('../../lib/recognition-result')
const {recognitionError}=require('../../lib/recognition-errors')
const {createArtCard}=require('../../lib/art-card')
const {hasConsent,setConsent}=require('../../lib/recognition-consent')
Page({
 data:{photoPath:'',mode:'empty',cameraOpen:false,cameraReady:false,cameraError:'',flash:'off',busy:false,aiBusy:false,recognition:{status:'',candidates:[]},showDemo:false,species:null,speciesList:[],probabilities:app.finishes,showOdds:false,recent:[],today:[],undiscovered:[],recognitionStatus:'unavailable'},
 onLoad(options={}){this._unloaded=false;this._albumEntry=options.source==='album';this.setData({speciesList:Object.values(app.globalData.species),recognitionStatus:classifyRecognition(null,recognition.available).status});this.restore()},
 onReady(){if(this._albumEntry&&!this._unloaded){this._albumEntry=false;this.album()}},
 onShow(){this.restore();const cards=app.getCards(),today=new Date().toDateString(),owned=new Set(cards.map(c=>c.speciesId));this.setData({reduceMotion:!!wx.getStorageSync('nature.reduceMotion'),drafts:app.getDrafts().map(d=>({id:d.id,photoPath:d.photoPath,status:d.pendingCard?'待入册卡片':d.mode==='unknown'?'待确认物种':'待鉴别照片'})).reverse(),recent:cards.slice(-3).reverse().map(c=>app.decorate(c)).filter(Boolean),today:cards.filter(c=>c.createdAt&&new Date(c.createdAt).toDateString()===today).map(c=>app.decorate(c)).filter(Boolean),undiscovered:Object.values(app.globalData.species).filter(s=>!owned.has(s.id)).slice(0,2)})},
 restore(){const d=app.getObservation?app.getObservation():app.getDraft();if(d)this.setData({photoPath:d.photoPath,mode:d.mode||'ready',species:null,pending:false});else{const ready=app.getReadyCards&&app.getReadyCards().slice(-1)[0];if(ready){this._readyId=ready.id;this.setData({photoPath:ready.photoPath,pending:true,mode:'ready'})}}},
 onHide(){this._albumEntry=false;this.setData({cameraOpen:false,cameraReady:false,aiBusy:false});this._token=(this._token||0)+1;clearTimeout(this._timer);if(this.data.mode==='identifying')this.setData({mode:'ready'})},
 onUnload(){this._unloaded=true;this.onHide();const d=app.getObservation&&app.getObservation();if(d){if(d.photoFileId&&wx.cloud)wx.cloud.callFunction({name:'cleanupObservationAssets',data:{observationId:d.id}}).catch(()=>{});app.discardObservation()}},
 openCamera(){this.setData({cameraOpen:true,cameraReady:false,cameraError:''})},
 newPhoto(){clearTimeout(this._timer);this._token=(this._token||0)+1;this.setData({photoPath:'',mode:'empty',species:null,pending:false})},
 recover(e){clearTimeout(this._timer);this._token=(this._token||0)+1;try{app.selectDraft(e.currentTarget.dataset.id);this.restore();this.setData({showDemo:false})}catch(e){wx.showToast({title:'恢复失败',icon:'none'})}},
 retrySave(){this.setData({busy:true});if(this._savedRetryPath)this.commitSaved(this._savedRetryPath);else if(this._unsavedPath)this.persist(this._unsavedPath);else this.setData({busy:false})},
 releaseOrphan(path){if(path)app.cleanupPaths([path]).catch(()=>{})},
 ready(){this.setData({cameraReady:true})},
 cameraFail(){this.setData({cameraReady:false,cameraError:'相机未能打开，请检查相机权限，或从相册选择照片。'})},
 settings(){wx.openSetting({})},
 closeCamera(){this.setData({cameraOpen:false})},
 flash(){this.setData({flash:this.data.flash==='off'?'on':'off'})},
 shoot(){if(this.data.busy||!this.data.cameraReady)return;this.setData({busy:true});wx.createCameraContext().takePhoto({quality:'high',success:r=>this.persist(r.tempImagePath),fail:()=>{this.setData({busy:false});wx.showToast({title:'拍摄失败，请重试',icon:'none'})}})},
 album(){if(this.data.busy||this._unloaded)return;wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album'],success:r=>{if(this._unloaded)return;if(r.tempFiles&&r.tempFiles[0]){this.setData({busy:true});this.persist(r.tempFiles[0].tempFilePath)}},fail:e=>{if(!this._unloaded&&!/cancel/.test(e.errMsg||''))wx.showToast({title:'无法打开相册，请检查权限',icon:'none'})}})},
 nearby(){wx.reLaunch({url:'/native/pages/nearby/index'})},
 commitSaved(savedPath){
  try{
   const draft=app.createDraft({photoPath:savedPath,createdAt:Date.now(),mode:'ready'});

   this._unsavedPath=null;this._savedRetryPath=null;
   this.setData({photoPath:savedPath,mode:'ready',cameraOpen:false,busy:false,species:null,showDemo:false,pending:false,saveFailed:false,drafts:app.getDrafts().slice().reverse().map(d=>({id:d.id,photoPath:d.photoPath,status:d.pendingCard?'待入册卡片':'待鉴别照片'}))});
  }catch(e){
   this._savedRetryPath=savedPath;
   this.setData({busy:false,saveFailed:true,cameraOpen:false});
   wx.showModal({title:'记录尚未保存',content:'照片文件仍在本机，但记录写入失败。请释放空间后，在本页点击重试保存；暂未生成卡片。',showCancel:false});
  }
 },
 persist(path){
  if(app.startObservation){app.startObservation(path);this.setData({photoPath:path,mode:'ready',cameraOpen:false,busy:false,species:null,pending:false,artFailed:false});return}
  this._unsavedPath=path;
  wx.saveFile({tempFilePath:path,success:r=>this.commitSaved(r.savedFilePath),fail:()=>{
   this.setData({busy:false,saveFailed:true,cameraOpen:false});
   wx.showModal({title:'照片尚未保存',content:'请检查可用空间后在本页重试；本次照片未加入图鉴。',showCancel:false});
  }});
 },
 async uploadPhoto(draft,filePath){
  if(!hasConsent(wx))throw {code:'consent_required'};
  if(!wx.cloud||!draft)return '';
  let ticket;try{ticket=await wx.cloud.callFunction({name:'recognizeObservation',data:{action:'upload_ticket',consent:true,observationId:draft.id}})}catch(e){throw {code:'cloud_call'}}
  if(!ticket.result||ticket.result.status!=='ready')throw {code:ticket.result&&ticket.result.code||'cloud_version'};
  if(ticket.result.contractVersion!==2||!ticket.result.cloudPath)throw {code:'cloud_version'};
  let uploaded;try{uploaded=await wx.cloud.uploadFile({cloudPath:ticket.result.cloudPath,filePath})}catch(e){throw {code:'photo_upload'}}
  let registration;
  try{registration=await wx.cloud.callFunction({name:'recognizeObservation',data:{action:'register_asset',consent:true,observationId:draft.id,idempotencyKey:draft.id,cloudPath:ticket.result.cloudPath,photoFileId:uploaded.fileID,purpose:'recognition'}})}catch(e){throw {code:'cloud_call'}}
  if(!registration.result||registration.result.status!=='registered')throw {code:registration.result&&registration.result.code||'cloud_version'};
  return uploaded.fileID;
 },
 identify(){
  if(!this.data.photoPath){this.setData({identifyError:'请先拍摄或选择一张照片。'});return}
  if(this.data.busy){wx.showToast({title:'照片正在保存，请稍候',icon:'none'});return}
  if(this.data.aiBusy){wx.showToast({title:'正在鉴别，请稍候',icon:'none'});return}
  this.setData({identifyError:''});
  if(!hasConsent(wx)){this.setData({needsRecognitionConsent:true});return}
  this.setData({needsRecognitionConsent:false});this.identifyConsented();
 },
acceptRecognition(){try{setConsent(true,wx);this.setData({needsRecognitionConsent:false});this.identify()}catch(e){this.setData({identifyError:'同意设置未保存，请释放本地空间后重试；照片未上传。'})}},
 async identifyConsented(){
  if(!hasConsent(wx)){this.setData({needsRecognitionConsent:true});return}
  if(!wx.cloud){this.setData({showDemo:true,identifyError:'云服务未就绪，可在下方手动确认物种，再直接制卡或 AI 艺术制卡。'});return}
  const draft=app.getDraft();if(!draft){this.setData({identifyError:'未找到已保存的照片记录，请重新选择照片后重试。'});return}
  const token=this._token=(this._token||0)+1,epoch=app.getDataEpoch(),current=()=>hasConsent(wx)&&token===this._token&&epoch===app.getDataEpoch()&&app.getDraft()?.id===draft.id;
  this.setData({aiBusy:true,mode:'identifying',species:null,identifyError:''});
  let stage='cloud_call';
  try{
   let fileId=draft.photoUploadVersion===2?draft.photoFileId:'';
   if(!fileId)fileId=await this.uploadPhoto(draft,draft.photoPath);
   if(!current())return;
   stage='local_save';app.saveDraft(Object.assign({},draft,{photoFileId:fileId,photoUploadVersion:2}));
   stage='cloud_call';
   const res=await wx.cloud.callFunction({name:'recognizeObservation',data:{consent:true,observationId:draft.id,photoFileId:fileId,idempotencyKey:draft.id,kind:'general'}});
   if(!current())return;
   const raw=res&&res.result;
   const result=classifyRecognition(raw&&raw.contractVersion===2?raw:{status:'failed',code:raw&&raw.code||'cloud_version'},true);
   const candidates=(result.candidates||[]).map(c=>{const sp=app.getSpecies(c.speciesId);return Object.assign({},c,{name:c.name||(sp&&sp.zh)||c.speciesId,zh:c.name||(sp&&sp.zh)||c.speciesId,confidenceText:Math.round(c.confidence*100)+'%',thumb:sp&&sp.image?resolve(sp.image):''})});
   const recognition={status:result.status,candidates,...(result.code?{code:result.code}: {})};
   stage='local_save';app.saveDraft(Object.assign({},app.getDraft(),{recognition,mode:result.status}));
   this.setData({mode:result.status,recognitionStatus:result.status,recognition,species:null,aiBusy:false,showDemo:false});
   if(result.status==='failed'||result.status==='unavailable')this.setData({identifyError:recognitionError(result)});
   else if(raw&&Array.isArray(raw.warnings)&&raw.warnings.length)this.setData({identifyError:'部分接口未完成，以下候选不完整。'+recognitionError(raw.warnings[0])});
  }catch(e){if(current())this.setData({mode:'ready',aiBusy:false,showDemo:false,identifyError:recognitionError(e&&e.code?e:{code:stage})})}
 },
 demo(){this.setData({showDemo:!this.data.showDemo})},
 candidate(e){const id=e.currentTarget.dataset.id,preset=app.getSpecies(id),item=(this.data.recognition.candidates||[]).find(x=>x.speciesId===id)||{};this.setData({species:Object.assign({},preset||{},{id:id,zh:item.name||(preset?preset.zh:id),name:item.name||id,latin:item.latin||(preset&&preset.latin)||''})})},
 confirmArt(){return this.confirm(true)},
 useOriginal(){return this.confirm(false)},
 async confirm(art=false){
  if(!this.data.species||this.data.busy)return;
  const session=app.getObservation?app.getObservation():null,sp=this.data.species;
  if(!session||!['recognized','needs_confirmation'].includes(session.recognition?.status)||!session.recognition.candidates.some(c=>c.speciesId===sp.id)){this.setData({identifyError:'请先识别成功并确认候选物种。'});return}
  const epoch=app.getDataEpoch(),current=()=>epoch===app.getDataEpoch()&&app.getObservation()?.id===session.id;
  this.setData({busy:true,artFailed:false,identifyError:''});
  try{
   let card=Object.assign({id:'art_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),speciesId:sp.id,photoObservationId:session.id,photoPath:session.photoPath,photoFileId:session.photoFileId},session.artWork?.speciesId===sp.id?session.artWork:{});
   if(art===true){
    this.setData({artProgress:'混元正在创作艺术正面…'});
    card=await createArtCard({api:wx.cloud,card,onUpdate:work=>{if(!current())throw Error('stale');app.saveDraft(Object.assign({},app.getObservation(),{artWork:work}))}});
    if(!current())return;
    if(card.artStatus!=='ready'){this.setData({artFailed:true,identifyError:card.artMessage});return}
   }else{card=Object.assign({},card,{artStatus:'original',artPhotoPath:''})}
   this.setData({artProgress:'正在准备这个物种的水彩卡背…'});
   let back=(await wx.cloud.callFunction({name:'speciesIllustration',data:{action:'ensure',speciesId:sp.id,name:sp.zh||sp.name,confirmed:true}})).result;
   if(!current())return;
   if(back?.status!=='ready'||!back.assetFileId){this.setData({identifyError:back?.code==='reference_unavailable'?'此物种的官方参考素材尚未就绪，未保存卡片。':'水彩卡背尚未完成，请稍后重试；未保存卡片。'});return}
   await Promise.all([card.artPhotoPath||card.photoPath,back.assetFileId].map(async src=>{if(src.startsWith('cloud://')){const urls=await wx.cloud.getTempFileURL({fileList:[src]});src=urls.fileList?.[0]?.tempFileURL;if(!src)throw Error('image_url')}return new Promise((resolve,reject)=>wx.getImageInfo({src,success:resolve,fail:reject}))}));
   if(!current())return;
   const saved=session.photoSaved?{savedFilePath:session.photoPath}:await new Promise((resolve,reject)=>wx.saveFile({tempFilePath:session.photoPath,success:resolve,fail:reject}));
   if(!current()){app.cleanupPaths([saved.savedFilePath]).catch(()=>{});return}
   if(!app.getSpecies(sp.id))wx.setStorageSync('nature.species.'+sp.id,{id:sp.id,zh:sp.zh||sp.id,latin:sp.latin||'',stars:1,facts:[],stats:[],knowledge:'资料尚未补充'});
   app.saveDraft(Object.assign({},app.getObservation(),{photoPath:saved.savedFilePath,photoSaved:true,backAssetFileId:back.assetFileId}));
   const prepared=app.prepareCard(sp.id);
   const complete=Object.assign({},prepared,{photoPath:saved.savedFilePath,artPhotoPath:card.artPhotoPath||'',artStatus:card.artStatus,backAssetFileId:back.assetFileId,backStyleVersion:back.styleVersion,frontMode:art===true?'art':'original'});
   app.commitObservationCard(complete);
   wx.navigateTo({url:'/native/pages/reveal/index?id='+complete.id});
  }catch(e){if(current())this.setData({identifyError:'制卡未完成，未加入收藏。请检查网络后重试。'})}
  finally{this.setData({busy:false,artProgress:''})}
 },
 resume(){if(this._readyId)wx.navigateTo({url:'/native/pages/reveal/index?id='+this._readyId})},
 reset(){wx.showModal({title:'重新拍摄？',content:'当前照片仅在本次操作暂存，重新拍摄会放弃当前未成功的观察。',success:r=>{if(r.confirm)this.openCamera()}})},
 odds(){this.setData({showOdds:!this.data.showOdds})},
 openCard(e){wx.navigateTo({url:'/native/pages/card/index?id='+e.currentTarget.dataset.id})}
})
