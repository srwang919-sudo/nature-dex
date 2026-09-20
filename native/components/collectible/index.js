const {presentCard}=require('../../lib/card-presentation')
const {localIllustrationFor}=require('../../lib/species-illustration')
Component({
 options:{virtualHost:true},properties:{card:Object,large:Boolean,back:Boolean,motion:Boolean},data:{stars:'',presentation:null,imageUnavailable:false},
 observers:{card:function(c){if(c){const presentation=presentCard(c);this.setData({stars:presentation.starText,presentation,imageUnavailable:false,backUnavailable:false});this.fixCloudUrls(presentation)}}},
 methods:{
  imageError(){this.setData({imageUnavailable:true})},
  artError(){if(this.data.card.backAssetFileId)this.setData({backUnavailable:true});else this.setData({'presentation.back.illustration':localIllustrationFor(this.data.card.speciesId)})},
 fixCloudUrls(p){
  if(!wx.cloud||!p)return;
  const items=[];
  if(p.back&&p.back.illustration&&p.back.illustration.indexOf('cloud://')===0)items.push(p.back.illustration);
  if(p.front&&p.front.photo&&p.front.photo.indexOf('cloud://')===0)items.push(p.front.photo);
  if(!items.length)return;
  wx.cloud.getTempFileURL({fileList:items}).then(t=>{
   if(!t.fileList)return;
   const map={};t.fileList.forEach(f=>{if(f.fileID&&f.tempFileURL)map[f.fileID]=f.tempFileURL});
   const patch={};
   if(p.back&&p.back.illustration&&map[p.back.illustration])patch['presentation.back.illustration']=map[p.back.illustration];
   if(p.front&&p.front.photo&&map[p.front.photo])patch['presentation.front.photo']=map[p.front.photo];
   if(Object.keys(patch).length){patch['imageUnavailable']=false;this.setData(patch);}
  }).catch(()=>{});
 },
  readStart(e){const t=e.touches&&e.touches[0];this._readOrigin=t?{x:t.clientX,y:t.clientY}:null;this._readMoved=false},
  readMove(e){const t=e.touches&&e.touches[0];if(t&&this._readOrigin&&Math.hypot(t.clientX-this._readOrigin.x,t.clientY-this._readOrigin.y)>8)this._readMoved=true},
  readEnd(){this._readOrigin=null},
  readCancel(){this._readMoved=true;this._readOrigin=null},
  readTap(){if(!this._readMoved)this.triggerEvent('recordtap');this._readMoved=false}
 }
})
