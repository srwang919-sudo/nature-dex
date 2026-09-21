# Collection, Social and Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已批准方案 C 落实为自动彩绘制卡、真实收藏双布局、条件勋章及诚实的社交/会员入口。

**Architecture:** 原生 app.js/native 是唯一发布源；保留现有服务调用、幂等操作与迟到响应保护，在纯函数层增加 v2 卡片、地点投影和统一成就模型。五阶段分别可验收；前四阶段只接已有服务，第五阶段只实现 unavailable 边界，不接真实支付或好友后端。

**Tech Stack:** 微信原生 JavaScript/WXML/WXSS、Node node:test/VM、已有 CloudBase 客户端、官方 wcc/wcsc。

**Spec:** `docs/plans/2026-09-21-collection-social-membership-design.md`（commit 928d13d7ff09cfe8c1726368e50ec2ccf61d6fab）。

## Global Constraints

- 示例卡绝不算入真实数据；七张案例的原始数据和资产不可改。
- 所有真实服务失败绝不保存 cards/drafts、不发勋章；不自动原图降级，不恢复“未完成观察”模块。
- 不自动采集/上传位置，用户操作后才请求位置；公开默认显示「地点未公开」。
- 首页/图鉴/我的三栏；首页按钮「拍一张」，移除任务/生境模块。
- 正面为自然史彩绘版式，背面为该次原照片；旧卡不批量重制、不重抽工艺，原图缺失诚实提示。
- 月会员 ¥18、年会员 ¥180，年省 ¥36（约 16.7%）；当前无支付，无真实好友连接，禁止伪造开通/关系/批准。
- 动态合法物种继续支持，不以原七物种或徽章主题做白名单；分类未知不猜测。
- 保留安全错误码、首次隐私同意、减少动态模式、既有翻面手势及取消/卸载保护。
- 不部署、不调用生产模型、不改云资源/密钥、不发布。真实支付与社交服务不属于本计划实施范围。
- 当前工作树有大量既有未提交修改。执行前保存 `git status --short` 与相关 diff 清单，逐块保留；不可 reset/checkout/全量 add，不将他人改动顺带提交。提交步骤遇重叠文件只暂存本任务审核后的 hunks。

## 现状与阶段依赖

当前 observe.confirm(art=false) 仍允许两路径并强制等待 speciesIllustration 背面；app.prepareCard 要求 backAssetFileId。presentCard.back 使用共享插画；home 仍生成任务；library 混有案例；profile 等级依据原七格章节。以上均是此次明确变更点，不应靠改测试掩盖。

阶段 1 → 2 → 3 → 4 → 5；每阶段通过本地测试后暂停审阅。阶段 5 也可独立验收为不可用边界，不依赖外部账号开通。不新增依赖或重构 Taro。

公共类型约定：`Asset={localPath:string,fileId:string}`；`Location={placeId:string,label:string,visibility:'private',consentAt:number,latitude?:number,longitude?:number}`；`Science={status:'available'|'missing',source:string,version:string,fields:Object}`；`CardV2` 保留旧 card 字段并增加 schemaVersion=2、canonicalSpeciesId、originalPhotoAsset、artAsset、scienceSnapshot、observedAt、localDate、location。`events={puzzleUsed:boolean,scienceReadSpecies:string[]}`。

---

## Phase 1 — 卡片模型、生成、科普与隐私

### Task 1: 定义兼容的 CardV2 与公开投影

**Files:** Create `native/lib/observation-card.js`, `native/lib/location-privacy.js`, `tests/native-card-v2.cjs`, `tests/native-location-privacy.cjs`; Modify `app.js`, `native/lib/card-presentation.js`.

**Interfaces:** `normalizeCard(card):CardV2|legacyCard` 不原地修改；`buildScience(species):Science` 只从可信项目资料取值；`publicLocation(location):{label:string}` 固定隐藏；`normalizeLocation(input,consentAt):Location|null` 不调用任何 wx API。

