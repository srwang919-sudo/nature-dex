# Account Erasure and Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver retryable, owner-derived cloud erasure and enforce expired-unfinished-observation cleanup without deleting public watercolor or financial audit records.

**Architecture:** Persist an accountPrivacy tombstone before erasure and check it in write transactions. A bounded privacy job repeatedly deletes registered private observations and nonfinancial owner-derived social data. An authenticated operator retention job uses the same deletion boundary for expired unfinished observations; failures remain visible, never reported as erased.

**Tech Stack:** Native WeChat; wx-server-sdk 4.0.2 with the tested local SDK compatibility boundary; Node tests; CloudBase transactional database.

**Spec:** Controller-approved privacy scope dated 2026-09-23 and docs/plans/2026-09-23-observation-privacy-verification.md.

## Global Constraints

- No deployment, upload, preview, provider invocation or credential inspection.
- Identity derives from OPENID; never accept client owner IDs or storage file IDs.
- Block new writes before deleting; recheck inside transactions to prevent late publication.
- Public speciesWatercolors is excluded. Existing payment orders/callback audit data cannot be blindly deleted; retention basis needs owner/legal review.
- Preserve existing dirty work and the latest withdrawal of unverified assets. Account erasure is separate from local clear.

### Task 1: Transactional account gate

**Files:** New deployment-local account-gate.js in recognizeObservation/createArtCard/speciesIllustration; integrate those index.js entrypoints. Tests: tests/cloud-account-gate.cjs.

**Interface:** `guardDatabase(db, owner)` returns `assertActive()`, collection access and `runTransaction(work)`; every mutation rechecks accountPrivacy/{sha256(owner)}. Throws `account_erasing` for any tombstone.

- [ ] Write test: start work, set tombstone, then attempt `doc.set`; assert zero writes and account_erasing.
- [ ] Run `node --test tests/cloud-account-gate.cjs` and inspect the expected missing-module failure.
- [ ] Implement atomic guard and wire provider publication paths; late output is deleted rather than published.
- [ ] Run gate, observation deletion-race, art and receipt tests; commit only this boundary after clean checkout.

### Task 2: Owner erasure and retention worker

**Files:** New cloudfunctions/managePrivacy/{index.js,core.js,repository.js,package.json,package-lock.json,sdk.js,delete-observation.js}; tests/cloud-account-erasure.cjs; cloudfunctions/initCollections/index.js.

**Interface:** User actions requestErasure/status/continueErasure accept no owner. Persist `{owner,status:'erasing',phase,updatedAt}`. Continue processes at most 20 items per call and returns processing/failed/erased with safe phase code. Operator `sweepExpired` requires server-only token authentication; accepts no arbitrary collection/path.

- [ ] Test cross-owner inputs rejected, partial storage failure preserves job, duplicate request is stable, public cache untouched and finance excluded.
- [ ] Run `node --test tests/cloud-account-erasure.cjs` before implementation.
- [ ] Enumerate owned assets, cancel and delete each through the fail-closed deletion boundary; revoke/remove owner and recipient social relationships/shares/copy tasks, recognition receipts and trusted observations. Keep durable tombstones after completion.
- [ ] Test expiration selection excludes successful retained artwork, include delayed callbacks and retry progress. Add only fixed required collections to setup allowlist.
- [ ] Run focused tests plus per-function clean installation/audit; commit independent of visual redesign.

### Task 3: Backend social/payment gates and client privacy controls

**Files:** natureSocial core/repository, natureMembership index/repository, native/lib/cloud-privacy.js, settings logic/template; tests/native-cloud-privacy.cjs and backend security suites.

**Interface:** Cloud privacy client exposes request/status/continue. Requires two explicit confirmations; displays pending/error until server returns erased. No client boolean grants payment membership. Financial query/refund reconciliation remains possible while new checkout is blocked.

- [ ] Write tests for request cancellation, unavailable service, partial failure and successful status refresh; assert local clear is not substituted for remote erasure.
- [ ] Block social/recognition/art writes transactionally; remove private metadata from public projections.
- [ ] Integrate minimal privacy controls without changing the newly requested visual system.
- [ ] Run `node --test tests/native-cloud-privacy.cjs tests/nature-social.security.cjs` and membership tests.

### Task 4: Release evidence and external operation

**Files:** OWNER_SETUP_GUIDE.md, RELEASE_CHECKLIST.md, new privacy verification doc.

- [ ] Run `npm test`, `npm run build:weapp`, node syntax and official WXML/WXSS compilation.
- [ ] Record the actual retention window and job authentication/deployment steps; configure nothing externally.
- [ ] Explicitly leave two-identity live deletion, scheduler installation, storage absence semantics, financial retention/legal basis and owner consent review as unverified gates.
- [ ] Commit only scoped changes via isolated index, never sweeping prior dirty UI/docs into this task.
