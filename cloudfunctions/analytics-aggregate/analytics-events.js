// 事件白名单与时间分桶：analytics-aggregate 与 analytics 云函数共享同一份契约。
// 白名单成员必须与 analytics/index.js 的 KNOWN_EVENTS 完全一致（由漂移测试守护）。
const EVENTS = [
  'photo_captured','recognition_started','recognition_success','recognition_failed',
  'species_confirmed','observation_created','species_first_discovered','discovery_number_assigned',
  'official_artwork_reused','official_artwork_missing','artwork_generation_started','artwork_candidate_created',
  'artwork_approved','custom_artwork_started','custom_artwork_success','generation_regenerated',
  'card_created','card_saved','nature_world_species_added','nature_world_species_tapped',
  'friend_like','card_requested','card_gifted','subscription_page_viewed','subscription_started','subscription_success',
  'print_flow_started','print_card_selected','print_preview_viewed','print_order_created','print_payment_success','print_order_shipped'
];

const DAY_MS = 86400000;
// 默认按东八区分日；可用环境变量覆盖（小时偏移，支持负数与小数）。
function tzHours() {
  const raw = Number(process.env.NATURE_ANALYTICS_TZ);
  return Number.isFinite(raw) ? raw : 8;
}
const pad = n => (n < 10 ? '0' + n : String(n));

// ms 时间戳 -> 'YYYY-MM-DD'（按配置时区）
function dayOf(ts, tz = tzHours()) {
  const t = Number(ts);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t + tz * 3600000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

// 'YYYY-MM-DD' -> 该日 [start,end) 的 ms 区间（UTC 绝对时间）
function dayRange(date, tz = tzHours()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!m) return null;
  const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - tz * 3600000;
  return { start, end: start + DAY_MS };
}

const isDay = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

// 'YYYY-MM-DD' +/- n 天（走 UTC 日期运算，不含时区偏移，避免跨月错位）
function addDays(date, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + Number(n) * DAY_MS);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

module.exports = { EVENTS, DAY_MS, dayOf, dayRange, addDays, isDay, tzHours, pad };
