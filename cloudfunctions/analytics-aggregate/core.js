// analytics-aggregate：把 analyticsEvents 按日聚合成 analyticsDaily（Master Plan §111–112）。
// 只做读 + 幂等写：同一天重复聚合覆盖同一文档，不产生重复统计。
const { EVENTS, dayOf, dayRange, addDays, isDay } = require('./analytics-events');

const PAGE = 200;        // 单页保守取值
const MAX_PAGES = 50;    // 单日最多 10,000 条；超出则标记 truncated，不静默丢数据

function emptyTotals() {
  const perEvent = {};
  for (const e of EVENTS) perEvent[e] = 0;
  return { events: 0, uniqueUsers: 0, perEvent, other: 0 };
}

// 只把白名单内的事件计入 perEvent；未知事件计入 other（保留可见性，但不参与派生指标）。
function bucket(rows) {
  const totals = emptyTotals();
  const users = new Set();
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    totals.events += 1;
    if (r.owner) users.add(r.owner);
    const name = typeof r.event === 'string' ? r.event : '';
    if (Object.prototype.hasOwnProperty.call(totals.perEvent, name)) totals.perEvent[name] += 1;
    else if (name) totals.other += 1;
  }
  totals.uniqueUsers = users.size;
  return totals;
}

// 口径（§111）：分母为 0 时返回 null，而不是 0 —— 0 会被误读成「转化率为零」。
const ratio = (a, b) => (b > 0 ? Number((a / b).toFixed(4)) : null);

function derive(totals) {
  const p = totals.perEvent;
  return {
    recognitionSuccessRate: ratio(p.recognition_success, p.recognition_success + p.recognition_failed),
    confirmationRate: ratio(p.species_confirmed, p.recognition_success),
    cardCompletionRate: ratio(p.card_created, p.species_confirmed),
    firstDiscoveryShare: ratio(p.species_first_discovered, p.discovery_number_assigned),
    officialArtworkReuseRate: ratio(p.official_artwork_reused, p.official_artwork_reused + p.official_artwork_missing),
    printConversion: ratio(p.print_order_created, p.print_flow_started)
  };
}

function funnel(p) {
  return {
    started: p.print_flow_started,
    cardSelected: p.print_card_selected,
    previewViewed: p.print_preview_viewed,
    orderCreated: p.print_order_created
  };
}

async function readDay(db, date) {
  const rows = [];
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      let q = db.collection('analyticsEvents').where({ day: date });
      if (typeof q.orderBy === 'function') q = q.orderBy('clientTs', 'asc');
      const res = await q.skip(page * PAGE).limit(PAGE).get();
      const batch = Array.isArray(res && res.data) ? res.data : [];
      rows.push(...batch);
      if (batch.length < PAGE) break;
      if (page === MAX_PAGES - 1) truncated = true;
    } catch (_) {
      // 聚合是后台任务：读取失败要被看见，但不能让定时器整体崩掉。
      truncated = true;
      break;
    }
  }
  return { rows, truncated };
}

// AI 成本来自 aiUsageEvents（§46–47）。范围查询依赖 db.command；
// 没有 command 时（旧环境/单测）诚实返回 null，绝不猜一个数字出来。
async function aiCostFor(db, start, end) {
  try {
    const cmd = typeof db.command === 'function' ? db.command() : null;
    if (!cmd || !cmd.gte || !cmd.lt) return null;
    const res = await db.collection('aiUsageEvents')
      .where({ createdAt: cmd.gte(start).and(cmd.lt(end)) })
      .limit(PAGE * MAX_PAGES).get();
    const rows = Array.isArray(res && res.data) ? res.data : [];
    let cost = 0, count = 0;
    const byProvider = {};
    for (const r of rows) {
      const c = Number(r && r.cost);
      if (!Number.isFinite(c)) continue;
      cost += c;
      count += 1;
      const p = (r && r.provider) || 'unknown';
      byProvider[p] = Number(((byProvider[p] || 0) + c).toFixed(6));
    }
    return { cost: Number(cost.toFixed(6)), count, byProvider };
  } catch (_) {
    return null;
  }
}

async function aggregateDay({ db, date, now = Date.now() } = {}) {
  if (!db || typeof db.collection !== 'function') return { status: 'failed', code: 'runtime_unavailable', retryable: true };
  if (!isDay(date)) return { status: 'failed', code: 'invalid_date' };
  const range = dayRange(date);
  if (!range) return { status: 'failed', code: 'invalid_date' };

  const { rows, truncated } = await readDay(db, date);
  const totals = bucket(rows);
  const ai = await aiCostFor(db, range.start, range.end);
  const doc = {
    day: date,
    startTs: range.start,
    endTs: range.end,
    events: totals.events,
    // 只保留去重后的「人数」计数，不存储任何 openid —— 聚合结果本身不含身份数据。
    uniqueUsers: totals.uniqueUsers,
    perEvent: totals.perEvent,
    otherEvents: totals.other,
    metrics: derive(totals),
    printFunnel: funnel(totals.perEvent),
    ai,
    truncated,
    aggregatedAt: now,
    schema: 1
  };
  try {
    await db.collection('analyticsDaily').doc(date).set({ data: doc });
    return { status: 'ok', day: date, events: totals.events, uniqueUsers: totals.uniqueUsers, truncated, aiCost: ai ? ai.cost : null };
  } catch (_) {
    return { status: 'failed', code: 'service_unavailable', retryable: true };
  }
}

