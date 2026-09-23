'use strict';

const assert = require('node:assert/strict');
const { generateKeyPairSync, sign } = require('node:crypto');
const test = require('node:test');

const { loadMerchantConfig } = require('../lib/config');
const { COLLECTIONS, createMembershipService } = require('../lib/core');
const { MemoryRepository } = require('../lib/repository');
const { encryptResourceForTest, rsaVerify } = require('../lib/security');
const { WechatPayGateway } = require('../lib/wechat-pay-gateway');

function keys() {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }),
  };
}

const merchantKeys = keys();
const wechatKeys = keys();

function configEnv() {
  return {
    WXPAY_APP_ID: 'wx-test-app',
    WXPAY_MCH_ID: '1900000001',
    WXPAY_MERCHANT_SERIAL_NO: 'MERCHANTSERIAL1',
    WXPAY_MERCHANT_PRIVATE_KEY_PEM: merchantKeys.privateKey,
    WXPAY_API_V3_KEY: '0123456789abcdef0123456789abcdef',
    WXPAY_PUBLIC_KEY_ID: 'PUB_KEY_ID_3000000001',
    WXPAY_PUBLIC_KEY_PEM: wechatKeys.publicKey,
    WXPAY_NOTIFY_URL: 'https://pay.example.cn/wechatpay/notify',
    WXPAY_REFUND_NOTIFY_URL: 'https://pay.example.cn/wechatpay/refund-notify',
    MEMBERSHIP_JOB_TOKEN: 'job_token_with_128_bits_minimum',
  };
}

function setup() {
  const config = loadMerchantConfig(configEnv());
  const repo = new MemoryRepository();
  let current = Date.parse('2026-09-23T00:00:00.000Z');
  const now = () => current;
  const calls = { create: 0, query: 0, close: 0, refund: 0, queryRefund: 0 };
  const gateway = {
    async createJsapiOrder(order) {
      calls.create += 1;
      calls.createdOrder = structuredClone(order);
      return { prepay_id: 'wx-prepay-test' };
    },
    async queryOrder(outTradeNo) {
      calls.query += 1;
      if (typeof gateway.queryResult === 'function') return gateway.queryResult(outTradeNo);
      return gateway.queryResult || { trade_state: 'NOTPAY' };
    },
    async closeOrder(outTradeNo) {
      calls.close += 1;
      calls.closedOutTradeNo = outTradeNo;
      return {};
    },
    async requestRefund(payload) {
      calls.refund += 1;
      calls.refundPayload = structuredClone(payload);
      return { status: 'PROCESSING' };
    },
    async queryRefund(outRefundNo) {
      calls.queryRefund += 1;
      if (typeof gateway.refundResult === 'function') return gateway.refundResult(outRefundNo);
      return gateway.refundResult;
    },
  };
  const service = createMembershipService({ repo, gateway, config, now });
  return { calls, config, gateway, now, repo, service, setNow(value) { current = value; } };
}

function signedNotification({ config, kind = 'payment', id = 'EV-1', resource, timestamp, nonce = 'notify-nonce' }) {
  const associatedData = 'transaction';
  const envelope = {
    id,
    create_time: new Date(timestamp).toISOString(),
    resource_type: 'encrypt-resource',
    event_type: kind === 'refund' ? 'REFUND.SUCCESS' : 'TRANSACTION.SUCCESS',
    summary: kind === 'refund' ? '退款成功' : '支付成功',
    resource: {
      original_type: kind === 'refund' ? 'refund' : 'transaction',
      algorithm: 'AEAD_AES_256_GCM',
      ciphertext: encryptResourceForTest(config.apiV3Key, resource, nonce, associatedData),
      associated_data: associatedData,
      nonce,
    },
  };
  const rawBody = JSON.stringify(envelope);
  const seconds = String(Math.floor(timestamp / 1000));
  const signature = sign('RSA-SHA256', Buffer.from(`${seconds}\n${nonce}\n${rawBody}\n`), wechatKeys.privateKey).toString('base64');
  return {
    rawBody,
    headers: {
      'Wechatpay-Serial': config.wechatPayPublicKeyId,
      'Wechatpay-Signature': signature,
      'Wechatpay-Timestamp': seconds,
      'Wechatpay-Nonce': nonce,
    },
  };
}

