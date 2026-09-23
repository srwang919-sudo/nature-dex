# 所有者配置与外部验收（2026-09-23）

只在相应控制台填写密钥；不要通过聊天、截图、代码提交任何密钥值。本轮仅本地代码整改，没有部署、修改规则或调用提供者。客户端当前固定环境 `nature-prod-d0gufarx064489f0f`；独立 AppID/主体、管理员权限仍须所有者核验。

## 当前调用与依赖

| 函数 | 用途 | 环境变量（仅名称） |
|---|---|---|
| recognizeObservation | 本人上传路径、资产登记、百度动物/植物/通用候选及可用百科来源 | 必填 BAIDU_API_KEY、BAIDU_SECRET_KEY；可选 NATURE_RECOGNITION_DAILY_LIMIT |
| createArtCard | 已确认候选+单次同意，私有腾讯混元图生图 | 可选 NATURE_ART_DAILY_LIMIT；通过 CloudBase AI 权限，不用百炼 Key |
| speciesIllustration | 服务端共享物种水彩缓存；当前 CardV2 不调用它生成背面 | 可选 NATURE_WATERCOLOR_DAILY_LIMIT |
| deleteObservationAssets | 先标记/取消再删除本人的原图与私有艺术图 | 无 |
| cleanupObservationAssets | 放弃临时观察时的清理 | 无 |
| initCollections | 固定集合初始化工具，仅所有者运维使用，不暴露产品入口 | 无 |

旧 natureAI2 仍含百炼接口与 DASHSCOPE_API_KEY / DASHSCOPE_MODEL / DASHSCOPE_TEXT_MODEL 配置读取，但不是当前制卡链；旧 generateIllustration、claimGift 不应当作已上线功能部署。关闭不使用函数的客户端调用权限，轮换曾泄露/硬编码的历史凭据；删代码不等于吊销。

## 发布前必须由所有者完成

- [ ] 核对当前小程序与既定 CloudBase 环境绑定；部署已审阅版本 recognizeObservation、createArtCard、speciesIllustration、deleteObservationAssets，以及必要的清理函数；本地文件存在不等于云端版本正确。
- [ ] 检查生图函数平台 timeout 为180秒、SDK兼容、模型已开通且有额度，微信端等待/取消行为实测；不得为解决报错开放私有存储。
- [ ] 服务端集合 `assets`、`artOperations`、`speciesWatercolors`、`observationDeletions`、`usageQuotas` 客户端禁止直接读写；全部写入由云函数派生 OPENID。遗留 cards/aiTasks 数据单独盘点并施加所有者隔离，不能默认公开。
- [ ] 私有 observations/ 与 private-art/：只有所有者可读、不可跨人列举/下载；服务端上传生成图尤其要以两个微信身份实测。不把公共水彩缓存设置变更扩展到原图目录。
- [ ] 新增集合部署前创建并设规则；缺集合/权限时必须失败关闭，不跳过删除标记或限额。删除标记至少长期保留以阻止同观察 ID 重建；计数按 UTC 日期隔离，清理过期计数时不删当天。
- [ ] 默认每 OPENID 每 UTC 日 art=3、watercolor=3、recognition=20；可选变量只接受整数0–100，0停止新调用，非法值使用保守默认。认领/扣额在事务中，失败不退额，缓存/状态查询不扣额。该机制不代替全站费用上限、账号滥用风控、预算告警；另设控制台每日总预算与告警。
- [ ] 百度动物/植物/通用图像接口权限、百科返回能力、额度与保留条款核验。所有候选必须确认；模型分数不可写成准确率。
- [ ] 隐私指引如实披露百度鉴别、腾讯云私有照片处理、腾讯混元艺术生成、单次生成同意、保存期限和删除渠道。当前链路不发送到百炼，未来更换提供者须同步文案与同意版本。
- [ ] 微信后台声明 chooseLocation 的主动选地点用途与隐私接口审核。没有操作就不能采集位置；所有公开投影始终隐藏地点与坐标。
- [ ] 两身份验证删除：本人成功；外人不能操作；存储失败不显示成功；生成中删除重试；生成迟到不能复活；旧缺观察 ID 卡进入人工处理，不假报成功。
- [ ] 制定未成功观察的上传原图/生成结果保留期限、撤回与账号删除渠道；本机「清除本地数据」不会撤销云端数据。已有下载/相册图片需用户自行删除。
- [ ] 真机相机、相册、头像、Canvas导出、分享与小字体验收；支付商户/订单/回调、微信登录/好友授权均未接通，不得宣传可购买或赠送。

## 安全错误定位

3/3/20是暂定运营保护值，不是会员权益或最终业务定价；发布前由所有者结合预算确认/调优。仅每人限额不能挡住多账号攻击或无限上传存储成本，需要控制台总预算和运维监控。

`asset_registry_missing` 是发布前需处理的孤儿原图阻断：没有本人 assets 登记，服务端不猜 CloudBase bucket/fileID，不把未知状态当作已删除。卡片保留、删除标记阻止继续生成；所有者须按本人观察路径在存储清理并补验收。既有完整删除标记的无登记重试才返回已删除。历史无登记文件的盘点/保留清理仍是外部门。

`daily_limit` 表示本人当日限额；`quota_unavailable` 检查 usageQuotas 规则/可用性；`art_consent_required` 重新在前端确认本次生成；`deletion_pending` 等生成取消收尾后重试；`cloud_delete_failed` 保留本机卡、核对函数安全日志和存储权限。不复制日志中的照片 URL、用户资料或凭据到公开问题中。
