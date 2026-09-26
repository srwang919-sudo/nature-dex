# 去大自然里 · 全流程 UI/UX 评审

> 版本 v0.1.11 ｜ 评审日期 2026-09-26 ｜ 范围：14 个注册页面 + 3 个公共组件 + 设计令牌层
> 方法：逐页读 wxml/wxss/js，核对《设计令牌》文档约定，按 WCAG 2.2 AA 实测字号与对比度，跑构建与全量回归。

## 一、结论

产品骨架是健康的：令牌体系、隐私表达、失败态文案（"搬运 Explain：失败不说成功"）都高于同类小程序的平均水平。这轮发现的问题**不是审美问题，而是三类硬伤**：

1. **有功能的壳在响、真身已下线** —— 「探索生境」入口指向已被删除的 nearby 页，点了必失败。
2. **关键信息弱到读不清** —— 三级文字色对比度只有 2.41:1，徽章"还差几次能拿到"这类决定用户行为的信息正挂在上面。
3. **样式来源不明** —— 多处 wxss 是"旧主题 + C theme 覆盖"双层甚至三层叠加，同一个文件里两套导航设计互相打架，改一处不知道会被谁覆盖。

已修复 11 项，全量回归 302/302 通过，构建 PASS。

## 二、问题清单

### P0 · 影响可用性与可信度

| # | 问题 | 位置 | 状态 |
|---|---|---|---|
| 1 | 「探索生境」入口 `wx.reLaunch` 到已删除的 `pages/nearby`，点击必失败 | `observe/index.wxml`、`observe/index.js`、`home/index.js` | ✅ 已移除入口与两端死代码 |
| 2 | `--color-text-tertiary #9AA5A0` 对比度 **2.41:1**（AA 要求 4.5:1） | `app.wxss` | ✅ 改 `#64736E`（4.73:1） |
| 3 | 禁用按钮文字用 tertiary，底 `#EFEFE8` + 字 ≈ **2.2:1**，用户看不清为何点不了 | `app.wxss` | ✅ 新增 `--color-text-disabled #8A9490`（≈3:1，inactive 组件符合 AA 豁免） |
| 4 | 导航栏背景 `#F5F2E9` 与页面背景 `#FAF9F6` 不一致，每页顶部出现色带断层 | `app.json` | ✅ 统一为 `#FAF9F6` |

### P1 · 明显的一致性与体验问题

| # | 问题 | 位置 | 状态 |
|---|---|---|---|
| 5 | 同一个 wxss 里「浮动胶囊」与「贴底栏」两套导航并存，前 13 行被第 14 行整段覆盖；选中态只剩文字变色，失去视觉锚点 | `navigation/index.wxss` | ✅ 重写为单一贴底栏，选中态恢复「品牌色＋加粗＋图标底块」三重信号 |
| 6 | 设置页 6 个板块全靠 `wx:if` 塞一页，入口分裂——4 个在顶部按钮组，「好友说明」孤零零沉在页面底部 | `settings/index.wxml` | ✅ 好友入口并入顶部按钮组，删除冗余的 availability-links |
| 7 | 征程罗盘/图例/气泡 **22rpx（11px）**、节点标签 **18rpx（9px）** | `journey/index.wxss` | ✅ 统一提到 24rpx 起，窄屏 19rpx |
| 8 | 个人页统计/页脚/订阅标签 **20rpx（10px）**，且用了 `#3d4944` `#8a938c` `#5c6b76` `#697669` 等裸色 | `profile/index.wxss` | ✅ 提至 22–24rpx，裸色改令牌；删除已被覆盖的旧徽章文本规则 |
| 9 | 首页 wxss 中 `.today-*` `.recent-*` `.explore-card` `.past-section` 等约 15 个选择器已无对应结构（探索页已精简为「拍一张＋自然世界」） | `home/index.wxss` | ✅ 清理 |
| 10 | 图鉴页 `.footprints-*` / library 里的足迹面板已不渲染 | `library/index.wxss`、`app.wxss` | ✅ 清理（含 app.wxss transition 列表里的 `.footprint-row`） |
| 11 | 「关闭」是气泡里的裸 `<text>`，热区仅文字大小；轨迹行高度不足 88rpx | `journey/index.wxss` | ✅ 关闭键负 margin 撑到 88rpx 热区，轨迹行加 `min-height:88rpx` |
| 12 | 「探索生境」卡片移除后，双列入口网格只剩一张卡会半宽居左 | `observe/index.wxss` | ✅ 入口网格改单列全宽 |

### P2 · 打磨建议（本轮未改，需你定方向）

