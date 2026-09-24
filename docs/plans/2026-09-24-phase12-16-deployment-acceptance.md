# 《去大自然里》Phase 12–16 部署与生产验收手册

> 日期：2026-09-24
> 对应 Master Plan：Phase 12（订阅）/ 13（好友）/ 14（打印）/ 15（Analytics）/ 16（全流程 QA）
> 代码库：`去大自然里-mini/`（原生微信小程序，发布源为仓库根目录）
> 本轮交付：P0 四季氛围 → P1 Analytics 埋点 → P2 打印履约后台 → P3 地区图鉴 → Phase 5 画作变体
> 测试基线：本地 `npm test`（node --test）+ `npm run build:weapp` 全绿

---

## 1. 本轮交付清单

| 项 | 位置 | 说明 |
|---|---|---|
| 四季/时段氛围 | `native/lib/museum-timeline.js`、`native/pages/home/index.{wxml,wxss}` | season（春/夏/秋/冬）+ dayPhase（日/黄昏/夜），纯前端 |
| 自然世界点击信息弹层 | `native/pages/home/index.*` | 物种名/学名/生境/遇见次数/首末日期，再回看卡片 |
| 前端埋点管线 | `native/lib/analytics.js` | 33 事件白名单，本地缓冲 + 批量上报 + 幂等 eventId + 静默失败 |
| 埋点云函数 | `cloudfunctions/analytics/` | 白名单校验、props 净化、`analyticsEvents` 幂等落库、单批 ≤20 条 |
| 埋点接入 | observe / home / friend-museum / print / settings / print-admin | 关键漏斗节点 |
| AI 用量账本 | `cloudfunctions/{recognizeObservation,speciesIllustration,createArtCard}/` | provider/model/cost/durationMs/error |
| 成本后台配置（§47） | 三处 `cost-config.js`（逐字节一致） | 默认 < 环境变量 < `aiCostConfig/main` |
| 地区图鉴（§11） | `native/lib/region-atlas.js`、`native/pages/nearby/*` | 本季清单进度；只用本机私密足迹，不上传位置 |
| 画作变体（§5） | 两处 `artwork-variants.js`（逐字节一致）、`prompt.js`、`artwork-flow.js` | 4 种呈现方式，服务端按物种稳定推导 |
| 打印履约后台（§14） | `cloudfunctions/printAdmin/`、`native/pages/print-admin/*` | 受理草稿→开印→发货，打印包导出，默认拒绝 |

---

## 2. 部署清单

### 2.1 云函数（逐个上传并部署）

```
analytics            ← 新增
printAdmin           ← 新增
recognizeObservation ← 更新（usage-ledger / cost-config）
speciesIllustration  ← 更新（cost-config / artwork-variants / prompt）
createArtCard        ← 更新（cost-config / artwork-variants / creation-wallet）
initCollections      ← 更新（集合清单）
managePrivacy        ← 更新（analyticsEvents 纳入账号擦除）
```

### 2.2 环境变量

| 云函数 | 变量 | 必填 | 说明 |
|---|---|---|---|
| `printAdmin` | `NATURE_ADMIN_OPENIDS` | ✅ | 逗号分隔的运营账号 openid。**未配置时后台对所有人关闭**（默认拒绝） |
| `recognizeObservation` | `NATURE_BAIDU_PLANT_COST` | 可选 | 百度植物识别单价（元/次），默认 0.0029 |
| `recognizeObservation` | `NATURE_BAIDU_ANIMAL_COST` | 可选 | 百度动物识别单价，默认 0.001 |
| `speciesIllustration` / `createArtCard` | `NATURE_HUNYUAN_COST` | 可选 | 混元生图单价，默认 0.20 |

> 环境变量会被 `aiCostConfig/main` 文档覆盖。运营改价无需重新部署。

### 2.3 集合初始化

部署后以任意已登录账号调用一次 `initCollections`。本轮新增集合：

- `analyticsEvents`（埋点事件，`_id` = 前端生成的 eventId，天然幂等）
- `printOrders`（履约订单，`_id` = `sha256('print-order|' + draftId)`）
- `aiCostConfig`（成本后台配置，固定文档 `main`）

### 2.4 成本配置文档示例

```json
// 集合：aiCostConfig  文档 _id：main
{ "costs": { "baiduPlant": 0.0029, "baiduAnimal": 0.001, "hunyuan": 0.20 } }
```

也支持扁平写法（省略 `costs` 一层）。非法值（负数、非数字）会被忽略并回落到环境变量/默认值。

---

## 3. Phase 15 Analytics 验收

### 3.1 事件表（33 个，前端白名单即契约）