- [ ] Step 1: 写失败测试，加入以下核心断言，另覆盖 knowledge/know 映射、IUCN/中国保护独立、未知资料 missing、旧卡缺照片不得填艺术图：
  ```js
  const assert=require('node:assert/strict');
  const {normalizeCard,buildScience}=require('../native/lib/observation-card');
  const {publicLocation}=require('../native/lib/location-privacy');
  const old={id:'one',speciesId:'海芋',photoPath:'/original',finishKey:'holo'};
  assert.equal(normalizeCard(old).originalPhotoAsset.localPath,'/original');
  assert.equal(old.schemaVersion,undefined);
  assert.equal(buildScience({}).status,'missing');
  assert.deepEqual(publicLocation({label:'私密花园',latitude:31,longitude:121}),{label:'地点未公开'});
  ```
- [ ] Step 2: Run `node --test tests/native-card-v2.cjs tests/native-location-privacy.cjs`，应因模块不存在失败。
- [ ] Step 3: 最小实现：`originalPhotoAsset=card.originalPhotoAsset||{localPath:card.photoPath||'',fileId:card.photoFileId||''}`；艺术资源独立映射 artPhotoPath；canonicalSpeciesId 兼容 speciesId。buildScience 只复制 family/facts/knowledge/know/habitat/season/iucn/protection，来源标项目已有资料，不给缺失字段科学结论。地点需非空 label/placeId 和正数 consentAt，坐标成对且在合法区间；公开投影永不传播输入字段。app.decorate 保留 v2 字段与原始日期，不拿 Date.now 掩盖旧卡缺日期。
- [ ] Step 4: Run `node --test tests/native-card-v2.cjs tests/native-location-privacy.cjs tests/native-card-presentation.cjs tests/native-science-data.cjs`，所有断言通过。
- [ ] Step 5: 逐文件/逐块审核暂存，`git diff --cached --check`；仅提交本任务：`git commit -m "feat: add compatible observation card and location privacy model"`。

### Task 2: 确认后自动制卡，背面原照片与失败原子性

**Files:** Modify `native/pages/observe/index.js`, `native/pages/observe/index.wxml`, `native/pages/observe/index.wxss`, `app.js`, `native/components/collectible/index.js`, `native/components/collectible/index.wxml`, `native/components/collectible/index.wxss`, `native/lib/card-presentation.js`, `native/lib/card-export.js`, `native/pages/card/index.js`, `native/pages/card/index.wxml`, `native/pages/reveal/index.js`; Create `tests/native-auto-card.cjs`; Update `tests/native-strict-create.cjs`, `tests/native-card-back.cjs`, `tests/native-export.cjs`.

**Interfaces:** observe.confirm() 始终走已有 createArtCard；CardV2 由 Task 1 规范化；app.prepareCard 校验 recognized 候选、ready 艺术、原图可用与 scienceSnapshot，而非 backAssetFileId。既有 `createArtCard({api,card,isCurrent,onUpdate})` 和 pollGeneration 保留。

