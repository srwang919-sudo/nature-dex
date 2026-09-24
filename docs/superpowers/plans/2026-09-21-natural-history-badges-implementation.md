# Natural History Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用严格的英文动态提示词升级两条艺术生成链路，并新增十二个不同物种主题的十二枚透明 PNG 自然徽章，在图鉴、我的与揭晓中以真实收藏状态呈现。

**Architecture:** 云函数继续分别承担私有 I2I 卡面与公共 T2I 物种插画；提示词由服务端可信物种名构造，客户端无 prompt 控制权。新增单一 `badge-model` 管理十二主题及一主题一张彩色资产，三个页面只消费同一模型并用 CSS 呈现未解锁态；案例、首页和既有卡片母版保持不变。

**Tech Stack:** 原生微信小程序、CommonJS、微信云开发、混元图像模型、Node `node:test`、透明 RGBA PNG。

**Spec:** `docs/plans/2026-09-21-natural-history-badges-design.md`

**Approved execution amendments (2026-09-21):** source images are already supplied; do not regenerate or overwrite them. Distribution copies are 256×256 RGBA PNGs, each≤60KiB, combined≤720KiB and main package<2MiB. Preserve dynamic validated speciesId support outside curated metadata; missing Latin/habitat is omitted, not rejected. This directory has no Git repository: all commit steps are skipped, no git init. Final evidence is recorded in docs/RELEASE_ACCEPTANCE.md.

## Global Constraints

- 不修改现有首页结构、交互、路由与主题素材。
- 不修改原七张博物志案例的数据、图片、顺序和不计收藏口径。
- `createArtCard` 失败不得以原图回退为成功艺术卡。
- `speciesIllustration` 不接收用户照片；ready 公共缓存继续跨用户复用。
- 英文提示词只能由服务端经过校验的物种名动态构造，拒绝客户端 prompt 覆盖。
- 新增恰好 12 个独立 1024×1024 RGBA 彩色透明 PNG，主题固定为赤狐、丹顶鹤、帝王蝶、毒蝇伞、银杏、梅花鹿、朱鹮、大熊猫、扬子鳄、红腹锦鸡、雪豹、普通翠鸟，每主题一张。
- 未解锁态必须复用同一 PNG，以 CSS 灰度、低饱和与透明度处理，不生成 locked 资产。
- 徽章解锁只统计真实卡，排除 `kind === 'example'` 与 `sample`；重复观察不重复揭晓。
- 减少动态模式直接显示徽章最终态，不震动、不旋转。

---

## File Structure

- `cloudfunctions/createArtCard/prompt.js`：私有卡面英文 prompt 的唯一构造器。
- `cloudfunctions/speciesIllustration/prompt.js`：公共物种插画英文 prompt 和 `watercolor-t2i-v2` 版本。
- `cloudfunctions/createArtCard/index.js`、`cloudfunctions/speciesIllustration/index.js`：调用构造器，不接受事件中的 prompt。
- `native/lib/badge-model.js`：十二主题、单一资产、真实收藏解锁和首次解锁判定。
- `assets/badges/*.png`：12 个透明 PNG。
- `native/pages/library/*`：图鉴徽章轨道。
- `native/pages/profile/*`：类别成就与物种徽章并列呈现。
- `native/pages/reveal/*`：首次解锁徽章揭晓。
- `tests/cloud-art-prompts.cjs`、`tests/native-species-badges.cjs`、`tests/badge-assets.cjs`：服务端、状态与资产契约测试。

### Task 1: 锁定首页、案例与严格失败基线

**Files:**
- Create: `tests/natural-history-badges-baseline.cjs`
- Test: `tests/natural-history-badges-baseline.cjs`

**Interfaces:**
- Consumes: `native/pages/home/index.{js,wxml,wxss}`、`native/lib/example-cards.js`、`native/lib/art-card.js`。
- Produces: `HOME_BASELINE_SHA256` 与七案例 ID/顺序契约；严格失败不得写 `artPhotoPath` 的回归保护。

- [ ] **Step 1: 写基线测试**

```js
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const {getExampleCards}=require('../native/lib/example-cards');
test('home and seven examples remain unchanged',()=>{
  const current=['native/pages/home/index.js','native/pages/home/index.wxml','native/pages/home/index.wxss'].map(hash);
  assert.deepEqual(current,HOME_BASELINE_SHA256);
  assert.deepEqual(getExampleCards().map(card=>card.speciesId),['kingfisher','egret','ibis','camellia','moth','pheasant','sparrow']);
});
```

