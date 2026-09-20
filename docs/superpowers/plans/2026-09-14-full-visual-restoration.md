# 「去大自然里」小程序全量视觉恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前原生微信小程序中交付水墨首页、示例/真实卡分区、章节九格、完整个人档案、二级设置与三 Tab 导航，并保证已有观察闭环不回退。

**Architecture:** 以 `native/` 为唯一主实现，`app.js` 继续提供真实卡与观察状态；新建纯函数视图模型隔离示例卡、章节和个人统计。底栏仍由 `native/lib/tab-model.js` 管理，新增个人页并把现有设置页下沉为二级路由；`dist/` 由构建产生，不手工编辑。

**Tech Stack:** 微信原生小程序、CommonJS、WXML、WXSS、微信云函数、Node.js `node:test`、微信开发者工具基础库 3.17.2

**Spec:** `docs/plans/2026-09-14-full-visual-restoration-design.md`

## Global Constraints

- 只修改小程序源文件 `native/`、根配置、资产和测试，不手工修改 `dist/`。
- 可见底栏固定为“发现 / 收藏 / 我的”三个入口。
- 七物种示例固定标注“示例卡 · 非本人拍摄”，不得进入 `app.getCards()` 或真实统计。
- 四工艺固定为标准一星、闪卡二星、异画四星、编号珍藏五星；概率保持 72%/20%/7%/1%。
- 标题使用霞鹜文楷，正文为苹方优先系统字体，数字使用 DaziranliNum。
- 现有拍摄、识别、保护、地点、分享赠送、导出、清理和低动效能力不得回退。
- 所有任务测试先行；本轮仅编写计划，不实际执行计划中的 Git 提交。

---

## Task 1：统一字体与四工艺五星契约

**Files:**
- Modify: `app.wxss`
- Modify: `native/lib/card-presentation.js`
- Modify: `native/components/collectible/index.wxml`
- Modify: `native/components/collectible/index.wxss`
- Test: `tests/native-card-presentation.cjs`

**Interfaces:**
- Consumes: 现有工艺键 `standard | holo | alt | numbered`。
- Produces: `getCraftPresentation(finish) -> {label, stars, probability, ariaLabel}`。

- [ ] **Step 1: 写失败测试**

```js
assert.deepEqual(getCraftPresentation('numbered'), {
  label:'编号珍藏版', stars:5, probability:0.01, ariaLabel:'编号珍藏版，五星工艺'
})
assert.equal(getCraftPresentation('alt').stars, 4)
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-card-presentation.cjs`

Expected: FAIL，现有 presentation 不含稳定的星级和读屏字段。

- [ ] **Step 3: 实现最小映射与字体类**

```js
const craft={standard:['标准版',1,.72],holo:['闪卡版',2,.20],alt:['异画版',4,.07],numbered:['编号珍藏版',5,.01]}
function getCraftPresentation(key){const [label,stars,probability]=craft[key];return{label,stars,probability,ariaLabel:`${label}，${['零','一','二','三','四','五'][stars]}星工艺`}}
```

WXML 同时输出工艺名与 `★/☆`；标题、正文、数字分别绑定 `.font-title/.font-body/.font-number`。

- [ ] **Step 4: 验证**

Run: `node --test tests/native-card-presentation.cjs tests/native-card-back.cjs`

