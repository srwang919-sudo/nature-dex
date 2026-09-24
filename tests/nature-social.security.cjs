const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const { createSocialService, keys } = require('../cloudfunctions/natureSocial/core');
const { MemoryRepository } = require('../cloudfunctions/natureSocial/memory-repository');
const { main } = require('../cloudfunctions/natureSocial');

const sha256 = value => createHash('sha256').update(value).digest('hex');
test('new print-approved gift binds server source and consent, legacy replay never upgrades photo rights',async()=>{const f=fixture(),s=await registerAndShare(f),sourceId=s.observation._id;f.repo.seed('natureCards',sourceId,{owner:'openid_alice',observationId:s.observation.observationId,status:'saved',cardType:'original_observation',speciesId:'kingfisher'});const r=await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'gift_print_request_123'}),e={copyRequestId:r.copyRequestId,idempotencyKey:'gift_print_approve_123',printConsent:'gift-print-v1'};const result=await f.call('openid_alice','approveCopy',e);assert.equal(result.status,'ready');assert.equal(result.copy.printAuthorized,true);assert.equal(result.copy.photoFileId,undefined);assert.equal(result.copy.sourceCardId,undefined);const row=await f.repo.get('natureMemorialCopies',r.copyRequestId);assert.equal(row.sourceCardId,sourceId);assert.equal(row.printAuthorization.version,'gift-print-v1');assert.equal((await f.call('openid_alice','approveCopy',e)).copy.id,result.copy.id);assert.equal((await f.call('openid_alice','approveCopy',{...e,printConsent:'yes'})).code,'invalid_request');const g=fixture(),gs=await registerAndShare(g),gr=await g.call('openid_bob','requestCopy',{shareId:gs.shareId,idempotencyKey:'gift_old_request_1234'}),ge={copyRequestId:gr.copyRequestId,idempotencyKey:'gift_old_approve_1234'};assert.equal((await g.call('openid_alice','approveCopy',ge)).copy.printAuthorized,false);assert.equal((await g.call('openid_alice','approveCopy',{...ge,printConsent:'gift-print-v1'})).code,'replay_conflict')});
test('recent shares seek past more than 100 old rows and invalid newest rows with owner-bound stable cursors',async()=>{const f=fixture(),s=await registerAndShare(f),base=await f.repo.get('natureSpeciesShares',s.shareId);f.repo.seed('natureSpeciesShares',s.shareId,{...base,createdAt:0});for(let i=0;i<120;i++)f.repo.seed('natureSpeciesShares',sha256('old'+i),{...base,createdAt:i});for(let i=0;i<25;i++)f.repo.seed('natureSpeciesShares',sha256('invalid'+i),{...base,createdAt:9999,speciesCardId:sha256('missing')});const ids=['a','b','c'].map(x=>sha256('new'+x)).sort();for(const id of ids)f.repo.seed('natureSpeciesShares',id,{...base,createdAt:9998});let cursor='',rows=[],pages=0;do{const r=await f.call('openid_bob','listRecentSharedSpecies',{cursor});assert.equal(r.status,'ready');rows.push(...r.species);cursor=r.nextCursor;pages++;if(cursor)assert.equal((await f.call('openid_eve','listRecentSharedSpecies',{cursor})).code,'invalid_request')}while(cursor&&rows.length<3);assert.ok(pages>=2);assert.deepEqual(rows.slice(0,3).map(x=>x.shareId),ids);f.repo.seed('trustedObservations',s.observation._id,{...s.observation,status:'revoked'});cursor='';do{const revoked=await f.call('openid_bob','listRecentSharedSpecies',{cursor});assert.equal(revoked.species.length,0);cursor=revoked.nextCursor}while(cursor)});
test('museum pages cannot cross friends and disabling profile hides all live sharing routes',async()=>{const f=fixture(),s=await registerAndShare(f),share=await f.repo.get('natureSpeciesShares',s.shareId);for(let i=0;i<22;i++)f.repo.seed('natureSpeciesShares',sha256('museum'+i),share);const first=await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId});assert.equal(first.cards.length,20);const last=await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId,cursor:first.nextCursor});assert.equal(last.cards.length,3);assert.equal(new Set([...first.cards,...last.cards].map(x=>x.shareId)).size,23);assert.equal((await f.call('openid_alice','getFriendMuseum',{relationshipId:s.relationshipId,cursor:first.nextCursor})).code,'invalid_request');await f.call('openid_alice','setSocialProfile',{enabled:false});assert.equal((await f.call('openid_bob','listSharedSpecies')).species.length,0);assert.equal((await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'profile_off_123456789'})).code,'not_verified');assert.equal((await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId})).cards.length,0)});
test('friend museum hides profile by default, requires explicit sharing and revokes on relationship/source changes',async()=>{const f=fixture(),s=await registerAndShare(f);await f.call('openid_alice','setSocialProfile',{enabled:false});let museum=await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId});assert.equal(museum.profile.enabled,false);assert.equal(museum.cards.length,0);assert.equal(museum.badgeCount,null);assert.equal((await f.call('openid_eve','getFriendMuseum',{relationshipId:s.relationshipId})).code,'forbidden');assert.equal((await f.call('openid_alice','setSocialProfile',{enabled:true,nickname:'林间小记',avatarSymbol:'leaf'})).status,'ready');museum=await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId});assert.equal(museum.profile.nickname,'林间小记');assert.equal(museum.cards.length,1);assert.equal(JSON.stringify(museum).includes('openid_'),false);assert.equal(JSON.stringify(museum).includes('秘密湿地'),false);await f.call('openid_alice','setSocialProfile',{enabled:false});museum=await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId});assert.equal(museum.profile.enabled,false);assert.notEqual(museum.profile.nickname,'林间小记');await f.call('openid_alice','setSocialProfile',{enabled:true,nickname:'林间小记',avatarSymbol:'leaf'});f.repo.seed('trustedObservations',s.observation._id,{...s.observation,status:'revoked'});assert.equal((await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId})).cards.length,0);await f.call('openid_alice','revokeFriend',{relationshipId:s.relationshipId});assert.equal((await f.call('openid_bob','getFriendMuseum',{relationshipId:s.relationshipId})).code,'relationship_inactive')});
test('sent share pages are stable, owner-bound and revocable across sessions',async()=>{const f=fixture(),s=await registerAndShare(f);const original=await f.repo.get('natureSpeciesShares',s.shareId);for(let i=0;i<25;i++)f.repo.seed('natureSpeciesShares',sha256('page'+i),{...original});let cursor='',seen=[];do{const page=await f.call('openid_alice','listSentShares',{cursor});assert.equal(page.status,'ready');seen.push(...page.shares.map(x=>x.shareId));cursor=page.nextCursor;if(cursor)assert.equal((await f.call('openid_bob','listSentShares',{cursor})).code,'invalid_request')}while(cursor);assert.equal(new Set(seen).size,26);assert.equal(seen.length,26);const revoked=await f.call('openid_alice','revokeSpeciesShare',{shareId:seen[0]});assert.equal(revoked.shared,false);assert.equal((await f.call('openid_eve','revokeSpeciesShare',{shareId:seen[1]})).code,'forbidden')});
test('copy deletion and withdrawal are authorized, idempotent and cannot be resurrected by approval replay',async()=>{const f=fixture(),s=await registerAndShare(f),r=await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'request_delete_123456'}),event={copyRequestId:r.copyRequestId,idempotencyKey:'approve_delete_123456'};const approved=await f.call('openid_alice','approveCopy',event);assert.equal(approved.copy.provenance.contributor,'匿名收藏者');assert.equal(approved.copy.provenance.speciesId,'kingfisher');assert.equal(JSON.stringify(approved.copy).includes('openid_'),false);assert.equal((await f.call('openid_eve','deleteGiftedCopy',{copyId:r.copyRequestId})).code,'forbidden');await Promise.all([f.call('openid_bob','deleteGiftedCopy',{copyId:r.copyRequestId}),f.call('openid_alice','revokeGiftedCopy',{copyId:r.copyRequestId})]);assert.equal((await f.call('openid_bob','listMemorialCopies')).copies.length,0);assert.equal((await f.call('openid_bob','deleteGiftedCopy',{copyId:r.copyRequestId})).status,'ready');const replay=await f.call('openid_alice','approveCopy',event);assert.equal(replay.code,'copy_removed');assert.equal(replay.copy,undefined);const row=await f.repo.get('natureMemorialCopies',r.copyRequestId);assert.equal(row.species,undefined);assert.equal(row.provenance,undefined);assert.equal((await f.repo.get('trustedObservations',s.observation._id)).status,'verified')});
test('likes are recipient-only, idempotent and reject revoked sources',async()=>{const f=fixture(),s=await registerAndShare(f);for(let i=0;i<2;i++)assert.equal((await f.call('openid_bob','setLike',{shareId:s.shareId,liked:true})).liked,true);assert.equal((await f.call('openid_bob','listSharedSpecies')).species[0].liked,true);assert.equal((await f.call('openid_eve','setLike',{shareId:s.shareId,liked:false})).code,'forbidden');assert.equal((await f.call('openid_bob','setLike',{shareId:s.shareId,liked:false})).liked,false);f.repo.seed('trustedObservations',s.observation._id,{...s.observation,status:'revoked'});assert.equal((await f.call('openid_bob','setLike',{shareId:s.shareId,liked:true})).code,'not_verified')});
test('requester cancellation is idempotent and owner cannot approve a canceled request',async()=>{const f=fixture(),s=await registerAndShare(f),r=await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'request_cancel_123456'});assert.equal((await f.call('openid_eve','cancelCopyRequest',{copyRequestId:r.copyRequestId})).code,'forbidden');for(let i=0;i<2;i++)assert.equal((await f.call('openid_bob','cancelCopyRequest',{copyRequestId:r.copyRequestId})).state,'cancelled');assert.equal((await f.call('openid_alice','approveCopy',{copyRequestId:r.copyRequestId,idempotencyKey:'approve_cancel_123456'})).code,'replay_conflict');assert.equal(f.repo.entries('natureMemorialCopies').length,0);assert.equal((await f.call('openid_bob','listMyCopyRequests')).requests[0].state,'cancelled')});
test('approval and cancellation race yields at most one non-discovery gifted copy',async()=>{const f=fixture(),s=await registerAndShare(f),r=await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'request_race_12345678'});const results=await Promise.all([f.call('openid_alice','approveCopy',{copyRequestId:r.copyRequestId,idempotencyKey:'approve_race_12345678'}),f.call('openid_bob','cancelCopyRequest',{copyRequestId:r.copyRequestId})]);assert.equal(results.filter(x=>x.status==='ready').length,1);const copies=(await f.call('openid_bob','listMemorialCopies')).copies;assert.equal(copies.length,1);assert.equal(copies[0].cardType,'gifted_collection');assert.equal(copies[0].countsAsDiscovery,false);assert.equal(copies[0].countsForAchievements,false);assert.equal(copies[0].discovery,undefined);assert.equal(copies[0].photoFileId,undefined);assert.equal((await f.repo.get('trustedObservations',s.observation._id)).status,'verified')});

