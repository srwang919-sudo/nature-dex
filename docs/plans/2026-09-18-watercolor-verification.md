# 水彩制卡阶段验证与部署前清单

## 已核实的真实接口
官方：https://docs.cloudbase.net/ai/image-model/wx-server-sdk
本地核对 wx-server-sdk 4.0.2、@cloudbase/ai 2.30.0。
正面调用 cloud.ai().createImageModel('hunyuan-image').generateImage，参数 model=HY-Image-v3.0-I2I-ToB-v1.0.1、images=[base64]、prompt、size、revise；结果 res.data[0].url。卡背模型为官方精确标识 HY-Image-3.0-Plus-4090-Tob-v1.0，只传 prompt/size/revise，不带图片输入。
这是同步长请求，不存在本实现杜撰的 HY task API。artOperations 是本应用的状态/幂等记录；客户端丢失首个响应可查询状态。正式函数需按官方建议配置足够的执行时限，SDK HTTP timeout=150000。

## 当前本地证据
- node --test tests/*.cjs：37/37 pass，含安全阶段错误映射和集合初始化。
- npm run build:weapp：PASS。
- 全部 24 个 native WXML/WXSS 文件官方单文件编译 exit 0。
- createArtCard、speciesIllustration、cleanupObservationAssets 及两个 provider.js 均 node --check 通过。
- 测试覆盖 HY 参数/二进制、公共缓存并发去重/跨用户复用、私有照片拒绝、正面 owner/幂等、严格失败不写 cards/drafts、主动原图路径、固定卡背资源和低动效既有回归。
- 2026-09-18 14:34（Asia/Shanghai）生产部署三个新函数 success:true：createArtCard 3files/2.9KB，speciesIllustration 3files/3.0KB，cleanupObservationAssets 2files/1.0KB。第一次Creating状态失败后重试成功，云端安装依赖。
- 14:38 单次speciesIllustration探测：普通翠鸟/kingfisher/confirmed，不传照片；返回 failed/service_unavailable，requestID 80b9a762-67b6-425a-a4f3-d8dccc67d591。失败在数据库外层，尚不能宣称模型可用。
- 14:40 createArtCard空参数/未确认拒绝测试返回 failed/invalid_request，requestID a4966e11-00c0-489e-8785-a5f64287e7da。没有上传照片或调用生成。
- 未读取密钥，未修改原案例资产。DevTools cloudfunctions已绑定nature-prod。
- 云控制台核验更新时间：createArtCard 14:32:28；speciesIllustration 14:32:41（之后安全阶段诊断版再次部署成功，3files/3.4KB）；cleanupObservationAssets 14:32:55。initCollections 14:43:05。
- 初始化返回 created=[artOperations,speciesWatercolors]，requestID 6ec18fd8-463e-4a63-8d5e-804c5cf128bd；原有assets报collection_setup_failed，控制台确认集合仍存在，未改动。
- 集合就绪后探测返回watercolor_failed，requestID e4a0b0e2-bfe1-4c69-ac14-aa79da4e38b1。生产日志仅Report，耗时531ms，函数运行码200不代表图片业务成功。
- 控制台将artOperations、speciesWatercolors都从“仅创建者可读写”收紧为“所有用户不可读写”，看到“权限变更完成”；服务端仍可读写。未扩大任何私有照片读取权限。
- 新安全诊断仅返回白名单阶段码，不写原始错误、URL、响应体或密钥；未开启额外日志。
- 14:57 安全阶段版仅一次探测返回watercolor_model_failed，requestID 347bb8c4-83d5-4745-9a52-2a8aafa00699：确定generateImage抛错，尚未下载/格式验证/上传。现有分类不能确定具体权限/额度/参数原因；不再重复计费重试，待控制台模型配置检查。
- 2026-09-20 15:02:32 部署脱敏摘要版成功（3files/3.7KB）。仅一次kingfisher诊断调用requestID=37d0862f-dc60-4490-b443-46e3b1adb25b，15:04:45链路日志明确 code=429，message=Request failed with status code 429。这是上游请求拒绝/限流类响应，尚无证据区分并发频率、模型额度或成长计划资格；不能宣称是欠费。不得重复调用碰运气。后续在生产环境AI面板核对该模型额度/并发和资格，必要时携请求ID提交平台支持。
- 脱敏测试覆盖URL、API key、token去除与200字符上限；全量37/37及build通过。仅记录白名单摘要，没有读取环境变量、密钥或上传用户照片。

## 已有参考图检查
assets/images 下七个已知物种 JPG 文件存在，合计约 624KB，是已有项目资料资产。
现有文档没有核实这些图的来源及可公开衍生插画授权；旧设计注明未完成授权核验只能开发预览。
因此未自动上传或将其登记 approved。用户已批准卡背改用文生图，不再依赖这些案例作为生成参考。

## 部署前必须处理
1. 生产环境固定 nature-prod-d0gufarx064489f0f。部署新函数 createArtCard、speciesIllustration、cleanupObservationAssets，云端安装依赖；旧 natureAI2 不再是新正面艺术流程。
2. 建立 artOperations、speciesWatercolors，客户端禁止直接读写，由云函数鉴权返回；现有 assets 保持用户隔离。initCollections仅固定这三个名称，认证用户可触发幂等建表，不接受任意集合名；非already-exists错误不再假报成功。
3. 不需要speciesReferences；原有七张案例保持原样、不登记公共参考。新公共背面只来自独立文生图。
4. 公共插画规则只能开放 public-species-watercolors/，严禁公开 observations/ 和 private-art/。需要在控制台实际检查规则，不以文件夹命名代替权限。
5. HY 模型权限、额度、执行超时和生成图安全策略须实际验证。输入/输出文件签名校验不是完整内容审核。
6. 主动离开时请求清理临时上传并取消未完成艺术操作；断电/杀进程/网络断开的遗留资产尚需部署可靠的过期清理与保留标记流程，当前不能宣称全生命周期清理已验收。
7. 真机测试：首次物种水彩成功、再次缓存命中、双用户并发、失败/主动原图、后台返回、断网、成功未揭晓恢复、导出、减少动效。

## 完成边界
本地主要路径已实现，三个函数部署成功。集合/权限/模型实测与可靠定时清理仍需验收，不满足正式上线门槛。生成失败不保存假卡，不降级为山水背面。
