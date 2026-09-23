const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const { createSocialService, keys } = require('../cloudfunctions/natureSocial/core');
const { MemoryRepository } = require('../cloudfunctions/natureSocial/memory-repository');
const { main } = require('../cloudfunctions/natureSocial');

const sha256 = value => createHash('sha256').update(value).digest('hex');

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
    kind: 'memorial_copy',
    sourceType: 'friend_copy',
    isObservation: false,
    countsForAchievements: false,
    countsAsDiscovery: false,
    species: approved.copy.species,
    receivedAt: approved.copy.receivedAt,
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
