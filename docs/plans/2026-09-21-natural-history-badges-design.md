# 自然博物徽章与英文生成提示词设计增补

> 执行中用户修订（2026-09-21）：下文1024px为生成源目标，不再是小程序分发尺寸；实际使用用户提供的12个独立源图，非破坏生成256×256 RGBA副本，每张≤60KiB、总计≤720KiB，主包<2MiB。动态百度物种必须继续支持：以服务端严格验证的speciesId为名称，可信映射只补英文/拉丁名；无映射不阻断，也不接受客户端自由prompt/name覆盖。

## 决策与边界

本增补只扩展 AI 艺术提示词和自然徽章，不改现有首页结构、导航与主视觉，不改七张“博物志案例”的数据、图片、顺序或“不计入收藏”口径。

生成链路继续遵守两条既有原则：

1. `createArtCard` 只基于用户已确认物种和该用户私有实拍生成卡面；生成失败返回明确失败，不把原图伪装成已生成艺术图。
2. `speciesIllustration` 只按确认后的物种生成公共博物插画，不接收用户照片；已经生成的物种继续命中 `speciesWatercolors` 公共缓存，跨用户复用且不重复生成。

## 英文动态提示词

两条提示词由服务端按经过校验的物种字段动态拼接，客户端不能传入或覆盖 prompt。

### 私有艺术卡 `createArtCard`

输入变量为 `speciesName` 与参考照片。固定模板：

```text
Create a refined natural-history watercolor portrait of the confirmed species "{speciesName}" from the supplied observation photograph. Preserve the individual animal or plant's true anatomy, proportions, diagnostic markings, colors, pose, and visible condition. Isolate one clear subject, keep a quiet habitat-informed background, soft natural light, translucent watercolor washes, colored-pencil details, subtle cold-press paper grain, museum field-guide accuracy, and generous editorial breathing room. No text, letters, numbers, labels, borders, frames, logos, signatures, fantasy traits, duplicated body parts, invented markings, or species substitution. This artwork is commemorative and must not be used as identification evidence.
```

`speciesName` 必须来自服务端确认映射，不能直接使用未经清洗的 `event.speciesId` 作为展示名称。

### 公共物种插画 `speciesIllustration`

输入变量为 `speciesName`，不输入照片。固定模板：

```text
Create a full-body natural-history watercolor plate of "{speciesName}" with scientifically faithful anatomy, proportions, diagnostic markings, plumage, fur, scales, or botanical structures. Show one complete subject in a restrained, species-appropriate Chinese habitat, with translucent watercolor washes, fine colored-pencil details, subtle cold-press paper texture, balanced museum field-guide composition, and clear silhouette separation. No text, letters, numbers, labels, card frame, logo, signature, photographic look, fantasy traits, duplicated anatomy, invented markings, or another species.
```

提示词文本变化必须升级 `styleVersion`（例如 `watercolor-t2i-v2`），因此旧 `v1` 缓存保持可追溯，新版本按 `styleVersion|speciesId` 形成新缓存键；同一 v2 物种仍跨用户复用。

## 12 枚透明 PNG 徽章资产

新增十二个不同物种主题，每个主题一张独立彩色 PNG，共 12 枚：

| 主题 | 文件 |
|---|---|
| 赤狐 | `assets/badges/red-fox.png` |
| 丹顶鹤 | `assets/badges/red-crowned-crane.png` |
| 帝王蝶 | `assets/badges/monarch-butterfly.png` |
| 毒蝇伞 | `assets/badges/fly-agaric.png` |
| 银杏 | `assets/badges/ginkgo.png` |
| 梅花鹿 | `assets/badges/sika-deer.png` |
| 朱鹮 | `assets/badges/ibis.png` |
| 大熊猫 | `assets/badges/giant-panda.png` |
| 扬子鳄 | `assets/badges/chinese-alligator.png` |
| 红腹锦鸡 | `assets/badges/golden-pheasant.png` |
| 雪豹 | `assets/badges/snow-leopard.png` |
| 普通翠鸟 | `assets/badges/common-kingfisher.png` |

每个文件为 1024×1024 RGBA 透明 PNG，主体安全区不超过画布 88%，边缘保留透明呼吸空间。原始资产统一使用彩色珐琅、古铜压印与克制高光；未解锁态复用同一张资产，通过页面 CSS 的灰度、低饱和与透明度处理呈现，不生成第二套图片。所有徽章禁止文字、数字、品牌标志和不透明方形背景。

十二主题的获得条件只读取真实收藏卡（排除 `kind === 'example'` 和 `sample`）：收藏对应 `speciesId` 后点亮。既有四个类别成就继续保留原阈值与统计逻辑；本次增加 `speciesBadges`，不借机改写类别成就。徽章主题不等于新增案例卡；不在现有物种表中的主题只有用户未来真实确认并收藏对应物种时才点亮。

## 三处接入

- **图鉴**：在自然章节与收藏卡之间增加“物种徽章”横向陈列；未获得与已获得均引用同一彩色 PNG，未获得项由 CSS 灰度/低饱和处理并显示“等待相遇”。案例卡不得点亮徽章。
- **我的**：原“我的自然勋章”保留类别成就，并新增十二枚物种徽章网格；统计中的徽章数量为类别已得数加物种已得数，仍只来自真实收藏。
- **揭晓**：新物种首次揭晓时，若本次收藏将首次解锁对应主题，在卡片揭晓完成后追加一次徽章揭晓；重复观察不重复播放。减少动态模式直接呈现最终徽章，不震动、不旋转。

徽章资产只作为本地静态资源，不写入公共物种水彩缓存，也不改变卡面 `artPhotoPath`。

## 失败与恢复

- `createArtCard` 或 `speciesIllustration` 失败时保留既有照片与任务状态，但不得把原照片写成生成成功结果，不得设置 `artStatus: 'fallback'`。
- UI 显示明确失败码与重试入口；重试使用原 operation/cache key，防止重复任务。
- 公共缓存只返回 `status === 'ready'` 的资产；`failed` 可由显式重试重新获得租约，旧成功缓存不删除。
- 徽章图片缺失时显示语义化占位和名称，不以 emoji 或案例图片冒充生成资产。

## 验收

- 首页和七张案例的相关文件哈希在实施前后不变，或通过精确契约测试证明内容未变。
- 两条英文 prompt 包含动态物种名、科学准确性、媒介、负面约束，且客户端无法覆盖。
- 12 个 PNG 均为 1024×1024 RGBA、透明角像素、文件名与清单一致。
- 图鉴、我的、揭晓均读取同一徽章定义；首次真实收藏点亮，案例与重复观察不误触发。
- 生成失败不回退原图；已生成物种插画继续公共缓存复用。
