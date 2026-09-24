const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const core = require('../cloudfunctions/analytics-aggregate/core');
const events = require('../cloudfunctions/analytics-aggregate/analytics-events');
const { main, sourceOf } = require('../cloudfunctions/analytics-aggregate/index');

// ---- mock ----------------------------------------------------------------
function chain(rows) {
  const state = { rows: rows.slice(), skip: 0, limit: Infinity };
  const api = {
    orderBy: () => api,
    skip: n => { state.skip = n; return api; },
    limit: n => { state.limit = n; return api; },
    get: async () => ({ data: state.rows.slice(state.skip, state.skip + state.limit) })
  };
  return api;
}
// 仅在测试中模拟 db.command：gte(x).and(lt(y)) -> {gte:x, lt:y}
const rangeCommand = () => ({
  gte: v => ({ gte: v, and: o => ({ gte: v, lt: o && o.lt }) }),
  lt: v => ({ lt: v })
});

function mockDb({ events: rows = [], ai = [], daily = {}, withCommand = false, config = null, countFails = false } = {}) {
  const written = {};
  const db = {
    command: withCommand ? rangeCommand : undefined,
    collection: name => {
      if (name === 'analyticsEvents') {
        return { where: cond => chain(rows.filter(r => r && r.day === cond.day)) };
      }
      if (name === 'aiUsageEvents') {
        return {
          where: cond => {
            let matched = ai;
            if (cond.provider != null) matched = matched.filter(r => r && r.provider === cond.provider);
            const c = cond.createdAt || {};
            if (c.gte != null || c.lt != null) {
              matched = matched.filter(r => {
                const t = Number(r && r.createdAt);
                return Number.isFinite(t) && t >= c.gte && t < c.lt;
              });
            }
            const api = chain(matched);
            api.count = async () => {
              if (countFails) throw Error('count failed');
              return { total: matched.length };
            };
            return api;
          }
        };
      }
      if (name === 'analyticsDaily') {
        return {
          doc: id => ({
            set: async ({ data }) => { written[id] = JSON.parse(JSON.stringify(data)); daily[id] = written[id]; },
            get: async () => (daily[id] ? { data: daily[id] } : { data: null })
          })
        };
      }
      if (name === 'aiCostConfig') {
        return {
          doc: () => ({
            get: async () => (config ? { data: config } : (() => { throw Error('DOCUMENT_NOT_EXIST'); })())
          })
        };
      }
      throw Error('unexpected collection ' + name);
    }
  };
  return { db, written, daily };
}

const cloudApi = db => ({ getWXContext: () => ({ OPENID: 'u1' }), database: () => db });

