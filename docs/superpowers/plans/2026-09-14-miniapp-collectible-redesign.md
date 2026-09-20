# Miniapp Collectible Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认参考升级三个主页面，同时保留收藏卡正面、提供七物种一页线稿科普背面和可信导出。

**Architecture:** 原生页面保留现有存储与业务入口；新增纯函数展示模型及七物种向量线稿供组件与Canvas共同使用。导出单独执行图片预解码事务，识别与分享只消费显式状态，不伪装后端已连通。

**Tech Stack:** 微信小程序原生JS/WXML/WXSS、Canvas2D、Node assert/VM、微信官方wcc/wcsc。

**Spec:** docs/plans/2026-09-14-miniapp-collectible-redesign-design.md

## Global Constraints

- 本文仅计划；文档交付后暂停，不执行以下步骤。
- 正面保留实拍大图、编号、工艺徽标、独立底部中文/学名/五星位；不改杂志封面。
- 保持nature.cards.v2与nature.drafts.v4兼容；旧1–4基础等级不凭空升级。
- 工艺72/20/7/1；等级、工艺、保护与置信度分离。
- 不定位、不假好友、不假认证、不上传、不preview。
- 无Git仓库，不初始化、不提交；以测试和文件审查作为各阶段交付证据。

---

### Task 1: 统一卡片展示模型与七份线稿

**Files:**
- Create: native/lib/card-presentation.js、native/lib/species-line-art.js、tests/native-card-presentation.cjs
- Modify: native/components/collectible/index.js、native/components/collectible/index.wxml、native/components/collectible/index.wxss、tests/native-card-back.cjs、tests/native-card-interaction.cjs、tests/native-science-data.cjs

**Interfaces:** `presentCard(card)` 返回 `{starText,front,back}`；front含photo/no/finish/name/latin，back含title/latin/artId/rows/protection/no/date。 `lineArtFor(speciesId)` 返回100×100坐标内的向量命令数组，每条为 `{op:'M'|'L'|'Q'|'C',points:number[]}`；未知id返回空数组。

- [ ] Step 1: 创建测试并先运行，断言新模块缺失使其失败：

```js
const assert=require('node:assert/strict');
const {presentCard}=require('../native/lib/card-presentation');
const {lineArtFor}=require('../native/lib/species-line-art');
assert.equal(presentCard({stars:3}).starText,'★★★☆☆');
assert.equal(presentCard({stars:99}).starText,'★★★★★');
const ids=['kingfisher','egret','ibis','pheasant','sparrow','moth','camellia'];
assert.equal(new Set(ids.map(id=>JSON.stringify(lineArtFor(id)))).size,7);
assert.deepEqual(lineArtFor('unknown'),[]);
```

Run: `node tests/native-card-presentation.cjs`。

- [ ] Step 2: 实现纯函数的等级边界及核心背面字段，禁止重写存储卡片：

```js
const level=Math.max(1,Math.min(5,Math.floor(Number(card.stars)||1)));
const starText='★'.repeat(level)+'☆'.repeat(5-level);
const rows=[['分类',card.family],['识别与行为',card.factTitle],
 ['栖息 / 季节',[card.habitat,card.season].filter(Boolean).join(' · ')],
 ['IUCN 评估',card.iucn]].filter(row=>row[1]);
```

七份线稿分别按设计文档中的形态绘制并人工核对，不采用同一图加不同标签。组件与导出共同读取向量源；WXML以100rpx小尺寸Canvas2D绘制，按设备像素比设画布尺寸，不增外部请求。卡背可见与card变化时绘制，组件卸载后取消迟到绘制；不启动持续动画。使用纸色#FFFBF2、正文#26352E、辅助#58655D、线#D9D7C9。

- [ ] Step 3: 以固定背面区块替换scroll-view；核心行标签20–22rpx、值24–26rpx；保护信息独立区块，不通过overflow:hidden截断。缺字段删除整行。完整资料入口保留facts/knowledge/stats全文。删除已失效的内部滚动断言，改为无scroll-view断言：

```js
const fs=require('node:fs');
const markup=fs.readFileSync('native/components/collectible/index.wxml','utf8');
assert.ok(!markup.includes('scroll-view'));
assert.ok(markup.includes('中国保护信息'));
assert.ok(!markup.includes('back-photo'));
```

