# 卡架、自然史正面、百度科普与勋章预览：最终本地验证

实际复验日期：2026-09-23。文件名沿用已批准计划的2026-09-21命名。
验证提交：`2e34a3e349e9330d418a76e3f7114ea475a88281`。

## 范围和隔离

依据 `docs/superpowers/plans/2026-09-21-baidu-card-gallery-badge.md` Task5。
使用临时Git index读取HEAD，再通过checkout-index独立检出至 `/tmp/nature-gallery-final-uOvdWT`。没有带入工作区历史未提交的cloudFailure诊断、旧prompt、头像/六格统计或其它视觉变更。上次中断留下的临时日志不可用，因此本次重新执行全部验证。

本轮只写验收文档，未部署、未调用生产识别/图像供应商、未读取密钥、未上传预览或正式发布，未修改案例资源。

## 命令与实测结果

| 检查 | 结果 |
|---|---|
| `node --test tests/*.cjs` | 71/71测试文件通过；0失败、0跳过 |
| `npm run build:weapp` | 原生发布源与语法校验通过；没有产生Taro dist或上传包 |
| 下列9项专项测试 | 9/9通过 |
| app.js + native全部JS + recognizeObservation全部本地JS + createArtCard/index.js与natural-history-prompt.js，逐个node --check | 45个文件通过 |
| app.json/project.config.json/sitemap.json + native全部JSON，JSON.parse | 6个文件通过 |
| 官方wcc单文件编译 | 12个WXML通过 |
| 官方wcsc单文件编译 | 12个WXSS通过 |
| 保守主包统计（按packOptions.ignore排除） | 1,916,394字节／109文件；低于2,097,152字节，余量180,758字节 |
| 徽章资产检查 | 12张256px、8-bit RGBA PNG；四角透明、可见主体、各≤60KiB |
| 案例不变契约 | 原7张图片及example-cards.js、src/data/species.ts共9项哈希与原常量一致 |

专项实际命令：

```sh
node --test tests/native-card-shelf.cjs tests/native-natural-history-front.cjs tests/cloud-natural-history-prompt.cjs tests/cloud-baidu-science.cjs tests/native-confirmed-science.cjs tests/native-badge-preview.cjs tests/badge-assets.cjs tests/badge-pack-size.cjs tests/natural-history-badges-baseline.cjs
```

官方工具目录为 `/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/`。
遍历native内12个WXML，分别执行wcc的 `-d -o`；12个WXSS分别执行wcsc的 `-o`，输出到本次 `/tmp/nature-gallery-compile-*` 临时目录。全部进程退出码0。包体是本地未压缩保守统计，不是微信上传回执。

## 已验证的行为边界

- puzzle偏好迁移shelf；保留旧puzzleUsed成就，空图鉴不获奖；滑动仅改变索引，点卡才导航；不自动轮播。
- 卡面与Canvas使用共用正面文字模型；类别缺失诚实显示；公开地点无坐标且“地点未公开”；V2背面仍为原始照片。
- 新操作采用无文字/水印/编号的自然史提示词；忽略客户端自由信息，拒绝自由prompt；旧ready操作复用，legacy重试保持旧风格。provider/API未改变。
- 百度三路与百科参数mock契约、原评分保留、部分失败/路线分歧警告；HTML/危险URL过滤，缺资料不编造。
- 候选不自动选中，确认身份错配拒绝；成功制卡后才有scienceSnapshot；迟到识别不写入另一次观察。可信本地结构字段优先，动态摘要留来源。
- 勋章预览显示模型原规则/进度、锁定灰度、图片失败提示；不写存储、不解锁、不重置页面滚动；无新增持续动画。

## 原案例SHA-256

```text
d26ff3cde96292ddbe1cda731bb285c49806ae5a961e6811ac667da934df3dcc  native/lib/example-cards.js
90e28fb240ce6703d8ebb6e3a36471abbbb69973b7ff33d553d888c95600b4ac  src/data/species.ts
e5cca32e97f1b6c24cbd00116aae10d3dd9ae22f5c83afcb2206f5d557a19eaf  assets/images/camellia.jpg
6ecf5d0990807addfdaf07f258a75d41f94e8566b301425d8b896b4301e9fbb2  assets/images/egret.jpg
393f04cb416bd04b15632eff608320520c4b8b13e4e3ef0815e7ed0f84e8deb6  assets/images/ibis.jpg
dad4be1f920011c7592b12a83aa644475bebd0dbfe5cdc2ca5a197bbaefabe3b  assets/images/kingfisher.jpg
b353840369309cc118ec0c0345910a759f05d3a0c37f988396519533d8fe4e89  assets/images/moth.jpg
cda732f43edba35028cfe5ff399d231d3f72335ec243c95fbf087163d9c55e4d  assets/images/pheasant.jpg
344343e078b09b6fbb50d568231e375db518bd3b999603726eb96235a8c4ed22  assets/images/sparrow.jpg
```

## 未验证外部门与发布阻断

1. **真实服务未验证**：三路百度账号权限、额度、真实baike摘要覆盖率、路由校准、延迟及图片规格需真实授权验收。官方契约记录见 `2026-09-21-baidu-science-contract.md`，不代表该账号已经开通。
2. **艺术质量未验证**：新提示词未在生产模型实测；完整主体、物种形态、无生成文字与画面审美仍需实际输出和人工确认。
3. **部署未进行**：createArtCard与recognizeObservation的新本地代码没有由本轮部署。上线前需另行授权部署、核对运行时/依赖/超时与日志，再做最小真实调用验收。
4. **真机未验证**：相机/相册/头像权限、重启持久化、下载/Canvas导出、原照背面、主动地点拒绝与撤权；错误/超时/取消/文件失效在真实设备上的表现。
5. **视觉交互未验证**：375/390/430宽、放大字体、卡架滑动不误点、卡片排版/翻面、勋章浮层滚动/关闭/灰度及低动效。未为获取截图启动可能同步云端的预览。
6. **微信后台外部门**：chooseLocation隐私保护说明与接口审核；本地权限说明≤30字不等于后台审核完成。域名、类目、审核材料与实际构建仍需发布验收。
7. **支付/好友仍未开放**：商户、订单、验签回调、退款；微信登录、CloudBase关系/公开授权/复制审批，均未接通。本地入口只说明边界，无伪支付或好友数据。
8. **未发布**：无体验版上传、正式审核或发布回执。历史工作区脏改动仍独立存在，本记录不替它们背书。

结论：此提交版本的本地自动验证通过；线上服务、实际画风、真机和发布目标尚未验收，不能宣称全部产品目标完成。
