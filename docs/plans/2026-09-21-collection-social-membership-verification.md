# 收藏、自然勋章与本地设置：独立验证记录

日期：2026-09-21。被验证产品代码提交：`fdca7095798ee19ce59422c917582e110f6c25af`。

## 验证边界

本轮从 HEAD 通过独立临时 Git index 检出到 `/tmp/nature-task8-clean-RtJsyY`，未带入当前工作目录的历史未提交代码、云函数、视觉或文档更改。未部署、未调用生产模型、未上传预览、未发布正式版。仅本地自动验证通过，不代表线上或真机可用。

执行来源为已批准的 collection-social-membership 设计和实施计划。Task1–7 分别提交兼容 CardV2、自动艺术制卡、首页三栏与单次相机入口、真实图鉴与主动私有地点、十二条件勋章、头像与本地设置、未开放会员/好友说明。

## 当前证据

| 命令或检查 | 实测结果 |
|---|---|
| `node --test tests/*.cjs` | 64 个测试文件，64 通过、0 失败、0 跳过 |
| `npm run build:weapp` | PASS native release source and syntax；仅原生源校验，不产生上传包 |
| `node --test tests/badge-assets.cjs tests/badge-pack-size.cjs tests/natural-history-badges-baseline.cjs` | 3/3 通过 |
| `node --check` 对 app.js 与 native 下全部 JS | 41 文件通过 |
| JSON.parse：app.json、project.config.json、sitemap.json 和 native 下 JSON | 6 文件通过 |
| 官方 wcc 单文件编译 | 12 WXML 通过 |
| 官方 wcsc 单文件编译 | 12 WXSS 通过 |
| 主包保守未压缩统计，按 packOptions.ignore 排除 | 1,908,045 字节，109 文件；低于 2,097,152 字节上限，余量 189,107 字节 |
| 徽章 PNG | 12 张；均 256×256、8-bit RGBA、四角透明且有可见主体，单张不超过 60 KiB |
| 原案例不变契约 | example-cards.js、源物种资料、7 张原图片共 9 项 SHA-256 与原常量完全一致 |

官方编译器实际路径：
`/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/`。
对每个 WXML 执行 `wcc -d -o /tmp/nature-task8-wxml.js <实际文件路径>`；对每个 WXSS 执行 `wcsc -o /tmp/nature-task8-wxss.js <实际文件路径>`。遍历范围仅 active native，不把停用 Taro 当作发布源。

首页可变结构契约已在 Task3 拆分，由 native-direct-camera / 三栏导航测试验证；案例哈希未重采样，本轮无需修改基线测试。代码片段中的文件参数表示实际遍历的12个模板，不是未执行的计划。

## 已覆盖的产品与失败边界

- 兼容旧卡、CardV2 艺术正面/原图背面、可信本地科普快照与缺失状态。
- 一次确认自动制卡；生成、资源、存储、取消或迟到失败不生成收藏/草稿/勋章/导航，不静默退回原图。
- 首页“拍一张”与 source=camera 单次接收；三栏为首页/图鉴/我的。
- 图鉴只真实记录、整齐/拼图布局；案例与失败不计入统计。
- 地点只有用户主动操作后选择，公开投影不含坐标且地点未公开；本机地点默认隐藏，卡主编辑区标“仅自己可见”。
- 十二勋章条件、去重物种等级、主动科普阅读去重、重复/示例/失败/存储异常边界。
- 主动头像取消、文件保存失败、偏好写失败、清除后迟到回调；旧头像不因失败丢失。
- 识别同意、减少动态、清除双重确认、清除后迟到备份不复活。
- 会员月18/年180、省36约16.7%；无已付费状态；好友无假数据。
- 会员/好友入口加载及 onShow 的 requestPayment、request、cloud.callFunction、旧 syncCards spy 调用次数均为0。

## 尚未验证或尚未开放的外部门

以下各项均不能由 Node/模板编译推导完成，仍是发布阻断或待安排验收：

- **真实云艺术/资料**：本轮没有真实 createArtCard 调用、供应商授权/额度/超时核验、跨端资源下载与导出实测。科普目前使用可信本地字段；动态物种缺资料不编造，不能宣称完整云端百科可用。
- **真机相机**：iPhone/Android 拍摄权限、source=camera 只打开一次、相册取消、返回前后台未实测。
- **真机头像**：chooseAvatar 平台支持、取消、图片持久化、重启恢复、清除与权限提示未实测。
- **真机卡片/导出**：艺术正面与原照片背面、翻面手感、长文本、图片读取失败、打印PNG与相册授权未实测。
- **真机地点**：chooseLocation 授权/拒绝、文本地点、权限撤回未实测。微信后台隐私保护指引、用途声明及 chooseLocation 接口审核需主体完成并验收；本地 app.json 声明不代表后台已批准。
- **布局可访问性**：375/390/430 宽、放大字体、低动效实际手感、真实双布局和勋章灰度/反馈未做本轮截图或真机验收。
- **支付**：仅未开放说明。商户、产品权益、订单、防重、验签回调、退款及正式审核均未接通，绝不视为已开通。
- **好友**：仅未开放说明。微信登录/CloudBase关系、显式公开授权、持有人复制审批、跨用户隔离与撤回尚未接通。
- **发布**：没有预览/上传/审核/发布回执。保守本地包体并非微信最终构建包回执。

## SHA-256 留档

前9项为原案例/数据不变基线；后12项为本轮已提交勋章资源身份记录，不改变原案例。

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
08bed0c55685bd99ac3cab5b27f8400b44f852cd7ea8cae8a069d298f57927a2  assets/badges/chinese-alligator.png
e58c5dcaa715ecb549b4c61d11ace23d3a8bf6eaa224d9ae4fa721ced2029392  assets/badges/common-kingfisher.png
35062edcbf71eb576c3d531825d8d4f8a35990b3de5ce68e1241a3c6325d974a  assets/badges/fly-agaric.png
3aac3b2f3895194282275b87d8d2d0516fcc3c0ade5c4f9e1f2f221c29207ba9  assets/badges/giant-panda.png
9f216265de83a435c1c4a654b69d8613ac176762d9f7c16819b962f65892e89b  assets/badges/ginkgo.png
0faaab816bd148b665f33b16066294c62aad709f6f69a2cdfaf1768b9db9e860  assets/badges/golden-pheasant.png
750f54d5eeb4bc78eafe3a6147c95fcb6719fc110102125be415b66e2a36f4c6  assets/badges/ibis.png
ae5a84c5a3a3214dac97b4b119fbb14cd1e09e4868a898f0985a1e09fd483507  assets/badges/monarch-butterfly.png
6c3bc376fafe98f123f91c8cc437dd1cf00faa37e2c76bd60f61cc20fe469436  assets/badges/red-crowned-crane.png
ba068d9a62b9dd55a0624aef6e9145b1001e12b474c0ce871450b7c915b37b58  assets/badges/red-fox.png
7ccfcc64a9a675a46094e65a124df26cecca7887420ba8af3c105ee41ef96267  assets/badges/sika-deer.png
8abcd77cd478207a2d9fcfbf37c403c8c12e2bde64524a058a1f0bdd75ce4ae3  assets/badges/snow-leopard.png
```

## 结论

本地实施阶段的独立自动验证通过；不作“所有目标已完成”或“可上线”的结论。需要主控安排以上外部门与真机验收后，才能做发布判断。
