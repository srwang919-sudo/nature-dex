const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');

test('natureSocial uses the pinned, compatibility-guarded CloudBase SDK offline', async () => {
  const requireCloud = createRequire(path.resolve(__dirname, '../cloudfunctions/natureSocial/package.json'));
  assert.equal(requireCloud('wx-server-sdk/package.json').version, '4.0.2');
  assert.equal(requireCloud('axios/package.json').version, '0.33.0');

  const cloud = requireCloud('./sdk');
  const requireDatabase = createRequire(requireCloud.resolve('@cloudbase/database'));
  const set = requireDatabase('lodash.set');
  const unset = requireDatabase('lodash.unset');
  assert.equal(typeof set.default, 'function');
  assert.equal(typeof unset.default, 'function');

  for (const unsafe of [
    '__proto__.natureSocialPolluted',
    ['__proto__', 'natureSocialPolluted'],
    'constructor.prototype.natureSocialPolluted',
    ['constructor', 'prototype', 'natureSocialPolluted'],
  ]) {
    try {
      set({}, unsafe, 'unsafe');
      assert.equal({}.natureSocialPolluted, undefined);
    } finally {
      delete Object.prototype.natureSocialPolluted;
    }
  }

  cloud.init({ env: 'local-contract-test' });
  const db = cloud.database();
  assert.equal(typeof db.runTransaction, 'function');
  assert.equal(typeof db.collection('natureFriendships').doc('contract').set, 'function');
  assert.equal(typeof db.collection('natureSpeciesShares').where({ recipient: 'fixture' }).limit(100).get, 'function');

  const { Db } = requireCloud('@cloudbase/database');
  const originalRequest = Db.reqClass;
  const actions = [];
  Db.reqClass = class {
    async send(action) {
      actions.push(action);
      return { transactionId: 'offline-social-transaction' };
    }
  };
  try {
    const value = await db.runTransaction(async tx => {
      assert.equal(typeof tx.collection('natureCopyRequests').doc('id').set, 'function');
      return 'committed-offline';
    });
    assert.equal(value, 'committed-offline');
    assert.deepEqual(actions, ['database.startTransaction', 'database.commitTransaction']);
  } finally {
    Db.reqClass = originalRequest;
  }
});
