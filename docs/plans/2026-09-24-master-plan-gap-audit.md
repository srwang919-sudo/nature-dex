# Master Plan 实施差距审计报告

> 日期：2026-09-24
> 对照对象：`/Users/w/Desktop/已粘贴的文本.txt`（《去大自然里》V1 Product + Design Master Plan — Final，3900+ 行，16 个 Phase）
> 代码库：`去大自然里-mini/`（原生微信小程序，`app.js` + `native/` + `cloudfunctions/`）
> 测试基线：**223/223 通过**，`npm run build:weapp` 通过，工作树有未提交改动。

---

## 0. 总体结论

Codex 已经完成了 Master Plan **绝大部分核心功能**，且是**前后端真实落地**（数据库事务、原子编号、审核状态机、幂等配额都在云函数里真实实现，不是前端壳）。

当前真正的差距不在「功能没写」，而在三类：

1. **端到端验收缺口**：代码写了，但没有真机/双账号/生产环境验证过（支付、好友跨账号、实体打印履约）。
2. **纯前端体验模块**：自然世界的四季/天气视觉氛围、Artwork Variants 只预留了架构，未做视觉实现。
3. **Analytics 埋点**：Master Plan Phase 15 的完整事件追踪基本未做。

下面逐 Phase 对照。

---

## 1. 逐 Phase 状态对照

| Phase | 内容 | 状态 | 证据 / 缺口 |
|---|---|---|---|
| **1** Full Audit | 架构+UI/UX 审计 | ✅ 完成 | 大量 `docs/plans/*.md` 审计与验证记录 |
| **2** Core Data Architecture | Species / SpeciesArtwork / Observation / UserSpeciesDiscovery / Card | ✅ 完成 | `natureSpecies` / `speciesArtworks` / `natureObservations` / `userSpeciesDiscoveries` / `natureCards` 五集合 + `discovery.js` 事务写入 |
| **3** Discovery Number | 原子编号 + First Discovery + 唯一约束 | ✅ 完成 | `discovery.js:finalizeObservation` 用 `runTransaction` + 冲突重试；`user_id+species_id` 唯一；`isFirstDiscovery` 标记 |
| **4** Official Artwork Library | 候选/批准/驳回/复用 + Original Contributor | ✅ 完成 | `artwork-repository.js:reviewArtwork` 完整状态机 + `officialSpeciesArtworks` 索引 + `userArtworkContributions` 奖励 |
| **5** Artwork Visual System | PromptBuilder + 变体 + 缩略图管线 | ⚠️ 部分 | Prompt 模板有（`natural-history-prompt.js`）；**变体系统、缩略图/主图派生管线未实现** |
| **6** Recognition Pipeline | 相机→百度→候选→确认→编号→制卡→世界更新 | ✅ 完成 | `recognizeObservation` 3 路线 + `identifyConsented` + `finalizeObservation` |
| **7** Hunyuan Pipeline | 官方缺失→生成候选→审核→Custom | ✅ 完成 | `speciesIllustration/artwork-flow.js` + `review-service.js` + Custom Artwork 配额 |
| **8** AI Quota + Usage Ledger | 新10/免5/会30 + 账本 + 幂等 | ✅ 完成 | `quota.js`（默认 艺术3/水彩3/识别20/上传20，可 env 覆盖）+ `creation-wallet.js`；`ai_usage_events` 账本**部分实现** |
| **9** Design System | 色彩/字体/圆角/阴影/动效 | ✅ 完成 | `app.wxss` + 各页 wxss，色彩 token 与 Plan §103 一致（`#F5F2E9`/`#243028`/`#49634E`） |
| **10** Growing Nature World | 首页自然世界 + 分层 + 点击 + 生长 | ⚠️ 部分 | `museum-timeline.js` 已有 zone/slot 分层（canopy/branch/water/ground）；**四季视觉、天气氛围、点击信息弹层未做** |
| **11** Core UI | Home/Collection/Card/Camera/Discovery/Region/Badge/Journey | ✅ 大部分 | 各页齐全；**地区图鉴「西湖秋季图鉴 18/24」未实现**（`nearby` 只有生境指南，无地区图鉴进度） |
| **12** Subscription | ¥19.9/月 ¥198/年 + 月配额 | ⚠️ 代码有 | `natureMembership` 完整（微信支付 gateway + 回调验签 + 退款）；**生产商户未配置，未真实验收** |
| **13** Friend System | 好友馆 + Like/Request/Gift | ⚠️ 代码有 | `natureSocial` + `claimGift` 完整；**双账号跨账号端到端未真实验收** |
| **14** Printing | 24张 ¥59.9 + 排版 + 地址 + 支付 + PrintRenderer + 订单 | ⚠️ 代码有 | `print-draft.js` + `print-order.js` 完整；**管理员履约后台、订单包下载、物流单号填写未实现** |
| **15** Analytics | 全量事件埋点 | ❌ 基本未做 | 无 `photo_captured`/`card_created`/`discovery_number_assigned` 等事件上报；无 `ai_usage_events` 完整账本 |
| **16** Full QA | 全流程测试 | ⚠️ 本地绿 | 223 测试绿，但**真机/双账号/生产环境未验** |