test('revoked source observation hides shares and blocks new copies and pending approval',async()=>{
 const f=fixture(),s=await registerAndShare(f);
 const pending=await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'copy_1234567890abcdef'});
 assert.equal(pending.status,'ready');
 f.repo.seed('trustedObservations',s.observation._id,{...s.observation,status:'revoked'});
 assert.deepEqual((await f.call('openid_bob','listSharedSpecies')).species,[]);
 assert.deepEqual((await f.call('openid_alice','listCopyRequests')).requests,[]);
 assert.equal((await f.call('openid_bob','requestCopy',{shareId:s.shareId,idempotencyKey:'copy_other_1234567890'})).code,'not_verified');
 assert.equal((await f.call('openid_alice','approveCopy',{copyRequestId:pending.copyRequestId,idempotencyKey:'approve_1234567890abcd'})).code,'not_verified');
 assert.equal((await f.call('openid_alice','setSpeciesPublic',{relationshipId:s.relationshipId,speciesCardId:s.registered.speciesCard.id,shared:true})).code,'not_verified');
});

function fixture() {
  let now = Date.UTC(2026, 8, 23, 4);
  let tokenNumber = 0;
  const repo = new MemoryRepository();
  const service = createSocialService({
    repo,
    now: () => now,
    randomToken: () => `secure_invite_token_${++tokenNumber}_abcdefghijklmnop`,
  });
  return {
    repo,
    call: (openid, action, payload = {}) => service.execute(openid, { action, ...payload }),
    advance: milliseconds => { now += milliseconds; },
  };
}