test('merchant configuration fails closed when any credential is missing', () => {
  const env = configEnv();
  delete env.WXPAY_API_V3_KEY;
  assert.throws(() => loadMerchantConfig(env), error => error.code === 'merchant_config_missing');
});

test('server catalog and trusted OPENID defeat forged client price and identity', async () => {
  const { calls, repo, service } = setup();
  await assert.rejects(
    service.createPayment('trusted-openid', { action: 'createPayment', planId: 'monthly', idempotencyKey: 'idem_key_1234', amount: 1, openid: 'attacker' }),
    error => error.code === 'invalid_request',
  );
  assert.equal(calls.create, 0);

  const result = await service.createPayment('trusted-openid', { action: 'createPayment', planId: 'monthly', idempotencyKey: 'idem_key_1234' });
  assert.equal(result.order.total, 1990);
  assert.equal(calls.createdOrder.total, 1990);
  assert.equal(calls.createdOrder.openid, 'trusted-openid');
  const stored = repo.entries(COLLECTIONS.orders)[0];
  assert.equal(stored.openid, 'trusted-openid');
  assert.equal(stored.currency, 'CNY');
});

test('idempotent order creation reuses the same prepay session and signs requestPayment', async () => {
  const { calls, config, service } = setup();
  const event = { action: 'createPayment', planId: 'annual', idempotencyKey: 'same_request_01' };
  const first = await service.createPayment('openid-1', event);
  const second = await service.createPayment('openid-1', event);
  assert.equal(calls.create, 1);
  assert.equal(first.order.orderId, second.order.orderId);
  assert.equal(first.order.total, 19800);
  const params = first.requestPayment;
  const message = `${config.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.package}\n`;
  assert.equal(params.signType, 'RSA');
  assert.equal(params.package, 'prepay_id=wx-prepay-test');
  assert.equal(rsaVerify(merchantKeys.publicKey, message, params.paySign), true);
});

test('abandoned prepay is authoritatively closed and rotated before safe retry', async () => {
  const { calls, config, gateway, now, repo, service, setNow } = setup();
  const event = { action: 'createPayment', planId: 'monthly', idempotencyKey: 'recover_request_1' };
  const first = await service.createPayment('openid-recover', event);
  const firstOutTradeNo = repo.entries(COLLECTIONS.orders)[0].outTradeNo;
  gateway.queryResult = outTradeNo => ({
    appid: config.appId,
    mchid: config.mchId,
    out_trade_no: outTradeNo,
    trade_state: 'NOTPAY',
  });
  setNow(now() + 111 * 60 * 1000);
  const retried = await service.createPayment('openid-recover', event);
  const secondOutTradeNo = repo.entries(COLLECTIONS.orders)[0].outTradeNo;
  assert.equal(calls.close, 1);
  assert.equal(calls.closedOutTradeNo, firstOutTradeNo);
  assert.notEqual(secondOutTradeNo, firstOutTradeNo);
  assert.equal(calls.create, 2);
  assert.equal(first.order.orderId, retried.order.orderId);
});

test('WeChat API responses are rejected unless the exact raw response is signed', async () => {
  const config = loadMerchantConfig(configEnv());
  const current = Date.parse('2026-09-23T00:00:00.000Z');
  const rawBody = JSON.stringify({ trade_state: 'NOTPAY', appid: config.appId, mchid: config.mchId, out_trade_no: 'ND-response' });
  const timestamp = String(Math.floor(current / 1000));
  const nonce = 'api-response-nonce';
  const validSignature = sign('RSA-SHA256', Buffer.from(`${timestamp}\n${nonce}\n${rawBody}\n`), wechatKeys.privateKey).toString('base64');
  let forged = false;
  const transport = async () => ({
    statusCode: 200,
    body: rawBody,
    headers: {
      'Wechatpay-Serial': config.wechatPayPublicKeyId,
      'Wechatpay-Timestamp': timestamp,
      'Wechatpay-Nonce': nonce,
      'Wechatpay-Signature': forged ? Buffer.alloc(256, 3).toString('base64') : validSignature,
    },
  });
  const gateway = new WechatPayGateway({ config, transport, now: () => current });
  assert.equal((await gateway.queryOrder('ND-response')).trade_state, 'NOTPAY');
  forged = true;
  await assert.rejects(gateway.queryOrder('ND-response'), error => error.code === 'notification_signature_invalid');
});

