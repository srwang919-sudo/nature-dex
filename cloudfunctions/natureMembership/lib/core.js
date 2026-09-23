'use strict';

const { productFor } = require('./catalog');
const { DomainError, fail } = require('./errors');
const {
  assertWechatSignature,
  decryptResource,
  secureEqual,
  sha256,
  signRequestPayment,
} = require('./security');

const COLLECTIONS = Object.freeze({
  orders: 'membershipOrders',
  entitlements: 'membershipEntitlements',
  events: 'wechatPayEvents',
  reconciliationRuns: 'membershipReconciliationRuns',
});

const IDEMPOTENCY = /^[A-Za-z0-9_-]{8,64}$/;
const ORDER_ID = /^[a-f0-9]{64}$/;

function exactObject(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set(fields);
  return Object.keys(value).every(key => allowed.has(key));
}

function orderIdFor(openid, key) {
  return sha256(`membership-order-v1|${openid}|${key}`);
}

function outTradeNoFor(orderId, attempt = 1) {
  return `ND${orderId.slice(0, 26)}${String(attempt).padStart(4, '0')}`;
}

function toRfc3339(ms) {
  return new Date(ms).toISOString();
}

function validDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function addUtcMonths(timestamp, months) {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

function membershipFromGrants(openid, grants, now) {
  let cursor = 0;
  const normalized = [...grants].sort((a, b) => a.paidAt - b.paidAt || a.orderId.localeCompare(b.orderId));
  for (const grant of normalized) {
    if (grant.state === 'REFUNDED') continue;
    const start = Math.max(cursor, grant.paidAt);
    cursor = addUtcMonths(start, grant.months);
  }
  return {
    owner: openid,
    grants: normalized,
    status: cursor > now ? 'ACTIVE' : 'EXPIRED',
    expiresAt: cursor || null,
    updatedAt: now,
  };
}

function publicOrder(order) {
  return {
    orderId: order._id,
    planId: order.planId,
    total: order.total,
    currency: order.currency,
    status: order.status,
    expiresAt: order.membershipExpiresAt || null,
  };
}

function validatePaidResult(config, order, result) {
  const successTime = validDate(result.success_time);
  if (
    result.trade_state !== 'SUCCESS' ||
    result.appid !== config.appId ||
    result.mchid !== config.mchId ||
    result.out_trade_no !== order.outTradeNo ||
    result.payer?.openid !== order.openid ||
    result.amount?.total !== order.total ||
    result.amount?.currency !== order.currency ||
    !result.transaction_id ||
    !successTime
  ) {
    throw new DomainError('authoritative_payment_mismatch', 'Authoritative payment does not match the server order', 409);
  }
  return successTime;
}

function validateOrderIdentity(config, order, result) {
  if (result.appid !== config.appId || result.mchid !== config.mchId || result.out_trade_no !== order.outTradeNo) {
    throw new DomainError('authoritative_payment_mismatch', 'Authoritative order identity does not match the server order', 409);
  }
}

function validateRefundResult(config, order, result) {
  if (
    result.refund_status !== 'SUCCESS' ||
    result.out_trade_no !== order.outTradeNo ||
    result.out_refund_no !== order.outRefundNo ||
    result.amount?.total !== order.total ||
    result.amount?.refund !== order.total ||
    result.amount?.currency !== order.currency
  ) {
    throw new DomainError('authoritative_refund_mismatch', 'Authoritative refund does not match the full server order', 409);
  }
  return validDate(result.success_time) || Date.now();
}

function createMembershipService({ repo, gateway, config, now = Date.now } = {}) {
  if (!repo || !gateway || !config) throw new TypeError('repo, gateway, and config are required');

  async function confirmPaid(order, result) {
    const paidAt = validatePaidResult(config, order, result);
    const product = productFor(order.planId);
    return repo.runTransaction(async tx => {
      const current = await tx.get(COLLECTIONS.orders, order._id);
      if (!current || current.openid !== order.openid || current.outTradeNo !== order.outTradeNo) fail('order_conflict');
      if (['REFUNDING', 'REFUNDED'].includes(current.status)) {
        return { ...current, _id: order._id };
      }
      const existingEntitlement = await tx.get(COLLECTIONS.entitlements, order.openid);
      const grants = existingEntitlement?.grants || [];
      let nextGrants = grants;
      if (!grants.some(grant => grant.orderId === order._id)) {
        nextGrants = [...grants, { orderId: order._id, planId: order.planId, months: product.months, paidAt, state: 'ACTIVE' }];
      }
      const entitlement = membershipFromGrants(order.openid, nextGrants, now());
      const updated = {
        ...current,
        status: 'PAID',
        transactionId: result.transaction_id,
        paidAt,
        membershipExpiresAt: entitlement.expiresAt,
        updatedAt: now(),
      };
      await tx.put(COLLECTIONS.orders, order._id, updated);
      await tx.put(COLLECTIONS.entitlements, order.openid, entitlement);
      return { ...updated, _id: order._id };
    });
  }

  async function reconcileOrder(order) {
    const result = await gateway.queryOrder(order.outTradeNo);
    validateOrderIdentity(config, order, result);
    if (result.trade_state === 'SUCCESS') return confirmPaid(order, result);
    if (['CLOSED', 'REVOKED', 'PAYERROR'].includes(result.trade_state)) {
      const updated = { ...order, status: result.trade_state, updatedAt: now() };
      await repo.put(COLLECTIONS.orders, order._id, updated);
      return updated;
    }
    if (result.trade_state === 'REFUND') {
      const status = order.status === 'REFUNDED' ? 'REFUNDED' : 'REFUNDING';
      const updated = { ...order, status, updatedAt: now() };
      await repo.put(COLLECTIONS.orders, order._id, updated);
      return updated;
    }
    return order;
  }

  async function recoverForNewPrepay(order) {
    const result = await gateway.queryOrder(order.outTradeNo);
    validateOrderIdentity(config, order, result);
    if (result.trade_state === 'SUCCESS') return confirmPaid(order, result);
    if (result.trade_state === 'NOTPAY') {
      // Closing the abandoned WeChat order prevents two payable out_trade_no values
      // from existing for one logical idempotency key. If payment won the race,
      // WeChat rejects close and the next retry queries SUCCESS instead of rotating.
      await gateway.closeOrder(order.outTradeNo);
    } else if (result.trade_state !== 'CLOSED') {
      throw new DomainError('order_recovery_pending', `Cannot replace order in state ${result.trade_state || 'UNKNOWN'}`, 409, true);
    }
    return repo.runTransaction(async tx => {
      const current = await tx.get(COLLECTIONS.orders, order._id);
      if (!current || current.outTradeNo !== order.outTradeNo || current.status === 'PAID') {
        throw new DomainError('order_recovery_conflict', 'Order changed during recovery', 409, true);
      }
      const attempt = current.attempt + 1;
      const rotated = {
        ...current,
        attempt,
        outTradeNo: outTradeNoFor(order._id, attempt),
        status: 'CREATING',
        updatedAt: now(),
      };
      delete rotated.prepayId;
      delete rotated.prepayExpiresAt;
      delete rotated.lastErrorCode;
      await tx.put(COLLECTIONS.orders, order._id, rotated);
      return { ...rotated, _id: order._id };
    });
  }

  async function createPayment(openid, event) {
    if (!openid) fail('unauthenticated', 'No trusted OPENID context', 401);
    if (!exactObject(event, ['action', 'planId', 'idempotencyKey']) || event.action !== 'createPayment' || !IDEMPOTENCY.test(event.idempotencyKey || '')) {
      fail('invalid_request');
    }
    const product = productFor(event.planId);
    if (!product) fail('invalid_plan');
    const createdAt = now();
    const id = orderIdFor(openid, event.idempotencyKey);
    const attempt = 1;
    const reserved = await repo.runTransaction(async tx => {
      const guard=await tx.get('accountPrivacy',sha256(openid));if(guard&&guard.status!=='active')fail('account_erasing');
      await tx.put('accountPrivacy',sha256(openid),{owner:openid,status:'active',generation:(guard?.generation||0)+1});
      const current = await tx.get(COLLECTIONS.orders, id);
      if (current) {
        if (current.openid !== openid || current.planId !== product.id) fail('idempotency_conflict', 'Idempotency key was used for another order', 409);
        return { created: false, order: current };
      }
      const order = {
        openid,
        planId: product.id,
        description: product.description,
        total: product.total,
        currency: product.currency,
        attempt,
        outTradeNo: outTradeNoFor(id, attempt),
        status: 'CREATING',
        createdAt,
        updatedAt: createdAt,
      };
      await tx.put(COLLECTIONS.orders, id, order);
      return { created: true, order: { ...order, _id: id } };
    });

    let order = { ...reserved.order, _id: reserved.order._id || id };
    if (!reserved.created) {
      if (order.status === 'PREPAY' && order.prepayId && order.prepayExpiresAt > now()) {
        return { status: 'ready', code: 'payment_ready', order: publicOrder(order), requestPayment: signRequestPayment(config, order.prepayId, now) };
      }
      if (order.status === 'PAID') return { status: 'ready', code: 'already_paid', order: publicOrder(order) };
      if (order.status === 'CREATING' && now() - order.updatedAt < 30_000) {
        throw new DomainError('payment_preparing', 'Order creation is already in progress', 409, true);
      }
      order = await recoverForNewPrepay(order);
      if (order.status === 'PAID') return { status: 'ready', code: 'already_paid', order: publicOrder(order) };
    }

    const timeExpire = toRfc3339(now() + 15 * 60 * 1000);
    const beforePayment=await repo.get('accountPrivacy',sha256(openid));if(beforePayment&&beforePayment.status!=='active')fail('account_erasing');
    let prepay;
    try {
      prepay = await gateway.createJsapiOrder({ ...order, id, timeExpire });
    } catch (error) {
      await repo.put(COLLECTIONS.orders, id, { ...order, lastErrorCode: error.code || 'wechatpay_unavailable', updatedAt: now() });
      throw error;
    }
    if (!prepay || typeof prepay.prepay_id !== 'string' || !prepay.prepay_id) {
      throw new DomainError('wechatpay_response_invalid', 'Missing prepay_id', 502, true);
    }
    order = {
      ...order,
      status: 'PREPAY',
      prepayId: prepay.prepay_id,
      prepayExpiresAt: now() + 110 * 60 * 1000,
      updatedAt: now(),
    };
    await repo.put(COLLECTIONS.orders, id, order);
    // Retain authoritative financial reconciliation data, but never return a new checkout after erasure.
    const afterPayment=await repo.get('accountPrivacy',sha256(openid));if(afterPayment&&afterPayment.status!=='active')fail('account_erasing');
    return { status: 'ready', code: 'payment_ready', order: publicOrder({ ...order, _id: id }), requestPayment: signRequestPayment(config, prepay.prepay_id, now) };
  }

  async function queryOwnedOrder(openid, event) {
    if (!openid) fail('unauthenticated', 'No trusted OPENID context', 401);
    if (!exactObject(event, ['action', 'orderId']) || event.action !== 'queryOrder' || !ORDER_ID.test(event.orderId || '')) fail('invalid_request');
    const order = await repo.get(COLLECTIONS.orders, event.orderId);
    if (!order || order.openid !== openid) fail('not_found', 'Order not found', 404);
    const reconciled = await reconcileOrder(order);
    return { status: 'ready', code: 'ok', order: publicOrder({ ...reconciled, _id: event.orderId }) };
  }

  async function getMembership(openid, event) {
    if (!openid) fail('unauthenticated', 'No trusted OPENID context', 401);
    if (!exactObject(event, ['action']) || event.action !== 'getMembership') fail('invalid_request');
    const current = await repo.get(COLLECTIONS.entitlements, openid);
    const membership = current ? membershipFromGrants(openid, current.grants || [], now()) : { owner: openid, grants: [], status: 'INACTIVE', expiresAt: null, updatedAt: now() };
    if (current && (membership.status !== current.status || membership.expiresAt !== current.expiresAt)) {
      await repo.put(COLLECTIONS.entitlements, openid, membership);
    }
    return { status: 'ready', code: 'ok', membership: { status: membership.status, expiresAt: membership.expiresAt } };
  }

  async function acceptNotification({ headers, rawBody, kind }) {
    if (typeof rawBody !== 'string') fail('raw_body_required', 'HTTP gateway must preserve the raw body', 400);
    assertWechatSignature({ config, headers, rawBody, now });
    let envelope;
    try { envelope = JSON.parse(rawBody); } catch (_) { fail('invalid_json'); }
    const expectedType = kind === 'refund' ? 'REFUND.SUCCESS' : 'TRANSACTION.SUCCESS';
    const expectedOriginal = kind === 'refund' ? 'refund' : 'transaction';
    if (!envelope || envelope.event_type !== expectedType || envelope.resource_type !== 'encrypt-resource' || envelope.resource?.original_type !== expectedOriginal || typeof envelope.id !== 'string') {
      fail('notification_type_invalid');
    }
    const resource = decryptResource(config.apiV3Key, envelope.resource);
    const outTradeNo = resource.out_trade_no;
    if (typeof outTradeNo !== 'string' || !outTradeNo) fail('notification_resource_invalid');
    if (kind === 'refund' && (typeof resource.out_refund_no !== 'string' || !resource.out_refund_no)) fail('notification_resource_invalid');
    const digest = sha256(rawBody);
    return repo.runTransaction(async tx => {
      const current = await tx.get(COLLECTIONS.events, envelope.id);
      if (current) {
        if (current.digest !== digest || current.kind !== kind) fail('notification_replay_conflict', 'Notification id was replayed with different content', 409);
        return { accepted: true, duplicate: true };
      }
      await tx.put(COLLECTIONS.events, envelope.id, {
        kind,
        eventType: envelope.event_type,
        digest,
        outTradeNo,
        outRefundNo: resource.out_refund_no || null,
        state: 'PENDING',
        attempts: 0,
        receivedAt: now(),
        nextAttemptAt: now(),
      });
      return { accepted: true, duplicate: false };
    });
  }

  async function markEvent(event, values) {
    await repo.put(COLLECTIONS.events, event._id, { ...event, ...values, updatedAt: now() });
  }

  async function reconcileRefundEvent(event, order) {
    const result = await gateway.queryRefund(event.outRefundNo);
    const refundedAt = validateRefundResult(config, order, result);
    return repo.runTransaction(async tx => {
      const currentOrder = await tx.get(COLLECTIONS.orders, order._id);
      if (!currentOrder) fail('not_found');
      const entitlement = await tx.get(COLLECTIONS.entitlements, currentOrder.openid);
      const grants = (entitlement?.grants || []).map(grant => grant.orderId === order._id ? { ...grant, state: 'REFUNDED', refundedAt } : grant);
      const nextEntitlement = membershipFromGrants(currentOrder.openid, grants, now());
      await tx.put(COLLECTIONS.orders, order._id, { ...currentOrder, status: 'REFUNDED', refundedAt, updatedAt: now() });
      await tx.put(COLLECTIONS.entitlements, currentOrder.openid, nextEntitlement);
    });
  }

  async function reconcileInbox(event) {
    if (!exactObject(event, ['action', 'jobToken', 'limit']) || event.action !== 'reconcileInbox' || !secureEqual(event.jobToken || '', config.jobToken)) {
      fail('forbidden', 'Invalid reconciliation credential', 403);
    }
    const limit = Number.isInteger(event.limit) ? Math.min(Math.max(event.limit, 1), 50) : 20;
    const pending = await repo.query(COLLECTIONS.events, { state: 'PENDING' }, limit);
    const inboxOutTradeNos = new Set(pending.map(item => item.outTradeNo));
    const runId = sha256(`reconcile|${now()}|${Math.random()}`);
    let processed = 0;
    let failed = 0;
    for (const inboxEvent of pending) {
      if (inboxEvent.nextAttemptAt > now()) continue;
      try {
        const orders = await repo.query(COLLECTIONS.orders, { outTradeNo: inboxEvent.outTradeNo }, 2);
        if (orders.length !== 1) fail('order_lookup_failed', 'Notification order was not uniquely found', 409);
        const order = orders[0];
        if (inboxEvent.kind === 'payment') {
          const reconciled = await reconcileOrder(order);
          if (!['PAID', 'REFUNDING', 'REFUNDED'].includes(reconciled.status)) {
            throw new DomainError('payment_not_confirmed', 'Payment query has not reached a confirmed state', 503, true);
          }
        }
        else {
          if (!order.outRefundNo || order.outRefundNo !== inboxEvent.outRefundNo) fail('refund_not_requested', 'Refund was not initiated by this service', 409);
          await reconcileRefundEvent(inboxEvent, order);
        }
        await markEvent(inboxEvent, { state: 'PROCESSED', processedAt: now(), attempts: inboxEvent.attempts + 1 });
        processed += 1;
      } catch (error) {
        const attempts = inboxEvent.attempts + 1;
        await markEvent(inboxEvent, {
          state: attempts >= 10 && !error.retryable ? 'DEAD_LETTER' : 'PENDING',
          attempts,
          lastErrorCode: error.code || 'reconciliation_failed',
          nextAttemptAt: now() + Math.min(60 * 60 * 1000, (2 ** Math.min(attempts, 10)) * 1000),
        });
        failed += 1;
      }
    }
    // Notifications can be delayed or lost. Periodic authoritative queries close
    // that gap without ever relying on a client callback.
    const openOrders = (await repo.query(COLLECTIONS.orders, { status: 'PREPAY' }, Math.max(1, 50 - pending.length)))
      .filter(order => !inboxOutTradeNos.has(order.outTradeNo));
    let queried = 0;
    for (const order of openOrders) {
      try {
        await reconcileOrder(order);
        queried += 1;
      } catch (_) {
        failed += 1;
      }
    }
    const expired = await expireMemberships();
    await repo.put(COLLECTIONS.reconciliationRuns, runId, { processed, failed, queried, expired, startedAt: now(), completedAt: now() });
    return { status: 'ready', code: 'reconciled', processed, failed, queried, expired };
  }

  async function requestFullRefund(orderId, reason = '用户申请退款') {
    if (!ORDER_ID.test(orderId || '')) fail('invalid_request');
    let order = await repo.get(COLLECTIONS.orders, orderId);
    if (!order || !['PAID', 'REFUNDING'].includes(order.status)) fail('order_not_refundable', 'Only paid orders can be refunded', 409);
    const outRefundNo = order.outRefundNo || `NR${orderId.slice(0, 30)}`;
    if (order.status === 'PAID') {
      order = { ...order, status: 'REFUNDING', outRefundNo, updatedAt: now() };
      await repo.put(COLLECTIONS.orders, orderId, order);
    }
    await gateway.requestRefund({ outTradeNo: order.outTradeNo, outRefundNo, total: order.total, refund: order.total, reason });
    return { status: 'ready', code: 'refund_submitted', orderId };
  }

  async function expireMemberships() {
    const active = await repo.query(COLLECTIONS.entitlements, { status: 'ACTIVE' }, 100);
    let expired = 0;
    for (const row of active) {
      if (row.expiresAt <= now()) {
        await repo.put(COLLECTIONS.entitlements, row._id, membershipFromGrants(row._id, row.grants || [], now()));
        expired += 1;
      }
    }
    return expired;
  }

  return {
    acceptNotification,
    createPayment,
    expireMemberships,
    getMembership,
    queryOwnedOrder,
    reconcileInbox,
    requestFullRefund,
  };
}

module.exports = {
  COLLECTIONS,
  addUtcMonths,
  createMembershipService,
  membershipFromGrants,
  orderIdFor,
  outTradeNoFor,
};
