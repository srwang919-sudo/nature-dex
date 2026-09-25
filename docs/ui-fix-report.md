# UI 视觉问题清单与修复对照（v0.1.3）

## 一、配色体系重设计

旧色板偏冷硬的深绿 + 米黄，层次靠阴影堆叠；新色板改为**温暖自然色系**，层次靠「背景 → 面板 → 卡片」三级明度差 + 三级阴影。

| 令牌 | 旧 | 新 |
|---|---|---|
| `--paper` 背景 | `#F5F2E9` | `#FAF9F6` 米白 |
| `--surface` 卡片 | `#FCFAF3` | `#FFFFFF` |
| `--ink` 正文 | `#243028` | `#2C3E35` 深炭绿 |
| `--muted` 次级 | `#5C675C` | `#66756B` 苔灰 |
| `--moss` 主色 | `#49634E` | `#4A7C59` 苔藓绿 |
| `--sun` 奖励 | `#C99B48` | `#D4A574` 暖阳金 |
| `--lake` | `#64869A` | `#5B8BC7` 天空蓝 |
| `--line` | `#DDD8C6` | `#E5E3DA` |

新增语义层（13 类）、阴影三级、圆角四级、间距五级、字号六级、`--tap-min:88rpx`，详见 `docs/design-tokens.md`。

## 二、问题清单与修复

| # | 问题 | 位置 | 修复 |
|---|---|---|---|
| 1 | 23 处 `var(--token, #旧色)` 回退，冻结旧深绿主题 | home(3)、nearby(10)、print-admin(10) | 全部删除回退值，改消费语义令牌；新增回归断言禁止该写法 |
| 2 | 6 个页面存在「C theme alignment」重复覆盖块，同一选择器定义 2–3 次 | nearby、profile、observe、settings、note、card | nearby/profile 已合并去重（保留其中的布局规则），observe/settings/note/card 覆盖块内的旧色值改令牌 |
| 3 | 选中绿 `#E6EBDD` / `#E7EBD9` / `#EAF0E4` 等 5 个近似色散落多处 | profile、settings、observe、nearby | 统一为 `--color-primary-light` |
| 4 | 危险红 3 种并存（`#b03a26`、`#B8492A`、`#C75B5B`） | settings、observe、全局 | 统一 `--color-danger`，并配 `-surface/-border/-text` 三件套 |
| 5 | profile 页 `.badge-medal` 系列是死 CSS（wxml 无引用） | profile/index.wxss | 删除（徽章视觉将在徽章专项中重做） |
| 6 | 触控区 88rpx / 96rpx 混用 | 全局 | 统一 `--tap-min:88rpx` 单一出口 |
| 7 | 卡片阴影散落硬编码（`#18222a0a` 等） | nearby、settings、navigation、home | 建立 `--shadow-sm/md/lg` 三级并替换 |
| 8 | `--space-section` 是死令牌，实际到处写 magic number | app.wxss | 删除，改 `--space-xs~xl` 五级 |
| 9 | 字号 12/14/16/18px 混用无规律 | 全局 | 建立 `--text-xs~title` 六级 |
| 10 | navigation 贴底栏沿用旧纸色 `#F5F2E9`、旧主绿 `#49634E` | components/navigation | 改 `--color-bg` / `--color-primary` |
| 11 | 深色遮罩文字色散落（`#FFF8E8`、`#f7f3e9`） | card、observe | 统一 `--color-on-dark` |
| 12 | 版本号与 package.json 不一致 | settings / package.json | 统一升至 0.1.3，测试守护一致性 |

### 未改动（有意保留）

- `pages/home/index.wxss` 季节场景色（`--season-*`、装饰色块）：属插画艺术层，令牌化会破坏四季表现。
- `components/collectible/index.wxss` 卡面印刷色（卡纸、烫金、全息/异形卡框）：模拟实体印刷品质感，属艺术层。
- `components/nature-badge/index.wxss`：将在徽章专项（里程碑2）随视觉重设计一并处理。

## 三、验收

- `npm run build:weapp` → PASS
- `node --test tests/*.cjs` → **303 通过 / 0 失败**
- `tests/native-c-theme.cjs` 升级为新守护：新色板 hex、语义层齐备、三级体系齐备、无旧色回退、对比度 ≥4.5:1、触控区令牌化
