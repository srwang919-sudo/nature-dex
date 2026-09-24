const { createHash, createHmac, timingSafeEqual, randomBytes } = require('node:crypto');

const COLLECTIONS = Object.freeze({
  observations: 'trustedObservations',
  invites: 'natureFriendInvites',
  friendships: 'natureFriendships',
  edges: 'natureFriendEdges',
  cards: 'natureSpeciesCards',
  shares: 'natureSpeciesShares',
  copyRequests: 'natureCopyRequests',
  copySlots: 'natureCopySlots',
  copies: 'natureMemorialCopies',
});

const INVITE_TTL = 15 * 60 * 1000;
const COPY_TTL = 7 * 24 * 60 * 60 * 1000;
const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const pageSignature=(owner,id)=>createHmac('sha256',owner).update('sent-share-v1|'+id).digest('hex');
const pageCursor=(owner,id)=>Buffer.from(id+'.'+pageSignature(owner,id)).toString('base64url');
function pageAfter(owner,value){if(!value)return '';if(typeof value!=='string'||value.length>200)deny('invalid_request');const [id,sig]=Buffer.from(value,'base64url').toString().split('.');if(!hexId(id)||!hexId(sig)||!timingSafeEqual(Buffer.from(sig),Buffer.from(pageSignature(owner,id))))deny('invalid_request');return id}
const keys = Object.freeze({
  trustedObservation: (owner, observationId) => sha256(`${owner}|${observationId}`),
  relationship: (a, b) => sha256(`friend-v1|${[a, b].sort().join('|')}`),
  edge: (owner, relationshipId) => sha256(`edge-v1|${owner}|${relationshipId}`),
  speciesCard: (owner, observationId) => sha256(`species-v1|${owner}|${observationId}`),
  share: (owner, recipient, speciesCardId) => sha256(`share-v1|${owner}|${recipient}|${speciesCardId}`),
  copyRequest: (requester, shareId, idempotencyKey) => sha256(`copy-request-v1|${requester}|${shareId}|${idempotencyKey}`),
  copySlot: (requester, shareId) => sha256(`copy-slot-v1|${requester}|${shareId}`),
});

class DomainError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const deny = code => { throw new DomainError(code); };
const hexId = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const observationId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const idempotencyKey = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value);
const inviteCode = value => typeof value === 'string' && /^[A-Za-z0-9_-]{24,128}$/.test(value);

function exactEvent(event, fields) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
  const allowed = new Set(['action', ...fields]);
  return Object.keys(event).every(key => allowed.has(key));
}

function cleanText(value, max, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) deny('attestation_invalid');
    return '';
  }
  if (typeof value !== 'string') deny('attestation_invalid');
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) deny('attestation_invalid');
  return text;
}

function speciesProjection(attestation) {
  const projection = {
    speciesId: cleanText(attestation.speciesId, 100, true),
    canonicalSpeciesId: cleanText(attestation.canonicalSpeciesId || attestation.speciesId, 100, true),
    speciesName: cleanText(attestation.speciesName, 80, true),
    scientificName: cleanText(attestation.scientificName, 120),
    category: cleanText(attestation.category, 32, true),
    rarity: cleanText(attestation.rarity, 32),
  };
  return Object.fromEntries(Object.entries(projection).filter(([, value]) => value !== ''));
}

function publicSpecies(projection) {
  return {
    speciesId: projection.speciesId,
    canonicalSpeciesId: projection.canonicalSpeciesId,
    speciesName: projection.speciesName,
    scientificName: projection.scientificName || '',
    category: projection.category,
    rarity: projection.rarity || '',
  };
}

function publicCopy(copy) {
  return {
    id: copy._id,
    cardType: 'gifted_collection',
    kind: 'memorial_copy',
    sourceType: 'friend_copy',
    isObservation: false,
    countsForAchievements: false,
    countsAsDiscovery: false,
    species: publicSpecies(copy.species),
    receivedAt: copy.receivedAt,
    provenance: {kind:'approved_friend_copy',contributor:'匿名收藏者',speciesId:copy.species.speciesId},
  };
}

function otherMember(friendship, caller) {
  if (!friendship || !Array.isArray(friendship.members) || friendship.members.length !== 2 || !friendship.members.includes(caller)) deny('forbidden');
  return friendship.members[0] === caller ? friendship.members[1] : friendship.members[0];
}