async function dashboard({ db, from, to, now = Date.now() } = {}) {
  if (!db || typeof db.collection !== 'function') return { status: 'failed', code: 'runtime_unavailable', retryable: true };
  if (!isDay(from) || !isDay(to)) return { status: 'failed', code: 'invalid_range' };
  if (from > to) return { status: 'failed', code: 'invalid_range' };

  const days = [];
  let cursor = from, guard = 0;
  while (cursor <= to && guard++ < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const daily = [];
  for (const d of days) {
    try {
      const res = await db.collection('analyticsDaily').doc(d).get();
      if (res && res.data) daily.push(res.data);
    } catch (_) {
      // 缺某一天的聚合文档不视为错误：当天没有事件就不会有文档。
    }
  }

  const perEvent = {};
  for (const e of EVENTS) perEvent[e] = 0;
  let events = 0, other = 0, aiCost = 0, aiCount = 0, truncated = false;
  const dau = [];
  for (const row of daily) {
    events += Number(row.events) || 0;
    other += Number(row.otherEvents) || 0;
    if (row.uniqueUsers != null) dau.push(Number(row.uniqueUsers) || 0);
    const pe = row.perEvent || {};
    for (const k of Object.keys(pe)) if (Object.prototype.hasOwnProperty.call(perEvent, k)) perEvent[k] += Number(pe[k]) || 0;
    if (row.ai && Number.isFinite(Number(row.ai.cost))) {
      aiCost += Number(row.ai.cost);
      aiCount += Number(row.ai.count) || 0;
    }
    if (row.truncated) truncated = true;
  }

  const summed = { events, uniqueUsers: 0, perEvent, other };
  const samples = dau.length || 1;
  const peak = dau.length ? dau.reduce((a, b) => Math.max(a, b), 0) : 0;

  return {
    status: 'ok',
    from,
    to,
    days: daily.length,
    totals: { events, otherEvents: other },
    eventTotals: perEvent,
    metrics: derive(summed),
    printFunnel: funnel(perEvent),
    dau: {
      average: Number((dau.reduce((a, b) => a + b, 0) / samples).toFixed(2)),
      peak,
      samples: dau.length
    },
    ai: { cost: Number(aiCost.toFixed(6)), count: aiCount },
    truncated,
    // 刻意不计算的指标：需要跨日身份去重或支付流水，而本聚合不存 openid、不存金额。
    // 与其算一个看起来漂亮的数字，不如明确标注口径缺失。
    notComputed: ['mau', 'retention', 'paid_users', 'subscription_revenue'],
    generatedAt: now
  };
}

// ---- §51 Hunyuan 免费额度监控 ----
// 总额配置在 aiCostConfig/main 的 hunyuanFreeQuotaTotal（后台可调，无需重新部署）；
// 用量直接来自 aiUsageEvents 的 hunyuan 计数，不引入第二本账。
const DAY_MS = 86400000;

async function countProvider(db, provider, start, end) {
  try {
    const cmd = typeof db.command === 'function' ? db.command() : null;
    const where = (start != null && cmd) ? { provider, createdAt: cmd.gte(start).and(cmd.lt(end)) } : { provider };
    const q = db.collection('aiUsageEvents').where(where);
    if (typeof q.count === 'function') {
      const r = await q.count();
      return Number(r && r.total) || 0;
    }
    const r = await q.limit(1000).get();
    return Array.isArray(r && r.data) ? r.data.length : 0;
  } catch (_) {
    return null; // 读取失败必须是 null（未知），不能冒充 0
  }
}

async function freeQuotaReport({ db, now = Date.now() } = {}) {
  if (!db || typeof db.collection !== 'function') return { status: 'failed', code: 'runtime_unavailable', retryable: true };
  let total = null;
  try {
    const r = await db.collection('aiCostConfig').doc('main').get();
    const raw = r && r.data;
    const v = Number(raw && (raw.hunyuanFreeQuotaTotal != null ? raw.hunyuanFreeQuotaTotal : (raw.costs && raw.costs.hunyuanFreeQuotaTotal)));
    if (Number.isFinite(v) && v >= 0) total = v;
  } catch (_) {}

  const usedTotal = await countProvider(db, 'hunyuan', null, null);
  const used7d = await countProvider(db, 'hunyuan', now - 7 * DAY_MS, now);
  const used30d = await countProvider(db, 'hunyuan', now - 30 * DAY_MS, now);

  const report = {
    status: 'ok',
    provider: 'hunyuan',
    usedTotal,
    used7d,
    used30d,
    freeQuotaTotal: total,
    generatedAt: now
  };
  if (total == null) {
    // 没配置总额就只报告用量：与其编一个“剩余额度”，不如明说口径缺失。
    report.note = 'free_quota_total 未配置（aiCostConfig/main 的 hunyuanFreeQuotaTotal），只报告用量，不估算余量';
    return report;
  }
  report.freeQuotaRemaining = Math.max(0, total - (usedTotal || 0));
  if (Number.isFinite(used30d) && used30d > 0) {
    report.estimatedDepletionDays = Math.max(0, Math.round(report.freeQuotaRemaining / (used30d / 30)));
  }
  const threshold = Number(process.env.NATURE_HUNYUAN_QUOTA_ALERT);
  report.alertThreshold = Number.isFinite(threshold) ? threshold : 20000;
  report.alert = report.freeQuotaRemaining < report.alertThreshold;
  return report;
}

module.exports = { aggregateDay, dashboard, bucket, derive, readDay, aiCostFor, dayOf, freeQuotaReport };
