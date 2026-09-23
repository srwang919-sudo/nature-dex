'use strict';

let cloud;
try {
  cloud = require('./sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (_) {}

const { loadMerchantConfig } = require('./lib/config');
const { createMembershipService } = require('./lib/core');
const { DomainError } = require('./lib/errors');
const { CloudBaseRepository } = require('./lib/repository');
const { WechatPayGateway } = require('./lib/wechat-pay-gateway');

function rawBodyOf(event) {
  if (typeof event.body !== 'string') throw new DomainError('raw_body_required', 'HTTP gateway must preserve a string body', 400);
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

function httpResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: body === undefined ? '' : JSON.stringify(body),
  };
}

function isHttpEvent(event) {
  return event && typeof event === 'object' && typeof event.httpMethod === 'string';
}

function callbackKind(path) {
  const normalized = String(path || '').replace(/\/+$/, '');
  if (normalized.endsWith('/wechatpay/notify')) return 'payment';
  if (normalized.endsWith('/wechatpay/refund-notify')) return 'refund';
  return undefined;
}

function publicFailure(error) {
  if (error instanceof DomainError) {
    return { status: 'failed', code: error.code, retryable: error.retryable };
  }
  return { status: 'failed', code: 'service_unavailable', retryable: true };
}

async function main(event = {}, context = {}, dependencies = {}) {
  const api = dependencies.cloud || cloud;
  try {
    if (!api) throw new DomainError('runtime_unavailable', 'CloudBase runtime is unavailable', 503, true);
    const config = dependencies.config || loadMerchantConfig(dependencies.env || process.env);
    const repo = dependencies.repo || new CloudBaseRepository(api.database());
    const gateway = dependencies.gateway || new WechatPayGateway({ config, transport: dependencies.transport, now: dependencies.now });
    const service = createMembershipService({ repo, gateway, config, now: dependencies.now });

    if (isHttpEvent(event)) {
      if (event.httpMethod.toUpperCase() !== 'POST') return httpResponse(405, { code: 'METHOD_NOT_ALLOWED' });
      const kind = callbackKind(event.path);
      if (!kind) return httpResponse(404, { code: 'NOT_FOUND' });
      await service.acceptNotification({ headers: event.headers || {}, rawBody: rawBodyOf(event), kind });
      return httpResponse(204);
    }

    if (event.action === 'reconcileInbox') return await service.reconcileInbox(event);

    let openid;
    try { openid = api.getWXContext().OPENID; } catch (_) {}
    if (!openid) throw new DomainError('unauthenticated', 'No trusted OPENID context', 401);
    if (event.action === 'createPayment') return await service.createPayment(openid, event);
    if (event.action === 'queryOrder') return await service.queryOwnedOrder(openid, event);
    if (event.action === 'getMembership') return await service.getMembership(openid, event);
    throw new DomainError('invalid_action');
  } catch (error) {
    if (isHttpEvent(event)) {
      const status = error instanceof DomainError ? error.httpStatus : 500;
      return httpResponse(status, { code: 'FAIL', message: error instanceof DomainError ? error.code : 'service_unavailable' });
    }
    return publicFailure(error);
  }
}

module.exports = { callbackKind, isHttpEvent, main, rawBodyOf };
