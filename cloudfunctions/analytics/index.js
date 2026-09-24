// analytics 云函数：接收前端批量埋点事件，写入 analyticsEvents 集合。
// 只做校验 + 落库，不做聚合。聚合/看板由后续后台或定时任务完成。
let cloud;
try {
  cloud = require('./sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (_) {}

const KNOWN_EVENTS = new Set([
  'photo_captured','recognition_started','recognition_success','recognition_failed',
  'species_confirmed','observation_created','species_first_discovered','discovery_number_assigned',
  'official_artwork_reused','official_artwork_missing','artwork_generation_started','artwork_candidate_created',
  'artwork_approved','custom_artwork_started','custom_artwork_success','generation_regenerated',
  'card_created','card_saved','nature_world_species_added','nature_world_species_tapped',
  'friend_like','card_requested','card_gifted','subscription_page_viewed','subscription_started','subscription_success',
  'print_flow_started','print_card_selected','print_preview_viewed','print_order_created','print_payment_success','print_order_shipped'
]);

const MAX_EVENTS = 20;

function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  for (const k of Object.keys(props)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(k)) continue;
    const v = props[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') { if (v.length > 120) continue; out[k] = v; }
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

function validEvent(e) {
  return e && typeof e === 'object' && typeof e.event === 'string' && KNOWN_EVENTS.has(e.event)
    && typeof e.eventId === 'string' && /^ev_[a-zA-Z0-9]{8,40}$/.test(e.eventId)
    && typeof e.ts === 'number' && Number.isFinite(e.ts);
}

async function main(event = {}, dependencies = {}) {
  const api = dependencies.cloud || cloud;
  if (!api) return { status: 'failed', code: 'runtime_unavailable', retryable: true };
  let openid;
  try { openid = api.getWXContext().OPENID; } catch (_) {}
  if (!openid) return { status: 'failed', code: 'unauthenticated' };
  const events = Array.isArray(event.events) ? event.events.slice(0, MAX_EVENTS) : [];
  if (!events.length) return { status: 'ok', accepted: 0 };
  const valid = events.filter(validEvent);
  if (!valid.length) return { status: 'ok', accepted: 0 };
  const db = api.database();
  const now = Date.now();
  // 逐条写入；eventId 作为 _id 天然幂等（重复上报覆盖同一条）。
  try {
    for (const e of valid) {
      const doc = { owner: openid, event: e.event, eventId: e.eventId, props: sanitizeProps(e.props), clientTs: e.ts, receivedAt: now };
      await db.collection('analyticsEvents').doc(e.eventId).set({ data: doc });
    }
    return { status: 'ok', accepted: valid.length };
  } catch (_) {
    return { status: 'failed', code: 'service_unavailable', retryable: true };
  }
}

module.exports = { main };
