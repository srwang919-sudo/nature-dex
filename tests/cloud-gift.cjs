const assert=require('node:assert/strict');
const {claim}=require('../cloudfunctions/claimGift');
const gifts=new Map([['g1',{id:'g1',status:'open'}]]);
assert.equal(claim(gifts,{giftId:'g1',idempotencyKey:'a',recipientId:'r'}).status,'created');
assert.equal(claim(gifts,{giftId:'g1',idempotencyKey:'a',recipientId:'r'}).status,'created');
assert.equal(claim(gifts,{giftId:'g1',idempotencyKey:'b',recipientId:'r2'}).status,'claimed');
console.log('PASS: gift claim idempotency');