- [ ] Step 1: 用 tests/native-strict-create.cjs 的 VM 注入 fake wx/getApp。新测试记录调用与存储数组；成功断言 `createArtCard` 一次、`speciesIllustration` 零次、正面 artAsset/背面 originalPhotoAsset 不同；循环注入 recognized/生成/原图读取/彩绘 decode/资料服务/最终写入失败，断言 `cards.length===0`、持久 drafts 零、无揭晓导航。重复确认和迟到响应各断言最多一次入册。
- [ ] Step 2: Run `node --test tests/native-auto-card.cjs tests/native-strict-create.cjs`，预期现有双路径/backAsset 依赖断言失败。
- [ ] Step 3: 删除 UI 的直接/艺术选择和 useOriginal 回退入口，唯一确认按钮调用 confirm()；保留同意门，未同意不上传。执行顺序为确认候选→私有艺术生成→buildScience→两面解码→保存原图及最终卡片→揭晓；当前会话缓存操作 ID，不持久化失败草稿。已知本地科普直接填充，动态无资料返回 missing，不发明内容；若用户流程调用了远程资料服务且失败则终止而非包装 missing。移除公共背面生成前置，但不删公共服务/缓存资源。所有 await 后检查 current()；资源失败分类使用现有 exportFailure/资源错误体系，回收未提交资源。collectible 单面切换保留，把 v2 背面渲染为原图加日期/私密地点标识；科学资料移至详情。旧卡独立兼容分支，缺原图明确空态。
- [ ] Step 4: Run `node --test tests/native-auto-card.cjs tests/native-strict-create.cjs tests/native-card-v2.cjs tests/native-card-interaction.cjs tests/native-card-back.cjs tests/native-export.cjs tests/native-export-decode.cjs`。更新旧“背面必须插画”断言为 v2 原照与 legacy 兼容双契约，不能删除失败用例。验证导出与屏幕正背一致且默认不含地点/坐标。
- [ ] Step 5: 审核 task 文件增量并 `git diff --cached --check`，`git commit -m "feat: generate watercolor cards automatically with original photo backs"`。

## Phase 2 — 首页与直接相机

### Task 3: 单次拍照入口和三栏导航

**Files:** Modify `native/pages/home/index.js`, `native/pages/home/index.wxml`, `native/pages/home/index.wxss`, `native/pages/observe/index.js`; Update `tests/native-home-three-tabs.cjs`, `tests/native-c-exploration.cjs`, `tests/native-c-second-pass.cjs`; Create `tests/native-direct-camera.cjs`. Read-only `native/components/navigation/index.js`, `native/lib/tab-model.js`.

**Interfaces:** 首页导航 `/native/pages/observe/index?source=camera`；observe 在 onLoad 接收 camera/album，onReady 消费一次，后续 onShow 不重开。

- [ ] Step 1: VM fake openCamera/album 累加调用数；`onLoad({source:'camera'});onReady();onShow();onShow()` 断言相机一次，相册零；album 对称；无 source 不擅自开相机。模板断言首页没有任务/生境模块，按钮为拍一张，底栏准确三项。
- [ ] Step 2: Run `node --test tests/native-direct-camera.cjs tests/native-home-three-tabs.cjs`，应在 source=camera 未消费处失败。
- [ ] Step 3: 使用 `const source=this._entrySource;this._entrySource='';if(source==='camera')this.openCamera();else if(source==='album')this.album();` 在 onReady 消费；首页 observe 增加导航锁和 fail 回收，更新按钮文案与相册文案。删除首页 task/habitat 绑定，不改 hero 资产；保留真实今日收集及回顶入口。相机权限失败显示相册/返回，不能阻断导航或反复申请。
- [ ] Step 4: Run `node --test tests/native-direct-camera.cjs tests/native-home-three-tabs.cjs tests/native-c-exploration.cjs tests/native-c-second-pass.cjs tests/native-c-navigation.cjs`。只调整已被设计替代的首页任务断言，保留数据真实性和三栏断言。
- [ ] Step 5: 审核后 `git diff --cached --check`，`git commit -m "feat: open camera directly from simplified home"`。

## Phase 3 — 收藏布局与私有足迹

### Task 4: 真实收藏两布局与主动地点

**Files:** Create `native/lib/collection-model.js`, `tests/native-collection-layout.cjs`, `tests/native-footprints.cjs`; Modify `native/pages/library/index.js`, `native/pages/library/index.wxml`, `native/pages/library/index.wxss`, `native/pages/card/index.js`, `native/pages/card/index.wxml`, `native/pages/card/index.wxss`, `app.js`; Update `tests/native-library-runtime.cjs`, `tests/native-local-parity.cjs`.

**Interfaces:** `realCards(cards):Card[]` 排除 sample/example/failed/cancelled/processing；`footprints(cards):{placeId,label,count}[]` 只含 consentAt>0 私有地点且不含坐标；`setCollectionLayout('neat'|'puzzle')` 写偏好，实际渲染成功后写 puzzleUsed 事件。`app.updateCardLocation(id,location|null)` 验证真实持有卡并持久化成功后刷新。

