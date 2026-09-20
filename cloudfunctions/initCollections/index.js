const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
exports.main = async () => {
  if (!cloud.getWXContext().OPENID) return { ok: false, code: 'unauthenticated' }
  const db = cloud.database()
  const created = [], existed = [], failed = []
  // Fixed allowlist only: callers cannot create arbitrary production resources.
  for (const name of ['assets', 'artOperations', 'speciesWatercolors']) {
    try { await db.createCollection(name); created.push(name) }
    catch (e) {
      if (/already exist|COLLECTION_EXIST/i.test(e.message || e.errMsg || '')) existed.push(name)
      else failed.push({ name, code: 'collection_setup_failed' })
    }
  }
  return { ok: failed.length === 0, created, existed, failed }
}
