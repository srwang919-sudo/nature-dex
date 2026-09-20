# 生产版自然观察收藏体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将本地收藏小程序升级为可验证的三 Tab 收藏体验，并为 CloudBase 鉴别、图生图、导出和好友赠送建立安全的生产实现。

**Architecture:** 客户端继续以 `native/` 为唯一有效页面层，用 `presentCard(card)` 统一屏幕和导出展示。网络能力全部经 CloudBase 云函数：私有照片在 Storage 中按用户隔离，云函数调用百度鉴别与 `aliyunWanx` 图生图适配器；客户端只消费明确状态，所有未接通服务保持 `available:false`。三 Tab 通过一个路由配置共享导航，拍摄作为探索页的动作。

**Tech Stack:** 微信小程序原生 WXML/WXSS/JavaScript、Canvas 2D、CloudBase Storage/Database/Cloud Functions、百度智能云图像识别、阿里云通义万相图生图适配器、Node CJS 测试、微信开发者工具 `wcc`/`wcsc`。

**Spec:** `docs/plans/2026-09-14-production-miniapp-design.md`

## Global Constraints

- 只修改根目录 `app.js`、`app.json`、`app.wxss` 和 `native/`；不修改历史 `src/dist`。
- 三个一级 Tab 固定为探索、博物志、我的；拍摄为探索主动作，附近为探索次级页。
- 正面始终使用 `native/components/collectible` 的真实照片实体卡；固定五个星位，旧值不得自动升级。
- 卡背无 `scroll-view`，七物种映射一致；插画只作装饰，不是鉴别证据。
- `recognition.available` 初始值必须为 `false`；没有真实云函数结果不得显示置信度或服务鉴别。
- 任何导出在照片与插画 `onload` 前不得绘制；失败不得留下粉红、空白或旧导出路径。
- 客户端不保存第三方凭据；照片默认私有；默认不采集位置。
- 不初始化 Git、不提交、不上传、不预览；每任务用已有 Node 测试和官方编译验证。

---

## File Structure

- `app.json`：声明三条一级导航页面与子页面，不再把拍摄作为 Tab。
- `native/lib/tab-model.js`：唯一三 Tab 路由与标签定义。
- `native/pages/home/*`：探索页的山林封面、拍摄入口和真实本地内容。
- `native/pages/library/*`：博物志网格、筛选和资料入口。
- `native/pages/settings/*`：我的页的真实本地统计与管理入口。
- `native/components/collectible/*` 与 `native/lib/card-presentation.js`：同一张实体正反面展示模型。
- `native/pages/reveal/*` 与 `native/pages/card/*`：四段开牌、纯净全屏查看和详情。
- `native/lib/asset-decode.js`、`native/lib/card-export.js`：导出预解码、绘制与失败清理。
- `cloudfunctions/*`：鉴别、图生图、赠送和删除队列的受限服务边界。
- `tests/native-*.cjs` 与 `tests/cloud-*.cjs`：本地契约和云函数纯逻辑测试。

### Task 1: 三 Tab 路由与探索首屏

**Files:**
- Create: `native/lib/tab-model.js`
- Create: `native/pages/library/index.js`
- Create: `native/pages/library/index.wxml`
- Create: `native/pages/library/index.wxss`
- Modify: `app.json`
- Modify: `native/components/navigation/index.js`
- Modify: `native/components/navigation/index.wxml`
- Modify: `native/components/navigation/index.wxss`
- Modify: `native/pages/home/index.js`
- Modify: `native/pages/home/index.wxml`
- Modify: `native/pages/home/index.wxss`
- Test: `tests/native-tabs.cjs`

