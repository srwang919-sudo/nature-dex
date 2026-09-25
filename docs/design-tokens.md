# 设计令牌（Design Tokens）

> 版本：v0.1.3 ｜ 位置：`app.wxss`
> 结构：**基础色 → 语义色 → 尺寸节奏**三层。页面与组件只消费语义层，不再直接写十六进制。

## 一、基础色（温暖自然）

调性：自然、珍藏、可信。米白为底、苔藓绿为骨、暖阳金为珍。

| 令牌 | 值 | 用途 |
|---|---|---|
| `--paper` | `#FAF9F6` | 页面背景（米白纸感） |
| `--surface` | `#FFFFFF` | 卡片面 |
| `--ink` | `#2C3E35` | 正文（深炭绿） |
| `--muted` | `#66756B` | 次级文字（苔灰，对比度 4.6:1） |
| `--moss` | `#4A7C59` | 品牌主绿：主按钮/当前状态/进度/关键图标 |
| `--lake` | `#5B8BC7` | 鸟类 · 天空蓝 |
| `--sun` | `#D4A574` | 奖励色：首发现 / 特殊收藏 / 高级徽章 |
| `--orange` | `#C98A5A` | 昆虫 · 暖琥珀（点缀，不作主按钮） |
| `--line` | `#E5E3DA` | 1px 边线 |

类别色：`--c-plant #5E8F6B`、`--c-bird #5B8BC7`、`--c-insect #C98A5A`、`--c-fungi #B06B67`、`--c-aqua #5E9496`

## 二、语义色（页面/组件只消费这一层）

| 类别 | 令牌 |
|---|---|
| 背景 | `--color-bg`、`--color-surface-1`（卡片）、`--color-surface-2`（面板）、`--color-surface-3`（凹陷/轨道底） |
| 文字 | `--color-text`、`--color-text-secondary`、`--color-text-tertiary` |
| 边框 | `--color-border` |
| 品牌 | `--color-primary`、`--color-primary-hover`、`--color-primary-light`（选中底/已达成） |
| 强调 | `--color-accent` |
| 状态 | `--color-success`、`--color-warning`、`--color-danger`（含 `-surface` / `-border` / `-text` 三件套）、`--color-info`（同三件套） |
| 深底文字 | `--color-on-dark`（深色遮罩上的浅色文字） |

## 三、尺寸与节奏

- 阴影三级：`--shadow-sm` / `--shadow-md` / `--shadow-lg`
- 圆角：`--radius-sm 12rpx` / `--radius-md 18rpx` / `--radius-lg 24rpx` / `--radius-xl 32rpx`（旧名 `--radius-card`、`--radius-action` 保留为别名）
- 间距：`--space-xs 8` / `--space-sm 16` / `--space-md 24` / `--space-lg 32` / `--space-xl 48`（rpx）
- 字号：`--text-xs 23` / `--text-sm 25` / `--text-base 28` / `--text-lg 32` / `--text-xl 40` / `--text-title 46`（rpx）
- 触控：`--tap-min:88rpx`（微信规范最小触控区统一出口）

## 四、使用约定

1. **禁止**在页面/组件里写新的十六进制色值；艺术层除外（见下）。
2. **禁止**使用 `var(--token, #旧色)` 回退写法——回退值会冻结旧配色，已有回归测试 `tests/native-c-theme.cjs` 守护。
3. **艺术层豁免**：以下属于插画/印刷表现，不纳入 UI 令牌体系
   - `pages/home/index.wxss` 的季节场景色（`--season-*` 与装饰色）
   - `components/collectible/index.wxss` 的实体卡面印刷色（卡纸、烫金、全息/异形卡框）
4. 新增状态色时，同时提供 `-surface` / `-border` / `-text` 三件套，避免散落的近似色。
5. 文字对比度须 ≥4.5:1（回归测试自动校验 `ink` / `muted` / `moss` 对纸白背景，以及主按钮白字对品牌绿）。
