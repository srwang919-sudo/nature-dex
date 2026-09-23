const test=require('node:test'),assert=require('node:assert/strict');
const {reserveCreation,settleCreation}=require('../cloudfunctions/createArtCard/creation-wallet');
function fixture(){const rows=new Map();return {rows,tx:{collection:c=>({doc:id=>({async get(){if(!rows.has(c+'/'+id))throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(rows.get(c+'/'+id))}},async set({data}){rows.set(c+'/'+id,structuredClone(data))}})})}}}
test('free wallet reserves 10 bonus plus 5 monthly, idempotently commits and releases',async()=>{
 const {tx}=fixture(),now=Date.UTC(2026,8,1);let first;
 for(let i=0;i<15;i++){const args={owner:'a',operationId:'op'+i,now},r=await reserveCreation(tx,args);if(!i)first=r;assert.deepEqual(await reserveCreation(tx,args),r);await settleCreation(tx,{...args,attempt:r.attempt,outcome:'commit'});}
 await assert.rejects(reserveCreation(tx,{owner:'a',operationId:'overflow',now}),/creation_quota_exhausted/);
 assert.equal(first.source,'bonus');
 const retry={owner:'b',operationId:'retry',now},r=await reserveCreation(tx,retry);await settleCreation(tx,{...retry,attempt:r.attempt,outcome:'release'});await settleCreation(tx,{...retry,attempt:r.attempt,outcome:'release'});assert.equal((await reserveCreation(tx,retry)).attempt,2);
 await assert.rejects(settleCreation(tx,{...retry,attempt:1,outcome:'commit'}),/reservation_stale/);
});
test('member month is 30, bonus is one-time; timeout releases and cannot late commit',async()=>{
 const {tx,rows}=fixture(),now=Date.UTC(2026,8,1);rows.set('membershipEntitlements/a',{owner:'a',status:'ACTIVE',expiresAt:Date.UTC(2027,8,1)});
 for(let i=0;i<40;i++){const r=await reserveCreation(tx,{owner:'a',operationId:'op'+i,now});await settleCreation(tx,{owner:'a',operationId:'op'+i,attempt:r.attempt,outcome:'commit',now})}
 await assert.rejects(reserveCreation(tx,{owner:'a',operationId:'full',now}),/creation_quota_exhausted/);
 const r=await reserveCreation(tx,{owner:'a',operationId:'next',now:Date.UTC(2026,9,1)});assert.equal(r.source,'monthly');
 await assert.rejects(settleCreation(tx,{owner:'a',operationId:'next',attempt:r.attempt,outcome:'commit',now:Date.UTC(2026,9,1)+180001}),/reservation_expired/);
 await settleCreation(tx,{owner:'a',operationId:'next',attempt:r.attempt,outcome:'release',now:Date.UTC(2026,9,1)+180001});
});
module.exports={fixture};
