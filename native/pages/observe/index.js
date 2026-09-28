const app=getApp()
const {resolve}=require('../../lib/asset-resolver')
const {recognition}=require('../../contracts/services')
const {classifyRecognition}=require('../../lib/recognition-result')
const {recognitionError,cloudFailure}=require('../../lib/recognition-errors')
const {createArtCard}=require('../../lib/art-card')
const {requestArtConsent}=require('../../lib/art-consent')
const {buildScience,normalizeCard,scienceForConfirmedCandidate}=require('../../lib/observation-card')
const {hasConsent,setConsent}=require('../../lib/recognition-consent')
const {track}=require('../../lib/analytics')
Page({
 data:{captureHints:[{key:'plant',label:'植物',kind:'plant'},{key:'animal',label:'动物',kind:'animal'},{key:'insect',label:'昆虫',kind:'animal'},{key:'fungi',label:'菌类',kind:'generalOnly'},{key:'other',label:'其他',kind:'general'}],captureHint:'other',hintLocked:false,photoPath:'',mode:'empty',cameraOpen:false,cameraReady:false,cameraError:'',flash:'off',busy:false,aiBusy:false,recognition:{status:'',candidates:[]},showDemo:false,species:null,speciesList:[],probabilities:app.finishes,showOdds:false,recent:[],today:[],undiscovered:[],recognitionStatus:'unavailable'},
 onLoad(options={}){this._unloaded=false;this._entrySource=['camera','album'].includes(options.source)?options.source:'';this.setData({speciesList:Object.values(app.globalData.species),recognitionStatus:classifyRecognition(null,recognition.available).status});this.restore()},
 onReady(){const source=this._entrySource;this._entrySource='';if(this._unloaded)return;if(source==='camera')this.openCamera();else if(source==='album')this.album()},
 onShow(){this.restore();const cards=app.getCards(),today=new Date().toDateString(),owned=new Set(cards.map(c=>c.speciesId));this.setData({reduceMotion:!!wx.getStorageSync('nature.reduceMotion'),drafts:app.getDrafts().filter(d=>d&&d.id).slice().reverse().map(d=>({id:d.id,photoPath:d.photoPath,status:d.pendingCard?'待入册卡片':d.mode==='unknown'?'待确认物种':'待鉴别照片'})),recent:cards.slice(-3).reverse().map(c=>app.decorate(c)).filter(Boolean),today:cards.filter(c=>c.createdAt&&new Date(c.createdAt).toDateString()===today).map(c=>app.decorate(c)).filter(Boolean),undiscovered:Object.values(app.globalData.species).filter(s=>!owned.has(s.id)).slice(0,2)})},
 restore(){const d=app.getObservation?app.getObservation():app.getDraft();if(d)this.setData({photoPath:d.photoPath,mode:d.mode||'ready',species:null,pending:false,hintLocked:!!d.recognitionKind,captureHint:d.captureHint||this.data.captureHint});else{const ready=app.getReadyCards&&app.getReadyCards().slice(-1)[0];if(ready){this._readyId=ready.id;this.setData({photoPath:ready.photoPath,pending:true,mode:'ready'})}}},
 onHide(){this._creationToken=(this._creationToken||0)+1;this.setData({busy:false,artProgress:''});this._entrySource='';this.setData({cameraOpen:false,cameraReady:false,aiBusy:false});this._token=(this._token||0)+1;clearTimeout(this._timer);if(this.data.mode==='identifying')this.setData({mode:'ready'})},
 onUnload(){this._unloaded=true;this.onHide();const d=app.getObservation&&app.getObservation();if(d&&!this._serverSavedCard){app.discardObservation();if(app.retryCloudCleanup)app.retryCloudCleanup().catch(()=>{})}},
 openCamera(){this.setData({cameraOpen:true,cameraReady:false,cameraError:''})},
 selectCaptureHint(e){const key=e.currentTarget.dataset.hint;if(this.data.aiBusy||this.data.busy||(!this.data.cameraOpen&&this.data.hintLocked))return;if(this.data.captureHints.some(h=>h.key===key))this.setData({captureHint:key})},
 newPhoto(){clearTimeout(this._timer);this._token=(this._token||0)+1;this.setData({photoPath:'',mode:'empty',species:null,pending:false})},
 recover(e){clearTimeout(this._timer);this._token=(this._token||0)+1;try{app.selectDraft(e.currentTarget.dataset.id);this.restore();this.setData({showDemo:false})}catch(e){wx.showToast({title:'恢复失败',icon:'none'})}},
 retrySave(){this.setData({busy:true});if(this._savedRetryPath)this.commitSaved(this._savedRetryPath);else if(this._unsavedPath)this.persist(this._unsavedPath);else this.setData({busy:false})},
 releaseOrphan(path){if(path)app.cleanupPaths([path]).catch(()=>{})},
 ready(){this.setData({cameraReady:true})},
 cameraFail(){this.setData({cameraReady:false,cameraError:'相机未能打开，请检查相机权限，或从相册选择照片。'})},
 settings(){wx.openSetting({})},
 closeCamera(){const draft=app.getDraft();this.setData({cameraOpen:false,...(draft?.recognitionKind?{captureHint:draft.captureHint||'other',hintLocked:true}:{})})},
 flash(){this.setData({flash:this.data.flash==='off'?'on':'off'})},
 shoot(){if(this.data.busy||!this.data.cameraReady)return;this.setData({busy:true});wx.createCameraContext().takePhoto({quality:'high',success:r=>this.persist(r.tempImagePath,'camera'),fail:()=>{this.setData({busy:false});wx.showToast({title:'拍摄失败，请重试',icon:'none'})}})},
 album(){if(this.data.busy||this._unloaded)return;wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album'],success:r=>{if(this._unloaded)return;if(r.tempFiles&&r.tempFiles[0]){this.setData({busy:true});this.persist(r.tempFiles[0].tempFilePath,'album')}},fail:e=>{if(!this._unloaded&&!/cancel/.test(e.errMsg||''))wx.showToast({title:'无法打开相册，请检查权限',icon:'none'})}})},
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
 persist(path,source){
  this._photoSource=source==='album'?'album':'camera';
  track('photo_captured',{source:this._photoSource});
  if(app.startObservation){app.startObservation(path);this.setData({photoPath:path,mode:'ready',cameraOpen:false,busy:false,species:null,pending:false,artFailed:false,hintLocked:false,recognition:{status:'',candidates:[]}});return}
  this._unsavedPath=path;
  wx.saveFile({tempFilePath:path,success:r=>this.commitSaved(r.savedFilePath),fail:()=>{
   this.setData({busy:false,saveFailed:true,cameraOpen:false});
   wx.showModal({title:'照片尚未保存',content:'请检查可用空间后在本页重试；本次照片未加入图鉴。',showCancel:false});
  }});
 },
 async uploadPhoto(draft,filePath){
  if(!hasConsent(wx))throw {code:'consent_required'};
  if(!wx.cloud||!draft)return '';
  require('../../lib/cloud-cleanup').enqueue(wx,draft.id);
  let ticket;try{ticket=await wx.cloud.callFunction({name:'recognizeObservation',data:{action:'upload_ticket',consent:true,observationId:draft.id}})}catch(e){throw cloudFailure(e,'upload_ticket')}
  if(!ticket.result||ticket.result.status!=='ready')throw {code:ticket.result&&ticket.result.code||'cloud_version'};
  if(ticket.result.contractVersion!==2||!ticket.result.cloudPath)throw {code:'cloud_version'};
  let uploaded;try{uploaded=await wx.cloud.uploadFile({cloudPath:ticket.result.cloudPath,filePath})}catch(e){throw {code:'photo_upload'}}
  let registration;
  try{registration=await wx.cloud.callFunction({name:'recognizeObservation',data:{action:'register_asset',consent:true,observationId:draft.id,idempotencyKey:draft.id,cloudPath:ticket.result.cloudPath,photoFileId:uploaded.fileID,purpose:'recognition'}})}catch(e){throw cloudFailure(e,'register_asset')}
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
  const kind=draft.recognitionKind||(this.data.captureHints.find(h=>h.key===this.data.captureHint)||{}).kind||'general';
  this.setData({hintLocked:true});
  track('recognition_started',{kind});
  let stage='cloud_call';
  try{
   app.saveDraft(Object.assign({},draft,{recognitionKind:kind,captureHint:this.data.captureHint}));
   let fileId=draft.photoUploadVersion===2?draft.photoFileId:'';
   if(!fileId)fileId=await this.uploadPhoto(draft,draft.photoPath);
   if(!current())return;
   stage='local_save';app.saveDraft(Object.assign({},draft,{photoFileId:fileId,photoUploadVersion:2,recognitionKind:kind,captureHint:this.data.captureHint}));
   stage='cloud_call';
   const res=await wx.cloud.callFunction({name:'recognizeObservation',data:{consent:true,observationId:draft.id,photoFileId:fileId,idempotencyKey:draft.id,kind}});
   if(!current())return;
   const raw=res&&res.result;
   const result=classifyRecognition(raw&&raw.contractVersion===2?raw:{status:'failed',code:raw&&raw.code||'cloud_version'},true);
   const candidates=(result.candidates||[]).map(c=>{const sp=app.getSpecies(c.speciesId);return Object.assign({},c,{name:c.name||(sp&&sp.zh)||c.speciesId,zh:c.name||(sp&&sp.zh)||c.speciesId,confidenceText:Math.round(c.confidence*100)+'%',thumb:sp&&sp.image?resolve(sp.image):''})});
   const recognition={status:result.status,candidates,...(result.code?{code:result.code}: {})};
   stage='local_save';app.saveDraft(Object.assign({},app.getDraft(),{recognition,mode:result.status}));
   this.setData({mode:result.status,recognitionStatus:result.status,recognition,species:null,aiBusy:false,showDemo:false});
   if(result.status==='failed'||result.status==='unavailable'){this.setData({identifyError:recognitionError(result)});track('recognition_failed',{code:String(result.code||result.status)})}
   else{if(raw&&Array.isArray(raw.warnings)&&raw.warnings.length)this.setData({identifyError:raw.warnings.some(w=>w.code==='route_disagreement')?'不同识别路线结果不一致，请仔细确认；分类标签不一定是具体物种。':'部分接口未完成，候选不完整，请确认后继续。'+recognitionError(raw.warnings[0])});track('recognition_success',{status:result.status,candidates:(result.candidates||[]).length,top:(result.candidates||[])[0]?.speciesId||''})}
  }catch(e){if(current()){const failure=e&&e.code?e:stage==='cloud_call'?cloudFailure(e,'recognize'):{code:stage};track('recognition_failed',{code:String(failure.code||stage)});this.setData({mode:'ready',aiBusy:false,showDemo:false,identifyError:recognitionError(failure)})}}
 },
 demo(){this.setData({showDemo:!this.data.showDemo})},
 candidate(e){const id=e.currentTarget.dataset.id,preset=app.getSpecies(id),item=(this.data.recognition.candidates||[]).find(x=>x.speciesId===id)||{};this.setData({species:Object.assign({},preset||{},{id:id,zh:item.name||(preset?preset.zh:id),name:item.name||id,latin:item.latin||(preset&&preset.latin)||''})})},
 async confirm(){
  if(!this.data.species||this.data.busy)return;
  if(this._serverSavedCard){try{app.commitObservationCard(this._serverSavedCard);const id=this._serverSavedCard.id;this._serverSavedCard=null;wx.navigateTo({url:'/native/pages/reveal/index?id='+id})}catch(e){this.setData({identifyError:'观察已保存到云端，卡片待同步。请释放本机空间后在本页重试，勿重复拍摄。'})}return}
  if(!hasConsent(wx)){this.setData({identifyError:'请先在设置中同意照片鉴别与私有云处理，再确认制卡。'});return}
  const session=app.getObservation?app.getObservation():null,sp=this.data.species;
  if(!session||!['recognized','needs_confirmation'].includes(session.recognition?.status)||!session.recognition.candidates.some(c=>c.speciesId===sp.id)){this.setData({identifyError:'请先识别成功并确认候选物种。'});return}
  const epoch=app.getDataEpoch(),token=this._creationToken=(this._creationToken||0)+1,current=()=>!this._unloaded&&token===this._creationToken&&epoch===app.getDataEpoch()&&app.getObservation()?.id===session.id;
  this.setData({busy:true,artFailed:false,identifyError:''});
  track('species_confirmed',{speciesId:sp.id,candidates:(session.recognition.candidates||[]).length});
  try{
   let card=Object.assign({id:'art_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),speciesId:sp.id,photoObservationId:session.id,photoPath:session.photoPath,photoFileId:session.photoFileId},session.artWork?.speciesId===sp.id?session.artWork:{});
    const resolved=(await wx.cloud.callFunction({name:'speciesIllustration',data:{action:'resolve',operationId:card.id,photoObservationId:session.id,speciesId:sp.id,confirmed:true}})).result;
    if(!current())return;
    if(resolved?.status==='ready')card=Object.assign({},card,{artStatus:'ready',artPhotoPath:resolved.assetFileId,artworkId:resolved.artworkId,artwork:{status:resolved.artworkStatus,isOfficial:resolved.isOfficial===true}});
    else if(!['needs_creation','processing'].includes(resolved?.status))throw Error(resolved?.code||'artwork_unavailable');
    if(card.artStatus==='ready')track('official_artwork_reused',{speciesId:sp.id,artworkId:String(card.artworkId||'')});
    else{track('official_artwork_missing',{speciesId:sp.id,status:String(resolved?.status||'')});track('artwork_generation_started',{speciesId:sp.id,status:String(resolved?.status||'')})}
    if(card.artStatus!=='ready'){
    const artConsent=await requestArtConsent(wx,{operationId:card.id,observationId:session.id});
    if(!artConsent||!current())return;
    track('custom_artwork_started',{speciesId:sp.id});
    card.artConsent=artConsent;
    this.setData({artProgress:'混元正在创作艺术正面…'});
    card=await createArtCard({api:wx.cloud,card,isCurrent:current,onUpdate:work=>{if(!current())throw Error('stale');app.saveDraft(Object.assign({},app.getObservation(),{artWork:work}))}});
    if(!current())return;
    if(card.artStatus!=='ready'){this.setData({artFailed:true,identifyError:card.artMessage});return}
    track('custom_artwork_success',{speciesId:sp.id});
    track('artwork_candidate_created',{speciesId:sp.id,artworkId:String(card.artworkId||'')});
    }
   this.setData({artProgress:'正在核验彩绘、原照片与博物资料…'});
   const selected=session.recognition.candidates.find(c=>c.speciesId===sp.id);
   const scienceSnapshot=scienceForConfirmedCandidate(selected,sp.id,buildScience(app.globalData.species[sp.id]||{}));
   const artUrl=card.artworkId?(await wx.cloud.callFunction({name:'speciesIllustration',data:{action:'resource',artworkId:card.artworkId}})).result:null;
   if(card.artworkId&&(!artUrl||artUrl.status!=='ready'||!artUrl.url))throw Error('artwork_resource_unavailable');
   const verified=await Promise.all([session.artLocalWorkId===card.id&&session.artLocalPath||artUrl?.url||card.artPhotoPath,session.photoPath].map(async src=>{if(!src)throw Error('image_missing');if(src.startsWith('cloud://')){const urls=await wx.cloud.getTempFileURL({fileList:[src]});src=urls.fileList?.[0]?.tempFileURL;if(!src)throw Error('image_url')}return new Promise((resolve,reject)=>wx.getImageInfo({src,success:resolve,fail:reject}))}));
   if(!current())return;
   if(!verified[0].path)throw Error('artwork_resource_unavailable');
   const artSaved=session.artLocalWorkId===card.id&&session.artLocalPath?{savedFilePath:session.artLocalPath}:await new Promise((resolve,reject)=>wx.saveFile({tempFilePath:verified[0].path,success:resolve,fail:reject}));
   if(!current()){app.cleanupPaths([artSaved.savedFilePath]).catch(()=>{});return}
   app.saveDraft(Object.assign({},app.getObservation(),{artLocalPath:artSaved.savedFilePath,artLocalWorkId:card.id}));
   const saved=session.photoSaved?{savedFilePath:session.photoPath}:await new Promise((resolve,reject)=>wx.saveFile({tempFilePath:session.photoPath,success:resolve,fail:reject}));
   if(!current()){app.cleanupPaths([saved.savedFilePath]).catch(()=>{});return}
   if(!app.getSpecies(sp.id))wx.setStorageSync('nature.species.'+sp.id,{id:sp.id,zh:sp.zh||sp.id,latin:sp.latin||'',stars:1,facts:[],stats:[],knowledge:'资料尚未补充'});
   app.saveDraft(Object.assign({},app.getObservation(),{photoPath:saved.savedFilePath,photoSaved:true,artWork:card,scienceSnapshot,resourcesVerified:true}));
   const prepared=app.prepareCard(sp.id);
   const complete=normalizeCard(Object.assign({},prepared,scienceSnapshot.fields,{category:selected.category||prepared.category,schemaVersion:2,photoPath:saved.savedFilePath,artPhotoPath:artSaved.savedFilePath,artAsset:{localPath:artSaved.savedFilePath,fileId:card.artPhotoPath},artStatus:'ready',scienceSnapshot,frontMode:'art',observedAt:session.createdAt,localDate:new Date(session.createdAt).toLocaleDateString()}));
   const receipt=await require('../../lib/save-observation').saveObservation({api:wx.cloud,operationId:card.id,isCurrent:current});
   if(receipt.observationId!==session.id)throw Error('observation_identity_mismatch');
   Object.assign(complete,{artworkId:card.artworkId,artwork:card.artwork,serverCardId:receipt.cardId,discovery:receipt.discovery,discoveryNumber:receipt.discovery.number,isFirstDiscovery:receipt.isFirstDiscovery});
   track('observation_created',{speciesId:sp.id,hasArtwork:!!complete.artworkId});
   track('discovery_number_assigned',{speciesId:sp.id,number:receipt.discovery.number});
   if(receipt.isFirstDiscovery)track('species_first_discovered',{speciesId:sp.id});
   this._serverSavedCard=complete;
   app.commitObservationCard(complete);
   track('card_created',{speciesId:sp.id,hasArtwork:!!complete.artworkId,scienceAvailable:!!complete.scienceSnapshot?.fields});
   this._serverSavedCard=null;
   wx.navigateTo({url:'/native/pages/reveal/index?id='+complete.id});
  }catch(e){if(current())this.setData({identifyError:this._serverSavedCard?'观察已保存到云端，卡片待同步。请释放本机空间后在本页重试，勿重复拍摄。':e.message==='discovery_baseline_unavailable'?'该物种的历史发现编号尚未核定，本次未入册；请稍后重试。':e.message==='creation_quota_exhausted'?'创作额度已用完，本次未入册；已有官方插画的物种仍可免费记录。':e.message==='artwork_resource_unavailable'?'插画暂时无法读取，本次未入册。请重试读取，不会重复扣除创作额度。':'制卡未完成，未加入收藏。请检查网络后重试。'})}
  finally{if(!this._unloaded&&token===this._creationToken)this.setData({busy:false,artProgress:''})}
 },
 resume(){if(this._readyId)wx.navigateTo({url:'/native/pages/reveal/index?id='+this._readyId})},
 reset(){wx.showModal({title:'重新拍摄？',content:'当前照片仅在本次操作暂存，重新拍摄会放弃当前未成功的观察。',success:r=>{if(r.confirm)this.openCamera()}})},
 odds(){this.setData({showOdds:!this.data.showOdds})},
 openCard(e){wx.navigateTo({url:'/native/pages/card/index?id='+e.currentTarget.dataset.id})}
})