test('forged and stale callbacks are rejected before inbox persistence', async () => {
  const { config, now, repo, service } = setup();
  const valid = signedNotification({ config, timestamp: now(), resource: { out_trade_no: 'NDfake' } });
  valid.headers['Wechatpay-Signature'] = Buffer.alloc(256, 7).toString('base64');
  await assert.rejects(service.acceptNotification({ ...valid, kind: 'payment' }), error => error.code === 'notification_signature_invalid');
  assert.equal(repo.entries(COLLECTIONS.events).length, 0);

  const stale = signedNotification({ config, timestamp: now() - 301_000, id: 'EV-stale', resource: { out_trade_no: 'NDfake' } });
  await assert.rejects(service.acceptNotification({ ...stale, kind: 'payment' }), error => error.code === 'notification_stale');
  assert.equal(repo.entries(COLLECTIONS.events).length, 0);
});

test('authenticated callbacks are idempotent and never grant before authoritative query', async () => {
  const { config, now, repo, service } = setup();
  const created = await service.createPayment('openid-2', { action: 'createPayment', planId: 'monthly', idempotencyKey: 'notify_test_01' });
  const order = repo.entries(COLLECTIONS.orders)[0];
  const notification = signedNotification({ config, timestamp: now(), resource: { out_trade_no: order.outTradeNo } });
  const first = await service.acceptNotification({ ...notification, kind: 'payment' });
  const replay = await service.acceptNotification({ ...notification, kind: 'payment' });
  assert.equal(first.duplicate, false);
  assert.equal(replay.duplicate, true);
  assert.equal(repo.entries(COLLECTIONS.events).length, 1);
  assert.equal(repo.entries(COLLECTIONS.entitlements).length, 0);
  assert.equal(created.order.status, 'PREPAY');
});

test('same notification id with different authenticated content is rejected as a replay conflict', async () => {
  const { config, now, repo, service } = setup();
  const first = signedNotification({ config, timestamp: now(), id: 'EV-replay', resource: { out_trade_no: 'ND-first' } });
  const second = signedNotification({ config, timestamp: now(), id: 'EV-replay', nonce: 'second-nonce', resource: { out_trade_no: 'ND-second' } });
  await service.acceptNotification({ ...first, kind: 'payment' });
  await assert.rejects(service.acceptNotification({ ...second, kind: 'payment' }), error => error.code === 'notification_replay_conflict');
  assert.equal(repo.entries(COLLECTIONS.events).length, 1);
});

test('successful signed authoritative query grants once; duplicate processing cannot extend twice', async () => {
  const { config, gateway, now, repo, service } = setup();
  const created = await service.createPayment('openid-3', { action: 'createPayment', planId: 'monthly', idempotencyKey: 'grant_test_001' });
  const order = repo.entries(COLLECTIONS.orders)[0];
  gateway.queryResult = {
    appid: config.appId,
    mchid: config.mchId,
    out_trade_no: order.outTradeNo,
    transaction_id: '4200000000001',
    trade_state: 'SUCCESS',
    success_time: new Date(now()).toISOString(),
    payer: { openid: 'openid-3' },
    amount: { total: 1990, currency: 'CNY' },
  };
  const notification = signedNotification({ config, timestamp: now(), resource: { out_trade_no: order.outTradeNo } });
  await service.acceptNotification({ ...notification, kind: 'payment' });
  const run = await service.reconcileInbox({ action: 'reconcileInbox', jobToken: config.jobToken });
  assert.deepEqual({ processed: run.processed, failed: run.failed }, { processed: 1, failed: 0 });
  const entitlement = repo.entries(COLLECTIONS.entitlements)[0];
  assert.equal(entitlement.status, 'ACTIVE');
  assert.equal(entitlement.grants.length, 1);
  const expiry = entitlement.expiresAt;
  const duplicate = signedNotification({ config, timestamp: now(), id: 'EV-duplicate-2', resource: { out_trade_no: order.outTradeNo } });
  await service.acceptNotification({ ...duplicate, kind: 'payment' });
  await service.reconcileInbox({ action: 'reconcileInbox', jobToken: config.jobToken });
  assert.equal(repo.entries(COLLECTIONS.entitlements)[0].expiresAt, expiry);
  assert.equal(repo.entries(COLLECTIONS.entitlements)[0].grants.length, 1);
  assert.equal(created.order.orderId, order._id);
});

