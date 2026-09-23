const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('crypto');
const {MemoryRepository}=require('../cloudfunctions/natureSocial/memory-repository'),{createSocialService}=require('../cloudfunctions/natureSocial/core');
test('erasing identities cannot write, and their previous social records disappear immediately',async()=>{
 const repo=new MemoryRepository(),service=createSocialService({repo});
 repo.seed('accountPrivacy',createHash('sha256').update('alice').digest('hex'),{owner:'alice',status:'erasing'});
 assert.equal((await service.execute('alice',{action:'createInvite'})).code,'account_erasing');assert.equal(repo.entries('natureFriendInvites').length,0);
 const guarded=require('../cloudfunctions/natureSocial/account-gate').accountGate(repo,'bob');repo.seed('natureSpeciesShares','share',{owner:'alice',recipient:'bob',status:'active'});
 assert.deepEqual(await guarded.query('natureSpeciesShares',{recipient:'bob'},100),[]);
 assert.equal(await guarded.get('natureSpeciesShares','share'),undefined);
});
