'use strict';

const { createPrivateKey, createPublicKey } = require('node:crypto');
const { isIP } = require('node:net');
const { DomainError } = require('./errors');

const REQUIRED = Object.freeze([
  'WXPAY_APP_ID',
  'WXPAY_MCH_ID',
  'WXPAY_MERCHANT_SERIAL_NO',
  'WXPAY_MERCHANT_PRIVATE_KEY_PEM',
  'WXPAY_API_V3_KEY',
  'WXPAY_PUBLIC_KEY_ID',
  'WXPAY_PUBLIC_KEY_PEM',
  'WXPAY_NOTIFY_URL',
  'WXPAY_REFUND_NOTIFY_URL',
  'MEMBERSHIP_JOB_TOKEN',
]);

function cleanPem(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function publicHttpsUrl(value, name) {
  let url;
  try { url = new URL(value); } catch (_) {
    throw new DomainError('merchant_config_invalid', `${name} must be a valid URL`, 503);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const privateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host);
  const privateIpv6 = host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
  if (url.protocol !== 'https:' || host === 'localhost' || host.endsWith('.local') || (isIP(host) === 4 && privateIpv4) || (isIP(host) === 6 && privateIpv6)) {
    throw new DomainError('merchant_config_invalid', `${name} must be a public HTTPS URL`, 503);
  }
  return url.toString();
}

function loadMerchantConfig(env = process.env) {
  const missing = REQUIRED.filter(name => !String(env[name] || '').trim());
  if (missing.length) {
    throw new DomainError('merchant_config_missing', `Missing merchant configuration: ${missing.join(', ')}`, 503);
  }

  const privateKey = cleanPem(env.WXPAY_MERCHANT_PRIVATE_KEY_PEM);
  const publicKey = cleanPem(env.WXPAY_PUBLIC_KEY_PEM);
  if (!/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey)) {
    throw new DomainError('merchant_config_invalid', 'Merchant private key must be PEM encoded', 503);
  }
  if (!/-----BEGIN PUBLIC KEY-----/.test(publicKey)) {
    throw new DomainError('merchant_config_invalid', 'WeChat Pay public key must be PEM encoded', 503);
  }
  try {
    createPrivateKey(privateKey);
    createPublicKey(publicKey);
  } catch (_) {
    throw new DomainError('merchant_config_invalid', 'Merchant or WeChat Pay PEM key is invalid', 503);
  }
  if (Buffer.byteLength(env.WXPAY_API_V3_KEY, 'utf8') !== 32) {
    throw new DomainError('merchant_config_invalid', 'APIv3 key must be exactly 32 bytes', 503);
  }
  if (!/^PUB_KEY_ID_\d+$/.test(env.WXPAY_PUBLIC_KEY_ID)) {
    throw new DomainError('merchant_config_invalid', 'WXPAY_PUBLIC_KEY_ID must use PUB_KEY_ID_* format', 503);
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(env.MEMBERSHIP_JOB_TOKEN)) {
    throw new DomainError('merchant_config_invalid', 'MEMBERSHIP_JOB_TOKEN must be a high-entropy token', 503);
  }

  const timeoutMs = Number(env.WXPAY_REQUEST_TIMEOUT_MS || 5000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 10000) {
    throw new DomainError('merchant_config_invalid', 'WXPAY_REQUEST_TIMEOUT_MS must be 1000..10000', 503);
  }
  const apiBase = new URL(env.WXPAY_API_BASE || 'https://api.mch.weixin.qq.com');
  if (apiBase.protocol !== 'https:') {
    throw new DomainError('merchant_config_invalid', 'WXPAY_API_BASE must use HTTPS', 503);
  }

  return Object.freeze({
    appId: env.WXPAY_APP_ID.trim(),
    mchId: env.WXPAY_MCH_ID.trim(),
    merchantSerialNo: env.WXPAY_MERCHANT_SERIAL_NO.trim(),
    merchantPrivateKeyPem: privateKey,
    apiV3Key: env.WXPAY_API_V3_KEY,
    wechatPayPublicKeyId: env.WXPAY_PUBLIC_KEY_ID.trim(),
    wechatPayPublicKeyPem: publicKey,
    notifyUrl: publicHttpsUrl(env.WXPAY_NOTIFY_URL, 'WXPAY_NOTIFY_URL'),
    refundNotifyUrl: publicHttpsUrl(env.WXPAY_REFUND_NOTIFY_URL, 'WXPAY_REFUND_NOTIFY_URL'),
    jobToken: env.MEMBERSHIP_JOB_TOKEN,
    apiBase: apiBase.origin,
    timeoutMs,
  });
}

module.exports = { loadMerchantConfig, REQUIRED };
