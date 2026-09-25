// 运营身份共享模块：env 白名单 + 数据库 claim 双通道。
// 该文件在 printAdmin 与 analytics-aggregate 中逐字节一致，漂移测试保证同步。
const ADMIN_ENV = 'NATURE_ADMIN_OPENIDS';
const CLAIM_ENV = 'NATURE_OPERATOR_CLAIM_CODE';
const DEFAULT_CLAIM_CODE = 'nature-ops-2026';
const DOC_ID = 'main';
const COLLECTION = 'natureAdmin';

function envOpenids() {
  return String(process.env[ADMIN_ENV] || '').split(',').map(v => v.trim()).filter(Boolean);
}

function expectedClaimCode() {
  const env = process.env[CLAIM_ENV];
  return typeof env === 'string' && env.length > 0 ? env : DEFAULT_CLAIM_CODE;
}

function normalizeOpenids(value) {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.length > 0);
  return [];
}

async function readOpenids(db) {
  try {
    const res = await db.collection(COLLECTION).doc(DOC_ID).get();
    const data = res && res.data;
    return normalizeOpenids(data && data.openids);
  } catch (e) {
    // 集合/文档不存在或任何读取失败：保守返回空数组，继续用 env 判断。
    return [];
  }
}

async function isOperator(db, openid) {
  if (!db || typeof db.collection !== 'function' || typeof openid !== 'string' || openid.length === 0) return false;
  const envList = envOpenids();
  if (envList.includes(openid)) return true;
  const dbList = await readOpenids(db);
  return dbList.includes(openid);
}

async function claimOperator({ db, openid, code, now = Date.now } = {}) {
  if (!db || typeof db.collection !== 'function') return { status: 'failed', code: 'service_unavailable', retryable: true };
  if (typeof openid !== 'string' || openid.length === 0) return { status: 'failed', code: 'unauthenticated' };
  if (typeof code !== 'string' || code !== expectedClaimCode()) return { status: 'failed', code: 'invalid_claim_code' };
  const ts = typeof now === 'function' ? now() : now;
  try {
    // 云函数管理员权限下 doc().set() 通常会自动创建集合；若环境要求显式创建，忽略失败。
    try { await db.createCollection && db.createCollection(COLLECTION); } catch (_) {}
    const doc = db.collection(COLLECTION).doc(DOC_ID);
    let existing = [];
    try {
      const res = await doc.get();
      existing = normalizeOpenids(res && res.data && res.data.openids);
    } catch (_) {}
    if (existing.includes(openid)) return { status: 'ok', already: true };
    const next = { openids: existing.concat([openid]), claimedAt: ts };
    await doc.set({ data: next });
    return { status: 'ok' };
  } catch (e) {
    return { status: 'failed', code: 'service_unavailable', retryable: true };
  }
}

module.exports = { isOperator, claimOperator, ADMIN_ENV, CLAIM_ENV, DEFAULT_CLAIM_CODE };