test('mismatched or failed authoritative query never grants entitlement', async () => {
  const { config, gateway, now, repo, service } = setup();
  await service.createPayment('openid-4', { action: 'createPayment', planId: 'annual', idempotencyKey: 'failure_test_01' });
  const order = repo.entries(COLLECTIONS.orders)[0];
  gateway.queryResult = {
    appid: config.appId,
    mchid: config.mchId,
    out_trade_no: order.outTradeNo,
    transaction_id: '4200000000002',
    trade_state: 'SUCCESS',
    success_time: new Date(now()).toISOString(),
    payer: { openid: 'attacker-openid' },
    amount: { total: 1, currency: 'CNY' },
  };
  const notification = signedNotification({ config, timestamp: now(), resource: { out_trade_no: order.outTradeNo } });
  await service.acceptNotification({ ...notification, kind: 'payment' });
  const run = await service.reconcileInbox({ action: 'reconcileInbox', jobToken: config.jobToken });
  assert.equal(run.failed, 1);
  assert.equal(repo.entries(COLLECTIONS.entitlements).length, 0);
  assert.equal(repo.entries(COLLECTIONS.events)[0].state, 'PENDING');
});

test('full refund callback is queried authoritatively and removes the corresponding grant', async () => {
  const { config, gateway, now, repo, service } = setup();
  const created = await service.createPayment('openid-5', { action: 'createPayment', planId: 'monthly', idempotencyKey: 'refund_test_01' });
  let order = repo.entries(COLLECTIONS.orders)[0];
  gateway.queryResult = {
    appid: config.appId,
    mchid: config.mchId,
    out_trade_no: order.outTradeNo,
    transaction_id: '4200000000003',
    trade_state: 'SUCCESS',
    success_time: new Date(now()).toISOString(),
    payer: { openid: 'openid-5' },
    amount: { total: 1990, currency: 'CNY' },
  };
  await service.queryOwnedOrder('openid-5', { action: 'queryOrder', orderId: created.order.orderId });
  await service.requestFullRefund(created.order.orderId, '测试退款');
  order = repo.entries(COLLECTIONS.orders)[0];
  gateway.refundResult = {
    out_trade_no: order.outTradeNo,
    out_refund_no: order.outRefundNo,
    refund_status: 'SUCCESS',
    success_time: new Date(now()).toISOString(),
    amount: { total: 1990, refund: 1990, currency: 'CNY' },
  };
  const notification = signedNotification({
    config,
    kind: 'refund',
    id: 'EV-refund',
    timestamp: now(),
    resource: { out_trade_no: order.outTradeNo, out_refund_no: order.outRefundNo },
  });
  await service.acceptNotification({ ...notification, kind: 'refund' });
  await service.reconcileInbox({ action: 'reconcileInbox', jobToken: config.jobToken });
  const entitlement = repo.entries(COLLECTIONS.entitlements)[0];
  assert.equal(entitlement.status, 'EXPIRED');
  assert.equal(entitlement.grants[0].state, 'REFUNDED');
  assert.equal(repo.entries(COLLECTIONS.orders)[0].status, 'REFUNDED');
});