- [ ] Step 1: 新测试核心为 `assert.deepEqual(realCards([{sample:true},{id:'bad',artStatus:'failed'},{id:'ok'}]).map(c=>c.id),['ok'])`；地点 fixture 包含未同意/重复/删除，断言聚合只有主动地点且 JSON 无 latitude/longitude。VM 调切换检查卡 ID 集合不变，存储失败不修改 UI 偏好。
- [ ] Step 2: Run `node --test tests/native-collection-layout.cjs tests/native-footprints.cjs`，预期新模块缺失。
- [ ] Step 3: 用相同 cards 数组渲染整齐网格/错落拼图（CSS 不随机重排数据），所有卡有可点名称。library 移除案例/未拥有问号章节展示，但保留原案例模块文件。足迹使用上述聚合，本地私有说明固定可见；无数据不请求权限。详情地点编辑提供文本输入保存及显式“选择地点”按钮；仅该按钮调用 wx.chooseLocation，拒绝时回到文本输入，不自动上传坐标。app 保存位置采用独立字段白名单，移除位置写 null；分享 payload 一律 publicLocation 投影。
- [ ] Step 4: Run `node --test tests/native-collection-layout.cjs tests/native-footprints.cjs tests/native-location-privacy.cjs tests/native-library-runtime.cjs tests/native-local-parity.cjs`；VM spy 确认 onLoad/onShow 零定位调用，分享无私密 label/坐标。核对是否需微信位置声明，仅按实际 API 和现有平台要求列为外部配置门，不擅自开启权限。
- [ ] Step 5: 审核后 `git diff --cached --check`，`git commit -m "feat: add real collection layouts and private voluntary footprints"`。

## Phase 4 — 条件勋章、个人与本地设置

### Task 5: 统一十二条件与真实等级

**Files:** Modify `native/lib/badge-model.js`, `native/lib/profile-model.js`, `app.js`, `native/pages/profile/index.js`, `native/pages/profile/index.wxml`, `native/pages/profile/index.wxss`, `native/pages/reveal/index.js`, `native/pages/reveal/index.wxml`, `native/pages/library/index.js`, `native/pages/library/index.wxml`, `native/pages/card/index.js`, `native/pages/card/index.wxml`; Create `tests/native-condition-achievements.cjs`; Update `tests/native-species-badges.cjs`, `tests/native-c-profile.cjs`, `tests/native-profile-page-runtime.cjs`.

**Interfaces:** `buildAchievements(cards,{notesByCard,events}):{id,name,progress,target,earned}[]`；`profileLevel(speciesCount):{level,label,current,next}`；app.getBadges 返回这一套，不继续两种勋章累计；`recordScienceRead(speciesId)` 仅详情主动打开科普时按真实持有物种去重。

- [ ] Step 1: table-driven 测试逐个条件阈值前/正好/超过；构造 20 个动态 speciesId，植物/鸟/虫各3、同种3条、3篇非空笔记、4个localDate、3个主动地点、puzzleUsed 与10物种阅读。断言名数组严格为初识自然/三叶档案/飞羽来信/微观访客/重逢之约/细察之心/四时相逢/山野行者/风物成册/博物志人/拼图成画/守护目光；失败/示例全不计，unknown 分类不计类别。
- [ ] Step 2: Run `node --test tests/native-condition-achievements.cjs`，旧物种主题规则应失败。
- [ ] Step 3: 各规则统一 `earned=progress>=target` 并 clamp 进度；图标复用十二本地资产但名称/条件来源唯一模型，不改 PNG。notes 从现有 nature.note.<id> 读取并 trim。日期优先 localDate、旧记录只从有效 createdAt 本地日期推导；不补不存在的地点/阅读。等级按全部真实去重物种数，沿用公开里程碑3/6/7的称号，7以上不伪造新阈值：顶级显示总物种数与已达当前最高等级。解锁 seen 事件与卡入册分离，卡保存成功后才比较前后 earned，不依赖尚未成功的 pending。
- [ ] Step 4: Run `node --test tests/native-condition-achievements.cjs tests/native-species-badges.cjs tests/native-c-profile.cjs tests/native-profile-page-runtime.cjs tests/native-c-discovery-animation.cjs`；替换旧主题获得断言，保留首卡/失败/重复/案例/存储异常覆盖。
- [ ] Step 5: 审核后 `git diff --cached --check`，`git commit -m "feat: unify conditional nature achievements and real species levels"`。

