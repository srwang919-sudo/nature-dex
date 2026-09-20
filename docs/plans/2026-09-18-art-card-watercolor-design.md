# 艺术正面与物种水彩卡背设计

状态：按已确认方向整理，仅设计，不代表代码或服务已经切换。

实施阶段更新：三个新云函数已部署生产环境；真实模型调用与权限仍需单独验收。确切证据见 2026-09-18-watercolor-verification.md。

2026-09-18 用户批准修订：卡背改用 HY-Image-3.0-Plus-4090-Tob-v1.0 文生图（官方标识的 Tob 大小写如此），不再依赖 speciesReferences。原有七张案例资源保持不变，不上传、不登记为生成参考。以下参考图方案已被本修订取代。

## 现状与差距
- 唯一发布源为根目录 app.js 与 native；生产环境已明确为 nature-prod-d0gufarx064489f0f。
- native/lib/art-card.js 目前调用 natureAI2 的万相接口，失败自动写 artStatus=fallback 并用原图继续。新方案必须删除这种自动降级。
- observe 拍照后立即 saveFile/createDraft；prepareCard 先写 pendingCard，艺术结果随后更新。失败照片仍出现在草稿管理，违背本次严格模式。
- 卡背解析器现在固定返回 home-ink-hero.jpg，属于共享装饰山水，不是对应物种水彩。旧 SVG/个人 illustrationUrl 也不能作为目标成果。
- app.js 已有七物种 family/facts/knowledge/stats/habitat/season/iucn 等资料。保留这些资料，不阻塞于新百科生成。

## 目标和边界
1. 正面采用 CloudBase 已启用模型 HY-Image-v3.0-I2I-ToB-v1.0.1。保留原收藏卡框、编号、工艺、名称、学名和星级，替换的只是画面。
2. 识别失败、未知、未确认候选均不得制卡。取消“识别失败后手动绕过”的当前行为。有候选时仍由用户确认。
3. 艺术失败明确停留错误状态，提供“重试”和“用原图制卡”。后者是用户主动选择的独立成功路径，不是失败自动保存。
4. 首次确认某 speciesId 时获取/生成该物种全幅水彩卡背，成功后公共复用。失败或处理中不得将山水/照片伪装为成功水彩。
5. 删除拍摄页和我的页的未完成观察/草稿列表。旧已收藏卡不删不改；旧草稿不自动转成观察记录，也不暗中批量删除。
6. 无自动保存的失败观察。允许本次页面会话短暂保留照片以便重试；退出/取消即释放。云上传是处理所需暂存，不等于保存收藏，需有清理机制。

## 数据流
拍照或相册临时路径 → 明确识别同意 → 私有暂存 → 百度候选 → 用户确认物种 →
并行准备正面（原图或 HY 艺术）与卡背（公共缓存查询/受控水彩生成） →
两面资源成功且可解码 → 写入成功待揭晓卡 → 开牌 → 用户完成入册。

识别/艺术/卡背/下载任何失败：不调用 prepareCard/addCard，不产生观察列表项，不跳揭晓。
正面艺术失败后的“用原图制卡”仍要求已确认物种、卡背成功；该按钮不绕过识别或卡背失败。
成功待揭晓记录仅保存完整卡，用于中断恢复，不作为“未完成观察”列表显示。用户返回拍摄时可继续本次成功开牌。

## 服务接口与身份
- 新云函数 createArtCard：submit/poll/cancel，服务端获取 OPENID；前端不传可信 owner。
- provider 固定为 cloudbase-hunyuan，model 固定为上述精确模型 ID，不能继续走万相。
- submit 参数：operationId、photoFileId、photoObservationId、speciesId、confirmed=true、consent=true、styleVersion。
- 返回仅为 processing(taskId)、ready(assetFileId)、failed(code,retryable)，禁止 fallback 状态。
- 用户照片及正面产物均在私有路径，任务按 OPENID+operationId 隔离并幂等；前端不能自选任意远程 URL。
- 新云函数 speciesIllustration：get/ensure/poll，只接受规范 speciesId 和 styleVersion，不接受用户照片、用户提示词或任意 URL。
- 公共库由服务端写，客户端只读已发布 ready 条目；公共文件是独立物种插画，绝不复制个人艺术正面或原始照片。
- CloudBase 控制台“模型已启用”不等于 SDK 调用方法已经核验。实施第一步必须核对实际模型调用文档、SDK版本、同步/异步响应及参数，不编造 API 地址或方法。

