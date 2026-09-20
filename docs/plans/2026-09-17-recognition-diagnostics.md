# 识别失败诊断与安全反馈

用户真机已通过隐私确认，看到旧“服务未配置或鉴别失败”提示。该提示只能证明识别结果进入failed分支，不能证明具体配置缺项。本轮不读取环境变量值，不连接控制台，不以本地mock推断线上原因。

## 确定性缺陷与修复

1. classifyRecognition丢弃云端code；上传票据失败也统一抛upload_unavailable。现保留白名单code及纯数字providerCode，页面持续显示原因和“识别码”，不输出请求URL、token、第三方error_msg或完整异常。
2. 老版本photoFileId可能位于observations/草稿.jpg，新函数要求observations/OPENID/草稿.jpg。旧值会永久forbidden。现仅复用photoUploadVersion=2的地址；用户同意识别后旧草稿重新走私有上传，保存版本标识，随后重试不重复上传。旧云照片不会擅自删除；既有云删除/保留周期待单独完善。
3. 通用识别并行调用animal/plant，旧Promise.all任一路失败会丢弃成功结果。现在分路收集错误：有候选时保留并强制needs_confirmation，显示部分结果警告；均失败返回安全原因，不伪造unknown或成功。
4. 云返回contractVersion=2；旧部署没有此标识时提示cloud_version，避免混用旧百炼识别与新百度请求协议。

## 安全码与控制台动作

- not_configured：在当前环境的recognizeObservation配置BAIDU_API_KEY、BAIDU_SECRET_KEY，不要配在natureAI2，更不要把值发聊天；保存后部署函数。
- provider_auth_failed：在百度控制台核对同一应用的两项凭据是否有效、配套。无需向助手提供值。
- provider_permission / 百度6：启用动物和植物识别接口。
- provider_quota / 百度17或19：核对日/总额度及计费状态；provider_rate_limit / 18：降低并发后重试。
- provider_token / 110或111：核对鉴权环境；函数每次申请token，不使用客户端缓存token。
- provider_image：换为可解码JPG/PNG；photo_unavailable：照片需小于4MB。
- asset_registry：创建assets集合并设置创建者写入与读取权限。photo_upload/photo_download：检查私有存储规则及文件存在性。不要开放公开规则绕过错误。
- forbidden：保留本地原图重新授权上传；不得使用其他身份的fileID。
- cloud_version/cloud_call/runtime_unavailable：确认根目录小程序使用正确CloudBase环境，并部署新版recognizeObservation、安装wx-server-sdk。客户端wx.cloud.init当前使用默认环境；若开发者工具默认环境与部署环境不同，需由所有者确认正确环境后再显式配置，不猜测环境ID。

依据百度官方错误码与鉴权说明：https://cloud.baidu.com/doc/AI_REFERENCE/s/Km3zhy5t7 、https://ai.baidu.com/ai-doc/IMAGERECOGNITION/Zk3bcxdfr 。数值码仅供维护定位，服务置信分数尚未校准为准确率。

## 验证边界

新增安全错误映射测试；云测试覆盖鉴权失败、接口权限失败、额度、归属记录失败、部分成功与不泄露原始错误；前端测试覆盖老照片重新上传、重试复用及配置错误常驻显示。没有调用真实百度或部署云函数。更新客户端和recognizeObservation后，用户只需提供屏幕上的识别码，不提供任何密钥。
