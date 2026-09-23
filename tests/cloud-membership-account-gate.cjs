const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('crypto');
const {MemoryRepository}=require('../cloudfunctions/natureSocial/memory-repository'),{createMembershipService}=require('../cloudfunctions/natureMembership/lib/core');
test('erasure blocks checkout before provider work and preserves financial records',async()=>{
 const repo=new MemoryRepository();let calls=0;repo.seed('accountPrivacy',createHash('sha256').update('me').digest('hex'),{owner:'me',status:'erasing'});
 const service=createMembershipService({repo,config:{},gateway:{createJsapiOrder:async()=>calls++}});
 await assert.rejects(service.createPayment('me',{action:'createPayment',planId:'monthly',idempotencyKey:'once-once'}),/account_erasing/);
 assert.equal(calls,0);assert.equal(repo.entries('membershipOrders').length,0);
});
