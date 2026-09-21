# 百度识别与候选科普契约核实

访问日期：2026-09-21。本记录只核实官方文档；未读取密钥、检查用户控制台、调用真实识别或部署。

## 官方来源与已核实契约

- 动物：[百度动物识别API](https://ai.baidu.com/ai-doc/IMAGERECOGNITION/Zk3bcxdfr)，正文直开暂失败，官方索引和[百度SDK说明](https://ai.baidu.com/ai-doc/IMAGERECOGNITION/fk3bcxi5z)交叉核实。POST `https://aip.baidubce.com/rest/2.0/image-classify/v1/animal`；表单image，动物支持top_num，可选baike_num；结果name/score、可选baike_info.description/baike_url。
- 植物：[百度植物识别API](https://cloud.baidu.com/doc/IMAGERECOGNITION/s/Mk3bcxe9i)，并核对[官方SDK](https://ai.baidu.com/ai-doc/IMAGERECOGNITION/4k3bcxj1m)。POST `https://aip.baidubce.com/rest/2.0/image-classify/v1/plant`；表单image及可选baike_num；结果name/score与可选百科摘要/链接。
- 通用：[百度通用物体和场景识别](https://ai.baidu.com/ai-doc/IMAGERECOGNITION/Xk3bcxe21)。POST `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general`；表单image及可选baike_num；keyword/score是物体/场景标签，并非必然是生物物种。root分类不擅自映射鸟/虫/保护级别。

图像使用二进制转base64后URL编码的表单，Content-Length按实际字节计算。不下载百科image_url，不抓取返回页面。动物/植物/通用单路均只请求5个百科结果；top_num=5仅发给动物接口。现有客户端kind=general表示三路组合；generalOnly为通用单路，animal/plant为对应单路。单次组合最多3条识别请求加1条token请求，路由并发，沿用每条25秒网络截止。没有引入未文档化的按名称查百科接口。

## 返回与确认

服务合并时保留每个候选route与routeScores，使用原分数、不平均为准确率；同一speciesId去重，最高原分候选保留自己的资料。不同路线首候选不一致返回route_disagreement，部分失败保留安全警告。组合结果始终needs_confirmation；直接normalizer兼容recognized但requiresConfirmation=true，前端从不自动选择。

sourceScience仅携带对应候选的speciesId、summary、available/missing、百度来源、路由、取得时间和可选安全链接。资料先随当前观察暂存在内存；确认候选时再次核对身份，艺术与资源核验、本地事务成功后才写scienceSnapshot。切换候选不能借用其他候选资料，取消/迟到沿用token隔离。

摘要删除script/style块、HTML标签和控制字符，截断至1200码点；不解析生成食性、分布、英文名、拉丁名或IUCN字段。HTTPS仅允许精确baike.baidu.com/item/路径；拒绝凭证、端口、查询/跳转、fragment和其它协议/主机。文档示例有HTTP链接，本版本保守不显示它，不猜测升级后的可访问性；摘要仍可带百度来源展示。

可信本地结构字段优先保留。百度摘要仅补缺失knowledge并单独留源；available表示有资料，不表示科学核验。无摘要为missing，单有链接不升级available。接口权限/额度/超时失败仍为失败/警告，不能伪装missing成功。

## 错误与外部门

沿用安全错误码映射：权限、额度、限流、token、图片参数与传输超时；不输出供应商原始文本、照片、URL令牌或环境变量值。新增route_disagreement是本地合并警告，不冒充百度错误码。

仍需主体在百度控制台分别核验三项接口权限、应用/计费状态、额度与实际baike返回；本地文档和mock测试不证明用户账号已开通。实际图像大小/维度、识别校准、服务响应时间及科学准确性需另行授权验证。部署recognizeObservation也须单独授权，本轮不执行。