// ---- 契约 ----------------------------------------------------------------
test('the aggregate whitelist never drifts from the ingest function', () => {
  const src = fs.readFileSync(path.join(root, 'cloudfunctions/analytics/index.js'), 'utf8');
  const m = /KNOWN_EVENTS = new Set\(\[([\s\S]*?)\]\)/.exec(src);
  assert.ok(m, 'KNOWN_EVENTS must stay parseable');
  const known = [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
  assert.deepEqual([...events.EVENTS].sort(), [...known].sort());
  assert.equal(new Set(events.EVENTS).size, events.EVENTS.length, 'no duplicate event names');
});

test('day bucketing agrees with the ingest function and respects the configured timezone', () => {
  const ingest = require('../cloudfunctions/analytics/index');
  const ts = Date.UTC(2026, 8, 24, 16, 0, 0); // 北京时间 2026-09-25 00:00
  assert.equal(events.dayOf(ts), '2026-09-25');
  assert.equal(ingest.dayOf(ts), events.dayOf(ts), 'both functions must bucket identically');
  // 边界：前一天的最后一秒与当天第一秒必须落在不同桶
  assert.equal(events.dayOf(Date.UTC(2026, 8, 24, 15, 59, 59)), '2026-09-24');
  assert.equal(events.dayOf(Date.UTC(2026, 8, 24, 16, 0, 0)), '2026-09-25');
  const r = events.dayRange('2026-09-25');
  assert.equal(r.start, Date.UTC(2026, 8, 24, 16, 0, 0));
  assert.equal(r.end - r.start, events.DAY_MS);
  assert.equal(events.addDays('2026-09-30', 1), '2026-10-01', 'month rollover');
  assert.equal(events.addDays('2026-01-01', -1), '2025-12-31', 'year rollover');
  assert.equal(events.isDay('nope'), false);
  assert.equal(events.dayOf(NaN), '');
});

test('dayOf honours NATURE_ANALYTICS_TZ so non-China deployments bucket correctly', () => {
  const prev = process.env.NATURE_ANALYTICS_TZ;
  process.env.NATURE_ANALYTICS_TZ = '0';
  assert.equal(events.dayOf(Date.UTC(2026, 8, 24, 16, 0, 0)), '2026-09-24', 'UTC bucketing');
  if (prev === undefined) delete process.env.NATURE_ANALYTICS_TZ; else process.env.NATURE_ANALYTICS_TZ = prev;
});

// ---- 聚合 ----------------------------------------------------------------
test('aggregate_day buckets events, counts distinct users and derives the §111 ratios', async () => {
  const day = '2026-09-25';
  const rows = [
    { owner: 'a', event: 'photo_captured', clientTs: 1, day },
    { owner: 'a', event: 'recognition_success', clientTs: 2, day },
    { owner: 'b', event: 'recognition_failed', clientTs: 3, day },
    { owner: 'b', event: 'species_confirmed', clientTs: 4, day },
    { owner: 'c', event: 'card_created', clientTs: 5, day },
    { owner: 'c', event: 'discovery_number_assigned', clientTs: 6, day },
    { owner: 'c', event: 'species_first_discovered', clientTs: 7, day },
    { owner: 'c', event: 'official_artwork_reused', clientTs: 8, day },
    { owner: 'c', event: 'official_artwork_missing', clientTs: 9, day },
    { owner: 'c', event: 'experimental_new_event', clientTs: 10, day }
  ];
  const { db, daily } = mockDb({ events: rows });
  const res = await core.aggregateDay({ db, date: day, now: 1000 });
  assert.equal(res.status, 'ok');
  assert.equal(res.events, 10);
  assert.equal(res.uniqueUsers, 3);

  const doc = daily[day];
  assert.equal(doc.day, day);
  assert.equal(doc.events, 10);
  assert.equal(doc.uniqueUsers, 3);
  assert.equal(doc.perEvent.recognition_success, 1);
  assert.equal(doc.otherEvents, 1, 'unknown events stay visible without polluting derived metrics');
  assert.equal(doc.metrics.recognitionSuccessRate, 0.5);
  assert.equal(doc.metrics.confirmationRate, 1);
  assert.equal(doc.metrics.cardCompletionRate, 1);
  assert.equal(doc.metrics.firstDiscoveryShare, 1);
  assert.equal(doc.metrics.officialArtworkReuseRate, 0.5);
  assert.equal(doc.truncated, false);
  assert.equal(doc.schema, 1);
});

test('ratios are null, not zero, when the denominator is missing', async () => {
  const day = '2026-09-26';
  const { db, daily } = mockDb({ events: [{ owner: 'a', event: 'photo_captured', clientTs: 1, day }] });
  await core.aggregateDay({ db, date: day, now: 1 });
  const m = daily[day].metrics;
  assert.equal(m.recognitionSuccessRate, null);
  assert.equal(m.confirmationRate, null);
  assert.equal(m.printConversion, null, 'a zero denominator must not look like real churn');
});

test('aggregate_day is idempotent: re-running replaces the same document', async () => {
  const day = '2026-09-27';
  const { db, daily } = mockDb({ events: [{ owner: 'a', event: 'card_created', clientTs: 1, day }] });
  const first = await core.aggregateDay({ db, date: day, now: 1 });
  const second = await core.aggregateDay({ db, date: day, now: 2 });
  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(Object.keys(daily).length, 1, 'one day = one document');
  assert.equal(daily[day].aggregatedAt, 2, 'the later run wins, it does not append');
});

test('aggregate_day rejects malformed dates and survives an unreadable database', async () => {
  const { db } = mockDb({});
  assert.deepEqual((await core.aggregateDay({ db, date: '25/09/2026' })).code, 'invalid_date');
  assert.deepEqual((await core.aggregateDay({ db: null, date: '2026-09-25' })).code, 'runtime_unavailable');
  const broken = { collection: () => ({ where: () => ({ orderBy: () => ({ skip: () => ({ limit: () => ({ get: async () => { throw Error('boom'); } }) }) }) }) }) };
  const res = await core.aggregateDay({ db: broken, date: '2026-09-25' });
  assert.equal(res.status, 'failed', 'a failed read is reported instead of silently writing zeros');
});

test('AI cost is summed per provider when the range command exists, and honestly null when it does not', async () => {
  const day = '2026-09-25';
  const { start, end } = events.dayRange(day);
  const ai = [
    { provider: 'baidu', cost: 0.0029, createdAt: start + 10 },
    { provider: 'baidu', cost: 0.001, createdAt: start + 20 },
    { provider: 'hunyuan', cost: 0.2, createdAt: end - 10 },
    { provider: 'hunyuan', cost: 0.2, createdAt: end + 10 } // 落在区间外，必须不计入
  ];
  const withCmd = mockDb({ events: [], ai, withCommand: true });
  const res = await core.aggregateDay({ db: withCmd.db, date: day, now: 1 });
  assert.equal(res.aiCost, 0.2039);
  assert.equal(withCmd.daily[day].ai.count, 3);
  assert.ok(Math.abs(withCmd.daily[day].ai.byProvider.baidu - 0.0039) < 1e-9);
  assert.equal(withCmd.daily[day].ai.byProvider.hunyuan, 0.2);

  const noCmd = mockDb({ events: [], ai });
  await core.aggregateDay({ db: noCmd.db, date: day, now: 1 });
  assert.equal(noCmd.daily[day].ai, null, 'no command support means no invented cost figure');
});

test('aggregation paginates instead of trusting a single page', async () => {
  const day = '2026-09-28';
  const rows = [];
  for (let i = 0; i < 430; i++) rows.push({ owner: 'u' + (i % 7), event: 'photo_captured', clientTs: i, day });
  const { db, daily } = mockDb({ events: rows });
  const res = await core.aggregateDay({ db, date: day, now: 1 });
  assert.equal(res.events, 430, 'every page is counted');
  assert.equal(daily[day].uniqueUsers, 7);
  assert.equal(daily[day].truncated, false);
});

// ---- 看板 ----------------------------------------------------------------
test('dashboard sums a range, averages DAU and refuses to fake MAU or revenue', async () => {
  const mk = (day, n, users) => ({
    day, events: n, uniqueUsers: users, otherEvents: 0, truncated: false,
    perEvent: Object.fromEntries(events.EVENTS.map(e => [e, 0])),
    ai: { cost: 0.2, count: 1 }
  });
  const d1 = mk('2026-09-01', 10, 4); d1.perEvent.print_flow_started = 3; d1.perEvent.print_order_created = 1;
  const d2 = mk('2026-09-02', 20, 6); d2.perEvent.print_flow_started = 5; d2.perEvent.print_order_created = 2;
  const daily = { '2026-09-01': d1, '2026-09-02': d2 };
  const { db } = mockDb({ daily });
  const res = await core.dashboard({ db, from: '2026-09-01', to: '2026-09-03', now: 5 });
  assert.equal(res.status, 'ok');
  assert.equal(res.days, 2, 'a day with no aggregation document is simply absent');
  assert.equal(res.totals.events, 30);
  assert.equal(res.dau.average, 5);
  assert.equal(res.dau.peak, 6);
  assert.equal(res.printFunnel.started, 8);
  assert.equal(res.printFunnel.orderCreated, 3);
  assert.equal(res.metrics.printConversion, 0.375);
  assert.ok(Math.abs(res.ai.cost - 0.4) < 1e-9);
  assert.deepEqual(res.notComputed.sort(), ['mau', 'paid_users', 'retention', 'subscription_revenue']);
});

test('dashboard rejects reversed and malformed ranges', async () => {
  const { db } = mockDb({});
  assert.deepEqual((await core.dashboard({ db, from: '2026-09-05', to: '2026-09-01' })).code, 'invalid_range');
  assert.deepEqual((await core.dashboard({ db, from: 'x', to: '2026-09-01' })).code, 'invalid_range');
});

// ---- §51 Hunyuan 免费额度监控 ----
test('quota report counts real usage and estimates depletion only when a total is configured', async () => {
  const now = Date.UTC(2026, 8, 25, 12);
  const ai = [];
  for (let i = 0; i < 40; i++) ai.push({ provider: 'hunyuan', cost: 0.2, createdAt: now - 3 * 86400000 }); // 30天内
  for (let i = 0; i < 5; i++) ai.push({ provider: 'hunyuan', cost: 0.2, createdAt: now - 40 * 86400000 }); // 30天外
  ai.push({ provider: 'baidu', cost: 0.0029, createdAt: now - 86400000 }); // 不计入 hunyuan

  const withTotal = mockDb({ ai, config: { costs: { hunyuanFreeQuotaTotal: 60 } }, withCommand: true });
  const report = await core.freeQuotaReport({ db: withTotal.db, now });
  assert.equal(report.status, 'ok');
  assert.equal(report.usedTotal, 45);
  assert.equal(report.used7d, 40);
  assert.equal(report.used30d, 40);
  assert.equal(report.freeQuotaTotal, 60);
  assert.equal(report.freeQuotaRemaining, 15);
  assert.equal(report.estimatedDepletionDays, 11, '15 remaining at 40/30d ≈ 11 days');
  assert.equal(report.alert, true, '15 < 20000 default threshold');

  const withoutTotal = mockDb({ ai, withCommand: true });
  const honest = await core.freeQuotaReport({ db: withoutTotal.db, now });
  assert.equal(honest.freeQuotaTotal, null);
  assert.equal(honest.freeQuotaRemaining, undefined, 'no configured total means no invented remaining');
  assert.ok(honest.note.includes('未配置'));
});

test('quota report never fabricates numbers when the ledger is unreadable', async () => {
  const failing = mockDb({ countFails: true, withCommand: true });
  const report = await core.freeQuotaReport({ db: failing.db, now: 1 });
  assert.equal(report.status, 'ok');
  assert.equal(report.usedTotal, null, 'a failed count is unknown, not zero');
});

test('the quota action is operator/timer gated like every other write path', async () => {
  process.env.NATURE_ADMIN_OPENIDS = 'u1';
  const { db } = mockDb({ config: { hunyuanFreeQuotaTotal: 100 }, withCommand: true });
  const res = await main({ action: 'quota' }, { cloud: cloudApi(db) });
  assert.equal(res.status, 'ok');
  assert.equal(res.freeQuotaRemaining, 100);
  delete process.env.NATURE_ADMIN_OPENIDS;
});

// ---- 权限与入口 ----------------------------------------------------------
test('write access is limited to the timer trigger and the operator allowlist', async () => {
  const prev = process.env.NATURE_ADMIN_OPENIDS;
  process.env.NATURE_ADMIN_OPENIDS = 'op1, op2';
  const { db } = mockDb({ events: [] });
  const day = '2026-09-25';

  const user = await main({ action: 'aggregate_day', date: day }, { cloud: { getWXContext: () => ({ OPENID: 'stranger' }), database: () => db } });
  assert.deepEqual(user.code, 'operator_required', 'an ordinary user must not trigger aggregation');

  const op = await main({ action: 'aggregate_day', date: day }, { cloud: { getWXContext: () => ({ OPENID: 'op2' }), database: () => db } });
  assert.equal(op.status, 'ok');

  const timer = await main({ action: 'aggregate_day', date: day, Type: 'Timer' }, { cloud: { getWXContext: () => ({}), database: () => db } });
  assert.equal(timer.status, 'ok', 'scheduled runs have no openid and must still work');

  assert.equal(sourceOf({ TriggerName: 'daily' }, 'anyone'), 'timer');
  assert.equal(sourceOf({}, 'op1'), 'operator');
  assert.equal(sourceOf({}, 'nope'), 'user');
  assert.equal(sourceOf({}, undefined), 'anonymous');
  if (prev === undefined) delete process.env.NATURE_ADMIN_OPENIDS; else process.env.NATURE_ADMIN_OPENIDS = prev;
});

test('the entry point validates actions and reports runtime problems instead of throwing', async () => {
  const { db } = mockDb({ events: [] });
  const api = { cloud: cloudApi(db) };
  assert.deepEqual((await main({}, api)).code, 'action_required');
  assert.deepEqual((await main({ action: 'wat' }, api)).code, 'operator_required', 'unknown actions are still gated');
  delete process.env.NATURE_ADMIN_OPENIDS;
  process.env.NATURE_ADMIN_OPENIDS = 'u1';
  assert.deepEqual((await main({ action: 'wat' }, api)).code, 'unknown_action');
  assert.deepEqual((await main({ action: 'aggregate_day', date: 'nope' }, api)).code, 'invalid_date');
  assert.deepEqual((await main({ action: 'dashboard', from: 'nope', to: 'nope' }, api)).code, 'invalid_range');
  const ping = await main({ action: 'ping' }, api);
  assert.equal(ping.status, 'ok');
  assert.equal(ping.privileged, true);
  assert.equal((await main({ action: 'aggregate_day', date: '2026-09-25' }, { cloud: null })).code, 'runtime_unavailable');
  delete process.env.NATURE_ADMIN_OPENIDS;
});

test('backfill walks a bounded range and reports each day', async () => {
  process.env.NATURE_ADMIN_OPENIDS = 'u1';
  const { db } = mockDb({ events: [{ owner: 'a', event: 'card_created', clientTs: 1, day: '2026-09-01' }] });
  const res = await main({ action: 'backfill', from: '2026-08-30', to: '2026-09-02' }, { cloud: cloudApi(db) });
  assert.equal(res.status, 'ok');
  assert.deepEqual(res.results.map(r => r.day), ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']);
  assert.equal(res.results.find(r => r.day === '2026-09-01').events, 1);
  assert.deepEqual((await main({ action: 'backfill', from: 'x', to: 'y' }, { cloud: cloudApi(db) })).code, 'invalid_range');
  delete process.env.NATURE_ADMIN_OPENIDS;
});

test('the daily document stores no identity: it keeps a headcount only', async () => {
  const day = '2026-09-29';
  const { db, daily } = mockDb({ events: [{ owner: 'secret-openid', event: 'card_created', clientTs: 1, day }] });
  await core.aggregateDay({ db, date: day, now: 1 });
  const serialised = JSON.stringify(daily[day]);
  assert.equal(serialised.includes('secret-openid'), false, 'no openid may survive into the aggregate');
  assert.equal(daily[day].uniqueUsers, 1);
});