function verifiedObservation(owner, observationId = 'obs_verified_1') {
  return {
    _id: sha256(`${owner}|${observationId}`),
    owner,
    observationId,
    status: 'verified',
    confirmed: true,
    attestationVersion: 1,
    speciesId: 'kingfisher',
    canonicalSpeciesId: 'alcedo-atthis',
    speciesName: '普通翠鸟',
    scientificName: 'Alcedo atthis',
    category: 'bird',
    rarity: 'uncommon',
    verifiedAt: Date.UTC(2026, 8, 23, 3),
    sourceFunction: 'createArtCard',
    photoFileId: 'cloud://private/photo.jpg',
    location: '秘密湿地',
    coordinates: { latitude: 1, longitude: 2 },
    note: '只给自己看',
  };
}

async function connect(f, owner = 'openid_alice', recipient = 'openid_bob') {
  const invite = await f.call(owner, 'createInvite');
  assert.equal(invite.status, 'ready');
  const accepted = await f.call(recipient, 'acceptInvite', {
    inviteCode: invite.inviteCode,
    idempotencyKey: 'accept_1234567890abcdef',
  });
  assert.equal(accepted.status, 'ready');
  return accepted.relationshipId;
}

async function registerAndShare(f, owner = 'openid_alice', recipient = 'openid_bob') {
  await f.call(owner,'setSocialProfile',{enabled:true,nickname:'观察者',avatarSymbol:'leaf'});
  const observation = verifiedObservation(owner);
  f.repo.seed('trustedObservations', observation._id, observation);
  const registered = await f.call(owner, 'registerVerifiedSpecies', { observationId: observation.observationId });
  assert.equal(registered.status, 'ready');
  const relationshipId = await connect(f, owner, recipient);
  const shared = await f.call(owner, 'setSpeciesPublic', {
    relationshipId,
    speciesCardId: registered.speciesCard.id,
    shared: true,
  });
  assert.equal(shared.status, 'ready');
  return { observation, registered, relationshipId, shareId: shared.shareId };
}