- [ ] Step 4: 运行 `node tests/native-card-presentation.cjs`、`node tests/native-card-back.cjs`、`node tests/native-card-interaction.cjs`、`node tests/native-science-data.cjs`。保持edge-on翻面、连续点击锁、8px拖动阈值、cancel与低动效测试通过；检查7张正背小屏无裁字，长文转详情而不是缩小到不可读。

### Task 2: 导出预解码与同母版绘制

**Files:**
- Create: native/lib/decode-photo.js、tests/native-export-decode.cjs
- Modify: native/lib/card-export.js、native/pages/card/index.js、native/pages/card/index.wxml、tests/native-export.cjs

**Interfaces:** `decodePhoto(canvas,src,isCurrent,timeoutMs=10000)` 返回Promise图片对象；失败reject且释放onload/onerror/timer。card-export消费Task1的presentCard与lineArtFor。页面成功后才发布exportPath。

- [ ] Step 1: 创建解码失败/超时/过期测试，先运行失败：

```js
const assert=require('node:assert/strict');
const {decodePhoto}=require('../native/lib/decode-photo');
(async()=>{
 let image;
 const canvas={createImage(){return image={}}};
 const pending=decodePhoto(canvas,'missing',()=>true,20);
 image.onerror(new Error('decode failed'));
 await assert.rejects(pending);
 await assert.rejects(decodePhoto(canvas,'slow',()=>true,1));
 const stale=decodePhoto(canvas,'old',()=>false,20);image.onload();
 await assert.rejects(stale);
})().catch(e=>{console.error(e);process.exitCode=1});
```

Run: `node tests/native-export-decode.cjs`。

- [ ] Step 2: 切换导出canvas为type="2d"，取得节点并设置width/height；以canvas.createImage的onload为绘制门：

```js
const image=await decodePhoto(canvas,card.photoPath||card.image,isCurrent);
if(!isCurrent())throw new Error('stale export');
render(canvas.getContext('2d'),presentCard(card),plan,image);
```

同步修改render使用Canvas2D属性API，不混用旧setFillStyle；getImageInfo仅获取尺寸和DPI信息，不能绕过decodePhoto。所有失败清exportPath/exporting，显示照片读取失败提示；不删除用户卡片。printBack无实拍图，不发无意义照片读取请求。

- [ ] Step 3: 扩展native-export.cjs，断言与presentCard共享五星、字段顺序和线稿；保留821×1121、750×1050、安全区≥71、低DPI提醒、保护区域硬底线。解码失败时fake render计数为0、保存成功计数为0，清除代次变化后的结果不发布。使用已有app.getDataEpoch，避免新增第二套清除代次。

- [ ] Step 4: 运行 `node tests/native-export-decode.cjs`、`node tests/native-export.cjs`、`node tests/native-local-parity.cjs`。对比7物种屏幕正背与导出PNG；照片、星级、工艺、线稿和保护文字一致，导出不含私人笔记。

### Task 3: 三个主页面的数据化视觉迁移

**Files:**
- Modify: native/pages/home/index.js、native/pages/home/index.wxml、native/pages/home/index.wxss、native/pages/note/index.js、native/pages/note/index.wxml、native/pages/note/index.wxss、native/pages/settings/index.js、native/pages/settings/index.wxml、native/pages/settings/index.wxss、native/components/navigation/index.wxss、tests/native-local-parity.cjs
- Modify: native/pages/observe/index.js、native/pages/observe/index.wxml、native/pages/observe/index.wxss

**Interfaces:** 沿用app.getCards/getDrafts/matchesFilters/getSpecies；统计只基于收藏，不读示例列表；附近只读已有habitat/season。

- [ ] Step 1: 在native-local-parity.cjs的现有home VM追加断言，先记录旧UI不满足参考分组的截图；保留真实计数与组合筛选测试：

```js
home.setData({category:'plant',filter:'holo'});home.refresh();
assert.ok(home.data.cards.every(c=>c.speciesId==='camellia'&&c.finishKey==='holo'));
assert.equal(home.data.total,2);
assert.equal(home.data.recent.length,1);
```