把实施开始时读取到的三个真实哈希写入 `HOME_BASELINE_SHA256`，不得使用空串或示意值。

- [ ] **Step 2: 运行既有严格失败测试**

Run: `node tests/native-art-card.cjs && node tests/native-strict-create.cjs`

Expected: PASS；失败结果没有新增艺术路径，也不标记 ready。

- [ ] **Step 3: 运行新基线测试**

Run: `node --test tests/natural-history-badges-baseline.cjs`

Expected: PASS，首页三文件与七案例顺序被锁定。

- [ ] **Step 4: 提交基线**

```bash
git add tests/natural-history-badges-baseline.cjs
git commit -m "test: lock home and example card baseline"
```

### Task 2: 服务端英文动态提示词

**Files:**
- Create: `cloudfunctions/createArtCard/prompt.js`
- Create: `cloudfunctions/speciesIllustration/prompt.js`
- Modify: `cloudfunctions/createArtCard/index.js`
- Modify: `cloudfunctions/speciesIllustration/index.js`
- Test: `tests/cloud-art-prompts.cjs`

**Interfaces:**
- Consumes: `buildPrivateArtPrompt(speciesName: string)`、`buildPublicSpeciesPrompt(speciesName: string)` 的可信名称输入。
- Produces: `PRIVATE_STYLE_VERSION = 'watercolor-i2i-v2'`、`PUBLIC_STYLE_VERSION = 'watercolor-t2i-v2'` 和英文 prompt 字符串。

- [ ] **Step 1: 写失败测试**

```js
const test=require('node:test'),assert=require('node:assert/strict');
const privatePrompt=require('../cloudfunctions/createArtCard/prompt');
const publicPrompt=require('../cloudfunctions/speciesIllustration/prompt');
test('server prompts are English, dynamic and defensive',()=>{
  const a=privatePrompt.buildPrivateArtPrompt('朱鹮');
  const b=publicPrompt.buildPublicSpeciesPrompt('普通翠鸟');
  for(const text of [a,b]){
    assert.match(text,/natural-history watercolor/i);
    assert.match(text,/No text, letters, numbers/i);
    assert.doesNotMatch(text,/[一-鿿]/);
  }
  assert.match(a,/Nipponia nippon|Crested Ibis/i);
  assert.match(b,/Common Kingfisher|Alcedo atthis/i);
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/cloud-art-prompts.cjs`

Expected: FAIL，两个 prompt 模块尚不存在。

- [ ] **Step 3: 实现可信名称映射与模板**

```js
const names={ibis:'Crested Ibis (Nipponia nippon)',kingfisher:'Common Kingfisher (Alcedo atthis)'};
function trustedSpeciesName(speciesId){const name=names[speciesId];if(!name)throw Error('invalid_species');return name}
function buildPrivateArtPrompt(name){return `Create a refined natural-history watercolor portrait of the confirmed species "${name}" from the supplied observation photograph. Preserve the individual animal or plant's true anatomy, proportions, diagnostic markings, colors, pose, and visible condition. Isolate one clear subject, keep a quiet habitat-informed background, soft natural light, translucent watercolor washes, colored-pencil details, subtle cold-press paper grain, museum field-guide accuracy, and generous editorial breathing room. No text, letters, numbers, labels, borders, frames, logos, signatures, fantasy traits, duplicated body parts, invented markings, or species substitution. This artwork is commemorative and must not be used as identification evidence.`}
```

完整映射至少覆盖现有七物种与新增三物种 `panda`、`chinese-alligator`、`snow-leopard`；公共构造器使用设计文档的完整公共模板。

- [ ] **Step 4: 接入云函数并拒绝覆盖**

`createArtCard/index.js` 用 `trustedSpeciesName(event.speciesId)` 构造 prompt；`speciesIllustration/index.js` 用相同可信英文名构造公共 prompt，并把缓存键输入改为 `watercolor-t2i-v2|speciesId`。两处继续拒绝事件中的 `prompt` 字段。

- [ ] **Step 5: 运行云函数测试**

Run: `node --test tests/cloud-art-prompts.cjs tests/cloud-hy-art.cjs tests/cloud-watercolor-t2i.cjs tests/cloud-species-watercolor.cjs`

Expected: PASS；同一 v2 物种并发只生成一次，第二用户命中同一 ready 缓存；失败不返回原图。

- [ ] **Step 6: 提交提示词升级**

```bash
git add cloudfunctions/createArtCard cloudfunctions/speciesIllustration tests/cloud-art-prompts.cjs tests/cloud-species-watercolor.cjs
git commit -m "feat: add trusted English natural-history prompts"
```

### Task 3: 生成并验证十二枚透明徽章

**Files:**
- Create: `assets/badges/red-fox.png`
- Create: `assets/badges/red-crowned-crane.png`
- Create: `assets/badges/monarch-butterfly.png`
- Create: `assets/badges/fly-agaric.png`
- Create: `assets/badges/ginkgo.png`
- Create: `assets/badges/sika-deer.png`
- Create: `assets/badges/ibis.png`
- Create: `assets/badges/giant-panda.png`
- Create: `assets/badges/chinese-alligator.png`
- Create: `assets/badges/golden-pheasant.png`
- Create: `assets/badges/snow-leopard.png`
- Create: `assets/badges/common-kingfisher.png`
- Create: `tests/badge-assets.cjs`

**Interfaces:**
- Consumes: 十二个固定物种主题和设计文档的彩色珐琅/古铜规范。
- Produces: 12 个 1024×1024 RGBA 透明 PNG，路径与名称严格固定。

- [ ] **Step 1: 写失败的 PNG 清单测试**

```js
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const names=['red-fox.png','red-crowned-crane.png','monarch-butterfly.png','fly-agaric.png','ginkgo.png','sika-deer.png','ibis.png','giant-panda.png','chinese-alligator.png','golden-pheasant.png','snow-leopard.png','common-kingfisher.png'];
test('exactly twelve transparent badge PNGs exist',()=>{
  assert.deepEqual(fs.readdirSync('assets/badges').sort(),names.sort());
  for(const name of names){const bytes=fs.readFileSync(`assets/badges/${name}`);assert.equal(bytes.subarray(1,4).toString(),'PNG')}
});
```

测试再解析 IHDR，断言宽高均为 1024、color type 为 6（RGBA），并抽查四角 alpha 为 0。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/badge-assets.cjs`