test('rejects forged identity fields and does not trust a local card payload', async () => {
  const f = fixture();
  const forged = await f.call('openid_alice', 'registerVerifiedSpecies', {
    observationId: 'obs_local_only',
    owner: 'openid_victim',
    _openid: 'openid_victim',
    speciesName: '伪造珍稀物种',
  });
  assert.deepEqual(forged, { status: 'failed', code: 'invalid_request' });

  const localOnly = await f.call('openid_alice', 'registerVerifiedSpecies', { observationId: 'obs_local_only' });
  assert.deepEqual(localOnly, { status: 'failed', code: 'not_verified' });
});

test('creates a mutual friendship without returning either OPENID', async () => {
  const f = fixture();
  const invite = await f.call('openid_alice', 'createInvite');
  const payload = { inviteCode: invite.inviteCode, idempotencyKey: 'accept_1234567890abcdef' };
  const first = await f.call('openid_bob', 'acceptInvite', payload);
  const replay = await f.call('openid_bob', 'acceptInvite', payload);
  assert.deepEqual(replay, first);
  assert.deepEqual(await f.call('openid_bob', 'acceptInvite', {
    inviteCode: invite.inviteCode,
    idempotencyKey: 'accept_different_abcdef',
  }), { status: 'failed', code: 'invite_used' });
  const relationshipId = first.relationshipId;
  const alice = await f.call('openid_alice', 'listFriends');
  const bob = await f.call('openid_bob', 'listFriends');
  assert.equal(alice.friends[0].relationshipId, relationshipId);
  assert.equal(bob.friends[0].relationshipId, relationshipId);
  assert.doesNotMatch(JSON.stringify({ alice, bob }), /openid_/);
});

