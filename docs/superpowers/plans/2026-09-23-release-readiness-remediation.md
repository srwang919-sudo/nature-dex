# Release Readiness Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove local release blockers without deploying or changing external resources.

**Architecture:** Keep the native root canonical. Deletion uses an owner-derived durable observation tombstone and server-only asset enumeration; generation checks that tombstone before claiming and publishing work. Consent is recorded per operation, and UI, documentation and dependency inventory describe the actual provider.

**Tech Stack:** Native WeChat JavaScript/WXML/WXSS, Node test runner, wx-server-sdk.

**Spec:** Controller-approved release-readiness remediation, 2026-09-23; existing CardV2 and privacy constraints in `docs/plans/2026-09-21-collection-social-membership-design.md`.

## Global Constraints

- Preserve all pre-existing dirty/untracked work, seven examples and assets.
- No deployment, preview, provider invocation, credentials or external configuration changes.
- Do not delete shared species watercolors or trust client owners/file identifiers.
- Commit only newly changed hunks through an isolated index.
- Provider disclosure must match inspected code: current front generation is Tencent CloudBase Hunyuan, not Alibaba Bailian. Document dormant legacy functions separately.

### Task 1: Fail-closed observation deletion

**Files:** `app.js`, `native/pages/card/index.js`, `cloudfunctions/deleteObservationAssets/index.js`, `cloudfunctions/createArtCard/index.js`, `cloudfunctions/recognizeObservation/index.js`, `cloudfunctions/initCollections/index.js`; new `tests/cloud-observation-delete.cjs` and `tests/native-card-delete.cjs`.

**Interfaces:** `deleteObservationAssets({observationId}) -> {status:'deleted'|'failed',code?}` derives OPENID, writes `observationDeletions` tombstone, cancels private art operations, verifies file deletion, then marks completion. `app.removeCard(id)` becomes asynchronous and preserves local state on remote failure.

- [ ] Add tests with `assert.equal(result.status,'failed')` for file errors, foreign owners and cancelled in-flight generation; verify retries retain tombstones.
- [ ] Run `node --test tests/cloud-observation-delete.cjs tests/native-card-delete.cjs` and inspect the expected red result.
- [ ] Implement tombstone transaction, owner-scoped enumeration, checked deletion and awaited client success; reject generation/registration on deleted observations.
- [ ] Run focused tests and `node --test tests/*.cjs`; commit only scoped hunks after isolated-index review.

### Task 2: Per-generation disclosure

**Files:** `native/pages/observe/index.js`, `native/lib/art-card.js`, `cloudfunctions/createArtCard/index.js`; new `native/lib/art-consent.js`, `cloudfunctions/createArtCard/consent.js`, `tests/art-consent.cjs`; adjust explicit generation fixture inputs.

**Interfaces:** proof `{version:1,provider:'tencent-hunyuan',acceptedAt,operationId,observationId}` binds explicit confirmation to one generation. Server validates proof identity, timestamp and provider; proof is not authentication.

- [ ] Add failing tests for absent/mismatched/stale proof and declined modal producing zero calls.
- [ ] Run `node --test tests/art-consent.cjs`.
- [ ] Show concise per-generation dialog, capture accepted proof, pass and persist it in art operation; preserve cancellation guards.
- [ ] Run `node --test tests/native-auto-card.cjs tests/native-art-card.cjs tests/art-consent.cjs`; commit isolated changes.

### Task 3: Readable card metadata and native-only dependencies

**Files:** `native/components/collectible/index.wxss`, `package.json`, `package-lock.json`; new `tests/release-readiness.cjs`.

- [ ] Assert normal metadata name at least 28rpx, secondary text 24rpx, bounded wrapping and no retired runtime scripts/dependencies.
- [ ] Run `node --test tests/release-readiness.cjs` for red result.
- [ ] Adjust metadata sizes/wrapping, remove Taro experiment/clean scripts and unused root packages; preserve historical source/output and cloud function manifests.
- [ ] Run `npm install --package-lock-only --ignore-scripts`, `npm audit`, `node --test tests/*.cjs`, `npm run build:weapp`; commit exact new hunks.

### Task 4: Honest release documentation and full local gate

**Files:** `README.md`, `docs/OWNER_SETUP_GUIDE.md`, `docs/RELEASE_CHECKLIST.md`, `CHANGELOG.md`, new `docs/plans/2026-09-23-release-readiness-verification.md`.

- [ ] Inspect active functions/env variable names without reading values; document actual functions, private collections, deletion tombstones and new deployment dependency.
- [ ] Write clean clone steps `npm ci --ignore-scripts`, `npm test`, `npm run build:weapp`; retain all external gates unchecked.
- [ ] Run all current worktree tests, native build, each official `wcc -d -o /tmp/nature-release-wxml.js` / `wcsc -o /tmp/nature-release-wxss.js` input, JSON/JS and package/hash checks.
- [ ] Record exact counts/results and unverified real devices/provider/deployment/permissions. Review isolated staged diff with `git diff --cached --check`, commit documentation only.

### Additional approved gate: Paid-work abuse

**Files:** `cloudfunctions/createArtCard/quota.js`, `cloudfunctions/speciesIllustration/quota.js`, `cloudfunctions/recognizeObservation/quota.js`, their entry points, `cloudfunctions/initCollections/index.js`, `tests/cloud-quota.cjs` and affected database fixtures.

**Interface:** `reserveQuota(tx,owner,kind,now)` atomically consumes one attempt in private `usageQuotas`; art/watercolor/recognition defaults are3/3/20 per OPENID per UTC day. Configurable integer0–100, 0 disables, no client override. Cache/status does not consume; failed provider attempts do.

- [ ] Assert fourth art attempt rejects with `daily_limit`, separate owner/date work independently, disabled limit rejects and all three packaged guard copies match.
- [ ] Reserve within existing generation-claim transaction or before any recognition provider call; unavailable quota storage fails closed.
- [ ] Run `node --test tests/cloud-quota.cjs tests/cloud-delete-generation-race.cjs tests/cloud-recognition.cjs tests/cloud-species-watercolor.cjs`; document deployment and global-budget gates separately.

## Self-review

All six requested areas map to Tasks 1–4. Runtime interfaces have named status/proof fields; no credentials are required. External provider disclosure discrepancy is reported to the controller before implementation. Execution is already approved inline; no additional product decision is inferred.