| 分组 | 事件 |
|---|---|
| 拍摄与识别 | `photo_captured`、`recognition_started`、`recognition_success`、`recognition_failed` |
| 确认与编号 | `species_confirmed`、`observation_created`、`species_first_discovered`、`discovery_number_assigned` |
| 画作 | `official_artwork_reused`、`official_artwork_missing`、`artwork_generation_started`、`artwork_candidate_created`、`artwork_approved`、`custom_artwork_started`、`custom_artwork_success`、`generation_regenerated` |
| 卡片与世界 | `card_created`、`card_saved`、`nature_world_species_added`、`nature_world_species_tapped` |
| 好友 | `friend_like`、`card_requested`、`card_gifted` |
| 订阅 | `subscription_page_viewed`、`subscription_started`、`subscription_success` |
| 打印 | `print_flow_started`、`print_card_selected`、`print_preview_viewed`、`print_order_created`、`print_payment_success`、`print_order_shipped` |

### 3.2 隐私边界（验收必查）

- 前端 `sanitizeProps` 只放行 string(≤120) / number / boolean，**对象、数组一律丢弃**。
- 不采集照片、不采集经纬度、不采集 openid（服务端用 `_openid` 归属，前端 props 不含身份）。
- 账号擦除：`managePrivacy` 的 `PERSONAL` 清单含 `['analyticsEvents','owner']`，申请清除后分析数据同批删除。
- 队列写入失败**不阻塞**主流程：`track()` 永不 throw，失败仅返回 `false`。

### 3.3 关键指标口径（§111 抽查）

| 指标 | 计算方式 |
|---|---|
| 识别成功率 | `recognition_success` ÷ (`recognition_success` + `recognition_failed`) |
| 确认转化率 | `species_confirmed` ÷ `recognition_success` |
| 制卡完成率 | `card_created` ÷ `species_confirmed` |
| 首次发现占比 | `species_first_discovered` ÷ `discovery_number_assigned` |
| 官方画作复用率 | `official_artwork_reused` ÷ (`official_artwork_reused` + `official_artwork_missing`) |
| 打印漏斗 | `print_flow_started` → `print_card_selected` → `print_preview_viewed` → `print_order_created` |
| AI 单次成本 | `aiUsageEvents.cost` 按 `provider` 求和 ÷ 事件数 |

> 抽查方式：真机跑一遍「拍一张 → 识别 → 确认 → 制卡 → 回看首页 → 打印选卡」，然后在控制台查 `analyticsEvents` 是否出现对应事件、`props` 里是否只有基本类型。

### 3.4 待配置

- **指标看板**：本轮只做采集与落库。看板可用云开发定时触发器做日聚合，或用控制台手查。**尚未实现**，属已知开放项。

---

## 4. Phase 14 打印履约后台操作手册

### 4.1 权限

- 只有 `NATURE_ADMIN_OPENIDS` 中的账号可调用 `printAdmin`；其余账号返回 `operator_required`。
- 后台页面 `native/pages/print-admin/index` 是普通小程序页，权限完全由服务端判定，前端不持有任何打印集合的读权限。

### 4.2 状态机（服务端固定，客户端无法自报起始状态）

```
draft ──accept_order──▶ accepted ──mark_produced──▶ in_production ──mark_shipped──▶ shipped
                                                          ▲
                                          set_tracking（需先有单号才能发货）
```

- 重复调用幂等：`mark_produced` 再来一次返回 `changed:false`，不产生第二次迁移。
- 发货前必须有物流单号，否则 `tracking_required`。
- 已发货订单**允许更正单号**（录错可改），状态不回退，且写入审计事件。
- 已取消订单拒绝任何写操作（`order_state_conflict`）。

### 4.3 打印包

`get_package` 返回三个文件（字符串，前端可复制）：

| 文件 | 内容 | 隐私处理 |
|---|---|---|
| `order.json` | 订单号/SKU/张数/金额/状态/打包时间 | 无身份信息，地点写作「地点未公开」 |
| `shipping.json` | 承运商/单号/收件人占位 | 收件人写作「支付后由持有人提供」，后台**不得**自行补全地址 |
| `manifest.csv` | 24 行卡片清单：位置/物种名/发现编号/类型/发现者/赠予者/`assetRef` | **不含存储路径与账号标识**，资源以 `a01`…`a24` 指代 |

真实资源地址只在同一次响应的 `assets[]` 里返回给已鉴权的运营账号，用于取图印刷。

### 4.4 验收步骤

1. 用普通账号在打印页选满 24 张 → 生成草稿。
2. 用运营账号打开履约页 → 「待受理草稿」出现该草稿 → 点「受理并生成订单」。
3. 点「打印清单」→ 复制 `manifest.csv`，核对 24 行、资源列为 `a01`…`a24`。
4. 点「已开印」→ 状态变「印制中」。
5. 不填单号直接「标记发货」→ 必须被拒绝并提示「请先登记物流单号」。
6. 选快递 + 填单号 → 「保存」→ 再「标记发货」→ 状态变「已发货」。
7. 用未授权账号重复第 2 步 → 必须提示「当前账号没有履约权限」。

---

## 5. Phase 12 订阅验收（依赖外部资质）

