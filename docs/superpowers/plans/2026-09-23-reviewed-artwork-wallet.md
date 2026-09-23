# Reviewed Species Artwork and Creation Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse reviewed official artwork without charge, isolate creator-only candidates, and account for generation with refundable idempotent reservations.

**Architecture:** Add doc-only service primitives inside the existing createArtCard deployment; official artwork index and review state are independent of old speciesWatercolors. A separate consumer wallet reserves bonus/monthly units before a provider call and commits only a durable usable result. Wire resolver and access renewal only after these primitives pass safety tests.

**Tech Stack:** CommonJS, CloudBase document transactions, existing Hunyuan text-to-image provider, Node tests.

**Spec:** `docs/plans/2026-09-23-final-v1-audit.md`

## Global Constraints

- No deployment/provider call, client approval, automatic official promotion or withdrawn assets.
- Old speciesWatercolors.ready is never an official source.
- Official reuse costs zero; candidate generation never sends user image/coordinates/notes.
- Initial bonus 10, free monthly 5, active authoritative membership monthly 30; integer units only.
- Candidate access owner-only; review requires service-controlled reviewer grant. Failure/timeout releases reserved units; late results cannot charge a released attempt.

### Task 1: Reviewed artwork repository

**Files:** Create `cloudfunctions/createArtCard/artwork-repository.js`, `tests/cloud-artwork-review.cjs`.
**Interfaces:** `officialArtwork(tx,speciesId)`, `reviewArtwork(tx,{reviewer,artworkId,decision,now})`; review decisions approve/reject/deprecate. Collections speciesArtworks, officialSpeciesArtworks, artworkReviewers, artworkReviewEvents; no client direct reads/writes.
- [ ] Test missing/legacy cache returns null, candidate never shared, unauthorized review refuses, approval requires usable asset and provenance, replacement demotes previous official, rejection removes index, immutable audit events.
  ```js
  assert.equal(await officialArtwork(tx,'kingfisher'),null);
  await assert.rejects(reviewArtwork(tx,{reviewer:'visitor',artworkId:'a',decision:'approve'}));
  ```
- [ ] Run `node --test tests/cloud-artwork-review.cjs` before implementation; expect missing module.
- [ ] Implement doc-only reads/writes and canonical species keys; never read legacy cache.
- [ ] Rerun test and commit only repository/test when independently reviewed.

### Task 2: Consumer reservation ledger

**Files:** Create `cloudfunctions/createArtCard/creation-wallet.js`, `tests/cloud-creation-wallet.cjs`.
**Interfaces:** `reserveCreation(tx,{owner,operationId,now})`, `settleCreation(tx,{owner,operationId,attempt,outcome,now})`; outcome commit/release. Monthly buckets keyed owner+UTC month, lifetime bonus keyed owner, reservation keyed owner+operation, usage event keyed reservation+attempt.
- [ ] Test 10+5 free units, 30 member monthly without new annual bonus, reservation idempotency, release/retry, expired attempt refuses late commit, UTC rollover, forged/stale attempt refusal.
  ```js
  assert.equal((await reserveCreation(tx,args)).attempt,1);
  await settleCreation(tx,{...args,attempt:1,outcome:'release'});
  ```
- [ ] Run `node --test tests/cloud-creation-wallet.cjs` before implementation.
- [ ] Implement integer reservation counters, exact owner checks, authoritative entitlement lookup, per-attempt event state; no provider data or raw photo retained in ledger.
- [ ] Run both focused suites and native build; keep daily abuse limits independent.

### Task 3: Resolver and authorized resource flow

**Files:** Modify `cloudfunctions/createArtCard/index.js`, `cloudfunctions/createArtCard/discovery.js`, `cloudfunctions/speciesIllustration/index.js`, `cloudfunctions/initCollections/index.js`, `cloudfunctions/managePrivacy/core.js`, `native/lib/art-card.js`, `native/lib/card-image.js`, `native/pages/observe/index.js`; create `cloudfunctions/createArtCard/species-flow.js`, `tests/cloud-species-resolver.cjs`.
**Interface:** submit resolves approved official first, otherwise reserves and generates a species-only candidate; status expires abandoned reservations; finalize requires valid official/owned candidate. Resource renewal validates saved owner card/approved public artwork server-side before issuing a short-lived URL. Legacy ensure may not publish unchecked shared art.
- [ ] Write resolver tests with provider spy zero calls/zero reservation for approved official; private candidate success, failed provider released, stale/deleted owner never publishes; legacy cache ignored.
- [ ] Implement lookup→reserve→provider outside transaction→candidate+commit within fenced transaction; consume safe server canonical name only. Review API checks staff grant, never client boolean. Reject missing historical baseline before paid provider work.
- [ ] Wire native confirmation and distinguish quota/artwork/baseline errors; keep original photo back/private and failure-not-saved.
- [ ] Run `npm test`, `npm run build:weapp`, official wcc/wcsc for observe. Perform isolated checkout and commit only scoped changes.

## Deployment gates

Before enabling: private collection/storage rules, operator reviewer grants, historical counter migration, scheduled stale-reservation reconciliation, real provider and signed membership entitlement checks, shared-file URL authorization and cancellation race tests. No local test is represented as these external gates passing.
