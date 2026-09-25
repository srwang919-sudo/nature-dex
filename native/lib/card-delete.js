// Deletion outcomes shared by the card page and the app shell.
// Local-first cards keep their photo on the device: a cloud cleanup that cannot
// confirm removal must say why instead of failing with one vague message.
const CODES = {
  cloud_delete_unavailable: '云端清理通道当前不可用，无法确认这张卡的云端照片已删除',
  function_not_found: '云端清理服务未部署，暂时无法确认云端照片已删除',
  cloud_unreachable: '云端清理没有返回结果，无法确认云端照片已删除',
  asset_registry_missing: '云端仍留有这条观察的记录，本次未能清除',
  cloud_delete_failed: '云端照片删除失败',
  deletion_pending: '这张卡还有彩绘生成任务在进行，任务结束后会自动继续清理',
  deletion_batch_limit: '这条观察关联的云端文件过多，需要后台分批清理',
  invalid_request: '云端清理请求被拒绝',
  runtime_unavailable: '云端服务暂时不可用',
  observation_saved: '这条观察已入册保存，暂不支持删除'
}

function messageFor(code) { return CODES[code] || '云端清理未确认，请稍后重试' }

// Returns null when the cloud confirmed removal, otherwise a known code.
function classify(input = {}) {
  const error = input.error
  if (error) {
    const text = String(error.message || error.errMsg || error || '')
    if (/FUNCTION_NOT_FOUND|function not (be )?found|FunctionName parameter|函数不存在|不存在.*函数/i.test(text)) return 'function_not_found'
    if (/\binvalid_request\b/.test(text)) return 'invalid_request'
    if (/\bruntime_unavailable\b/.test(text)) return 'runtime_unavailable'
    return 'cloud_unreachable'
  }
  const result = input.result
  if (!result) return 'cloud_unreachable'
  if (result.status === 'deleted') return null
  if (result.status === 'retained') return 'observation_saved'
  if (result.status === 'failed') return CODES[result.code] ? result.code : 'cloud_delete_failed'
  return 'cloud_delete_failed'
}

module.exports = { CODES, messageFor, classify }
