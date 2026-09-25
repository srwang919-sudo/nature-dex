# 删卡失败修复说明

> 修复日期：2026-09-25
> 影响面：卡片详情页「删除这张卡」在部分卡片上永远失败

## 一、现象

在卡片详情页点「删除」→ 确认后弹出「删除未确认，请稍后重试」，卡片仍在图鉴里，反复重试结果相同。

## 二、根因

删除链路：`native/pages/card/index.js removeCard()` → `app.js removeCard()` → 云函数 `deleteObservationAssets`。

`app.js` 在 2026-09-23 的 fail-closed 改造后规定：只要卡片带云端 `fileId`，就必须先拿到云函数返回 `status:'deleted'`，否则直接抛异常并**原样保留本机卡片**。云函数在下列情况不会返回 `deleted`：

| 失败码 | 含义 |
|---|---|
| `cloud_delete_unavailable` | 卡片没有 `photoObservationId`，或 `wx.cloud` 不可用 |
| `asset_registry_missing` | 云端 `assets` 集合查不到该观察记录 |
| `invalid_request` / `runtime_unavailable` | 参数或云环境异常 |
| `cloud_delete_failed` / `deletion_pending` / `deletion_batch_limit` | 删除失败 / 有生成任务在跑 / 文件过多 |
| `function_not_found` | 云函数未部署（客户端归类） |

这个 App 是**本地优先**设计：`cloudUpsertCard`/`cloudSyncNote` 默认返回 `sync_consent_required`，照片默认不上云。于是出现逻辑死结——**云端本来就没有的数据，永远无法"证明已删除"**，这类卡片被永久锁死。

叠加问题：catch 里只有一句笼统提示，既没有区分原因，也没有重试入口；项目里现成的后台清理队列 `native/lib/cloud-cleanup.js` 完全没被用上。

## 三、修复：分级处理

原则：**云端确实没有这份数据 → 直接删本机；云端有数据但清理失败 → 保留本机 + 说清原因 + 入队后台重试 + 逃生通道。**

### 1. 云函数 `deleteObservationAssets`
`assets` 查不到记录时，先读 `natureObservations`（必须在撤销前读，撤销会把状态改写成 `deleted`）：
- 观察从未登记 → 云端不可能存在私有照片 → 写幂等墓碑，返回 `{status:'deleted',mode:'no_cloud_asset'}`
- 观察已标记删除 → 同上（幂等重试）
- 观察登记存在但资产行缺失 → 保守保持 `fail('asset_registry_missing')`，维持 fail-closed

同步更新字节一致副本 `cleanupObservationAssets/delete-observation.js`（有 sha256 drift 测试守护）。

### 2. 客户端 `app.js`
- 无云端文件或无 `photoObservationId` → 直接删本机（`mode:'local_only'`），不再无谓调用云端
- 云端确认 → 删本机（`mode:'cloud'`）
- 云端失败/不可达 → 返回 `{status:'blocked',code,message,queued}`，保留本机，并把观察 id 推入后台清理队列
- 新增 `forceRemoveCard()` 逃生通道：强制清本机数据，云端清理仍留在队列里重试
- 新增 `eraseCard()` / `blockCardRemoval()` / `queueCloudCleanup()` 三个内聚方法

### 3. 失败原因可读化 `native/lib/card-delete.js`
把失败码映射成中文说明（如「这张卡还有彩绘生成任务在进行，任务结束后会自动继续清理」），并从云调用异常中识别「云函数未部署」等传输层问题。

### 4. 交互
- 卡片页：失败时由 toast 改为弹窗，显示具体原因，提供「稍后重试」与「仍要删除本机」（二次确认，明示云端照片可能残留且已入队）
- 设置页：新增「重试清理 N 条云端照片」入口，复用 `app.retryCloudCleanup()`，让后台队列可见、可控

## 四、验收

- `tests/native-card-delete.cjs`：本地卡直删、云端确认后删除、失败保留+入队、逃生通道、未部署识别、已入册保留
- `tests/native-card-delete-codes.cjs`：失败码归类与文案
- `tests/cloud-observation-delete.cjs`：区分「观察从未登记」与「登记存在但资产行缺失」两种语义
- 全量 `node --test tests/*.cjs`：**303 通过 / 0 失败**
