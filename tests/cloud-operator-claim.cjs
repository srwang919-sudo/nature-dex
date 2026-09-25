const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const { isOperator, claimOperator } = require('../cloudfunctions/printAdmin/operator');
const printAdmin = require('../cloudfunctions/printAdmin/core').printAdmin;
const analyticsMain = require('../cloudfunctions/analytics-aggregate/index').main;

function mockDb({ rows = new Map(), failRead = false, failWrite = false } = {}) {
  return {
    collection: name => ({
      doc: id => ({
        async get() {
          if (failRead) throw Error('db read failed');
          const key = name + '/' + id;
          if (!rows.has(key)) throw Error('DATABASE_DOCUMENT_NOT_EXIST');
          return { data: structuredClone(rows.get(key)) };
        },
        async set({ data }) {
          if (failWrite) throw Error('db write failed');
          rows.set(name + '/' + id, structuredClone(data));
        }
      })
    }),
    createCollection: async () => {},
    rows
  };
}

function cloudApi(db, openid) {
  return { getWXContext: () => openid ? { OPENID: openid } : {}, database: () => db };
}

const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('the operator module stays byte-identical across cloud functions', () => {
  const a = digest(path.join(root, 'cloudfunctions/printAdmin/operator.js'));
  const b = digest(path.join(root, 'cloudfunctions/analytics-aggregate/operator.js'));
  assert.equal(a, b, 'operator.js must not drift between functions');
});

test('claim_operator rejects a wrong code and writes nothing', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
  const db = mockDb();
  const res = await claimOperator({ db, openid: 'u1', code: 'wrong' });
  assert.equal(res.status, 'failed');
  assert.equal(res.code, 'invalid_claim_code');
  assert.equal(db.rows.size, 0);
});

test('claim_operator adds the openid to natureAdmin/main and is idempotent', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
  const db = mockDb();
  const first = await claimOperator({ db, openid: 'u1', code: 'nature-ops-2026', now: 1000 });
  assert.equal(first.status, 'ok');
  assert.equal(db.rows.get('natureAdmin/main').openids.join(','), 'u1');
  assert.equal(db.rows.get('natureAdmin/main').claimedAt, 1000);
  const second = await claimOperator({ db, openid: 'u1', code: 'nature-ops-2026', now: 2000 });
  assert.equal(second.status, 'ok');
  assert.equal(second.already, true);
  assert.deepEqual(db.rows.get('natureAdmin/main').openids, ['u1'], 'no duplicate openid');
});

test('isOperator is true after claim and false for others', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
  const db = mockDb();
  await claimOperator({ db, openid: 'u1', code: 'nature-ops-2026' });
  assert.equal(await isOperator(db, 'u1'), true);
  assert.equal(await isOperator(db, 'u2'), false);
  assert.equal(await isOperator(db, ''), false);
  assert.equal(await isOperator(db, null), false);
});

test('env openids still work and database read failure falls back to env only', async () => {
  process.env.NATURE_ADMIN_OPENIDS = 'env-op';
  const db = mockDb({ failRead: true });
  assert.equal(await isOperator(db, 'env-op'), true, 'env op is still recognized when db is unreadable');
  assert.equal(await isOperator(db, 'db-op'), false, 'db op is not recognized when db is unreadable');
  delete process.env.NATURE_ADMIN_OPENIDS;
});

test('claim_operator returns unauthenticated when openid is missing', async () => {
  const db = mockDb();
  const res = await claimOperator({ db, openid: '', code: 'nature-ops-2026' });
  assert.equal(res.code, 'unauthenticated');
});

test('analytics-aggregate still requires an operator after claim changes', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  const db = mockDb();
  const res = await analyticsMain({ action: 'aggregate_day', date: '2026-09-25' }, { cloud: cloudApi(db, 'stranger') });
  assert.equal(res.code, 'operator_required');
});

test('analytics-aggregate accepts a claimed operator and aggregate_day runs', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
  const db = mockDb();
  await claimOperator({ db, openid: 'u1', code: 'nature-ops-2026' });
  const res = await analyticsMain({ action: 'aggregate_day', date: '2026-09-25' }, { cloud: cloudApi(db, 'u1') });
  assert.equal(res.status, 'ok');
});

test('printAdmin exposes claim_operator without prior operator status', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
  const db = mockDb();
  const res = await printAdmin({ db, owner: 'u1', event: { action: 'claim_operator', code: 'nature-ops-2026' }, now: 1000 });
  assert.equal(res.status, 'ok');
  assert.equal(await isOperator(db, 'u1'), true);
});

test('printAdmin still gates existing actions without claim', async () => {
  delete process.env.NATURE_ADMIN_OPENIDS;
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
  const db = mockDb();
  await assert.rejects(printAdmin({ db, owner: 'u1', event: { action: 'list_orders' } }), /operator_required/);
});

test('custom claim code from env overrides the default', async () => {
  process.env.NATURE_OPERATOR_CLAIM_CODE = 'ops-secret';
  const db = mockDb();
  const bad = await claimOperator({ db, openid: 'u1', code: 'nature-ops-2026' });
  assert.equal(bad.code, 'invalid_claim_code');
  const good = await claimOperator({ db, openid: 'u1', code: 'ops-secret' });
  assert.equal(good.status, 'ok');
  delete process.env.NATURE_OPERATOR_CLAIM_CODE;
});