Expected: PASS；保护提示位置与文案不变，星级不出现“评分”含义。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add app.wxss native/lib/card-presentation.js native/components/collectible tests/native-card-presentation.cjs
git commit -m "feat: align miniapp craft stars and typography"
```

## Task 2：建立七张示例卡与真实卡隔离

**Files:**
- Create: `native/lib/example-cards.js`
- Create: `native/components/example-gallery/index.js`
- Create: `native/components/example-gallery/index.json`
- Create: `native/components/example-gallery/index.wxml`
- Create: `native/components/example-gallery/index.wxss`
- Modify: `app.json`
- Create: `tests/native-example-cards.cjs`

**Interfaces:**
- Consumes: `assets/images/{ibis,kingfisher,pheasant,egret,sparrow,moth,camellia}.jpg`。
- Produces: `getExampleCards() -> ExampleCard[]`，其中 `kind:'example'`、`sourceLabel:'示例卡 · 非本人拍摄'`、`readOnly:true`。

- [ ] **Step 1: 写失败测试**

```js
const cards=getExampleCards()
assert.equal(cards.length,7)
assert.ok(cards.every(x=>x.kind==='example'&&x.readOnly&&x.sourceLabel==='示例卡 · 非本人拍摄'))
assert.equal(countOwnedSpecies(cards),0)
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-example-cards.cjs`

Expected: FAIL，`native/lib/example-cards.js` 尚不存在。

- [ ] **Step 3: 实现只读数据与组件**

```js
const ids=['ibis','kingfisher','pheasant','egret','sparrow','moth','camellia']
const cards=ids.map(id=>Object.freeze({kind:'example',id,photo:`/assets/images/${id}.jpg`,sourceLabel:'示例卡 · 非本人拍摄',readOnly:true}))
module.exports={getExampleCards:()=>cards.slice()}
```

组件不触发 `app.saveCard`、赠送或导出；所有卡面及弹层重复显示来源声明。

- [ ] **Step 4: 验证**

Run: `node --test tests/native-example-cards.cjs tests/native-page-data-contract.cjs`

Expected: PASS；七物种顺序稳定，示例对象不能流入真实卡装饰与统计。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add native/lib/example-cards.js native/components/example-gallery app.json tests/native-example-cards.cjs
git commit -m "feat: add clearly labelled example card gallery"
```

## Task 3：实现水墨首页与附近入口

**Files:**
- Modify: `native/pages/home/index.js`
- Modify: `native/pages/home/index.wxml`
- Modify: `native/pages/home/index.wxss`
- Create: `assets/visual/mountain-far.png`
- Create: `assets/visual/mountain-mid.png`
- Create: `assets/visual/pine-foreground.png`
- Create: `tests/native-home-visual.cjs`

**Interfaces:**
- Consumes: `app.getCards()`、`getExampleCards()`、`nature.reduceMotion`。
- Produces: 首页数据 `{ownedCards, examples, nearbySummary, reduceMotion}` 与导航 `observe()`、`nearby()`。

- [ ] **Step 1: 写失败测试**

```js
assert.match(wxml,/去大自然里/)
assert.match(wxml,/附近生境/)
assert.match(wxml,/我的真实收藏/)
assert.match(wxml,/认识卡片/)
assert.match(wxml,/示例卡 · 非本人拍摄/)
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-home-visual.cjs`

Expected: FAIL，首页尚无完整分层与示例/真实分区。

- [ ] **Step 3: 实现页面层级**

```js
refresh(){const owned=app.getCards().map(c=>app.decorate(c)).filter(Boolean);this.setData({ownedCards:owned.slice(-4).reverse(),examples:getExampleCards(),reduceMotion:!!wx.getStorageSync('nature.reduceMotion')})}
```

山景层设置 `pointer-events:none`，低动效类禁用雾层动画；空态按钮进入观察页；附近继续导航到当前附近承载页。

- [ ] **Step 4: 验证**

Run: `node --test tests/native-home-visual.cjs tests/native-flow.cjs tests/native-tabs.cjs`

