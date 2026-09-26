# 识别准确率优化（v0.1.5）

## 一、原链路的短板

| 环节 | 问题 | 后果 |
|---|---|---|
| 路由决策 | `mergeCandidateRoutes` 强制 `status:'needs_confirmation'`、`requiresConfirmation:true` | **`recognized` 状态永远不可达**，再高的置信度也要用户点确认 |
| 阈值 | 单一阈值 0.86，不看物种路由 | 植物（百科覆盖好）被过度拦下，通用标签（噪声大）反而容易放过 |
| 重试 | 零重试 | 网络抖动或百度限流（error_code 18）直接判失败 |
| 参数 | `top_num` 只给 animal 路传，plant/general 用默认值 | 候选池宽度不一致，top1 不准时没有备选 |
| 置信度呈现 | 候选卡的 `confidenceText` **从未被生成** | 界面上一直空白，用户看不到"把握多少" |
| 兜底 | 识别失败只有一句文案，无重试入口；`unknown` 无重拍入口 | 失败即死路 |

## 二、已实施的优化

### 云端（`cloudfunctions/recognizeObservation`）

1. **分物种阈值**：动物 `0.85`、植物 `0.80`、通用 `0.90`，拿不到有效路由时取最严 `0.90`。阈值取自该候选中置信度最高的路由。
2. **三档路由决策**：
   - `confidence ≥ 阈值` → `recognized`，`requiresConfirmation:false`（高把握直通）
   - `0.6 ≤ confidence < 阈值` → `needs_confirmation`，返回候选供点选
   - `< 0.6` → `unknown`，客户端引导重拍/重识别
3. **返回把握度**：结果带 `confidence`（top1）与 `threshold`，便于界面与后续统计。
4. **智能重试**：网络类错误（超时/连接重置/DNS）最多 3 次尝试、指数退避 400ms→800ms；百度限流（error_code 18）单独等 1.2s 重试一次；其余错误快速失败，不拖长等待。
5. **参数统一**：`top_num=5` 三路都显式传，候选池宽度一致；`baike_num=5` 保持。

### 客户端（`native/lib/recognition-result.js` + `pages/observe`）

1. **置信度真的显示出来了**：候选与 top1 都生成 `confidenceText`（百分比），结果区顶部显示「识别把握 92% · 已自动选定最可能的物种」。
2. **失败兜底**：识别错误区新增「重试识别」按钮；`unknown` 区新增「再试一次」与「重拍一张」。
3. `requiresConfirmation` 跟随服务端判定，不再恒为 true。

## 三、仍需数据才能定的事

- **阈值是拍出来的，不是量出来的**：0.85/0.80/0.90 是按物种库特性给的工程初值。要校准到真实水平，需要记录每次识别的 top1 与用户最终确认结果，跑一段时间统计 top1 命中率后再调。
- **建议的下一步**：在 `aiUsageEvents` 账本里记录 `candidates` / `confidence` / `userConfirmed`（用户点选了第几个候选），并在聚合看板里加「top1 命中率、分物种准确率」。有了这份数据，阈值就能从"猜"变成"算"。
- 准确率统计与用户纠错通道尚未实现（本次未做，属于可后续叠加的能力，不影响当前链路正确性）。

## 四、验收

- `tests/cloud-recognition.cjs`、`tests/cloud-baidu-science.cjs`、`tests/native-recognition-contract.cjs`、`tests/open-source-recognition-contract.cjs` 均按新语义更新并通过
- 全量 `node --test tests/*.cjs`：303 通过 / 0 失败
- 云函数 `recognizeObservation` 已部署
