const {presentCard}=require('../../lib/card-presentation')
const {localIllustrationFor}=require('../../lib/species-illustration')
const thumb=require('../../lib/thumbnail')
function automaticMediaDenied(){const pages=typeof getCurrentPages==='function'?getCurrentPages():[],route=pages[pages.length-1]?.route||'';return ['native/pages/home/index','native/pages/library/index','native/pages/journey/index','native/pages/profile/index'].includes(route)&&!require('../../lib/recovery-consent').allowed(wx)}
Component({
 options:{virtualHost:true},properties:{card:Object,large:Boolean,back:Boolean,motion:Boolean,scene:Boolean},data:{stars:'',presentation:null,imageUnavailable:false,thumbUrl:'',useThumb:false},
 observers:{card:function(c){if(c){const presentation=presentCard(c),denied=automaticMediaDenied()||(c.serverCardId&&!require('../../lib/recovery-consent').allowed(wx));if(denied){if(/^(cloud:\/\/|https?:\/\/)/.test(presentation.front.photo))presentation.front.photo='';if(/^(cloud:\/\/|https?:\/\/)/.test(presentation.back.illustration))presentation.back.illustration=''}this.setData({stars:presentation.starText,presentation,imageUnavailable:denied&&!presentation.front.photo,backUnavailable:denied&&!presentation.back.illustration});this.applyThumb();this.fixCloudUrls(presentation)}}},
 methods:{
  // 缩略图只在展示层启用；默认 off，所以不改任何现有行为。
  applyThumb(){
   const mode=thumb.currentMode(typeof wx!=='undefined'?wx:null);
   const p=this.data.presentation;
   const derived=(mode!=='off'&&p&&p.front)?thumb.deriveThumbUrl(p.front.photo,thumb.widthFor(this.properties),mode):null;
   if(derived){this.setData({thumbUrl:derived,useThumb:true});return}
   this.setData({thumbUrl:'',useThumb:false});
  },
  // 一次性回退：派生地址失败必须退回原图，绝不能因此把卡片判成「图片不可用」。
  imageError(){
   if(this.data.useThumb){
    const next=thumb.nextSource(this.data.thumbUrl,this.data.presentation&&this.data.presentation.front&&this.data.presentation.front.photo,true);
    this.setData({thumbUrl:'',useThumb:false,imageUnavailable:!!next.unavailable});return;
   }
   this.setData({imageUnavailable:true});
  },
  artError(){if(this.data.card.schemaVersion===2||this.data.card.backAssetFileId)this.setData({backUnavailable:true});else this.setData({'presentation.back.illustration':localIllustrationFor(this.data.card.speciesId)})},
 fixCloudUrls(p){
  const token=this._assetToken=(this._assetToken||0)+1;
  if(!wx.cloud||!p||automaticMediaDenied())return;
  if(this.data?.card?.serverCardId){
   if(!require('../../lib/recovery-consent').allowed(wx))return;
   for(const [side,src,field,flag]of [['art',p.front.photo,'presentation.front.photo','imageUnavailable'],['original',p.back.illustration,'presentation.back.illustration','backUnavailable']]){
    if(!/^(cloud:\/\/|https?:\/\/)/.test(src||''))continue;
    wx.cloud.callFunction({name:'createArtCard',data:{action:'card_resource',cardId:this.data.card.serverCardId,side}}).then(r=>{if(token!==this._assetToken||!require('../../lib/recovery-consent').allowed(wx))return;if(r.result?.status==='ready'&&r.result.url){this.setData({[field]:r.result.url,[flag]:false});this.applyThumb()}else this.setData({[flag]:true})}).catch(()=>{if(token===this._assetToken)this.setData({[flag]:true})});
   }return;
  }
  if(this.data?.card?.artworkId&&/^(cloud:\/\/|https?:\/\/)/.test(p.front.photo)){wx.cloud.callFunction({name:'speciesIllustration',data:{action:'resource',artworkId:this.data.card.artworkId}}).then(r=>{if(token!==this._assetToken||automaticMediaDenied())return;if(r.result?.status==='ready'&&r.result.url){this.setData({'presentation.front.photo':r.result.url,imageUnavailable:false});this.applyThumb()}else this.setData({imageUnavailable:true})}).catch(()=>{if(token===this._assetToken)this.setData({imageUnavailable:true})});}
  const items=[];
  if(p.back&&p.back.illustration&&p.back.illustration.indexOf('cloud://')===0)items.push(p.back.illustration);
  if(!this.data?.card?.artworkId&&p.front&&p.front.photo&&p.front.photo.indexOf('cloud://')===0)items.push(p.front.photo);
  if(!items.length)return;
  wx.cloud.getTempFileURL({fileList:items}).then(t=>{
   if(token!==this._assetToken||automaticMediaDenied())return;
   if(!t.fileList)return;
   const map={};t.fileList.forEach(f=>{if(f.fileID&&f.tempFileURL)map[f.fileID]=f.tempFileURL});
   const patch={};
   if(p.back&&p.back.illustration&&map[p.back.illustration])patch['presentation.back.illustration']=map[p.back.illustration];
   if(p.front&&p.front.photo&&map[p.front.photo])patch['presentation.front.photo']=map[p.front.photo];
   if(Object.keys(patch).length){patch['imageUnavailable']=false;this.setData(patch);this.applyThumb();}
  }).catch(()=>{});
 },
  readStart(e){const t=e.touches&&e.touches[0];this._readOrigin=t?{x:t.clientX,y:t.clientY}:null;this._readMoved=false},
  readMove(e){const t=e.touches&&e.touches[0];if(t&&this._readOrigin&&Math.hypot(t.clientX-this._readOrigin.x,t.clientY-this._readOrigin.y)>8)this._readMoved=true},
  readEnd(){this._readOrigin=null},
  readCancel(){this._readMoved=true;this._readOrigin=null},
  readTap(){if(!this._readMoved)this.triggerEvent('recordtap');this._readMoved=false}
 }
})
