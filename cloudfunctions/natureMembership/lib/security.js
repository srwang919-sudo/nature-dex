'use strict';

const {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} = require('node:crypto');
const { DomainError } = require('./errors');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const randomNonce = () => randomBytes(16).toString('hex');

function rsaSign(privateKeyPem, message) {
  return sign('RSA-SHA256', Buffer.from(message), createPrivateKey(privateKeyPem)).toString('base64');
}

function rsaVerify(publicKeyPem, message, signature) {
  try {
    return verify('RSA-SHA256', Buffer.from(message), createPublicKey(publicKeyPem), Buffer.from(signature, 'base64'));
  } catch (_) {
    return false;
  }
}

function buildAuthorization(config, method, canonicalUrl, body, timestamp, nonce) {
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonce}\n${body || ''}\n`;
  const signature = rsaSign(config.merchantPrivateKeyPem, message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.merchantSerialNo}"`;
}

function signRequestPayment(config, prepayId, now = Date.now) {
  const timeStamp = String(Math.floor(now() / 1000));
  const nonceStr = randomNonce();
  const packageValue = `prepay_id=${prepayId}`;
  const message = `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;
  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign: rsaSign(config.merchantPrivateKeyPem, message),
  };
}

function header(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  const value = key ? headers[key] : '';
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function assertWechatSignature({ config, headers, rawBody, now = Date.now, maxSkewSeconds = 300 }) {
  const serial = header(headers, 'Wechatpay-Serial');
  const signature = header(headers, 'Wechatpay-Signature');
  const timestamp = header(headers, 'Wechatpay-Timestamp');
  const nonce = header(headers, 'Wechatpay-Nonce');
  if (!serial || !signature || !timestamp || !nonce || !/^\d{10}$/.test(timestamp)) {
    throw new DomainError('notification_signature_missing', 'Required WeChat Pay signature headers are missing', 401);
  }
  if (serial !== config.wechatPayPublicKeyId || signature.startsWith('WECHATPAY/SIGNTEST/')) {
    throw new DomainError('notification_signature_invalid', 'Untrusted WeChat Pay signing key', 401);
  }
  const skew = Math.abs(Math.floor(now() / 1000) - Number(timestamp));
  if (skew > maxSkewSeconds) {
    throw new DomainError('notification_stale', 'Notification timestamp is outside the replay window', 401);
  }
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  if (!rsaVerify(config.wechatPayPublicKeyPem, message, signature)) {
    throw new DomainError('notification_signature_invalid', 'Invalid WeChat Pay signature', 401);
  }
}

function decryptResource(apiV3Key, resource) {
  if (!resource || resource.algorithm !== 'AEAD_AES_256_GCM' || typeof resource.ciphertext !== 'string' || typeof resource.nonce !== 'string') {
    throw new DomainError('notification_resource_invalid', 'Unsupported notification resource', 400);
  }
  try {
    const encrypted = Buffer.from(resource.ciphertext, 'base64');
    if (encrypted.length <= 16) throw new Error('ciphertext too short');
    const ciphertext = encrypted.subarray(0, -16);
    const tag = encrypted.subarray(-16);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(resource.nonce, 'utf8'));
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'));
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(plaintext);
  } catch (_) {
    throw new DomainError('notification_decryption_failed', 'Unable to authenticate notification resource', 400);
  }
}

function encryptResourceForTest(apiV3Key, plaintext, nonce, associatedData = '') {
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(apiV3Key), Buffer.from(nonce));
  cipher.setAAD(Buffer.from(associatedData));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(plaintext)), cipher.final(), cipher.getAuthTag()]);
  return encrypted.toString('base64');
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

module.exports = {
  assertWechatSignature,
  buildAuthorization,
  decryptResource,
  encryptResourceForTest,
  header,
  randomNonce,
  rsaSign,
  rsaVerify,
  secureEqual,
  sha256,
  signRequestPayment,
};