Expected: FAIL，`assets/badges` 或 12 个目标文件尚不存在。

- [ ] **Step 3: 逐一生成十二个不同主题**

使用图像生成工具为赤狐、丹顶鹤、帝王蝶、毒蝇伞、银杏、梅花鹿、朱鹮、大熊猫、扬子鳄、红腹锦鸡、雪豹、普通翠鸟逐一生成独立 1024×1024 彩色透明 PNG。统一提示：`single centered collectible enamel natural-history badge, antique bronze rim, scientifically recognizable {species}, quiet Chinese habitat motifs, restrained moss green and warm mineral colors, subtle embossed depth, transparent background, no text, no letters, no numbers, no logo, no square plate`。每个主题必须单独生成与人工检查，不从一张拼图裁切。

- [ ] **Step 4: 锁定单资产状态规则**

不得生成 `*-locked.png` 或 `*-earned.png`。测试断言文件名不含这两个后缀；未解锁态在页面使用 `.species-badge:not(.earned) image{filter:grayscale(1) saturate(.25);opacity:.48}`，已解锁态显示原始彩色资产。

- [ ] **Step 5: 验证资产**

Run: `node --test tests/badge-assets.cjs`

Expected: PASS；目录恰好 12 个文件，全部 1024×1024 RGBA 且透明角像素。

- [ ] **Step 6: 提交资产**

```bash
git add assets/badges tests/badge-assets.cjs
git commit -m "feat: add transparent species badge set"
```

### Task 4: 建立单一物种徽章模型

**Files:**
- Create: `native/lib/badge-model.js`
- Modify: `app.js`
- Test: `tests/native-species-badges.cjs`

**Interfaces:**
- Consumes: `buildSpeciesBadges(cards: Card[]): SpeciesBadge[]`，真实卡字段 `speciesId`、`kind`、`sample`。
- Produces: `SpeciesBadge {key,speciesId,name,asset,earned,firstCardId}`；`app.getBadges()` 返回既有 `badges` 和新增 `speciesBadges`。

- [ ] **Step 1: 写失败测试**