---

## 2. 三大真实差距（按优先级）

### 差距 A：Analytics 埋点体系（Phase 15）—— 完全空白

Master Plan §111–112 定义了 30+ 关键指标和 30+ 事件，当前代码库**几乎没有**埋点。

需要建立：
- `ai_usage_events` 完整账本（`quota.js` 只记配额计数，没记 provider/model/cost/error）
- 事件上报管线：`photo_captured` → `recognition_success` → `species_confirmed` → `discovery_number_assigned` → `card_created` → `nature_world_species_tapped` → `friend_like` → `print_order_created` 等
- `aiCostConfig` 后台配置（§47：混元 0.20 RMB / 百度植物 0.0029 / 动物 0.001）

### 差距 B：自然世界季节/天气氛围（Phase 10 的视觉部分）—— 纯前端可做

`museum-timeline.js` 只有 `seasonLabel` 文字（冬/春/夏/秋），首页 `world-ecosystem` 是固定 CSS 场景层（`scene-canopy`/`scene-branch`/`scene-ground`/`scene-water`）。

Master Plan §40–41 要求：
- 春（嫩叶、花、柔和）夏（浓绿、昆虫、丰富）秋（黄叶、落叶、迁徙鸟）冬（枝干、冬候鸟、冷色）
- 晴天/阴天/雨/黄昏/夜晚 的 Atmosphere Layer

这是**品牌辨识度最高的模块**，纯前端（WXSS 变量 + 季节 class 切换）即可落地，不依赖后端、不花钱、可立即看到效果。

### 差距 C：实体打印履约 + 支付/好友生产验收（Phase 12/13/14 的验收部分）

代码都在，缺的是：
- **管理员履约后台**：下载 Print Package（order.json/shipping.json/manifest.csv/front/back/print.pdf）、填物流单号
- **生产商户配置**：微信支付商户号、回调验签、退款
- **双账号真实验收**：好友 Like/Gift 跨账号、并发领取、断网

这三块都需要**外部账号/资质/真机**，不是纯代码能闭环的。

---

## 3. 建议的下一步（按投入产出比排序）

| 优先级 | 事项 | 类型 | 成本 | 可否立即见效 |
|---|---|---|---|---|
| **P0** | 自然世界四季氛围（差距 B） | 纯前端 | 低 | ✅ 立即 |
| **P1** | Analytics 埋点体系（差距 A） | 前后端 | 中 | 需部署 |
| **P2** | 打印履约后台（差距 C 一部分） | 后端+简单管理页 | 中 | 需部署 |
| **P3** | 地区图鉴（Phase 11 缺失） | 前端+少量后端 | 中 | 需部署 |
| **P4** | 支付/好友生产验收 | 外部资质+真机 | 高（依赖外部） | 需账号 |

---

## 4. 附：未提交改动清单（工作树状态）

当前工作树有未提交改动，主要是之前排查 `i.id` 崩溃的防御性加固：

- `app.js`（`getReadyCards`/`getCards` 空元素过滤）
- `native/pages/observe/index.js`（`onShow` 草稿过滤 + confirm 分步定位）
- `native/pages/card/index.wxss`、`profile/index.*`、`settings/index.wxml` 等 UI 微调

建议：确认当前防御加固有效后，先提交一版干净的 commit，再开始新功能，避免把排查改动和功能改动混在一起。

---

*本报告由 WorkBuddy 生成，作为继续实施的依据。*