test('shares only a whitelisted species summary with the explicitly selected friend', async () => {
  const f = fixture();
  await registerAndShare(f);
  const bob = await f.call('openid_bob', 'listSharedSpecies');
  const stranger = await f.call('openid_charlie', 'listSharedSpecies');
  assert.equal(bob.status, 'ready');
  assert.equal(bob.species.length, 1);
  assert.equal(stranger.species.length, 0);
  assert.deepEqual(Object.keys(bob.species[0].species).sort(), [
    'canonicalSpeciesId', 'category', 'rarity', 'scientificName', 'speciesId', 'speciesName',
  ]);
  assert.doesNotMatch(JSON.stringify(bob), /photo|location|coordinate|note|cloud:\/\//i);
});

test('requires the recipient to request and the owner to explicitly approve a memorial copy', async () => {
  const f = fixture();
  const { shareId } = await registerAndShare(f);
  const requested = await f.call('openid_bob', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_1234567890abcdef',
  });
  assert.equal(requested.status, 'ready');
  assert.equal(requested.state, 'pending');
  const pending = await f.call('openid_alice', 'listCopyRequests');
  assert.equal(pending.requests.length, 1);
  assert.equal(pending.requests[0].copyRequestId, requested.copyRequestId);
  assert.doesNotMatch(JSON.stringify(pending), /openid_|photo|location|coordinate|note/i);

  const intruder = await f.call('openid_charlie', 'approveCopy', {
    copyRequestId: requested.copyRequestId,
    idempotencyKey: 'approve_1234567890abcdef',
  });
  assert.deepEqual(intruder, { status: 'failed', code: 'forbidden' });

  const approved = await f.call('openid_alice', 'approveCopy', {
    copyRequestId: requested.copyRequestId,
    idempotencyKey: 'approve_1234567890abcdef',
  });
  assert.equal(approved.status, 'ready');
  assert.deepEqual(approved.copy, {
    id: requested.copyRequestId,
    cardType: 'gifted_collection',kind: 'memorial_copy',
    sourceType: 'friend_copy',
    isObservation: false,
    countsForAchievements: false,
    countsAsDiscovery: false,
    species: approved.copy.species,
    receivedAt: approved.copy.receivedAt,
    printAuthorized: false,
    provenance: {kind:'approved_friend_copy',contributor:'匿名收藏者',speciesId:'kingfisher'},
  });
  const received = await f.call('openid_bob', 'listMemorialCopies');
  assert.deepEqual(received.copies, [approved.copy]);
  assert.equal((await f.call('openid_alice', 'listMemorialCopies')).copies.length, 0);
  assert.equal((await f.call('openid_alice', 'listCopyRequests')).requests.length, 0);

  const sameReplay = await f.call('openid_alice', 'approveCopy', {
    copyRequestId: requested.copyRequestId,
    idempotencyKey: 'approve_1234567890abcdef',
  });
  assert.deepEqual(sameReplay, approved);
  const conflictingReplay = await f.call('openid_alice', 'approveCopy', {
    copyRequestId: requested.copyRequestId,
    idempotencyKey: 'approve_different_abcdef',
  });
  assert.deepEqual(conflictingReplay, { status: 'failed', code: 'replay_conflict' });
  assert.equal(f.repo.entries('natureMemorialCopies').length, 1);
});

test('serializes concurrent approval attempts into one copy', async () => {
  const f = fixture();
  const { shareId } = await registerAndShare(f);
  const request = await f.call('openid_bob', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_concurrent_12345',
  });
  const results = await Promise.all([
    f.call('openid_alice', 'approveCopy', { copyRequestId: request.copyRequestId, idempotencyKey: 'approve_concurrent_12345' }),
    f.call('openid_alice', 'approveCopy', { copyRequestId: request.copyRequestId, idempotencyKey: 'approve_concurrent_12345' }),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(f.repo.entries('natureMemorialCopies').length, 1);
});

test('revocation and blocking immediately remove access and prevent new copy requests', async () => {
  const f = fixture();
  const { relationshipId, shareId } = await registerAndShare(f);
  const revoked = await f.call('openid_alice', 'revokeFriend', { relationshipId });
  assert.equal(revoked.status, 'ready');
  assert.equal((await f.call('openid_bob', 'listSharedSpecies')).species.length, 0);
  assert.deepEqual(await f.call('openid_bob', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_after_revoke_1',
  }), { status: 'failed', code: 'relationship_inactive' });

  const reinvite = await f.call('openid_alice', 'createInvite');
  assert.equal((await f.call('openid_bob', 'acceptInvite', {
    inviteCode: reinvite.inviteCode,
    idempotencyKey: 'accept_again_123456789',
  })).status, 'ready');
  assert.equal((await f.call('openid_bob', 'blockFriend', { relationshipId })).status, 'ready');
  const revokeWhileBlocked = await f.call('openid_alice', 'revokeFriend', { relationshipId });
  assert.equal(revokeWhileBlocked.relationshipStatus, 'blocked');
  const blockedInvite = await f.call('openid_alice', 'createInvite');
  assert.deepEqual(await f.call('openid_bob', 'acceptInvite', {
    inviteCode: blockedInvite.inviteCode,
    idempotencyKey: 'blocked_accept_1234567',
  }), { status: 'failed', code: 'relationship_blocked' });
});

