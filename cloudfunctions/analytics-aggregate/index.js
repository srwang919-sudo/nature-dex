// analytics-aggregate：按日聚合埋点（§111–112）+ 看板查询。
// 写操作只允许定时触发器或运营白名单调用；普通用户调用返回 operator_required。
const { aggregateDay, dashboard, freeQuotaReport } = require('./core');
const { dayOf, addDays, isDay } = require('./analytics-events');
const { isOperator } = require('./operator');

let cloud;
try {
  cloud = require('./sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (_) {}

function envOperators() {
  return new Set((process.env.NATURE_ADMIN_OPENIDS || '').split(',').map(s => s.trim()).filter(Boolean));
}

// 定时触发器没有 OPENID，必须靠事件标记放行；否则后台永远聚合不了。
// 保持同步：外部测试依赖此函数同步返回。
function sourceOf(event, openid) {
  const e = event && typeof event === 'object' ? event : {};
  if (e.Type === 'Timer' || e.type === 'Timer' || e.TriggerName || e.triggerName) return 'timer';
  if (openid && envOperators().has(openid)) return 'operator';
  if (openid) return 'user';
  return 'anonymous';
}

async function main(event = {}, dependencies = {}) {
  const api = dependencies.cloud || cloud;
  if (!api) return { status: 'failed', code: 'runtime_unavailable', retryable: true };
  let openid;
  try { openid = api.getWXContext().OPENID; } catch (_) {}

  const db = api.database();
  let source = sourceOf(event, openid);
  // env 未命中时，再查数据库里的已激活运营名单（自助激活通道）。
  if (source === 'user' && openid && (await isOperator(db, openid))) source = 'operator';
  const privileged = source === 'timer' || source === 'operator';
  const action = String((event && event.action) || '');
  if (!action) return { status: 'failed', code: 'action_required' };
  // ping 不涉数据，用于部署后自检「我是谁、有没有权限」。
  if (action === 'ping') return { status: 'ok', source, privileged };

  if (!privileged) return { status: 'failed', code: 'operator_required' };

  const now = Date.now();

  if (action === 'aggregate_day') {
    return aggregateDay({ db, date: event.date || dayOf(now), now });
  }

  if (action === 'dashboard') {
    return dashboard({ db, from: event.from, to: event.to, now });
  }

  if (action === 'quota') {
    return freeQuotaReport({ db, now });
  }

  if (action === 'backfill') {
    if (!isDay(event.from) || !isDay(event.to)) return { status: 'failed', code: 'invalid_range' };
    const results = [];
    let cursor = event.from, guard = 0;
    while (cursor <= event.to && guard++ < 60) {
      const r = await aggregateDay({ db, date: cursor, now });
      results.push({ day: cursor, status: r.status, events: r.events || 0 });
      cursor = addDays(cursor, 1);
    }
    return { status: 'ok', backfilled: results.length, results };
  }

  return { status: 'failed', code: 'unknown_action' };
}

module.exports = { main, sourceOf };
