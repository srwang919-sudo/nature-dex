'use strict';

const https = require('node:https');
const { DomainError } = require('./errors');
const {
  assertWechatSignature,
  buildAuthorization,
  randomNonce,
} = require('./security');

function defaultTransport({ url, method, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method, headers, timeout: timeoutMs }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        statusCode: response.statusCode || 0,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('timeout', () => request.destroy(new Error('request timeout')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

class WechatPayGateway {
  constructor({ config, transport = defaultTransport, now = Date.now } = {}) {
    if (!config) throw new TypeError('config is required');
    this.config = config;
    this.transport = transport;
    this.now = now;
  }

  async request(method, canonicalUrl, payload) {
    const body = payload === undefined ? '' : JSON.stringify(payload);
    const timestamp = String(Math.floor(this.now() / 1000));
    const nonce = randomNonce();
    const headers = {
      Accept: 'application/json',
      Authorization: buildAuthorization(this.config, method, canonicalUrl, body, timestamp, nonce),
      'Wechatpay-Serial': this.config.wechatPayPublicKeyId,
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(body));
    }

    let response;
    try {
      response = await this.transport({
        url: `${this.config.apiBase}${canonicalUrl}`,
        method,
        headers,
        body,
        timeoutMs: this.config.timeoutMs,
      });
    } catch (error) {
      throw new DomainError('wechatpay_unavailable', error.message, 503, true);
    }
    if (!response || typeof response.body !== 'string') {
      throw new DomainError('wechatpay_response_invalid', 'Missing raw WeChat Pay response', 502, true);
    }

    // APIv3 responses are never trusted until their signature authenticates the exact raw body.
    assertWechatSignature({
      config: this.config,
      headers: response.headers,
      rawBody: response.body,
      now: this.now,
    });

    let data = {};
    if (response.body) {
      try { data = JSON.parse(response.body); } catch (_) {
        throw new DomainError('wechatpay_response_invalid', 'WeChat Pay returned invalid JSON', 502, true);
      }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      const retryable = response.statusCode >= 500 || response.statusCode === 429;
      throw new DomainError('wechatpay_api_error', String(data.message || data.code || 'WeChat Pay API error'), retryable ? 503 : 502, retryable);
    }
    return data;
  }

  createJsapiOrder(order) {
    return this.request('POST', '/v3/pay/transactions/jsapi', {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: order.description,
      out_trade_no: order.outTradeNo,
      time_expire: order.timeExpire,
      attach: order.id,
      notify_url: this.config.notifyUrl,
      amount: { total: order.total, currency: order.currency },
      payer: { openid: order.openid },
    });
  }

  queryOrder(outTradeNo) {
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(this.config.mchId)}`;
    return this.request('GET', path);
  }

  closeOrder(outTradeNo) {
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}/close`;
    return this.request('POST', path, { mchid: this.config.mchId });
  }

  requestRefund({ outTradeNo, outRefundNo, total, refund, reason }) {
    return this.request('POST', '/v3/refund/domestic/refunds', {
      out_trade_no: outTradeNo,
      out_refund_no: outRefundNo,
      reason,
      notify_url: this.config.refundNotifyUrl,
      amount: { total, refund, currency: 'CNY' },
    });
  }

  queryRefund(outRefundNo) {
    return this.request('GET', `/v3/refund/domestic/refunds/${encodeURIComponent(outRefundNo)}`);
  }
}

module.exports = { WechatPayGateway, defaultTransport };
