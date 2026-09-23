'use strict';

const PRODUCTS = Object.freeze({
  monthly: Object.freeze({
    id: 'monthly',
    description: '去大自然里月度会员',
    total: 1800,
    currency: 'CNY',
    months: 1,
  }),
  annual: Object.freeze({
    id: 'annual',
    description: '去大自然里年度会员',
    total: 18000,
    currency: 'CNY',
    months: 12,
  }),
});

function productFor(planId) {
  return PRODUCTS[planId];
}

module.exports = { PRODUCTS, productFor };