Expected: PASS；首页不写入收藏数据，旧观察入口与附近入口可达。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add native/pages/home assets/visual tests/native-home-visual.cjs
git commit -m "feat: restore ink landscape miniapp home"
```

## Task 4：实现真实收藏与章节九格

**Files:**
- Create: `native/lib/chapter-model.js`
- Modify: `native/pages/library/index.js`
- Modify: `native/pages/library/index.wxml`
- Modify: `native/pages/library/index.wxss`
- Create: `tests/native-chapters.cjs`

**Interfaces:**
- Consumes: `app.getCards()` 装饰后的真实卡数组。
- Produces: `computeChapterProgress(chapter,cards) -> {found,total:9,milestones}` 与 3×3 章节数据。

- [ ] **Step 1: 写 0/3/6/9 测试**

```js
assert.deepEqual(computeChapterProgress(city, owned.slice(0,3)),{found:3,total:9,milestones:[3]})
assert.throws(()=>computeChapterProgress(city, examples),/owned cards only/)
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-chapters.cjs`

Expected: FAIL，章节模型尚不存在。

- [ ] **Step 3: 实现九格和真实列表**

```js
function computeChapterProgress(chapter,cards){if(cards.some(x=>x.kind==='example'))throw Error('owned cards only');const found=new Set(cards.map(x=>x.speciesId));const n=chapter.cells.filter(x=>found.has(x.speciesId)).length;return{found:n,total:9,milestones:[3,6,9].filter(x=>n>=x)}}
```

WXML 先渲染章节，再渲染“我的真实收藏”；重复物种只点亮一次，原筛选功能保留。

- [ ] **Step 4: 验证**

Run: `node --test tests/native-chapters.cjs tests/native-page-data-contract.cjs tests/native-flow.cjs`

Expected: PASS；九格进度只受真实卡影响，收藏筛选仍可用。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add native/lib/chapter-model.js native/pages/library tests/native-chapters.cjs
git commit -m "feat: add nine-cell chapters to real collection"
```

## Task 5：新增完整“我的”页并下沉设置

**Files:**
- Create: `native/lib/profile-model.js`
- Create: `native/pages/profile/index.js`
- Create: `native/pages/profile/index.wxml`
- Create: `native/pages/profile/index.wxss`
- Modify: `native/pages/settings/index.js`
- Modify: `native/pages/settings/index.wxml`
- Modify: `native/pages/settings/index.wxss`
- Modify: `app.json`
- Create: `tests/native-profile.cjs`

**Interfaces:**
- Consumes: 真实卡、笔记、草稿、导出记录、`nature.checkins` 与现有设置存储键。
- Produces: `buildProfile(cards,state) -> {level,xp,nextXp,stats,badges,notes}`、`checkIn(dateKey) -> {pointsAdded,cumulativeDays}`。

- [ ] **Step 1: 写个人档案与打卡测试**

```js
assert.equal(buildProfile(cards,state).stats.species,new Set(cards.map(x=>x.speciesId)).size)
assert.deepEqual(checkIn('2026-09-14'),{pointsAdded:2,cumulativeDays:8})
assert.deepEqual(checkIn('2026-09-14'),{pointsAdded:0,cumulativeDays:8})
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-profile.cjs`

Expected: FAIL，个人档案模型与页面尚不存在。

- [ ] **Step 3: 实现档案和设置分层**

```js
Page({data:{profile:null},onShow(){this.setData({profile:buildProfile(app.getCards(),readProfileState())})},settings(){wx.navigateTo({url:'/native/pages/settings/index'})},note(){wx.navigateTo({url:'/native/pages/note/index'})}})
```

页面完整展示 Lv、经验、统计、累计打卡、徽章、笔记、记录；设置页保留低动效、草稿恢复、JSON 备份、文件重试清理和双重确认删除。

- [ ] **Step 4: 验证**

Run: `node --test tests/native-profile.cjs tests/native-export.cjs tests/native-local-parity.cjs`

