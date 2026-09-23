const assert=require('node:assert/strict');
const {POLICY}=require('../native/lib/v1-policy');
const {productFor}=require('../cloudfunctions/natureMembership/lib/catalog');
const {membershipView}=require('../native/lib/availability-model');
assert.deepEqual(POLICY,{monthlyFen:1990,annualFen:19800,print24Fen:5990,printQuantity:24,freeMonthly:5,memberMonthly:30,initialBonus:10});
assert.equal(productFor('monthly').total,POLICY.monthlyFen);assert.equal(productFor('annual').total,POLICY.annualFen);
assert.equal(membershipView().monthly,19.9);assert.equal(membershipView().yearly,198);assert.equal(membershipView().saving,40.8);assert.equal(membershipView().savingPercent,17.1);assert.equal(membershipView().availability,'unavailable');
console.log('PASS final V1 prices, policy and honest availability');