```js
const test=require('node:test'),assert=require('node:assert/strict');
const {buildSpeciesBadges,firstUnlockedBadge}=require('../native/lib/badge-model');
test('only real species cards unlock one of twelve badges',()=>{
  const cards=[{id:'sample',speciesId:'ibis',sample:true},{id:'real',speciesId:'kingfisher'}];
  const badges=buildSpeciesBadges(cards);
  assert.equal(badges.length,12);
  assert.equal(badges.find(x=>x.speciesId==='ibis').earned,false);
  assert.equal(badges.find(x=>x.speciesId==='kingfisher').earned,true);
  assert.equal(firstUnlockedBadge(cards.slice(0,1),cards).speciesId,'kingfisher');
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `node --test tests/native-species-badges.cjs`

Expected: FAIL，`badge-model.js` 尚不存在。

- [ ] **Step 3: 实现十二主题定义与纯函数**

```js
const definitions=Object.freeze([
 {key:'species-red-fox',speciesId:'red-fox',name:'月夜赤狐',asset:'/assets/badges/red-fox.png'},
 {key:'species-red-crowned-crane',speciesId:'red-crowned-crane',name:'湿地丹顶',asset:'/assets/badges/red-crowned-crane.png'},
 {key:'species-monarch-butterfly',speciesId:'monarch-butterfly',name:'迁徙之翼',asset:'/assets/badges/monarch-butterfly.png'},
 {key:'species-fly-agaric',speciesId:'fly-agaric',name:'菌林信号',asset:'/assets/badges/fly-agaric.png'},
 {key:'species-ginkgo',speciesId:'ginkgo',name:'金叶时刻',asset:'/assets/badges/ginkgo.png'},
 {key:'species-sika-deer',speciesId:'sika-deer',name:'林间梅影',asset:'/assets/badges/sika-deer.png'},
 {key:'species-ibis',speciesId:'ibis',name:'朱鹮守望',asset:'/assets/badges/ibis.png'},
 {key:'species-panda',speciesId:'panda',name:'竹林邻居',asset:'/assets/badges/giant-panda.png'},
 {key:'species-alligator',speciesId:'chinese-alligator',name:'湿地古鳄',asset:'/assets/badges/chinese-alligator.png'},
 {key:'species-pheasant',speciesId:'pheasant',name:'锦羽山林',asset:'/assets/badges/golden-pheasant.png'},
 {key:'species-snow-leopard',speciesId:'snow-leopard',name:'雪山幽灵',asset:'/assets/badges/snow-leopard.png'},
 {key:'species-kingfisher',speciesId:'kingfisher',name:'溪流蓝光',asset:'/assets/badges/common-kingfisher.png'}
]);
```

`buildSpeciesBadges` 先过滤案例和 sample，再按不同 `speciesId` 点亮；`firstUnlockedBadge(before,after)` 只返回从 false 变 true 的第一枚，重复卡返回 `null`。

- [ ] **Step 4: 接入 app 聚合但不改既有类别阈值**

`app.getBadges()` 保留原 `badges` 和 `other`，新增 `speciesBadges: buildSpeciesBadges(cards)`；不修改 `plant/bird/insect/mammal` 的 need。

- [ ] **Step 5: 运行模型和既有统计测试**

Run: `node --test tests/native-species-badges.cjs tests/native-c-profile.cjs tests/native-profile-page-runtime.cjs`

Expected: PASS；案例不解锁，重复不重复解锁，既有类别统计不回归。

- [ ] **Step 6: 提交模型**

```bash
git add native/lib/badge-model.js app.js tests/native-species-badges.cjs
git commit -m "feat: add real-collection species badge model"
```

### Task 5: 接入图鉴和我的

**Files:**
- Modify: `native/pages/library/index.js`
- Modify: `native/pages/library/index.wxml`
- Modify: `native/pages/library/index.wxss`
- Modify: `native/pages/profile/index.js`
- Modify: `native/pages/profile/index.wxml`
- Modify: `native/pages/profile/index.wxss`
- Test: `tests/native-species-badges.cjs`

**Interfaces:**
- Consumes: `app.getBadges().speciesBadges`。
- Produces: 图鉴 `speciesBadges` 横向轨道；我的 `speciesBadges` 网格；统计 `stats.badges = earnedCategory + earnedSpecies`。

- [ ] **Step 1: 扩充失败测试**

静态断言 library/profile WXML 都绑定 `item.asset`、`item.name`、`item.earned`，并断言 profile runtime 的徽章统计为类别已得数加物种已得数。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/native-species-badges.cjs tests/native-c-profile.cjs`

Expected: FAIL，页面尚未读取 `speciesBadges`。

- [ ] **Step 3: 接入图鉴轨道**

在自然章节后增加 `scroll-view scroll-x`，每项使用 `<image src="{{item.asset}}" mode="aspectFit"/>`；未获得文字为“等待相遇”，已获得为“已经遇见”。图像加载失败显示本地 CSS 叶片占位与物种名称，不使用 emoji。

- [ ] **Step 4: 接入我的网格与真实统计**

既有类别勋章区域保持；新增“物种相遇徽章”十二格。`profile.stats.badges` 等于两个数组中 `earned` 的总数，不计案例。未解锁项和已解锁项都绑定 `item.asset`，仅通过 `.species-badge:not(.earned) image` 的 CSS 灰度、低饱和与透明度区分。