Expected: PASS；漏签不清零、同日不重复加分、现有数据管理能力仍可达。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add native/lib/profile-model.js native/pages/profile native/pages/settings app.json tests/native-profile.cjs
git commit -m "feat: add complete profile and secondary settings"
```

## Task 6：三 Tab 路由与旧能力回归

**Files:**
- Modify: `native/lib/tab-model.js`
- Modify: `native/components/navigation/index.js`
- Modify: `native/components/navigation/index.wxml`
- Modify: `app.json`
- Modify: `tests/native-tabs.cjs`
- Create: `tests/native-visual-restoration-regression.cjs`

**Interfaces:**
- Consumes: `/native/pages/home/index`、`library/index`、`profile/index`，以及旧观察/揭晓/卡片/笔记/设置路由。
- Produces: `tabs=[{key:'discover',label:'发现'},{key:'collection',label:'收藏'},{key:'me',label:'我的'}]`。

- [ ] **Step 1: 写三 Tab 与旧路由测试**

```js
assert.deepEqual(tabs.map(x=>x.label),['发现','收藏','我的'])
for(const route of ['observe','reveal','card','note','settings'])assert.ok(app.pages.some(x=>x.includes(`/pages/${route}/`)))
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-tabs.cjs tests/native-visual-restoration-regression.cjs`

Expected: FAIL，当前第三 Tab 仍指向设置页且名称不一致。

- [ ] **Step 3: 实现路由映射**

```js
const tabs=Object.freeze([
 {key:'discover',label:'发现',url:'/native/pages/home/index',icon:'leaf'},
 {key:'collection',label:'收藏',url:'/native/pages/library/index',icon:'book'},
 {key:'me',label:'我的',url:'/native/pages/profile/index',icon:'person'}
])
```

导航组件只展示这三项；非 Tab 页面继续使用 `navigateTo`，不得删除旧页面。

- [ ] **Step 4: 验证**

Run: `node --test tests/native-tabs.cjs tests/native-flow.cjs tests/native-visual-restoration-regression.cjs`

Expected: PASS；底栏恰好三项，所有旧功能路由仍注册并可达。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add native/lib/tab-model.js native/components/navigation app.json tests/native-tabs.cjs tests/native-visual-restoration-regression.cjs
git commit -m "refactor: simplify miniapp navigation without regressions"
```

## Task 7：微信开发者工具逐页验收

**Files:**
- Create: `docs/acceptance/visual-restoration/wechat-page-checklist.md`
- Create: `docs/acceptance/visual-restoration/feature-regression.md`
- Create: `tests/native-visual-static.cjs`

**Interfaces:**
- Consumes: Tasks 1–6 全部页面、组件和测试。
- Produces: 可重复的构建检查与逐页截图索引。

- [ ] **Step 1: 写静态完整性测试**

```js
assert.ok(fs.existsSync('assets/visual/mountain-far.png'))
assert.match(homeWxml,/示例卡 · 非本人拍摄/)
assert.match(profileWxml,/经验/)
assert.match(profileWxml,/徽章/)
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-visual-static.cjs`

Expected: FAIL，直到所有视觉资源与页面结构完成。

- [ ] **Step 3: 建立逐页验收表**

```md
| 页面 | 模拟器 | 字体/动效 | 必查状态 | 截图 | 结果 |
|---|---|---|---|---|---|
| 发现首页 | iPhone 15 | 大字体/低动效 | 山雾松林、示例声明、真实空态 | home-large.png | 通过 |
```

清单逐页覆盖首页、七种示例详情、观察、揭晓、卡片正背面、收藏九格、附近、我的、设置，并列出旧功能回归结果。

- [ ] **Step 4: 构建并在开发者工具验收**

Run: `npm run build:weapp && node --test tests/*.cjs`

Expected: 构建成功且测试全绿。随后用微信开发者工具打开项目根目录，按清单检查 iPhone mini、iPhone 15、Android 小屏的浅色、大字体、低动效并保存截图。

- [ ] **Step 5: 记录提交步骤但本轮不执行**

```bash
git add docs/acceptance/visual-restoration tests/native-visual-static.cjs
git commit -m "test: verify visual restoration page by page"
```

## 完成门槛与自审

- [ ] 水墨首页、示例/真实卡隔离、九格章节、完整个人页、二级设置和三 Tab 均有测试证据。
- [ ] 四工艺五星、三类字体、附近入口和七物种示例在页面间一致。
- [ ] `node --test tests/*.cjs` 与 `npm run build:weapp` 全部通过。
- [ ] 微信开发者工具逐页截图齐全，无溢出、截断、假收藏或旧功能不可达。
- [ ] 规格覆盖对应 Task 1 字体/工艺、Task 2 示例、Task 3 首页/附近、Task 4 九格、Task 5 我的/设置、Task 6 导航/回归、Task 7 微信验收。
- [ ] 类型与命名一致：`getCraftPresentation`、`getExampleCards`、`computeChapterProgress`、`buildProfile`、`tabs` 只使用本文定义的签名。