**前置条件（当前未配置，代码已就绪）**

- [ ] 微信支付商户号与小程序绑定，`natureMembership` 配置商户证书与 APIv3 密钥
- [ ] 回调地址在小程序后台登记，验签使用平台证书
- [ ] 确认退款权限、退款回调

**验收矩阵**

| 场景 | 期望 |
|---|---|
| 正常购买月卡 ¥19.9 | `createPayment` 返回 `requestPayment` 参数（signType=RSA、package 以 `prepay_id=` 开头）；支付后 `getMembership` = ACTIVE，月配额 30 |
| 支付取消 | 前端不产生「已开通」状态；`pendingPayment` 保留可重试 |
| 重复点击购买 | 幂等：同一 `idempotencyKey` 只产生一笔订单 |
| 断网中断 | 重进小程序 `reconcile` 能按订单号查回真实状态 |
| 账号清除中 | 拒绝新支付（`account_erasing`） |
| 退款 | 订单状态与权益同步回收，对账记录依法保留 |

---

## 6. Phase 13 好友验收（双账号）

| 场景 | 期望 |
|---|---|
| A 邀请 B | B 接受后双方互相可见；过期码报 `expired`，自邀报 `self_invite` |
| A 公开某物种 | B 在好友馆可见；**不含原照片、不含坐标、不含距离** |
| B 点赞 | 幂等；A 的 `listReceivedLikes` 能看到 |
| B 申请副本 | A 可批准/拒绝；拒绝后 B 侧不出现副本 |
| 并发领取同一副本 | 只有一个成功（`natureCopySlots` 约束） |
| 断网重试 | 同一 `idempotencyKey` 不产生第二份副本 |
| 拉黑/解除 | 立即不再返回该好友的任何内容 |

---

## 7. Phase 16 全流程 QA 清单

1. 全新设备 → 首次进入 → 隐私说明 → 拍一张 → 识别 → 确认 → 制卡 → 揭示动画 → 回看卡片。
2. 首页自然世界：四季配色随月份切换；黄昏/夜晚氛围随小时切换；点击物种出现信息弹层。
3. 无网络：拍摄与本地保存不丢数据；识别失败给明确原因；不上传照片。
4. 断网恢复：草稿可续，重复确认不产生第二张卡。
5. 额度用尽：提示明确，**不扣额度**地拒绝（`creation_quota_exhausted`）。
6. 地区图鉴：无位置记录时显示 0/24 的诚实空进度，不编造数字。
7. 账号清除：申请 → 分批清理 → 未完成时可继续；`analyticsEvents` 一并删除。
8. reduce-motion 开启：首页、揭示动画、卡面翻转均无过渡动效。
9. 无障碍：导航当前页有 aria 标签；按钮触控区 ≥88rpx。

---

## 8. 已知开放项

| # | 项 | 状态 | 说明 |
|---|---|---|---|
| 1 | Artwork 缩略图/主图派生管线（§5 剩余部分） | ⏳ 未实现 | 设计见下 |
| 2 | Analytics 指标看板/日聚合 | ⏳ 未实现 | 目前只有采集落库 |
| 3 | 订阅商户配置与支付实测 | ⏳ 依赖外部资质 | 代码就绪，见 §5 |
| 4 | 好友双账号实测 | ⏳ 依赖两个微信号 | 代码就绪，见 §6 |
| 5 | 地形/场景美术资产替换 | ⏳ 待定稿 | 首页场景目前为 CSS 布局层；风格试稿已产出，待确认方向 |

### 缩略图管线为什么没有随手实现

原计划在列表与画布上改用云端缩略图地址（COS 图像处理参数）。**没有实现的原因**：微信云存储的临时地址带签名，图像处理参数与签名串的拼接顺序在「私有读写」桶上需要以真实环境验证；拼接错误会让图片 404，而组件当前的失败分支会直接把卡片判为「图片不可用」——即出现可见回归。

因此本轮**不猜测拼装方式**。落地前的验证步骤：

1. 在真实环境取一张 `cloud://` 图片的 `tempFileURL`。
2. 分别尝试 `?imageMogr2/thumbnail/420x&sign=...` 与 `?sign=...&imageMogr2/thumbnail/420x`，看哪一个返回 200。
3. 确认后再实现 `native/lib/thumbnail.js`（纯派生函数）+ 组件**一次性回退**：派生地址加载失败必须退回原图，绝不能因此判定「图片不可用」。
4. 卡面导出与打印链路**永远使用原图**，不接入缩略图（300dpi 品质优先）。

---

## 9. 回滚

- 云函数逐个保留上一版本，控制台可回滚单函数。
- 前端回滚：`git revert` 对应 commit 后重新上传。
- 埋点可随时停：前端清空 `analytics` 云函数名即可（`flush` 失败会保留队列、静默重试，不影响主流程）。

---

*本手册由 WorkBuddy 生成，作为 Phase 12–16 上线的执行依据。*
