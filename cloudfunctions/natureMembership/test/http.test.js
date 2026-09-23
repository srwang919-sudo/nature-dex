'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { main, rawBodyOf } = require('../index');

test('HTTP body contract never reserializes an object before signature verification', () => {
  assert.throws(() => rawBodyOf({ body: { unsafe: true } }), error => error.code === 'raw_body_required');
  assert.equal(rawBodyOf({ body: Buffer.from('{"ok":true}').toString('base64'), isBase64Encoded: true }), '{"ok":true}');
});

test('missing merchant environment fails closed for client and callback entry points', async () => {
  const fakeCloud = { database() { throw new Error('must not reach database'); }, getWXContext() { return { OPENID: 'openid' }; } };
  const client = await main({ action: 'getMembership' }, {}, { cloud: fakeCloud, env: {} });
  assert.equal(client.code, 'merchant_config_missing');
  const callback = await main({ httpMethod: 'POST', path: '/wechatpay/notify', headers: {}, body: '{}' }, {}, { cloud: fakeCloud, env: {} });
  assert.equal(callback.statusCode, 503);
  assert.match(callback.body, /merchant_config_missing/);
});

test('HTTP callback routes reject methods and unknown paths without entering business logic', async () => {
  const fakeCloud = {};
  const config = {};
  const repo = {};
  const gateway = {};
  const get = await main({ httpMethod: 'GET', path: '/wechatpay/notify', body: '' }, {}, { cloud: fakeCloud, config, repo, gateway });
  assert.equal(get.statusCode, 405);
  const missing = await main({ httpMethod: 'POST', path: '/not-a-callback', body: '' }, {}, { cloud: fakeCloud, config, repo, gateway });
  assert.equal(missing.statusCode, 404);
});