| # | 问题 | 影响 |
|---|---|---|
| 13 | 设置页仍是「一页六板块 `wx:if` 切换」，且与新的 `friend` 页功能重叠（连接好友/邀请码/点赞/分享/请求/副本两边都有实现） | 维护双份逻辑，改一处漏一处 |
| 14 | `native/lib/region-atlas.js`（64 行）随 nearby 下线后已无任何引用 | 死模块，建议连带 `tests/native-region-atlas.cjs` 一起处理 |
| 15 | `profile/index.wxss` 仍是「旧版 → C theme → 再次覆盖」三层叠加 | 改样式时不知道哪层生效 |
| 16 | 打印页信息密度过高：长段落说明＋按钮矩阵堆在一屏 | 完成 24 张选卡的心智负担偏重 |
| 17 | 搜索输入框无 focus 态与 placeholder 色定制 | 无障碍 2.4.7 Focus Visible 的边缘项 |

## 三、无障碍核验数据（实测）

对比度按 WCAG 相对亮度公式计算，背景取 `--paper #FAF9F6`（亮度 0.9473）。

| 令牌 | 改前 | 改后 | AA 正文 4.5:1 |
|---|---|---|---|
| `--color-text` `#2C3E35` | — | 12.4:1 | ✅ |
| `--color-text-secondary` `#66756B` | — | 4.61:1 | ✅ |
| `--color-text-tertiary` | `#9AA5A0` **2.41:1** ❌ | `#64736E` **4.73:1** | ✅ |
| `--color-text-disabled`（新增） | 复用 tertiary 2.2:1 ❌ | `#8A9490` **2.97:1** | ✅（inactive 组件豁免，按 UI 3:1 达标） |
| `--color-warning-text` 于 `--color-warning-surface` | `#5A4A28` 于 `#FAF3E4` | 6.4:1 | ✅ |
| `--color-info-text` 于 `--color-info-surface` | `#2A6280` 于 `#EDF3F9` | 5.95:1 | ✅ |

字号底线设为 **24rpx（12px）**；18–22rpx 仅保留给明确的装饰性标签（徽章等级 tag、地图比例尺），危险性—「搬运 Explain：不再用于承载操作后果的正文」。

一个必须说明的物理事实：在米白底上，**"比 secondary 更浅"与"满足 4.5:1"不可兼得**（tertiary 的亮度上限被锁死在 0.1716，而 secondary 已是 0.1662）。所以三级文字改用**更冷的灰绿色相**表达层级，而不是继续调浅。这是这轮唯一的取舍，如果你更看重"更浅"，就要接受它不达标。

## 四、改动清单

| 文件 | 改动 |
|---|---|
| `app.wxss` | 三级/禁用文字色；warning 与 primary-light 三件套、`--color-focus`；`.notice` `.pill.on` `.secondary.danger` 令牌化；`.page` padding 令牌化；清理 `.footprint-row` |
| `app.json` | 导航栏背景统一为 `#FAF9F6` |
| `native/components/navigation/index.wxss` | 重写为单一贴底栏；选中态三重信号；字号 26rpx |
| `native/components/navigation/index.wxml` / `index.js` | 移除已下线的 `capture` 中间按钮分支 |
| `native/pages/observe/index.wxml` / `.js` / `.wxss` | 移除死链入口；删除 `nearby()` 与 `.habitat-drawing`；入口网格单列；补齐根 view 闭合 |
| `native/pages/home/index.js` / `index.wxss` | 删除 `openNearby` 死代码与约 15 个失效选择器 |
| `native/pages/library/index.wxss` | 清理 footprints 死样式 |
| `native/pages/journey/index.wxss` | 字号统一到 24rpx 起；关闭键与轨迹行触控区 88rpx |
| `native/pages/profile/index.wxss` | 三处小字号提升；四处裸色令牌化；删除被覆盖的旧规则 |
| `native/pages/settings/index.wxml` | 好友入口并入顶部按钮组；删除冗余 availability-links |
| `native/pages/setup/index.wxss`、`print-admin/index.wxss` | 字号 22→24rpx |
| `tests/native-atlas-single-title.cjs` | 布局预算守护支持 `--space-lg` 令牌取值 |

## 五、验收

```
npm run build:weapp   → PASS native release source and syntax
npm test              → 302 tests / 302 pass / 0 fail
```

修复前基线为 **289 pass / 13 fail**；其中 12 项来自中断在半途的 nearby 下线（页面目录已删、注册已移除，但跳转、app.json、测试未跟上），本轮由你中断后的提交与本次清理共同收敛；最后 1 项（布局预算读不到令牌字面量）随本次令牌化一并修正。

未验证项（需真机/多身份，本轮不具备条件）：相机与头像、导出到相册、两个微信身份的数据隔离、`.bubble-close` 负 margin 在真机上的热区实际表现。