**Interfaces:**
- Produces: `tabs = [{ key:'explore', label:'探索', url:'/native/pages/home/index' }, { key:'library', label:'博物志', url:'/native/pages/library/index' }, { key:'me', label:'我的', url:'/native/pages/settings/index' }]`。
- Consumes: `store.listCards()` 和 `species` 资料对象；`home.openObserve()` 使用 `wx.navigateTo({ url:'/native/pages/observe/index' })`。

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { tabs } = require('../native/lib/tab-model');
assert.deepStrictEqual(tabs.map((tab) => tab.key), ['explore', 'library', 'me']);
assert.strictEqual(tabs.some((tab) => tab.url.includes('/observe/')), false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-tabs.cjs`

Expected: FAIL because `native/lib/tab-model.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
const tabs = Object.freeze([
  { key: 'explore', label: '探索', url: '/native/pages/home/index' },
  { key: 'library', label: '博物志', url: '/native/pages/library/index' },
  { key: 'me', label: '我的', url: '/native/pages/settings/index' }
]);
module.exports = { tabs };
```

Update the navigation component to render this array and add `library` to `app.json`. Render the home page in the order cover/hero camera/album-and-habitat/today/seasonal; render truthful empty states and move collection filtering to library.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/native-tabs.cjs`

Expected: PASS.

- [ ] **Step 5: Run page checks**

Run: `find native/pages/home native/pages/library native/components/navigation -name '*.js' -print0 | xargs -0 -n1 node --check`

Expected: every command exits 0.

### Task 2: 统一实体卡正反面与七物种插画

**Files:**
- Modify: `native/lib/card-presentation.js`
- Modify: `native/lib/species-illustration.js`
- Modify: `native/components/collectible/index.wxml`
- Modify: `native/components/collectible/index.wxss`
- Modify: `native/pages/card/index.wxml`
- Test: `tests/native-card-presentation.cjs`
- Test: `tests/native-card-back.cjs`

**Interfaces:**
- Produces: `presentCard(card).front` with `{ photo,no,finish,finishKey,name,latin,starText }` and `.back` with `{ illustration,shortFact,habitatSeason,protection,no,date }`.
- Consumes: `illustrationFor(speciesId): string` for the seven supported IDs and `''` for unsupported IDs.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { presentCard } = require('../native/lib/card-presentation');
const card = presentCard({ speciesId:'egret', stars:4, factTitle:'长颈长腿', habitat:'湿地', season:'全年' });
assert.strictEqual(card.front.starText, '★★★★☆');
assert.ok(card.back.illustration.endsWith('/egret.png'));
assert.strictEqual(card.back.shortFact, '长颈长腿');
assert.strictEqual(card.back.habitatSeason, '湿地 · 全年');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-card-presentation.cjs && node tests/native-card-back.cjs`

Expected: FAIL until the new `shortFact` field and back template exist.

- [ ] **Step 3: Write minimal implementation**

Add `shortFact` and `habitatSeason` to the back model. Keep exactly five front star positions. In WXML remove scrolling content, place a large `image` behind or beside the readable paper content, and show only the six specified back fields. Add a visible paper/line-art fallback when `illustration` is empty; never substitute another species asset.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/native-card-presentation.cjs && node tests/native-card-back.cjs`

Expected: PASS, including seven distinct asset paths, zero `scroll-view` in the back face, and five star glyphs per front.

- [ ] **Step 5: Run component compile**

Run: `/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc-exec/wcc native/components/collectible/index.wxml >/dev/null`

Expected: exits 0.

### Task 3: 开牌四段状态机与纯净全屏 3D 查看

**Files:**
- Create: `native/lib/reveal-machine.js`
- Modify: `native/pages/reveal/index.js`
- Modify: `native/pages/reveal/index.wxml`
- Modify: `native/pages/reveal/index.wxss`
- Modify: `native/pages/card/index.js`
- Modify: `native/pages/card/index.wxml`
- Modify: `native/pages/card/index.wxss`
- Test: `tests/native-reveal-machine.cjs`
- Test: `tests/native-card-interaction.cjs`

**Interfaces:**
- Produces: `createRevealMachine({ reducedMotion, onComplete })` with `start()`, `cancel()`, `state()` and states `sealed`, `split`, `lift`, `settled`.
- Produces: card-page data key `viewer:false` on page load and methods `openViewer()` / `closeViewer()`.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { createRevealMachine } = require('../native/lib/reveal-machine');
const states = [];
const machine = createRevealMachine({ reducedMotion:true, onComplete:(s) => states.push(s) });
machine.start();
assert.deepStrictEqual(states, ['sealed', 'split', 'lift', 'settled']);
assert.strictEqual(machine.state(), 'settled');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-reveal-machine.cjs`

Expected: FAIL because the state machine module does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
function createRevealMachine({ reducedMotion, onComplete }) {
  let current = 'sealed';
  const stages = ['sealed', 'split', 'lift', 'settled'];
  return { state: () => current, cancel: () => { current = 'sealed'; }, start: () => {
    stages.forEach((stage) => { current = stage; onComplete(stage); });
  }};
}
module.exports = { createRevealMachine };
```

Replace the immediate callback in `start()` with guarded timers at 420ms, 700ms, 1020ms and 1260ms when `reducedMotion` is false. Cancel all timers on hide, unload, touch cancellation and back. Set `viewer:false` initially; only `openViewer()` shows the full-screen overlay and `closeViewer()` hides it without navigation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/native-reveal-machine.cjs && node tests/native-card-interaction.cjs`

Expected: PASS for reduced-motion sequencing, cancellation, 8px drag gate and viewer default.

- [ ] **Step 5: Run page checks**

Run: `find native/pages/reveal native/pages/card -name '*.js' -print0 | xargs -0 -n1 node --check`

Expected: every command exits 0.

### Task 4: 导出预解码与失败清理

**Files:**
- Create: `native/lib/asset-decode.js`
- Modify: `native/lib/decode-photo.js`
- Modify: `native/lib/card-export.js`
- Modify: `native/pages/card/index.js`
- Test: `tests/native-export-decode.cjs`
- Test: `tests/native-export.cjs`

**Interfaces:**
- Produces: `decodeAsset(canvas, src, generation, timeoutMs): Promise<{ path:string, image:object }>`; it rejects with `ASSET_DECODE_FAILED`, `ASSET_DECODE_TIMEOUT`, or `ASSET_DECODE_STALE`.
- Produces: `renderCard(ctx, card, { photo, illustration, mode })`; photo and illustration are decoded image handles, not paths.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { decodeAsset } = require('../native/lib/asset-decode');
const canvas = { createImage: () => ({ set src(v) { this.onerror(new Error(v)); } }) };
decodeAsset(canvas, 'wxfile://gone.jpg', 1, 1)
  .then(() => assert.fail('must reject'))
  .catch((error) => assert.strictEqual(error.code, 'ASSET_DECODE_FAILED'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-export-decode.cjs`

Expected: FAIL because `decodeAsset` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `decodeAsset` with `image.onload`, `image.onerror`, a 10,000ms timeout and a generation predicate. In card export, decode the mapped illustration first and the photo second; on any rejection set `exportPath:''`, do not call `canvasToTempFilePath`, and show the recovery message. Remove the duplicate `exportImage` object key so exactly one implementation controls every mode.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/native-export-decode.cjs && node tests/native-export.cjs`

Expected: PASS for successful image handles, matching illustration path, print back, stale/decode failure and no stale export path.

- [ ] **Step 5: Run JavaScript checks**

Run: `node --check native/lib/asset-decode.js && node --check native/pages/card/index.js`

Expected: exits 0.

### Task 5: CloudBase 可信识别、可选图生图与赠送

**Files:**
- Create: `cloudfunctions/recognizeObservation/index.js`
- Create: `cloudfunctions/generateIllustration/index.js`
- Create: `cloudfunctions/claimGift/index.js`
- Create: `cloudfunctions/deleteObservationAssets/index.js`
- Create: `native/lib/cloud-services.js`
- Modify: `native/contracts/services.js`
- Modify: `native/pages/observe/index.js`
- Modify: `native/pages/card/index.js`
- Test: `tests/cloud-recognition.cjs`
- Test: `tests/cloud-gift.cjs`
- Test: `tests/native-recognition-contract.cjs`

**Interfaces:**
- Produces: `callRecognition(input): Promise<RecognitionResult>` where `RecognitionResult.status` is `recognized|needs_confirmation|unknown|failed`.
- Produces: `requestIllustration({ observationId, speciesId, consent }): Promise<{ status:'ready'|'failed', assetFileId?:string }>`.
- Produces: `claimGift({ giftId, idempotencyKey }): Promise<{ status:'created'|'claimed'|'expired'|'rejected' }>`.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { normalizeRecognition } = require('../cloudfunctions/recognizeObservation');
assert.deepStrictEqual(normalizeRecognition({ candidates:[] }), { status:'unknown', candidates:[] });
assert.throws(() => normalizeRecognition({ candidates:[{ speciesId:'egret' }] }), /confidence/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/cloud-recognition.cjs && node tests/cloud-gift.cjs && node tests/native-recognition-contract.cjs`

Expected: FAIL because the cloud function modules do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement pure normalizers separately from CloudBase adapters. The recognition function validates the private `photoFileId`, calls Baidu only from cloud-side environment credentials, and returns only allowed candidates. The image function rejects `consent !== true`, uses the `aliyunWanx` adapter and returns `failed` on timeout or safety rejection. The gift function uses a database transaction keyed by gift ID and idempotency key. Until deployment configuration is present, the client returns `available:false` and exposes manual confirmation only.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/cloud-recognition.cjs && node tests/cloud-gift.cjs && node tests/native-recognition-contract.cjs`

Expected: PASS for unknown, missing confidence, explicit consent, transaction idempotency and unavailable client behavior.

- [ ] **Step 5: Run secret scan**

Run: `rg -n --glob '!docs/**' '(AKIA|API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?TOKEN)' native cloudfunctions`

Expected: no credentials or credential literals are returned.

### Task 6: 隐私删除、包体与全量发布检查

**Files:**
- Modify: `native/pages/settings/index.js`
- Modify: `native/pages/settings/index.wxml`
- Modify: `project.config.json`
- Modify: `docs/OWNER_SETUP_GUIDE.md`
- Modify: `docs/RELEASE_ACCEPTANCE.md`
- Test: `tests/native-local-parity.cjs`
- Test: `tests/native-page-data-contract.cjs`

**Interfaces:**
- Consumes: `deleteObservationAssets({ observationId, generation }): Promise<{ status:'deleted'|'queued' }>`.
- Produces: `settings.clearObservation(id)` that locally marks deletion before dispatching cloud cleanup and reports queued state after network failure.

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert');
const { classifyDeleteResult } = require('../native/lib/cloud-services');
assert.strictEqual(classifyDeleteResult({ network:false }), 'queued');
assert.strictEqual(classifyDeleteResult({ network:true, deleted:true }), 'deleted');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-local-parity.cjs && node tests/native-page-data-contract.cjs`

Expected: FAIL until queued deletion status is implemented.

- [ ] **Step 3: Write minimal implementation**

Add a settings confirmation that explains local and cloud cleanup. Persist a retry marker on network failure and render “等待清理” instead of “已删除”. Keep `project.config.json` minification enabled only after the official compile passes; use `packOptions.ignore` for tests, documents, source history and unused image sources, never for active seven-species illustration assets.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/native-local-parity.cjs && node tests/native-page-data-contract.cjs`

Expected: PASS for local deletion, queued cleanup and no false cloud-success copy.

- [ ] **Step 5: Run release checks**

Run: `for f in tests/native-*.cjs tests/cloud-*.cjs; do test -f "$f" && node "$f" || exit 1; done; find native cloudfunctions -name '*.js' -print0 | xargs -0 -n1 node --check`

Expected: every test and syntax check exits 0.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-14-production-miniapp.md`. This repository intentionally has no Git metadata, so execution must not initialize, commit, upload or preview. Execute the tasks in order with a reviewer gate after each independently testable deliverable.
