# 去大自然里 · 原生微信小程序

> Nature Dex is being prepared as a privacy-first open-source nature observation and species recognition project. The open-source baseline is local and has not yet been published to GitHub.

活动入口为根目录 `app.js / app.json / app.wxss` 与 `native/`；`miniprogramRoot: ./`。旧 `src/`、`dist/` 是历史源码和产物，不运行 Taro 编译覆盖当前入口。七物种资料从 `src/data/species.ts` 文本同步并逐字段校验。

用户已确认当前独立 AppID、名称与主体；本轮只实施本地功能，没有上传或生成手机预览。开发者工具账号登录与产品真实用户登录不是一回事，真实识别、账号云同步和好友赠送未接通。

## 本地流程

- 图鉴按七物种去重；类别与工艺组合筛选，重复卡保留在最近记录。
- 内嵌相机单快门 / 相册 → 本机保存 → 独立鉴别（服务未接通时如实unknown）→ 明确手动选种 → 固定工艺 → 揭晓 → 单卡3D翻面/阅读 → 入册。
- `nature.drafts.v4` 多草稿带activeId，自动兼容旧 `nature.draft.v3`；未知照片、未入册卡均有恢复入口。删除只清理不再被记录引用的照片；失败保存在清理队列并可重试。
- 私人照片分享图及正背合图由用户明确选择生成并另行保存相册；微信分享按钮仅发送公共物种资料路径与示例缩略图，不携带私人原卡ID、照片、日期或笔记。
- 打印输出PNG：目标300dpi，外框821×1121px，裁切750×1050px，3mm出血与裁切标记；正文留在安全区。按原图尺寸及照片框覆盖裁切计算有效DPI，低于300明确提示，放大导出不会补回细节。正背分别输出。PDF与实体打印下单尚未开放。
- 附近是静态生境、季节与礼仪，没有真实定位、距离、公开热点或他人坐标。
- 个人页含最近观察、笔记、草稿、JSON备份及二次确认清除。JSON里的图片路径仅原设备有效，图片需要单独导出；清除也清理本产品生成的备份文件。

工艺概率为72/20/7/1；客户端仅为本地体验，正式可信发行需要服务端签发与版本化规则。识别/赠送契约在 `native/contracts/services.js`，明确 unavailable，不返回假成功。

## 来源

- 精确网页参考：`../去大自然里/index.html` 与 https://nature-card-app.app.workbuddy.host/
- 历史工程：`/Users/w/WorkBuddy/2026-09-13-08-59-43/nature-dex` 与 `/Users/w/WorkBuddy/2026-09-09-22-23-54/nature-dex`。
- 实施设计和三模块计划：`docs/plans/2026-09-13-local-parity-design.md`、`docs/superpowers/plans/2026-09-13-local-parity-{a,b,c}.md`。

## 验证

运行所有 `tests/native-*.cjs`：覆盖多草稿迁移、删除重试/共享引用、七格与筛选、双确认清除、分享隐私、打印尺寸、渲染指令、翻面/阅读、完整科学资料。官方编译必须逐文件：`wcc -d -o /tmp/check.js <file.wxml>`、`wcsc -o /tmp/check.js <file.wxss>`。

本轮本地测试与静态编译通过；相机/相册权限、照片清理、Canvas真机内存/导出、相册保存、微信资料分享落地、字体与GPU手感仍需真实微信设备验收。测试不能替代真机，PNG像素尺寸也不代表纸张色彩已打样。
# 2026-09-17 识别服务与发布入口（覆盖下方历史说明）

唯一发布源是根目录 app.js/app.json/app.wxss 与 native/。导入本目录到微信开发者工具，不导入dist。npm run build:weapp 和 npm run dev:weapp仅验证原生源；npm run experiment:taro为旧Taro实验，不作为当前产品发布。packOptions排除src/dist/scripts/tests/cloudfunctions和开发依赖；云函数单独部署。

百度是唯一物种识别服务，客户端调用recognizeObservation。拍照只存本地；“同意并鉴别”后才申请本人上传路径、上传并调用百度。0.86仅为待校准的候选分流阈值，不是准确率保证；所有候选仍需用户确认。低分候选和未知照片保留。未配置服务时可手动确认，不假报成功。

百炼只提供确认物种后的可选科普与手绘，卡详情分别显示授权按钮。科普仅发送名称，手绘发送已授权上传的照片。生成任务由用户主动查询，服务端校验本人任务；入册和启动不自动调用。AI科普标识“待核实”，不覆盖身份或保护信息。旧generateIllustration和natureAI2识别入口拒绝执行。

自动云同步与笔记上传已停用，避免无同意上传。我的页显示真实本地数量，空收藏为0，示例不计入；假积分、订阅价格与默认nash统计已去除。

## 必须由所有者在控制台完成

1. 吊销并轮换曾硬编码的旧百炼凭据；删除源码不能使旧凭据失效。不要把新值发送到聊天。
2. 百度应用启用动物与植物识别并确认额度；recognizeObservation环境变量配置BAIDU_API_KEY、BAIDU_SECRET_KEY。natureAI2配置DASHSCOPE_API_KEY；可选DASHSCOPE_TEXT_MODEL、DASHSCOPE_MODEL。仅在云控制台填写值。
3. CloudBase创建assets与aiTasks集合。assets客户端仅创建者读写，_openid不得伪造或修改；aiTasks客户端禁止读写，只允许受信任云函数访问。cards历史数据也设仅创建者读写。存储设仅上传者私有读写，不要为了预览开放公开访问。
4. 部署recognizeObservation与natureAI2及各自wx-server-sdk依赖；同时下线旧generateIllustration或部署其拒绝执行版。核对当前独立小程序、函数环境、外网访问、超时与额度。本地代码不会自动替换线上旧函数。
5. 微信隐私指引披露照片上传、百度识别、明确授权的百炼生成、存储和删除。当前deleteObservationAssets只是排队占位，不保证云端删除；完整云资产删除、保留周期及撤回机制验收前，不应正式上线照片云服务。函数身份校验不能替代数据库和存储规则。
6. 两个微信测试身份验证互相不能读照片或查询任务；云函数生成图片的私有读取权限需验证，不可开放存储规避。用清晰、模糊、多主体、非生物与未知物种真图校准阈值、记录误识别，mock测试不是精度评估。

没有操作账号、控制台、部署、上传或preview。七物种默认手绘PNG在本地包缺失，依赖既有云资源映射；本轮不改视觉，不保证离线插画可用。该资源链与私有生成图真机展示仍需验证。

## Open-source development

The canonical public source is the root native Mini Program and `native/` runtime. Start without provider credentials by running the local contract tests and the mock recognition flow. Provider-backed recognition requires owner-managed console configuration and explicit user consent; it is not required for ordinary contributions.

Before publishing, read [`docs/OPEN_SOURCE_SCOPE.md`](docs/OPEN_SOURCE_SCOPE.md). Do not commit `project.private.config.json`, `.env`, user photos, generated archives, or assets without a recorded license.

## 本轮本地证据

- node --test tests/*.cjs：22 tests / 22 pass / 0 fail。
- npm run build:weapp：原生入口、JS/JSON与页面文件通过，无Taro发布产物。
- 官方wcc/wcsc逐文件编译24个WXML/WXSS，全部exit 0，无stderr警告。
- 云函数JS/JSON通过；扫描root/native/cloudfunctions/src源码凭据字面量命中0，不读取环境变量值。