## 卡背素材与缓存
键：sha256('watercolor-t2i-v1|'+规范 speciesId)，不含用户 ID。已知 ID 由服务端映射名称；新 ID 必须与经用户确认的物种名称一致，通过字符/长度/未知词校验。
记录：speciesId/styleVersion/model/referenceVersion/status/taskId/assetFileId/createdAt/updatedAt/errorCode/leaseExpiresAt。
状态：missing → generating → ready；失败为 failed，可重试；租约过期允许接管但不并发重复提交。
卡背服务仅接收 confirmed/speciesId/name，不接收用户照片、图片URL、参考图或自定义提示词。使用 cloud.ai().createImageModel('hunyuan-image').generateImage 的 prompt/model/size/revise 参数，不带 images。无效或未知输入安全失败；公共缓存成功后复用。
输出提示：单一正确物种、完整主体、博物学水彩、纸纹、自然背景、无文字、无卡框；留足全幅构图安全区。图像是艺术表达，不作为鉴别证据。
只有通过图像可读性、文件类型和内容安全检查的结果进入 ready。版本升级生成新缓存，旧卡继续使用已固定的版本与文件，不被全局静默替换。

## 严格保存、清理和迁移
- 新流程不调用原 createDraft。会话状态只在内存；后台恢复限同一进程，进程被杀不恢复失败观察。
- 私有临时上传登记 expiresAt 和 purpose，取消/失败尝试服务端删除，定时清理兜底；清理失败记录只含待删文件标识，不进观察列表。
- 成功提交先保证两面资源可用，再持久化照片/卡片；存储失败不展示入册成功，清理未引用文件。提交幂等不重抽工艺。
- 旧 nature.drafts.v4 保留兼容读取用于导出/明确清除，不自动暴露旧草稿列表，不自动删除旧照片。旧收藏允许原图显示。
- 旧 artStatus=fallback 收藏保持历史，不强制转成新艺术成功。新流程不再创建 fallback 卡。

## UI 状态
idle / photoReady / recognizing / recognitionFailed / candidateConfirmation /
artGenerating / artFailed / backGenerating / backFailed / committing / revealReady。
- recognitionFailed：重试识别、重拍、换照片；无制卡捷径。
- artFailed：可读错误、重试艺术、主动用原图制卡；零自动跳转。
- backFailed：重试水彩、取消；不得显示用户照片当手绘。
- 成功揭晓继续使用已有仪式状态机，减少动态效果时无倾斜/光效/震动，操作完整保留。
- 移除“未完成的观察”“草稿管理”模块；本地统计只读成功入册卡。

## 自然博物志（不阻塞项）
优先现有可靠字段，缺项不伪造。自动补充来源、审校方式及未知物种百科生成暂不落地；缺知识不阻止识别已确认且两面成功的卡片入册。不得把生成文案自动写成保护等级。

## 验收
失败识别、失败艺术、失败卡背均不增加 cards/drafts/观察统计；艺术失败不自动原图制卡。
用户主动原图制卡可成功，且明确标注实拍而不是 AI。
同物种并发首次请求最多一个有效生成任务；不同用户可复用公共卡背而不能读取彼此原图/艺术图。
卡背永远是物种水彩生成结果，不是原照、艺术正面或通用山水。
断网、超时、取消、后台、重复点击、清除中迟到回调不产生新收藏或隐私残留。
全量测试、原生构建和官方模板编译通过；真实 CloudBase 调用和真机效果另有证据才可称上线可用。