### Task 6: 主动头像、隐私、帮助反馈、关于

**Files:** Modify `native/pages/profile/index.js`, `native/pages/profile/index.wxml`, `native/pages/profile/index.wxss`, `native/pages/settings/index.js`, `native/pages/settings/index.wxml`, `native/pages/settings/index.wxss`, `app.js`; Create `tests/native-profile-settings.cjs`.

**Interfaces:** `nature.profile.v2={avatarPath,nickname}` 仅本地；`saveAvatar(tempPath)` 保存文件成功后更新偏好，失败保留旧头像；设置页以 query section=privacy/help/about 显示本地子区块，不注册假反馈后端。

- [ ] Step 1: VM 测试头像取消/保存失败/成功，断言未选择不调用选择 API，失败不写偏好；设置页常量测试隐私默认隐藏地点、无 authenticated=true 伪标记、反馈不自动发网络/附照片。
- [ ] Step 2: Run `node --test tests/native-profile-settings.cjs`，预期缺头像行为。
- [ ] Step 3: profile 用用户主动 chooseAvatar 事件+wx.saveFile 成功持久化，保留旧文件直到新偏好写成，清除本地数据包含头像。设置页保留低动效、识别同意、双重清除及导出迟到保护；移除旧草稿管理可见模块。帮助展示操作/权限排错和用户手动复制反馈文本，无自动上传；关于展示实际 package 版本和 AI纪念非鉴别声明。案例教学若保留只能帮助独立入口，明显示例。
- [ ] Step 4: Run `node --test tests/native-profile-settings.cjs tests/native-local-parity.cjs tests/native-consent-runtime.cjs tests/native-c-accessibility.cjs`，验证清除不复活头像/导出/私密数据。
- [ ] Step 5: 审核后 `git diff --cached --check`，`git commit -m "feat: add local avatar privacy and help settings"`。

## Phase 5 — 好友与支付不可用边界（无后端连接）

### Task 7: 诚实的会员与好友说明入口

**Files:** Create `native/lib/availability-model.js`, `tests/native-membership-social-boundary.cjs`; Modify `native/pages/profile/index.js`, `native/pages/profile/index.wxml`, `native/pages/profile/index.wxss`, `native/pages/settings/index.js`, `native/pages/settings/index.wxml`, `native/pages/settings/index.wxss`.

**Interfaces:** `membershipView():{availability:'unavailable',monthly:18,yearly:180,saving:36}`；`socialView():{availability:'unavailable',friends:[]}`。不定义真实 purchase/acceptCopy API，不接 claimGift；未来关系、公开授权、复制批准依设计模型需另行服务计划。

- [ ] Step 1: 新测试断言 `membershipView().saving===membershipView().monthly*12-membershipView().yearly`；VM 注入会抛错的 wx.requestPayment/wx.cloud.callFunction，点击会员/好友入口不得触发；模板必须包含暂未开放、明确公开物种、复制需持有人批准，无假开通状态或好友 fixture。
- [ ] Step 2: Run `node --test tests/native-membership-social-boundary.cjs`，应因新模块缺失失败。
- [ ] Step 3: 两个入口导航 settings?section=membership/friends 本地说明。会员月18年180省36，按钮 disabled 并有文字说明；好友空状态说明登录/CloudBase前置和复制批准要求。任何本地 profile.active/paid 值都不映射到开通 UI。精确隐私规则引用 Task1 的公开投影，不显示示例好友或卡片复制成功。
- [ ] Step 4: Run `node --test tests/native-membership-social-boundary.cjs tests/native-security-boundary.cjs tests/native-profile-settings.cjs`；全程网络 spy 调用数零。
- [ ] Step 5: 审核后 `git diff --cached --check`，`git commit -m "feat: expose honest unavailable membership and friends entry points"`。