使用现有测试中两种三卡fixture；空数据独立fixture断言total为0且示例不增加total。阅读note页面源码，断言不调用getLocation；settings保留清除双确认测试。

- [ ] Step 2: 将三张参考的顶栏、留白和分组映射到设计文档所列真实字段；首页卡网格仍使用 `<collectible card="{{item}}"/>`，附近显示“生境观察指南”，我的显示“本地收藏”。不引入参考中的假距离/用户名/认证数字。导航各项保持可点击及安全区，拍摄激活黄、图鉴激活薄荷色。

第二张参考映射到observe而非替换home：大圆相机、相册/附近入口、今日收集、待发现。复用现有shoot/album入口，不合并鉴别到快门；今日卡片使用：

```js
const today=new Date().toDateString();
const todaysCards=app.getCards().filter(card=>card.createdAt&&new Date(card.createdAt).toDateString()===today);
const ownedIds=new Set(app.getCards().map(card=>card.speciesId));
const undiscovered=Object.values(app.globalData.species).filter(species=>!ownedIds.has(species.id));
```

我的统计区域保留三个真实值：物种数、收藏数、不同日期数；参考经验条改为有明确分母7的章节进度。不加入未实现的徽章/订阅/积分。为上述今日筛选加入跨日期fixture，昨天记录不计入今日、无createdAt不冒充今日。

- [ ] Step 3: 运行 `node tests/native-local-parity.cjs`。截图覆盖空数据/多条重复/植物+闪卡无结果/超长笔记/低动效；与参考逐页并排核对，记录差异，不以代码测试代替视觉验收。

### Task 4: 识别与分享状态、全流程回归

**Files:**
- Create: native/lib/recognition-result.js、tests/native-recognition-contract.cjs
- Modify: native/contracts/services.js、native/pages/observe/index.js、native/pages/observe/index.wxml、native/lib/card-presentation.js、native/lib/card-export.js、native/pages/card/index.wxml、tests/native-flow.cjs、README.md

**Interfaces:** `classifyRecognition(result,available)` 返回 `{status,candidates}`；available=false始终unavailable；只接收真实result内的候选与confidence，不生成随机或默认confidence。展示模型输出verificationLabel取自recognitionSource；不存在来源为“用户确认 / 本地记录”，不得显示认证成功。

- [ ] Step 1: 新测试先失败：

```js
const assert=require('node:assert/strict');
const {classifyRecognition}=require('../native/lib/recognition-result');
assert.equal(classifyRecognition(null,false).status,'unavailable');
assert.equal(classifyRecognition({status:'unknown',candidates:[]},true).status,'unknown');
assert.equal(classifyRecognition({status:'needs_confirmation',candidates:[{speciesId:'ibis',confidence:.4}]},true).status,'needs_confirmation');
```

Run: `node tests/native-recognition-contract.cjs`。

- [ ] Step 2: 保留契约available:false；未配置分支直接显示未接通，不播放虚假服务器识别进度；演示入口独立且明确。候选/unknown/failed均保留草稿，取消与换图沿用_token使迟到响应失效。真实recognized仍经过用户确认，不从confidence推断基础星级。公开share继续只用sample物种路径；对未来源卡不得加认证徽章。

- [ ] Step 3: 运行所有 `tests/native-*.cjs`；对每个native JS运行node --check、每个JSON运行JSON.parse；官方单文件编译：

```sh
/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc-exec/wcc -d -o /tmp/nature-card-template.js native/components/collectible/index.wxml
/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc-exec/wcsc -o /tmp/nature-card-style.js native/components/collectible/index.wxss
```

对全部native模板/样式重复该单文件命令。确认packOptions仍排除开发文件、全部实际资源可达，并报告保守体积。

- [ ] Step 4: 主控组织真机验收：拍摄/相册 → 未接通说明或明确演示/手动确认 → 揭晓 → 正背3D → 入册 → 重开 → 导出照片成功与失败 → 分享公共资料。记录屏幕与PNG对应截图、权限拒绝和未知恢复结果。README只写有当前证据的完成项；后端、认证、PDF、下单、好友赠送仍标未开放。
