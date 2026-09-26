const app=getApp(),{realCards,footprints,locationFreeCard,normalizeCollectionPreference,recordShelfUse}=require('../../lib/collection-model');
Page({
 data:{cards:[],all:[],query:'',footprints:[],ownedCount:0,speciesCount:0,layout:'neat',shelfIndex:0,reduceMotion:false},
 onShow(){this.refresh();this.sync()},
 async sync(){if(!app.syncCards||this.data.syncing)return;this.setData({syncing:true,syncError:''});try{const r=await app.syncCards();this.setData({syncNeedsConsent:r?.code==='sync_consent_required'});this.refresh()}catch(e){this.setData({syncError:e.message==='sync_consent_required'?'云端恢复授权已关闭，请在隐私设置中重新开启。':'云端卡片暂未恢复，请检查网络或本机空间后重试。已有本地收藏仍保留。'})}finally{this.setData({syncing:false})}},
 recoverySettings(){wx.navigateTo({url:'/native/pages/settings/index?section=privacy'})},
 print(){wx.navigateTo({url:'/native/pages/print/index'})},
 refresh(){const owned=realCards(app.getCards()),stored=wx.getStorageSync('nature.collection.v1')||{},preference=normalizeCollectionPreference(stored);if(stored.layout==='puzzle'){try{wx.setStorageSync('nature.collection.v1',Object.assign({},stored,preference))}catch(e){wx.showToast({title:'卡架偏好未保存，可稍后重试',icon:'none'})}}const decorated=owned.map(c=>app.decorate(locationFreeCard(c))).filter(Boolean).reverse(),visible=this.filterCards(decorated,this.data.query);this.setData({all:decorated,cards:visible,ownedCount:owned.length,speciesCount:new Set(owned.map(c=>c.canonicalSpeciesId||c.speciesId).filter(Boolean)).size,layout:preference.layout,shelfIndex:Math.max(0,Math.min(this.data.shelfIndex,visible.length-1)),reduceMotion:!!wx.getStorageSync('nature.reduceMotion')})},
 // 图鉴直达：名称、学名、科属、地点、日期任一命中即可，不再逐页翻找。
 filterCards(list,query){const q=String(query==null?'':query).trim().toLowerCase();if(!q)return list;return list.filter(c=>[c.zh,c.latin,c.family,c.locationLabel,c.date].some(v=>String(v==null?'':v).toLowerCase().includes(q)))},
 searchInput(e){const query=String((e&&e.detail&&e.detail.value)||'');this.setData({query,cards:this.filterCards(this.data.all,query),shelfIndex:0})},
 clearSearch(){this.setData({query:'',cards:this.data.all,shelfIndex:0})},
 setCollectionLayout(e){const layout=e.currentTarget.dataset.layout;if(!['neat','shelf'].includes(layout))return;const old=wx.getStorageSync('nature.collection.v1')||{},next=Object.assign({},old,normalizeCollectionPreference(old),{layout});try{wx.setStorageSync('nature.collection.v1',next);this.setData({layout},()=>{if(layout==='shelf'&&this.data.cards.length){try{wx.setStorageSync('nature.collection.v1',Object.assign({},next,recordShelfUse(next,this.data.cards.length)))}catch(e){wx.showToast({title:'布局已切换，使用记录未保存',icon:'none'})}}})}catch(e){wx.showToast({title:'布局设置未保存，请重试',icon:'none'})}},
 shelfChange(e){const index=Number(e.detail.current);if(Number.isInteger(index)&&index>=0&&index<this.data.cards.length)this.setData({shelfIndex:index})},
 open(e){const id=e.currentTarget.dataset.id;if(!this.data.cards.some(c=>c.id===id))return;wx.navigateTo({url:'/native/pages/card/index?id='+encodeURIComponent(id)})},
 explore(){wx.navigateTo({url:'/native/pages/observe/index?source=camera'})}
});