- [ ] **Step 5: 运行测试并提交**

Run: `node --test tests/native-species-badges.cjs tests/native-c-profile.cjs tests/native-profile-page-runtime.cjs tests/native-tabs.cjs`

Expected: PASS；首页测试哈希仍通过，七案例仍为七张。

```bash
git add native/pages/library native/pages/profile tests/native-species-badges.cjs tests/native-c-profile.cjs
git commit -m "feat: show species badges in library and profile"
```

### Task 6: 在首次收藏揭晓物种徽章

**Files:**
- Modify: `native/pages/reveal/index.js`
- Modify: `native/pages/reveal/index.wxml`
- Modify: `native/pages/reveal/index.wxss`
- Test: `tests/native-species-badges.cjs`
- Test: `tests/native-c-accessibility.cjs`

**Interfaces:**
- Consumes: 收藏前后真实卡数组和 `firstUnlockedBadge(before,after)`。
- Produces: `unlockedBadge: SpeciesBadge|null`、`badgeRevealed: boolean`；首次获得展示一次，重复为 null。

- [ ] **Step 1: 写失败测试**

VM 测试第一次收藏普通翠鸟后 `unlockedBadge.speciesId === 'kingfisher'`；第二张普通翠鸟后为 `null`；sample 朱鹮不触发。低动效时 `badgeRevealed === true` 且不调用 `wx.vibrateShort`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/native-species-badges.cjs tests/native-c-accessibility.cjs`

Expected: FAIL，揭晓页没有物种徽章状态。

- [ ] **Step 3: 在 collect 的原子边界计算首次解锁**

保存前记录 `before=app.getCards()`，`app.addCard(c)` 成功后取 `after=app.getCards()`，调用 `firstUnlockedBadge(before,after)`。只有非 null 才设置 `unlockedBadge`；保存失败不揭晓徽章。

- [ ] **Step 4: 添加可访问揭晓层**

显示该主题唯一的彩色 PNG、徽章名和“首次遇见 · 徽章已点亮”，提供“收入图鉴”按钮。标准动效只使用一次淡入/缩放；减少动态直接显示最终层且不振动。

- [ ] **Step 5: 运行页面回归**

Run: `node --test tests/native-species-badges.cjs tests/native-c-accessibility.cjs tests/native-page-data-contract.cjs tests/native-local-parity.cjs`

Expected: PASS；卡片揭晓、翻面、入册和导航原行为不变。

- [ ] **Step 6: 提交揭晓接入**

```bash
git add native/pages/reveal tests/native-species-badges.cjs tests/native-c-accessibility.cjs
git commit -m "feat: reveal first species badge after collection"
```

### Task 7: 全量验收与资产完整性

**Files:**
- Modify: `docs/ASSET_PROVENANCE.md`
- Modify: `docs/RELEASE_ACCEPTANCE.md`

**Interfaces:**
- Consumes: 12 个资产来源、生成参数、测试输出和真机检查结果。
- Produces: 可审计资产记录与本次验收记录。

- [ ] **Step 1: 记录资产来源**

为每个 PNG 记录生成工具、日期、提示词摘要、人工检查结论和 SHA-256；不写入账号、token 或内部下载 URL。

- [ ] **Step 2: 运行全量自动检查**

Run: `npm test && npm run build:weapp && node --check cloudfunctions/createArtCard/index.js && node --check cloudfunctions/speciesIllustration/index.js`

Expected: 全部退出码 0；12 个资产测试、提示词测试、公共缓存并发复用、严格失败、三个页面和首页/案例基线全部通过。

- [ ] **Step 3: 微信开发者工具与真机验收**

依次验证：未收藏项使用同一彩色资产的 CSS 灰度/低饱和态；首次普通翠鸟点亮并只揭晓一次；重复普通翠鸟不再揭晓；sample 朱鹮不解锁；减少动态直接显示；断网或模型失败不出现原图艺术卡；第二用户同一物种命中 ready 公共缓存。

- [ ] **Step 4: 检查工作区只包含批准范围**

Run: `git diff --check && git status --short`

Expected: 无 `dist/` 手工改动、无首页/案例变更、无私钥和临时生成文件；既有用户未提交改动不得被覆盖或夹带。

- [ ] **Step 5: 提交验收记录**

```bash
git add docs/ASSET_PROVENANCE.md docs/RELEASE_ACCEPTANCE.md
git commit -m "docs: record species badge acceptance"
```