## Final Gate — 本地验证与外部验收清单

### Task 8: 回归、官方编译与未验证项记录

**Files:** Create `docs/plans/2026-09-21-collection-social-membership-verification.md`; Update `tests/natural-history-badges-baseline.cjs` 仅拆出首页可变与案例不变契约，`docs/RELEASE_ACCEPTANCE.md`。

**Interfaces:** 所有阶段接口保持一致；真实云服务/支付/好友“可用”不能由本地测试推出。

- [ ] Step 1: 先运行 `node --test tests/*.cjs`，记录旧契约失败；逐条核对设计变更，禁止删除安全测试。保留7案例/资产哈希原常量，不为让测试通过重采样；首页不再要求旧首页哈希，应改成当前结构契约。
- [ ] Step 2: Run `node --test tests/*.cjs` 和 `npm run build:weapp`，期望全通过；build仅原生校验，不称上传或真实包。Run `node --test tests/badge-assets.cjs tests/badge-pack-size.cjs tests/natural-history-badges-baseline.cjs`，主包保守计数 <2MiB，案例原哈希全部相同。
- [ ] Step 3: JS/JSON 与官方模板编译，使用实际安装路径，每个模板单文件运行：
  ```bash
  node - <<'NODE'
  const fs=require('fs'),cp=require('child_process'),path=require('path');
  function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(p,x.name)):[path.join(p,x.name)]);}
  for(const p of ['app.js',...walk('native').filter(p=>p.endsWith('.js'))])cp.execFileSync(process.execPath,['--check',p]);
  for(const p of ['app.json',...walk('native').filter(p=>p.endsWith('.json'))])JSON.parse(fs.readFileSync(p,'utf8'));
  const bin='/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/';
  const tmp=fs.mkdtempSync('/tmp/nature-collection-compile-');
  for(const p of walk('native')){
   if(p.endsWith('.wxml'))cp.execFileSync(bin+'wcc',['-d','-o',tmp+'/wxml.js',p],{stdio:'pipe'});
   if(p.endsWith('.wxss'))cp.execFileSync(bin+'wcsc',['-o',tmp+'/wxss.js',p],{stdio:'pipe'});
  }
  console.log('JS/JSON/WXML/WXSS verified');
  NODE
  ```
- [ ] Step 4: 在可用本地模拟器/真机验收375/390/430宽、放大字体、减少动态、单次相机、原图背面与导出、一键确认失败不保存、主动地点权限拒绝、真实双布局。无可用环境时在 verification 文档逐项标“未验证”，不为了截图部署或调用生产模型。记录微信位置声明/审核、支付商户、社交登录/服务端权限均是外部门，不能假称已开通。
- [ ] Step 5: 记录精确测试数量、命令结果、包体、哈希和剩余外部门；`git diff --cached --check` 后仅提交审核文件：`git commit -m "docs: record collection redesign verification and external gates"`。

## 计划自查与交接

- 规格覆盖：任务1–2覆盖数据/正背/科普/原子失败；任务3首页和单次相机；任务4真实布局与私有地点；任务5十二条件/真实等级；任务6头像/设置；任务7未开放社交/支付；任务8静态、资产和真机门。
- 类型一致：统一 canonicalSpeciesId 与兼容 speciesId，Location.visibility 固定 private，Science.status 仅 available/missing，生成失败不伪装 missing；events 字段由任务4/5使用一致。
- 执行前需再次读取设计与当前 diff；本计划提交不等于实施授权，也不包含产品代码变更。由主控安排唯一开发者逐阶段执行，审阅通过后进入下一阶段。
