const messages={
 recognition_pending:'这张照片仍在鉴别中，请稍后再次点击查看结果；不会重复发起付费鉴别。',
 recognition_expired:'本次鉴别未能完成，未保存卡片。请重新选择照片开始新观察。',
 receipt_conflict:'照片鉴别记录不一致，请重新选择照片。',
 cancelled:'这次观察已取消，照片不会继续用于制卡。',
 daily_limit:'今天的鉴别次数已达安全限额，请明天再试。',
 quota_unavailable:'鉴别安全限额暂时无法核验，请稍后重试。',
 provider_missing_parameter:'百度未收到必需的图片参数，请更新云端识别函数后重试。照片仍在本机，也可手动确认物种后制卡。',
 not_configured:'识别函数缺少配置。请在 recognizeObservation 设置 BAIDU_API_KEY 和 BAIDU_SECRET_KEY，并重新部署。',
 provider_auth_failed:'百度鉴权失败。请在百度控制台核对该应用的 API Key 与 Secret Key 是否配套、有效。',
 provider_permission:'百度应用未开通所需识别接口。请检查动物识别和植物识别权限。',
 provider_quota:'百度识别额度已用尽。请检查调用额度或计费状态。',
 provider_rate_limit:'识别请求过于频繁，请稍后重试。',
 provider_token:'百度访问凭证无效，请核对云函数鉴权配置后重试。',
 provider_image:'百度无法解码这张图片，请重新拍摄或选择 JPG/PNG 图片。',
 provider_response:'百度返回格式异常，请稍后重试。',
 photo_unavailable:'照片为空或超过4MB，请选取较小的照片后重试。',
 photo_download:'云端照片读取失败，请检查私有存储权限，或重新选取照片。',
 forbidden:'照片归属校验未通过，请重新选择本机照片后重试；不要开放公开存储。',
 asset_registry:'服务端照片登记失败。请确认 assets 集合已创建，且已部署支持 register_asset 的 recognizeObservation；不要开放客户端写权限。',
 photo_upload:'照片上传失败，请检查网络和 CloudBase 私有存储权限。',
 cloud_version:'云端识别函数版本不匹配，请重新部署 recognizeObservation 到当前小程序环境。',
 cloud_call:'识别云函数调用未完成。请按下方云码、阶段和请求编号检查 nature-prod 中 recognizeObservation 的调用日志；目录关联不代表运行成功。',
 runtime_unavailable:'云函数运行环境缺少依赖，请部署时安装 wx-server-sdk。',
 unauthenticated:'未能获取微信调用身份，请从微信小程序内重试。',
 consent_required:'请先确认隐私授权，再开始鉴别。',
 invalid_request:'识别请求缺少必要资料，请重新选择照片后重试。',
 timeout:'识别服务响应超时，请稍后重试。照片仍在本机。',
 provider_error:'识别服务暂时失败，请稍后重试。',
 local_save:'识别记录未能保存，请检查本机空间后重试。'
};
function safeCode(input){if(input&&Object.prototype.hasOwnProperty.call(messages,input.code))return input.code;if(input&&Number.isFinite(input.errCode))return 'cloud_call';return 'provider_error'}
function cloudFailure(error={},stage){const result={code:'cloud_call'};if(Number.isInteger(error.errCode)&&Math.abs(error.errCode)<10000000)result.cloudCode=error.errCode;if(['upload_ticket','register_asset','recognize'].includes(stage))result.stage=stage;const id=error.requestID||error.requestId;if(typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id))result.requestId=id;return result}
function recognitionError(input){const code=safeCode(input),n=Number.isInteger(input&&input.providerCode)&&input.providerCode>=0&&input.providerCode<1000000?input.providerCode:null;const safe=cloudFailure({errCode:input&&input.cloudCode,requestId:input&&input.requestId},input&&input.stage);return messages[code]+' [识别码:'+code+(n===null?'':' / 百度:'+n)+(safe.cloudCode===undefined?'':' / 云码:'+safe.cloudCode)+(safe.stage?' / 阶段:'+safe.stage:'')+(safe.requestId?' / 请求:'+safe.requestId:'')+']'}
module.exports={recognitionError,safeCode,cloudFailure};