test('revoking one species share hides it and prevents approval of its pending request', async () => {
  const f = fixture();
  const { shareId } = await registerAndShare(f);
  const request = await f.call('openid_bob', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_before_revoke_1',
  });
  assert.equal(request.status, 'ready');
  assert.equal((await f.call('openid_alice', 'revokeSpeciesShare', { shareId })).status, 'ready');
  assert.equal((await f.call('openid_bob', 'listSharedSpecies')).species.length, 0);
  assert.equal((await f.call('openid_alice', 'listCopyRequests')).requests.length, 0);
  assert.deepEqual(await f.call('openid_alice', 'approveCopy', {
    copyRequestId: request.copyRequestId,
    idempotencyKey: 'approve_after_revoke_1',
  }), { status: 'failed', code: 'share_inactive' });
});

test('reconnecting never resurrects an old share or old copy request', async () => {
  const f = fixture();
  const { relationshipId, shareId, registered } = await registerAndShare(f);
  const oldRequest = await f.call('openid_bob', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_old_generation_1',
  });
  assert.equal((await f.call('openid_alice', 'revokeFriend', { relationshipId })).status, 'ready');

  const invite = await f.call('openid_alice', 'createInvite');
  const reconnected = await f.call('openid_bob', 'acceptInvite', {
    inviteCode: invite.inviteCode,
    idempotencyKey: 'accept_new_generation_1',
  });
  assert.equal(reconnected.relationshipId, relationshipId);
  assert.equal((await f.call('openid_bob', 'listSharedSpecies')).species.length, 0);
  assert.deepEqual(await f.call('openid_alice', 'approveCopy', {
    copyRequestId: oldRequest.copyRequestId,
    idempotencyKey: 'approve_old_generation_1',
  }), { status: 'failed', code: 'share_inactive' });

  const reshared = await f.call('openid_alice', 'setSpeciesPublic', {
    relationshipId,
    speciesCardId: registered.speciesCard.id,
    shared: true,
  });
  assert.equal(reshared.shareId, shareId);
  assert.equal((await f.call('openid_bob', 'listSharedSpecies')).species.length, 1);
  const newRequest = await f.call('openid_bob', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_new_generation_1',
  });
  assert.equal(newRequest.status, 'ready');
  assert.notEqual(newRequest.copyRequestId, oldRequest.copyRequestId);
});

test('expires invitations and copy requests and makes rejection idempotent', async () => {
  const f = fixture();
  const invite = await f.call('openid_alice', 'createInvite');
  f.advance(16 * 60 * 1000);
  assert.deepEqual(await f.call('openid_bob', 'acceptInvite', {
    inviteCode: invite.inviteCode,
    idempotencyKey: 'late_accept_123456789',
  }), { status: 'failed', code: 'expired' });

  const { shareId } = await registerAndShare(f, 'openid_carol', 'openid_dan');
  const request = await f.call('openid_dan', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_expiring_1234',
  });
  const rejected = await f.call('openid_carol', 'rejectCopy', {
    copyRequestId: request.copyRequestId,
    idempotencyKey: 'reject_1234567890abcd',
  });
  assert.equal(rejected.state, 'rejected');
  assert.deepEqual(await f.call('openid_carol', 'rejectCopy', {
    copyRequestId: request.copyRequestId,
    idempotencyKey: 'reject_1234567890abcd',
  }), rejected);

  const request2 = await f.call('openid_dan', 'requestCopy', {
    shareId,
    idempotencyKey: 'request_expiring_5678',
  });
  f.advance(8 * 24 * 60 * 60 * 1000);
  assert.deepEqual(await f.call('openid_carol', 'approveCopy', {
    copyRequestId: request2.copyRequestId,
    idempotencyKey: 'approve_too_late_1234',
  }), { status: 'failed', code: 'expired' });
});

test('key helpers use the agreed attestation and relationship rules', () => {
  assert.equal(keys.trustedObservation('owner', 'obs'), sha256('owner|obs'));
  assert.equal(keys.relationship('b', 'a'), keys.relationship('a', 'b'));
  assert.notEqual(keys.relationship('a', 'b'), keys.relationship('a', 'c'));
});

test('runtime derives identity only from CloudBase context and fails safely', async () => {
  const unauthenticated = await main({ action: 'getProfile' }, {
    cloud: { getWXContext: () => ({}) },
  });
  assert.deepEqual(unauthenticated, { status: 'failed', code: 'unauthenticated' });

  const forged = await main({ action: 'createInvite', owner: 'openid_victim' }, {
    cloud: { getWXContext: () => ({ OPENID: 'openid_attacker' }) },
    repo: new MemoryRepository(),
  });
  assert.deepEqual(forged, { status: 'failed', code: 'invalid_request' });
});