function requireActive(friendship, caller) {
  const other = otherMember(friendship, caller);
  if (friendship.status === 'blocked') deny('relationship_blocked');
  if (friendship.status !== 'active') deny('relationship_inactive');
  return other;
}

function ready(code, values = {}) { return { status: 'ready', code, ...values }; }

function createSocialService({ repo, now = Date.now, randomToken = () => randomBytes(24).toString('base64url'), accountGuarded=false } = {}) {
  if (!repo) throw new TypeError('repo is required');

  async function sourceStillVerified(store, speciesCardId) {
    const card = await store.get(COLLECTIONS.cards, speciesCardId);
    if (!card) return false;
    const record = await store.get(COLLECTIONS.observations, keys.trustedObservation(card.owner, card.observationId));
    return !!(record && record.owner === card.owner && record.observationId === card.observationId && record.status === 'verified' && record.confirmed === true && record.attestationVersion === 1);
  }

  const actions = {
    async getProfile(openid, event) {
      if (!exactEvent(event, [])) deny('invalid_request');
      const edges = await repo.query(COLLECTIONS.edges, { owner: openid }, 100);
      let friendCount = 0;
      for (const edge of edges) {
        const relationship = await repo.get(COLLECTIONS.friendships, edge.relationshipId);
        if (relationship?.status === 'active') friendCount += 1;
      }
      return ready('ok', { profile: { friendCount, socialSchemaVersion: 1 } });
    },

    async createInvite(openid, event) {
      if (!exactEvent(event, [])) deny('invalid_request');
      const code = randomToken();
      if (!inviteCode(code)) throw new Error('unsafe random token');
      const createdAt = now();
      await repo.put(COLLECTIONS.invites, sha256(code), {
        issuer: openid,
        status: 'open',
        createdAt,
        expiresAt: createdAt + INVITE_TTL,
      });
      return ready('invite_created', { inviteCode: code, expiresAt: createdAt + INVITE_TTL });
    },

    async acceptInvite(openid, event) {
      if (!exactEvent(event, ['inviteCode', 'idempotencyKey']) || !inviteCode(event.inviteCode) || !idempotencyKey(event.idempotencyKey)) deny('invalid_request');
      const inviteId = sha256(event.inviteCode);
      return repo.runTransaction(async tx => {
        const invite = await tx.get(COLLECTIONS.invites, inviteId);
        if (!invite) deny('not_found');
        if (invite.issuer === openid) deny('self_invite');
        const relationshipId = keys.relationship(invite.issuer, openid);
        if (invite.status === 'accepted') {
          if (invite.recipient === openid && invite.acceptKeyHash === sha256(event.idempotencyKey)) return ready('friend_connected', { relationshipId });
          deny('invite_used');
        }
        if (invite.expiresAt <= now()) deny('expired');
        if (invite.status !== 'open') deny('invite_used');
        const current = await tx.get(COLLECTIONS.friendships, relationshipId);
        if (current?.status === 'blocked' || current?.blockedBy?.length) deny('relationship_blocked');
        const connectedAt = now();
        const generation = current?.status === 'active' ? (current.generation || 1) : (current?.generation || 0) + 1;
        const friendship = {
          members: [invite.issuer, openid].sort(),
          status: 'active',
          blockedBy: [],
          generation,
          connectedAt,
          updatedAt: connectedAt,
        };
        await tx.put(COLLECTIONS.friendships, relationshipId, friendship);
        for (const member of friendship.members) {
          await tx.put(COLLECTIONS.edges, keys.edge(member, relationshipId), { owner: member, relationshipId, createdAt: connectedAt });
        }
        await tx.put(COLLECTIONS.invites, inviteId, { ...invite, status: 'accepted', recipient: openid, acceptKeyHash: sha256(event.idempotencyKey), acceptedAt: connectedAt });
        return ready('friend_connected', { relationshipId });
      });
    },

    async listFriends(openid, event) {
      if (!exactEvent(event, [])) deny('invalid_request');
      const edges = await repo.query(COLLECTIONS.edges, { owner: openid }, 100);
      const friends = [];
      for (const edge of edges) {
        const relationship = await repo.get(COLLECTIONS.friendships, edge.relationshipId);
        if (relationship?.status === 'active' && relationship.members?.includes(openid)) {
          friends.push({ relationshipId: edge.relationshipId, connectedAt: relationship.connectedAt });
        }
      }
      return ready('ok', { friends });
    },

    async registerVerifiedSpecies(openid, event) {
      if (!exactEvent(event, ['observationId']) || !observationId(event.observationId)) deny('invalid_request');
      const attestation = await repo.get(COLLECTIONS.observations, keys.trustedObservation(openid, event.observationId));
      if (!attestation) deny('not_verified');
      if (attestation.owner !== openid || attestation.observationId !== event.observationId || attestation.status !== 'verified' || attestation.confirmed !== true || attestation.attestationVersion !== 1 || !Number.isSafeInteger(attestation.verifiedAt) || !['createArtCard', 'recognizeObservation'].includes(attestation.sourceFunction)) deny('attestation_invalid');
      const species = speciesProjection(attestation);
      const cardId = keys.speciesCard(openid, event.observationId);
      const card = await repo.runTransaction(async tx => {
        const current = await tx.get(COLLECTIONS.cards, cardId);
        if (current) {
          if (current.owner !== openid || current.observationId !== event.observationId || current.attestationId !== attestation._id) deny('registration_conflict');
          return current;
        }
        const created = { owner: openid, observationId: event.observationId, attestationId: attestation._id, species, createdAt: now() };
        await tx.put(COLLECTIONS.cards, cardId, created);
        return { ...created, _id: cardId };
      });
      return ready('species_registered', { speciesCard: { id: cardId, species: publicSpecies(card.species), createdAt: card.createdAt } });
    },

    async setSpeciesPublic(openid, event) {
      if (!exactEvent(event, ['relationshipId', 'speciesCardId', 'shared']) || !hexId(event.relationshipId) || !hexId(event.speciesCardId) || typeof event.shared !== 'boolean') deny('invalid_request');
      return repo.runTransaction(async tx => {
        const friendship = await tx.get(COLLECTIONS.friendships, event.relationshipId);
        const recipient = requireActive(friendship, openid);
        const card = await tx.get(COLLECTIONS.cards, event.speciesCardId);
        if (!card || card.owner !== openid) deny('forbidden');
        if (event.shared && !await sourceStillVerified(tx, event.speciesCardId)) deny('not_verified');
        const shareId = keys.share(openid, recipient, event.speciesCardId);
        const current = await tx.get(COLLECTIONS.shares, shareId);
        const updatedAt = now();
        await tx.put(COLLECTIONS.shares, shareId, {
          ...(current || {}), owner: openid, recipient, relationshipId: event.relationshipId,
          relationshipGeneration: friendship.generation,
          speciesCardId: event.speciesCardId, species: publicSpecies(card.species),
          likedByRecipient: current?.relationshipGeneration === friendship.generation && current.likedByRecipient === true,
          status: event.shared ? 'active' : 'revoked', updatedAt,
          createdAt: current?.relationshipGeneration === friendship.generation ? current.createdAt : updatedAt,
        });
        return ready(event.shared ? 'species_shared' : 'share_revoked', { shareId, shared: event.shared });
      });
    },

    async listSentShares(openid,event){
      if(!exactEvent(event,['cursor']))deny('invalid_request');
      const page=await repo.page(COLLECTIONS.shares,{owner:openid},pageAfter(openid,event.cursor),20);
      const shares=[];for(const row of page.rows){const slot=await repo.get(COLLECTIONS.copySlots,keys.copySlot(row.recipient,row._id)),copy=slot?.state==='approved'?await repo.get(COLLECTIONS.copies,slot.requestId):null;shares.push({shareId:row._id,relationshipId:row.relationshipId,species:publicSpecies(row.species),shared:row.status==='active',liked:row.likedByRecipient===true,sharedAt:row.createdAt,giftedCopyId:copy&&copy.sourceOwner===openid&&copy.status!=='removed'?copy._id:''})}
      return ready('ok',{shares,nextCursor:page.hasMore?pageCursor(openid,page.lastId):''});
    },

    async revokeSpeciesShare(openid, event) {
      if (!exactEvent(event, ['shareId']) || !hexId(event.shareId)) deny('invalid_request');
      return repo.runTransaction(async tx => {
        const share = await tx.get(COLLECTIONS.shares, event.shareId);
        if (!share || share.owner !== openid) deny('forbidden');
        await tx.put(COLLECTIONS.shares, event.shareId, { ...share, status: 'revoked', updatedAt: now() });
        return ready('share_revoked', { shareId: event.shareId, shared: false });
      });
    },

    async listSharedSpecies(openid, event) {
      if (!exactEvent(event, [])) deny('invalid_request');
      const shares = await repo.query(COLLECTIONS.shares, { recipient: openid, status: 'active' }, 100);
      const species = [];
      for (const share of shares) {
        const relationship = await repo.get(COLLECTIONS.friendships, share.relationshipId);
        if (relationship?.status === 'active' && relationship.members?.includes(openid) && share.relationshipGeneration === relationship.generation && await sourceStillVerified(repo, share.speciesCardId)) {
          species.push({ shareId: share._id, relationshipId: share.relationshipId, species: publicSpecies(share.species), sharedAt: share.createdAt, liked:share.likedByRecipient===true });
        }
      }
      return ready('ok', { species });
    },

    async setLike(openid,event){
      if(!exactEvent(event,['shareId','liked'])||!hexId(event.shareId)||typeof event.liked!=='boolean')deny('invalid_request');
      return repo.runTransaction(async tx=>{
        const share=await tx.get(COLLECTIONS.shares,event.shareId);
        if(!share||share.recipient!==openid)deny('forbidden');
        if(share.status!=='active')deny('share_inactive');
        const friendship=await tx.get(COLLECTIONS.friendships,share.relationshipId);requireActive(friendship,openid);
        if(share.relationshipGeneration!==friendship.generation)deny('share_inactive');
        if(!await sourceStillVerified(tx,share.speciesCardId))deny('not_verified');
        await tx.put(COLLECTIONS.shares,event.shareId,{...share,likedByRecipient:event.liked,likeUpdatedAt:now()});
        return ready('like_updated',{shareId:event.shareId,liked:event.liked});
      });
    },

    async cancelCopyRequest(openid,event){
      if(!exactEvent(event,['copyRequestId'])||!hexId(event.copyRequestId))deny('invalid_request');
      return repo.runTransaction(async tx=>{
        const request=await tx.get(COLLECTIONS.copyRequests,event.copyRequestId);
        if(!request||request.requester!==openid)deny('forbidden');
        if(request.state==='cancelled')return ready('copy_cancelled',{copyRequestId:event.copyRequestId,state:'cancelled'});
        if(request.state!=='pending')deny('replay_conflict');
        await tx.put(COLLECTIONS.copyRequests,event.copyRequestId,{...request,state:'cancelled',decidedAt:now()});
        const slotId=keys.copySlot(openid,request.shareId),slot=await tx.get(COLLECTIONS.copySlots,slotId);
        if(slot?.requestId===event.copyRequestId)await tx.put(COLLECTIONS.copySlots,slotId,{...slot,state:'cancelled',updatedAt:now()});
        return ready('copy_cancelled',{copyRequestId:event.copyRequestId,state:'cancelled'});
      });
    },

    async listMyCopyRequests(openid,event){
      if(!exactEvent(event,[]))deny('invalid_request');
      const rows=await repo.query(COLLECTIONS.copyRequests,{requester:openid},100);
      return ready('ok',{requests:rows.map(row=>({copyRequestId:row._id,shareId:row.shareId,species:publicSpecies(row.species),state:row.state==='pending'&&row.expiresAt<=now()?'expired':row.state,expiresAt:row.expiresAt}))});
    },

    async requestCopy(openid, event) {
      if (!exactEvent(event, ['shareId', 'idempotencyKey']) || !hexId(event.shareId) || !idempotencyKey(event.idempotencyKey)) deny('invalid_request');
      const requestId = keys.copyRequest(openid, event.shareId, event.idempotencyKey);
      const slotId = keys.copySlot(openid, event.shareId);
      return repo.runTransaction(async tx => {
        const share = await tx.get(COLLECTIONS.shares, event.shareId);
        if (!share || share.recipient !== openid) deny('forbidden');
        if (share.status !== 'active') deny('share_inactive');
        if (!await sourceStillVerified(tx, share.speciesCardId)) deny('not_verified');
        const friendship = await tx.get(COLLECTIONS.friendships, share.relationshipId);
        requireActive(friendship, openid);
        if (share.relationshipGeneration !== friendship.generation) deny('share_inactive');
        const existing = await tx.get(COLLECTIONS.copyRequests, requestId);
        if (existing) {
          if (existing.relationshipGeneration !== friendship.generation) deny('idempotency_reused');
          return ready('copy_requested', { copyRequestId: requestId, state: existing.state, expiresAt: existing.expiresAt });
        }
        const slot = await tx.get(COLLECTIONS.copySlots, slotId);
        if (slot?.state === 'approved') deny('already_copied');
        if (slot?.state === 'pending') {
          const pending = await tx.get(COLLECTIONS.copyRequests, slot.requestId);
          if (pending && pending.expiresAt > now() && pending.relationshipGeneration === friendship.generation) deny('request_pending');
        }
        const createdAt = now(), expiresAt = createdAt + COPY_TTL;
        await tx.put(COLLECTIONS.copyRequests, requestId, {
          owner: share.owner, requester: openid, shareId: event.shareId, relationshipId: share.relationshipId,
          relationshipGeneration: friendship.generation,
          species: publicSpecies(share.species), state: 'pending', requestKeyHash: sha256(event.idempotencyKey), createdAt, expiresAt,
        });
        await tx.put(COLLECTIONS.copySlots, slotId, { requester: openid, shareId: event.shareId, requestId, state: 'pending', updatedAt: createdAt });
        return ready('copy_requested', { copyRequestId: requestId, state: 'pending', expiresAt });
      });
    },

    async listCopyRequests(openid, event) {
      if (!exactEvent(event, [])) deny('invalid_request');
      const rows = await repo.query(COLLECTIONS.copyRequests, { owner: openid, state: 'pending' }, 100);
      const requests = [];
      for (const request of rows) {
        if (request.expiresAt <= now()) continue;
        const share = await repo.get(COLLECTIONS.shares, request.shareId);
        const friendship = await repo.get(COLLECTIONS.friendships, request.relationshipId);
        if (share?.status === 'active' && share.owner === openid && friendship?.status === 'active' && friendship.members?.includes(openid) && share.relationshipGeneration === friendship.generation && request.relationshipGeneration === friendship.generation && await sourceStillVerified(repo, share.speciesCardId)) {
          requests.push({
            copyRequestId: request._id,
            relationshipId: request.relationshipId,
            species: publicSpecies(request.species),
            requestedAt: request.createdAt,
            expiresAt: request.expiresAt,
          });
        }
      }
      return ready('ok', { requests });
    },

    async listMemorialCopies(openid, event) {
      if (!exactEvent(event, [])) deny('invalid_request');
      const copies = await repo.query(COLLECTIONS.copies, { recipient: openid }, 100);
      return ready('ok', { copies: copies.filter(copy=>copy.status!=='removed').map(publicCopy) });
    },

    async deleteGiftedCopy(openid,event){return removeCopy(openid,event,false)},
    async revokeGiftedCopy(openid,event){return removeCopy(openid,event,true)},

    async approveCopy(openid, event) { return decideCopy(openid, event, 'approved'); },
    async rejectCopy(openid, event) { return decideCopy(openid, event, 'rejected'); },

    async revokeFriend(openid, event) { return changeFriendship(openid, event, 'revoke'); },
    async blockFriend(openid, event) { return changeFriendship(openid, event, 'block'); },
    async unblockFriend(openid, event) { return changeFriendship(openid, event, 'unblock'); },
  };

  async function removeCopy(openid,event,bySource){
    if(!exactEvent(event,['copyId'])||!hexId(event.copyId))deny('invalid_request');
    return repo.runTransaction(async tx=>{const copy=await tx.get(COLLECTIONS.copies,event.copyId);if(!copy||(bySource?copy.sourceOwner:copy.recipient)!==openid)deny('forbidden');if(copy.status!=='removed')await tx.put(COLLECTIONS.copies,event.copyId,{recipient:copy.recipient,sourceOwner:copy.sourceOwner,status:'removed',removedAt:now(),removedBy:bySource?'source':'recipient',cardType:'gifted_collection',kind:'memorial_copy',isObservation:false,countsAsDiscovery:false,countsForAchievements:false});return ready('copy_removed',{copyId:event.copyId,state:'removed'})});
  }

  async function decideCopy(openid, event, decision) {
    if (!exactEvent(event, ['copyRequestId', 'idempotencyKey']) || !hexId(event.copyRequestId) || !idempotencyKey(event.idempotencyKey)) deny('invalid_request');
    return repo.runTransaction(async tx => {
      const request = await tx.get(COLLECTIONS.copyRequests, event.copyRequestId);
      if (!request || request.owner !== openid) deny('forbidden');
      const decisionKeyHash = sha256(event.idempotencyKey);
      if (request.state !== 'pending') {
        if (request.state === decision && request.decisionKeyHash === decisionKeyHash) {
          if (decision === 'approved') {
            const copy = await tx.get(COLLECTIONS.copies, event.copyRequestId);
            if(!copy||copy.status==='removed')return ready('copy_removed',{copyRequestId:event.copyRequestId,state:'removed'});
            return ready('copy_approved', { state: 'approved', copy: publicCopy(copy) });
          }
          return ready('copy_rejected', { state: 'rejected', copyRequestId: event.copyRequestId });
        }
        deny('replay_conflict');
      }
      if (request.expiresAt <= now()) deny('expired');
      const share = await tx.get(COLLECTIONS.shares, request.shareId);
      if (!share || share.status !== 'active' || share.owner !== openid || share.recipient !== request.requester) deny('share_inactive');
      if (!await sourceStillVerified(tx, share.speciesCardId)) deny('not_verified');
      const friendship = await tx.get(COLLECTIONS.friendships, request.relationshipId);
      requireActive(friendship, openid);
      if (share.relationshipGeneration !== friendship.generation || request.relationshipGeneration !== friendship.generation) deny('share_inactive');
      const decidedAt = now();
      await tx.put(COLLECTIONS.copyRequests, event.copyRequestId, { ...request, state: decision, decisionKeyHash, decidedAt });
      await tx.put(COLLECTIONS.copySlots, keys.copySlot(request.requester, request.shareId), { requester: request.requester, shareId: request.shareId, requestId: event.copyRequestId, state: decision, updatedAt: decidedAt });
      if (decision === 'rejected') return ready('copy_rejected', { state: 'rejected', copyRequestId: event.copyRequestId });
      const originalCard=await tx.get(COLLECTIONS.cards,share.speciesCardId);
      if(!originalCard||originalCard.owner!==openid)deny('not_verified');
      const copy = {
        recipient: request.requester, sourceOwner: openid, sourceShareId: request.shareId,
        cardType: 'gifted_collection',kind: 'memorial_copy', sourceType: 'friend_copy', isObservation: false,
        countsForAchievements: false, countsAsDiscovery: false,
        species: publicSpecies(originalCard.species), receivedAt: decidedAt,
      };
      await tx.put(COLLECTIONS.copies, event.copyRequestId, copy);
      return ready('copy_approved', { state: 'approved', copy: publicCopy({ ...copy, _id: event.copyRequestId }) });
    });
  }

  async function changeFriendship(openid, event, operation) {
    if (!exactEvent(event, ['relationshipId']) || !hexId(event.relationshipId)) deny('invalid_request');
    return repo.runTransaction(async tx => {
      const friendship = await tx.get(COLLECTIONS.friendships, event.relationshipId);
      otherMember(friendship, openid);
      const blockedBy = Array.isArray(friendship.blockedBy) ? friendship.blockedBy.slice() : [];
      if (operation === 'block' && !blockedBy.includes(openid)) blockedBy.push(openid);
      if (operation === 'unblock') {
        if (!blockedBy.includes(openid)) deny('forbidden');
        blockedBy.splice(blockedBy.indexOf(openid), 1);
      }
      const status = blockedBy.length ? 'blocked' : 'revoked';
      await tx.put(COLLECTIONS.friendships, event.relationshipId, { ...friendship, status, blockedBy, updatedAt: now(), ...(operation === 'revoke' ? { revokedBy: openid } : {}) });
      return ready(operation === 'block' ? 'friend_blocked' : operation === 'unblock' ? 'friend_unblocked' : 'friend_revoked', { relationshipId: event.relationshipId, relationshipStatus: status });
    });
  }

  return {
    async execute(openid, event = {}) {
      if (typeof openid !== 'string' || !openid) return { status: 'failed', code: 'unauthenticated' };
      try {
        if(!accountGuarded){const guarded=require('./account-gate').accountGate(repo,openid);await guarded.assertActive();return await createSocialService({repo:guarded,now,randomToken,accountGuarded:true}).execute(openid,event)}
        if (typeof event.action !== 'string' || !actions[event.action]) deny('invalid_request');
        return await actions[event.action](openid, event);
      } catch (error) {
        if (error instanceof DomainError || error.code==='account_erasing') return { status: 'failed', code: error.code };
        throw error;
      }
    },
  };
}

module.exports = { COLLECTIONS, createSocialService, keys, publicSpecies };
