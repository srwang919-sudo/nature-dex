const app=getApp()
const {track}=require('../../lib/analytics')
const WORLD_SEEN='nature.worldSnapshot.v1'
const canonicalId=c=>String(c&&(c.canonicalSpeciesId||c.speciesId)||'').normalize('NFKC').trim()
Page({
 onPageScroll(e){const show=e.scrollTop>360;if(show!==this.data.showReturnTop)this.setData({showReturnTop:show})},
 returnTop(){wx.pageScrollTo({scrollTop:0,duration:this.data.reduceMotion?0:200})},
 data:{showReturnTop:false,today:[],worldCards:[],worldPick:null,reduceMotion:false,sceneDecorBroken:false,explore:null},
 onShow(){this._navigating=false;this.refresh();if(app.syncCards)app.syncCards().then(()=>this.refresh()).catch(()=>{})},
 refresh(){
  const cards=app.getCards().filter(c=>c&&!c.sample&&c.kind!=='example').map(c=>app.decorate(c)).filter(Boolean);
  const timeline=require('../../lib/museum-timeline').buildMuseumTimeline(cards,Date.now());
  this.setData({...timeline,reduceMotion:!!wx.getStorageSync('nature.reduceMotion')});
  this.noticeWorldGrowth(timeline.worldCards);
  // 继续探索（§85）：本季地区图鉴进度。只读本机私密足迹；目录或数据异常时诚实隐藏模块。
  try{
   const catalog=(app.globalData&&app.globalData.species)||{};
   const atlas=require('../../lib/region-atlas').buildRegionAtlas(cards,{catalog,now:Date.now()});
   this.setData({explore:atlas&&atlas.total?{seasonLabel:atlas.seasonLabel,found:atlas.found,total:atlas.total,coverage:atlas.coverage}:null});
  }catch(e){this.setData({explore:null})}
 },
 // 自然世界生长埋点（§111–112）：仅上报，不参与界面判定；存储失败不影响首页。
 noticeWorldGrowth(worldCards){
  try{
   const keys=[...new Set((worldCards||[]).map(canonicalId).filter(Boolean))].sort();
   const previous=wx.getStorageSync(WORLD_SEEN);
   const seen=Array.isArray(previous)?previous.filter(k=>typeof k==='string'):null;
   if(seen){const known=new Set(seen);const added=keys.filter(k=>!known.has(k));for(const speciesId of added)track('nature_world_species_added',{speciesId,worldCount:keys.length})}
   wx.setStorageSync(WORLD_SEEN,keys);
  }catch(e){}
 },
 // 点击自然世界里的物种：先给一层信息弹层（§10），再回看真实卡片。
 tapWorld(e){
  const id=e.currentTarget.dataset.id,card=(this.data.worldCards||[]).find(c=>c.id===id);
  if(!card)return;
  const speciesId=canonicalId(card),journey=(this.data.journeys||[]).find(j=>j.speciesId===speciesId)||null,observations=(journey&&journey.observations)||[];
  this.setData({worldPick:{id:card.id,speciesId,zh:card.zh||speciesId,latin:card.latin||'',habitat:card.habitat||'',season:card.season||'',count:journey?journey.count:1,firstLabel:(observations[observations.length-1]||{}).dateLabel||'日期未记录',lastLabel:(observations[0]||{}).dateLabel||'日期未记录'}});
  track('nature_world_species_tapped',{speciesId,count:journey?journey.count:1,zone:String(card.worldZone||'')});
 },
 noop(){},
 // 手绘场景装饰层（§32：分层可复用元素，不是整张 AI 场景图）。
 // 任何一张装饰图加载失败都整层退回 CSS 场景，绝不让首页出现破图。
 hideSceneDecor(){if(!this.data.sceneDecorBroken)this.setData({sceneDecorBroken:true})},
 closeWorldPick(){this.setData({worldPick:null})},
 openWorldCard(){const pick=this.data.worldPick;this.setData({worldPick:null});if(pick)wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(pick.id)})},
 capture(source){if(this._navigating)return;this._navigating=true;try{wx.navigateTo({url:'/native/pages/observe/index?source='+source,fail:()=>{this._navigating=false}})}catch(e){this._navigating=false}},
 observe(){this.capture('camera')},
 album(){this.capture('album')},
 async loadFriendRecent(){if(this.data.friendBusy)return;const token=this._friendToken=(this._friendToken||0)+1;this.setData({friendBusy:true,friendError:'',friendRecent:[]});try{let cursor='',rows=[];do{const r=await require('../../lib/account-services').socialCall(wx,'listRecentSharedSpecies',{cursor});if(token!==this._friendToken)return;rows.push(...(r.species||[]));cursor=r.nextCursor||''}while(cursor&&rows.length<3);if(token===this._friendToken)this.setData({friendRecent:rows.slice(0,3),friendLoaded:true})}catch(e){if(token===this._friendToken)this.setData({friendError:e.message,friendRecent:[]})}finally{if(token===this._friendToken)this.setData({friendBusy:false})}},
 openFriendMuseum(e){wx.navigateTo({url:'/native/pages/friend-museum/index?relationshipId='+encodeURIComponent(e.currentTarget.dataset.id)})},
 onHide(){this._friendToken=(this._friendToken||0)+1;this.setData({friendBusy:false,friendRecent:[],friendLoaded:false})},
 library(){wx.reLaunch({url:'/native/pages/library/index'})},
 openNearby(){wx.navigateTo({url:'/native/pages/nearby/index'})},
 openCard(e){wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(e.currentTarget.dataset.id)})}
})
