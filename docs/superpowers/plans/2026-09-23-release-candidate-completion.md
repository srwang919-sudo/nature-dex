# Release Candidate Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile approved unfinished project work and resolve locally testable release defects while exposing, never fabricating, external service readiness.

**Architecture:** Keep the native root, CardV2 and existing service contracts. Reconcile existing work in isolated feature commits before hardening SDK adapters or data retention. Payment and friend service completion must use genuine identity/merchant state, never fixture success.

**Tech Stack:** Native WeChat, Node.js tests, pinned wx-server-sdk4.0.2 and CloudBase AI2.30.0.

**Spec:** User-requested complete launchable product; approved collection/art/three-tab/C-visual designs in docs/plans; controller authorization2026-09-23.

## Global Constraints

- Preserve seven case images/data and all existing user work; no blanket resets or deletion.
- No deployment, publication, preview or external provider/account changes.
- Tests and commits must be reproducible without credentials; do not represent mocks as real service validation.
- Newly found external prerequisites are sent to controller immediately.

### Task1: Reconcile pending art and diagnostics

**Files:** cloudfunctions/createArtCard and speciesIllustration index/prompt/species; native/lib/recognition-errors.js; native/pages/observe/index.js; tests/cloud-art-prompts.cjs, cloud-species-watercolor.cjs, recognition-errors.cjs.

**Interface:** canonical validated speciesId accepts dynamic species; public stylewatercolor-t2i-v2, new frontnatural-history-front-v1; diagnostic output remains allowlisted.

- [ ] Read each diff; run `node --test tests/cloud-art-prompts.cjs tests/cloud-species-watercolor.cjs tests/recognition-errors.cjs` before mutation.
- [ ] Reconcile historical prompt with current style-version selection without changing current card/data/provider.
- [ ] Commit only this subsystem through isolated index; run complete tests/build on clean checkout.

### Task2: Reconcile approved UI/accessibility

**Files:** native/pages/profile/index.wxml/index.wxss, card/index.wxml/index.wxss, settings/index.wxml; tests/native-c-accessibility.cjs and native-c-second-pass.cjs.

- [ ] Verify six stats derive from profile-model and no fake progress; test via `node --test tests/native-c-accessibility.cjs tests/native-c-second-pass.cjs tests/native-profile.cjs`.
- [ ] Retain close target88rpx and labels, actual avatar selection and motion guards; correct stale original-back wording if test exposes it.
- [ ] Compile changed WXML/WXSS, commit independently; do not alter examples.

### Task3: Preserve historical documentation and asset evidence

**Files:** existing29-change inventory docs and scripts/prepare-badge-assets.cjs; docs/ASSET_PROVENANCE.md; docs/RELEASE_ACCEPTANCE.md.

- [ ] Read all historical plan/verification additions; label superseded behavior as history, not current release claims.
- [ ] Verify asset sizes/hash against files without regenerating them; record generation-source external availability.
- [ ] Commit documentation/optional asset tool independently; no hidden dependence added to runtime.

### Task4: Cloud dependency remediation

**Files:** six active function package.json/package-lock.json; proposed deployment-local safe lodash set/unset adapter packages; tests/cloud-sdk-security.cjs.

**Interface:** replace only vulnerable utility calls with maintained lodash4.18.1 set/unset exports; axios stays same0.x line at0.33.0. No wx-server-sdk major downgrade. Requires controller architecture approval before adapter implementation.

- [ ] Write red tests for malicious __proto__/constructor/prototype paths and normal dot/bracket mutation semantics.
- [ ] Apply explicit private compatibility adapter if approved, test SDK import/query/transaction construction without network.
- [ ] Run each function npm ci/audit, complete application tests; report remaining findings rather than masking them.

### Task5: Retention/orphan cleanup and external functionality gates

**Files:** cloudfunctions/deleteObservationAssets, cleanupObservationAssets, recognizeObservation registration path, tests/cloud-observation-delete.cjs; deployment/owner docs.

- [ ] Test unregistered upload and delayed registration; original may only be deleted via server-owned identity/path evidence, never client fileId.
- [ ] Implement safe owner-derived cleanup only after official storage/fileID contract is verified; until then return asset_registry_missing, not success.
- [ ] Send controller exact owner requirements for payment, social identity/rules, retention policy, content compliance and device validation. Local adapters may fail closed pending configuration; no payment or friend success fixtures.

### Task6: Final independent evidence

- [ ] Run `npm test`, `npm run build:weapp`, per-function `npm ci --ignore-scripts`/`npm audit`, official template compile and unchanged case hashes.
- [ ] Record commit list, main package bytes and true external gates in a new verification record; no launchable claim without all production evidence.

## Self-review

The29 pending changes map to Tasks1–3; SDK risk toTask4; data/privacy and service readiness toTask5; release evidence toTask6. External account state remains a concrete completion dependency, not permission to omit requested functionality.
