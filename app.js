// Explicit production environment: do not inherit the DevTools default.
App({
  onLaunch(){
    if (!wx.cloud) { console.warn('[cloud] 基础库过低，无 wx.cloud'); return }
    try { wx.cloud.init({ env: 'nature-prod-d0gufarx064489f0f', traceUser: false }) }
    catch (e) { console.warn('[cloud] init failed', e) }
    // Recovery stays default-off; only retry an explicitly requested revocation.
    require('./native/lib/recovery-consent').retryRevocation(wx).catch(()=>{})
    this.refreshAssetUrls()
    this.retryCloudCleanup().catch(()=>{})
  },
  globalData: {
    species: {
      kingfisher: { id: 'kingfisher', zh: '普通翠鸟', latin: 'Alcedo atthis', no: 'No.0007', finish: '异画版', finishKey: 'alt', stars: 4, tagline: '蓝得像一小块碎掉的天空', habitat: '塘畔 · 溪流', iucn: '无危 LC', family: "翠鸟科 Alcedinidae", season: "全年可见", factTitle: "俯冲入水，几乎不溅水花", factDetail: "从枯枝垂直扎进水里，靠瞬膜护住眼睛；命中率能到七成以上。", knowledge: "翠鸟的眼睛等于自带两套焦距。入水那一刻，水的折射会把猎物的位置「骗」偏，它会主动修正俯冲角度；而且它能看见紫外光 —— 在我们眼里一片蓝的羽毛，在同类眼里亮得多。", facts: [{"title":"俯冲入水，几乎不溅水花","detail":"从枯枝垂直扎进水里，靠瞬膜护住眼睛；命中率能到七成以上。"},{"title":"中国最小的翠鸟","detail":"全长只有 16–18cm，体重 30–40g，比一只麻雀还小一圈。"},{"title":"塘畔与溪流的常客","detail":"爱停在水清、有枯枝伸出的水面；在垂直土岸上挖洞做巢。"}], stats: [{"value":"16–18 cm","label":"体长"},{"value":"约 40 km/h","label":"俯冲时速"},{"value":"无危 LC","label":"IUCN 等级"}], note: '它停在塘边那根枯枝上，蓝得像一小块碎掉的天空——我等了整整一个上午。' },
      egret: { id: 'egret', zh: '白鹭', latin: 'Egretta garzetta', no: 'No.0031', finish: '闪卡版', finishKey: 'holo', stars: 3, tagline: '水面上那一小团不肯落下的云', habitat: '滩涂 · 稻田', iucn: '无危 LC', family: "鹭科 Ardeidae", season: "春秋过境", factTitle: "会「抖脚」把鱼赶出来", factDetail: "繁殖期脚趾变黄，抖动脚掌惊出藏在泥沙里的小鱼虾。", knowledge: "白鹭会「换脸」。头顶的辫羽和背上的蓑羽只在繁殖期长出来，非繁殖期的它是一只光溜溜的普通白鸟 —— 很多人因此在冬天认不出它。", facts: [{"title":"会「抖脚」把鱼赶出来","detail":"繁殖期脚趾变黄，抖动脚掌惊出藏在泥沙里的小鱼虾。"},{"title":"一身白羽曾是奢侈品","detail":"19 世纪欧洲用它繁殖期的饰羽做帽子，一度被大量捕杀，也正是现代鸟类保护的起点。"},{"title":"站在浅水里一动不动","detail":"靠极慢的步伐接近猎物，最后一击只要 0.1 秒。"}], stats: [{"value":"55–65 cm","label":"体长"},{"value":"≈100 cm","label":"翼展"},{"value":"无危 LC","label":"IUCN 等级"}], note: '雾还没散，它站在浅水里，像一团不肯落下的云。' },
      ibis: { id: 'ibis', zh: '朱鹮', latin: 'Nipponia nippon', no: 'No.0021', finish: '编号珍藏版', finishKey: 'numbered', stars: 4, tagline: '从 7 只重新长回一片天空', habitat: '水田 · 浅溪', iucn: '濒危 EN', family: "鹮科 Threskiornithidae", season: "留鸟", factTitle: "1981 年全世界只剩 7 只", factDetail: "在陕西洋县被重新发现，当时整个物种只剩下这一小群。", knowledge: "朱鹮的脸在繁殖期会变成鲜红色 —— 那不是羽毛，是裸露的皮肤充血。它也是全球鸟类中，从「极危」成功降级到「濒危」的极少数案例之一。", facts: [{"title":"1981 年全世界只剩 7 只","detail":"在陕西洋县被重新发现，当时整个物种只剩下这一小群。"},{"title":"繁殖期会把自己「染」灰","detail":"颈部分泌黑色素，用嘴涂到羽毛上 —— 不是换羽变色。"},{"title":"现在约 1 万只","detail":"靠人工繁育与野化放归，从「极危」降到了「濒危」。"}], stats: [{"value":"55–80 cm","label":"体长"},{"value":"7 只到约 1 万","label":"种群变化"},{"value":"濒危 EN","label":"IUCN 等级"}], note: '它从水田里抬起头的那一秒，整片天空好像都安静了一下。' },
      camellia: { id: 'camellia', zh: '山茶', latin: 'Camellia japonica', no: 'No.0088', finish: '标准版', finishKey: 'standard', stars: 2, tagline: '在冬天开花的树', habitat: '山林 · 公园', iucn: '无危 LC', family: "山茶科 Theaceae", season: "11–3 月花期", factTitle: "在最冷的季节开花", factDetail: "花期 11 月到翌年 3 月，靠冬季仍在活动的鸟（如暗绿绣眼鸟）传粉。", knowledge: "山茶和茶树是同一个属的近亲。你喝的茶学名就叫 Camellia sinensis —— 茶、山茶油、院子里那棵红山茶，其实是一家人。", facts: [{"title":"在最冷的季节开花","detail":"花期 11 月到翌年 3 月，靠冬季仍在活动的鸟（如暗绿绣眼鸟）传粉。"},{"title":"花瓣会整朵一起落下","detail":"不像别的花一瓣一瓣掉，它整朵掉下来，落花铺满一地。"},{"title":"叶子里有秘密武器","detail":"叶片含茶皂素，能当天然洗涤剂，也能防虫 —— 古人早就用它洗头。"}], stats: [{"value":"1.5–6 m","label":"树高"},{"value":"11–3 月","label":"花期"},{"value":"无危 LC","label":"IUCN 等级"}], note: '冬天里唯一还在开的花。整朵落下的时候，像谁把花轻轻放在了地上。' },
      moth: { id: 'moth', zh: '绿尾大蚕蛾', latin: 'Actias ningpoana', no: 'No.0142', finish: '闪卡版', finishKey: 'holo', stars: 3, tagline: '长了尾巴的月亮', habitat: '阔叶林 · 灯火下', iucn: '未评估 NE', family: "大蚕蛾科 Saturniidae", season: "5–9 月", factTitle: "成虫完全不吃东西", factDetail: "口器已经退化，羽化后只活 7–10 天，全部能量用来寻找配偶。", knowledge: "它的一生几乎都在「减肥」：幼虫期疯狂吃叶子攒脂肪，变成成虫后一口都不能吃，只能靠存货撑完最后十天。蛾不是不好看的蝴蝶 —— 它是属于夜里的那一半。", facts: [{"title":"成虫完全不吃东西","detail":"口器已经退化，羽化后只活 7–10 天，全部能量用来寻找配偶。"},{"title":"长尾是「骗蝙蝠」的","detail":"尾巴扭动能干扰蝙蝠的回声定位，让捕食手偏掉几厘米。"},{"title":"眼斑会吓人一跳","detail":"受惊时张开前翅，露出四枚眼斑，模仿猫头鹰或蛇的眼睛。"}], stats: [{"value":"10–14 cm","label":"翼展"},{"value":"7–10 天","label":"成虫寿命"},{"value":"未评估 NE","label":"IUCN 等级"}], note: '灯下第一次见，还以为是风吹来的一片叶子，直到它张开了那对尾巴。' },
      pheasant: { id: 'pheasant', zh: '红腹锦鸡', latin: 'Chrysolophus pictus', no: 'No.0210', finish: '编号珍藏版', finishKey: 'numbered', stars: 4, tagline: '中国特有的「金鸡」', habitat: '山地森林', iucn: '无危 LC', family: "雉科 Phasianidae", season: "全年可见", factTitle: "只在中国有野生种群", factDetail: "分布于秦岭以南的山地森林，海拔 500–2500m，是中国的特有鸟种。", knowledge: "它的金色不是色素，而是羽毛里微小结构对光线的散射。一旦被汗水或雨水打湿，这份金色会立刻暗下去 —— 所以它只在干爽的清晨和斜阳里最耀眼。", facts: [{"title":"只在中国有野生种群","detail":"分布于秦岭以南的山地森林，海拔 500–2500m，是中国的特有鸟种。"},{"title":"「凤凰」画稿的灵感之一","detail":"也是中国鸟类学会会徽的原型 —— 一身红金配色，古人称它金鸡。"},{"title":"求偶要跳「之」字舞","detail":"雄鸟侧身把彩色披肩朝雌鸟展开，边转边跳，绕圈炫耀好几分钟。"}], stats: [{"value":"60–110 cm","label":"体长"},{"value":"500–2500 m","label":"栖息海拔"},{"value":"无危 LC","label":"IUCN 等级"}], note: '它从灌丛里走出来，斜阳正好落在披肩上——那天我才明白「金鸡」不是夸张。' },
      sparrow: { id: 'sparrow', zh: '麻雀', latin: 'Passer montanus', no: 'No.0001', finish: '标准版', finishKey: 'standard', stars: 1, tagline: '最容易被忽略的邻居', habitat: '屋檐 · 街巷', iucn: '无危 LC', family: "雀科 Passeridae", season: "全年可见", factTitle: "耳羽黑斑是它的身份证", factDetail: "成年麻雀耳羽处有黑斑、脸颊有白点，一眼就能和别的小雀区分开。", knowledge: "麻雀其实是「定居者」。和多数候鸟不同，它一年四季都在同一个方圆一两公里内活动 —— 你窗前那只，很可能就是去年同一只。", facts: [{"title":"耳羽黑斑是它的身份证","detail":"成年麻雀耳羽处有黑斑、脸颊有白点，一眼就能和别的小雀区分开。"},{"title":"会跟着人住","detail":"筑巢在屋檐、墙缝、空调外机里，是典型的伴人鸟 —— 它选了人类当邻居。"},{"title":"秋天会囤粮","detail":"秋季有一部分个体会集中觅食谷粒，装进嗉囊带回藏起来。"}], stats: [{"value":"12–14 cm","label":"体长"},{"value":"全年","label":"可见期"},{"value":"无危 LC","label":"IUCN 等级"}], note: '它每天七点二十准时出现在窗台，比我上班还准。' }
    }
  },
  getCards() { let cards = wx.getStorageSync('nature.cards.v2'); if (!Array.isArray(cards)) cards = []; const clean = cards.filter(c => c && c.id); if (clean.length !== cards.length) { try { wx.setStorageSync('nature.cards.v2', clean) } catch (e) {} } return clean },
  saveCards(cards) { wx.setStorageSync('nature.cards.v2', cards) },
  updateCardLocation(id, input) {
    const cards=this.getCards(),card=require('./native/lib/collection-model').realCards(cards).find(c=>c.id===id);
    if(!card)throw Error('仅可修改已收藏的真实记录');
    const location=input===null?null:require('./native/lib/location-privacy').normalizeLocation(input,input&&input.consentAt);
    if(input!==null&&!location)throw Error('地点尚未确认');
    const next=Object.assign({},card,{location});this.saveCards(cards.map(c=>c.id===id?next:c));return next;
  },
  addCard(card) {
    const cards = this.getCards().slice()
    if (cards.some(item => item.id === card.id)) return cards.find(item => item.id === card.id)
    cards.push(card)
    this.saveCards(cards)
    this.cloudUpsertCard(card)
    return card
  },
  async cloudUpsertCard() { return {status:'disabled',code:'sync_consent_required'} },
  async cloudSyncNote() { return {status:'disabled',code:'sync_consent_required'} },
  async refreshAssetUrls() { return {status:'retired'} },
  async syncAssets() { return {status:'retired'} },
  async retryCloudCleanup(){const protectedIds=new Set(this.getCards().concat(this.getReadyCards()).map(c=>c.photoObservationId).filter(Boolean));if(this._observation)protectedIds.add(this._observation.id);return require('./native/lib/cloud-cleanup').drain(wx,protectedIds)},
  // 删除永远以「本机生效」为准：能确认云端删除就连云端一起清；确认不了也先删本机，
  // 云端照片转入后台队列重试，不让用户因为云端状态而删不掉自己的卡片。
  async removeCard(cardId) {
    const card = this.getCards().find(c => c.id === cardId)
    if (!card) return {status:'deleted',mode:'missing'}
    const fileId=card.photoFileId||card.originalPhotoAsset?.fileId||card.artAssetFileId||card.artAsset?.fileId
    const observationId=card.photoObservationId
    if(!fileId||!observationId)return this.eraseCard(cardId,'local_only')
    if(!wx.cloud?.callFunction)return this.eraseCard(cardId,'local_only',observationId)
    let code
    try{
      const reply=await wx.cloud.callFunction({name:'deleteObservationAssets',data:{observationId}})
      code=require('./native/lib/card-delete').classify({result:reply&&reply.result})
      if(!code)return this.eraseCard(cardId,(reply.result&&reply.result.mode)||'cloud')
    }catch(e){code=require('./native/lib/card-delete').classify({error:e})}
    // 已入册的真实观察：删了就找不回来，必须让用户再确认一次。
    if(code==='observation_saved')return {status:'needs_confirm',code,message:require('./native/lib/card-delete').messageFor(code)}
    return this.eraseCard(cardId,'local_first',observationId)
  },
  // Escape hatch: the local copy goes away and any cloud cleanup stays queued for retry.
  async forceRemoveCard(cardId) {
    const card = this.getCards().find(c => c.id === cardId)
    if(card&&card.photoObservationId)this.queueCloudCleanup(card.photoObservationId)
    return this.eraseCard(cardId,'forced')
  },
  blockCardRemoval(cardId,code){
    const card=this.getCards().find(c=>c.id===cardId)
    const queued=card&&card.photoObservationId?this.queueCloudCleanup(card.photoObservationId):false
    return {status:'blocked',code,message:require('./native/lib/card-delete').messageFor(code),queued}
  },
  queueCloudCleanup(observationId){
    try{require('./native/lib/cloud-cleanup').enqueue(wx,observationId);return true}catch(e){return false}
  },
  async eraseCard(cardId,mode,pendingObservationId){
    const card=this.getCards().find(c=>c.id===cardId)||{}
    this._dataEpoch = this.getDataEpoch() + 1;
    this.saveCards(this.getCards().filter(c => c.id !== cardId))
    try { wx.removeStorageSync('nature.note.' + cardId) } catch (e) {}
    const queued=pendingObservationId?this.queueCloudCleanup(pendingObservationId):false
    await this.cleanupPaths([card.photoPath,card.originalPhotoAsset?.localPath,card.artPhotoPath].filter(p=>p&&!p.startsWith('cloud://')))
    return {status:'deleted',mode,cloudCleanupPending:queued}
  },
  achievementContext() {const cards=this.getCards(),notesByCard={};cards.forEach(c=>{notesByCard[c.id]=wx.getStorageSync('nature.note.'+c.id)||''});return {notesByCard,events:{shelfUsed:!!(wx.getStorageSync('nature.collection.v1')||{}).shelfUsed,puzzleUsed:!!(wx.getStorageSync('nature.collection.v1')||{}).puzzleUsed,scienceReadSpecies:wx.getStorageSync('nature.scienceReads.v1')||[]}}},
  getBadges() { return {badges:require('./native/lib/badge-model').buildAchievements(this.getCards(),this.achievementContext())} },
  recordScienceRead(speciesId) {const {realCards}=require('./native/lib/collection-model'),{keyOf}=require('./native/lib/badge-model');if(!realCards(this.getCards()).some(c=>keyOf(c)===speciesId&&(c.scienceSnapshot?.status==='available'||(!c.scienceSnapshot&&this.globalData.species[speciesId]))))return false;const previous=wx.getStorageSync('nature.scienceReads.v1'),reads=Array.isArray(previous)?previous:[];if(!reads.includes(speciesId))wx.setStorageSync('nature.scienceReads.v1',reads.concat([speciesId]));return true},
  getSpeciesInfo(name) { try { return wx.getStorageSync('nature.species.' + name) || null } catch (e) { return null } },
  ensureSpeciesInfo() { return Promise.resolve(null) },
  async generateSubmitFor() { return {status:'disabled',code:'explicit_consent_required'} },
  async pollIllustrations() { return {status:'disabled',code:'explicit_consent_required'} },
  async syncCards() { if(!require('./native/lib/recovery-consent').allowed(wx))return {status:'disabled',code:'sync_consent_required'};if(this._cardSync)return this._cardSync;this._cardSync=require('./native/lib/card-recovery').recoverCards(this,wx);try{return await this._cardSync}finally{this._cardSync=null} },
  getSpecies(id) { const s = this.globalData.species[id]; if (s) return s; return this.getSpeciesInfo(id) },
  draftState() {
    const state = wx.getStorageSync('nature.drafts.v4');
    if (state && state.version === 4 && Array.isArray(state.items)) {
      const clean = state.items.filter(d => d && d.id)
      if (clean.length !== state.items.length) { state.items = clean; try { wx.setStorageSync('nature.drafts.v4', state) } catch (e) {} }
      return state;
    }
    const old = wx.getStorageSync('nature.draft.v3');
    const item = old && old.photoPath ? Object.assign({}, old, { id: old.id || 'draft_legacy', updatedAt: old.createdAt || Date.now() }) : null;
    const migrated = { version: 4, activeId: item ? item.id : null, items: item ? [item] : [] };
    if (item) { wx.setStorageSync('nature.drafts.v4', migrated); wx.removeStorageSync('nature.draft.v3'); }
    return migrated;
  },
  getDrafts() { return this.draftState().items },
  startObservation(photoPath) { if(this._observation)this.discardObservation();this._observation={id:'obs_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),photoPath,createdAt:Date.now(),mode:'ready'};return this._observation },
  getObservation(){return this._observation||null},
  discardObservation(){const paths=[this._observation?.artLocalPath,this._observation?.photoSaved?this._observation.photoPath:''].filter(Boolean);if(paths.length)wx.setStorageSync('nature.cleanup.v1',[...new Set(this.getCleanup().concat(paths))]);this._observation=null;if(paths.length)this.retryCleanup().catch(()=>{})},
  getDraft() { if(this._observation)return this._observation;const s = this.draftState(); return s.items.find(d => d.id === s.activeId) || null },
  saveDraft(draft) {
    if(this._observation&&this._observation.id===draft.id){this._observation=Object.assign({},draft);return this._observation}
    const state = this.draftState();
    const existing = draft.id ? state.items.find(d => d.id === draft.id) : state.items.find(d => d.photoPath === draft.photoPath);
    const next = Object.assign({}, draft, { id: existing ? existing.id : draft.id || 'draft_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), updatedAt: Date.now() });
    const items = state.items.filter(d => d.id !== next.id).concat([next]);
    wx.setStorageSync('nature.drafts.v4', { version: 4, activeId: next.id, items }); return next;
  },
  createDraft(draft) { return this.saveDraft(Object.assign({}, draft, { id: 'draft_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) })) },
  selectDraft(id) { const s = this.draftState(); if (!s.items.some(d => d.id === id)) throw new Error('草稿不存在'); wx.setStorageSync('nature.drafts.v4', Object.assign({}, s, { activeId: id })); return this.getDraft(); },
  clearDraft(id) { const s = this.draftState(), target = id || s.activeId; const items = s.items.filter(d => d.id !== target); wx.setStorageSync('nature.drafts.v4', {version:4,activeId:items.length ? items[items.length-1].id : null,items}); },
  getCleanup() { return wx.getStorageSync('nature.cleanup.v1') || [] },
  async cleanupPaths(paths) {
    const refs = new Set(this.getCards().concat(this.getReadyCards(),this.getDrafts()).flatMap(c=>[c.photoPath,c.artPhotoPath,c.artAsset?.localPath,c.originalPhotoAsset?.localPath]).concat([(wx.getStorageSync('nature.profile.v2')||{}).avatarPath]));
    const pending = [...new Set(this.getCleanup().concat(paths))].filter(p => p && !refs.has(p) && !p.startsWith('/assets/'));
    wx.setStorageSync('nature.cleanup.v1', pending);
    const failed = [];
    for (const filePath of pending) {
      await new Promise(resolve => {
        const callbacks={filePath,success:resolve,fail:e=>{if(!/not exist|no such file|not found/i.test(e.errMsg || ''))failed.push(filePath);resolve();}};
        if(filePath.endsWith('.json') && wx.getFileSystemManager) wx.getFileSystemManager().unlink(callbacks); else wx.removeSavedFile(callbacks);
      });
    }
    wx.setStorageSync('nature.cleanup.v1', failed); return failed;
  },
  retryCleanup() { return this.cleanupPaths([]) },
  async deleteDraft(id) {
    const d = this.getDrafts().find(item => item.id === id); if (!d) return [];
    // If either storage write fails, the photo remains referenced or its cleanup intent survives.
    wx.setStorageSync('nature.cleanup.v1', [...new Set(this.getCleanup().concat([d.photoPath]).filter(Boolean))]);
    this.clearDraft(id); return this.retryCleanup();
  },
  getDataEpoch() { return this._dataEpoch || 0 },
  saveAvatar(tempPath) {
    if(!tempPath)return Promise.reject(Error('未选择头像'));
    const epoch=this.getDataEpoch(),token=this._avatarToken=(this._avatarToken||0)+1;
    const discard=filePath=>wx.removeSavedFile({filePath,fail:()=>{try{wx.setStorageSync('nature.cleanup.v1',[...new Set(this.getCleanup().concat(filePath))])}catch(e){}}});
    return new Promise((resolve,reject)=>wx.saveFile({tempFilePath:tempPath,fail:()=>reject(Error('头像保存失败，请重试')),success:async r=>{
      const filePath=r.savedFilePath;
      if(!filePath)return reject(Error('头像保存失败，请重试'));
      if(epoch!==this.getDataEpoch()||token!==this._avatarToken){discard(filePath);return reject(Error('头像保存已取消'))}
      const previous=wx.getStorageSync('nature.profile.v2')||{};
      const next=Object.assign({},previous,{avatarPath:filePath});
      try{wx.setStorageSync('nature.profile.v2',next)}catch(e){discard(filePath);return reject(Error('头像设置未保存，请重试'))}
      if(previous.avatarPath&&previous.avatarPath!==filePath){try{await this.cleanupPaths([previous.avatarPath])}catch(e){}}
      resolve(next);
    }}));
  },
  async clearLocalData() {
    require('./native/lib/cloud-cleanup').forget(wx,new Set(this.getCards().concat(this.getReadyCards()).map(c=>c.photoObservationId).filter(Boolean)));
    this._dataEpoch = this.getDataEpoch() + 1;
    this._observation=null;
    const photos = this.getCards().concat(this.getReadyCards()).flatMap(c=>[c.photoPath,c.artPhotoPath]).filter(p=>p&&!/^(cloud:\/\/|https?:\/\/)/.test(p)).concat(this.getDrafts().map(d=>d.photoPath), this.getCleanup(), wx.getStorageSync('nature.export.files')||[],[(wx.getStorageSync('nature.profile.v2')||{}).avatarPath]);
    // Persist cleanup intent before removing records, so partial file failures can be retried.
    wx.setStorageSync('nature.cleanup.v1', [...new Set(photos.filter(Boolean))]);
    const keys = wx.getStorageInfoSync().keys;
    keys.filter(k=>k.startsWith('nature.') && k !== 'nature.cleanup.v1' && k !== 'nature.cloudCleanup.v1').forEach(k=>wx.removeStorageSync(k));
    return this.retryCleanup();
  },
  exportLocalData() { return {version:1,exportedAt:new Date().toISOString(),cards:this.getCards(),drafts:this.getDrafts(),notes:this.getCards().map(c=>({cardId:c.id,text:wx.getStorageSync('nature.note.'+c.id)||''})),notice:'本地数据备份；照片路径仅在原设备有效，图片请单独导出'}; },
  categoryOf(id) { return id === 'camellia' ? 'plant' : id === 'moth' ? 'insect' : 'bird' },
  matchesFilters(card, category, finish) { return !!card && (category === 'all' || this.categoryOf(card.speciesId || card.id) === category) && (finish === 'all' || card.finishKey === finish) },
  finishes: [
    { key: 'standard', label: '标准版', probability: 72 },
    { key: 'holo', label: '闪卡版', probability: 20 },
    { key: 'alt', label: '异画版', probability: 7 },
    { key: 'numbered', label: '编号珍藏版', probability: 1 }
  ],
  drawFinish(value) { const n = value === undefined ? Math.random() * 100 : value; return this.finishes[n < 72 ? 0 : n < 92 ? 1 : n < 99 ? 2 : 3] },
  decorate(card) {
    card = require('./native/lib/observation-card').normalizeCard(card);
    const sp = this.getSpecies(card.speciesId)||(card.serverCardId&&card.zh?{id:card.speciesId,zh:card.zh,latin:card.latin||''}:null);
    if (!sp) return null;
    const finish = this.finishes.find(f => f.key === card.finishKey) || this.finishes.find(f => f.key === sp.finishKey) || this.finishes[0];
    const protection = { ibis: '国家一级保护动物 · 种群稀少，请勿捕捉、惊扰', pheasant: '国家二级保护动物 · 请勿捕捉、饲养', kingfisher: '三有保护动物 · 请勿捕捉、饲养', egret: '三有保护动物 · 请勿捕捉、饲养', sparrow: '三有保护动物 · 请勿捕捉、饲养' };
    const observedAt = card.observedAt !== undefined ? card.observedAt : card.createdAt;
    const date = observedAt !== undefined && observedAt !== null && observedAt !== '' && Number.isFinite(new Date(observedAt).getTime()) ? new Date(observedAt).toLocaleDateString() : '';
    return Object.assign({}, sp, card, { protection: protection[sp.id] || '', finish: finish.label, finishKey: finish.key, date, image: card.photoPath || '' });
  },
  prepareCard(speciesId, options = {}) {
    const draft = this.getDraft();
    if(this._observation&&draft===this._observation&&(!draft.resourcesVerified||draft.artWork?.artStatus!=='ready'||!draft.artWork.artPhotoPath||!draft.scienceSnapshot||!['recognized','needs_confirmation'].includes(draft.recognition?.status)||!draft.recognition.candidates.some(c=>c.speciesId===speciesId)))throw Error('请先完成识别、彩绘和原照片核验');
    if (!draft || !draft.photoPath || !this.getSpecies(speciesId)) throw new Error('请先保存照片并确认物种');
    if (draft.pendingCard) {
      if (draft.pendingCard.speciesId !== speciesId) {
        if (!options.correctPending || this.getCards().some(c=>c.id===draft.pendingCard.id)) throw new Error('这张照片已制卡，请继续查看原卡或换一张照片');
        const corrected=Object.assign({},draft.pendingCard,{speciesId,artTaskId:'',artPhotoPath:'',artStatus:'',artMessage:'',recognitionSource:draft.recognition?.candidates?.some(c=>c.speciesId===speciesId&&c.source==='baidu')?'service':'manual'});
        this.saveDraft(Object.assign({},draft,{pendingCard:corrected}));
        return corrected;
      }
      return draft.pendingCard;
    }
    const finish = this.drawFinish();
    const card = { id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), speciesId, confirmed:true, photoObservationId:draft.id, photoPath: draft.photoPath, photoFileId: draft.photoFileId || '', category: (draft.recognition && draft.recognition.candidates && draft.recognition.candidates[0] && draft.recognition.candidates[0].category) || 'other',
    recognitionSource: (draft.recognition && draft.recognition.candidates && draft.recognition.candidates.some(candidate=>candidate.speciesId===speciesId&&candidate.source==='baidu')) ? 'service' : 'manual', createdAt: Date.now(), finishKey: finish.key, revealed: false, localSerial: '本地记录 ' + Date.now().toString().slice(-8), identification: 'user-confirmed' };
    this.saveDraft(Object.assign({}, draft, { pendingCard: card }));
    return card;
  },
  getReadyCards(){let cards=wx.getStorageSync('nature.readyCards.v1');const old=wx.getStorageSync('nature.readyCard.v1');if(!Array.isArray(cards))cards=old?[old]:[];const clean=cards.filter(c=>c&&c.id);if(clean.length!==cards.length){try{wx.setStorageSync('nature.readyCards.v1',clean)}catch(e){}}return clean},
  commitObservationCard(card){if(card.schemaVersion===2?card.artStatus!=='ready'||!card.artAsset?.localPath||!card.originalPhotoAsset?.localPath||!card.scienceSnapshot:!card.backAssetFileId||!card.photoPath)throw Error('卡片资源未完成');wx.setStorageSync('nature.readyCards.v1',this.getReadyCards().filter(c=>c.id!==card.id).concat([card]));this._observation=null;return card},
  findCard(id) { const saved = this.getCards().find(c => c.id === id),ready=this.getReadyCards().find(c=>c.id===id);if(ready)return saved||ready; const draft = this.getDrafts().find(d=>d.pendingCard && d.pendingCard.id===id); return saved || (draft ? draft.pendingCard : null) },
  updateCard(card) { const ready=this.getReadyCards();if(ready.some(c=>c.id===card.id)){wx.setStorageSync('nature.readyCards.v1',ready.map(c=>c.id===card.id?card:c));return} const draft = this.getDrafts().find(d=>d.pendingCard && d.pendingCard.id===card.id); if(draft)this.saveDraft(Object.assign({},draft,{pendingCard:card})); else this.saveCards(this.getCards().map(c=>c.id===card.id?card:c)); },
  clearFiledDraft(cardId) { wx.setStorageSync('nature.readyCards.v1',this.getReadyCards().filter(c=>c.id!==cardId)); const draft=this.getDrafts().find(d=>d.pendingCard && d.pendingCard.id===cardId);if(draft)this.clearDraft(draft.id); }
})
