# Secure Social Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan inline and verify each security boundary before release. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CloudBase social backend where friends can see only explicitly shared, server-attested species summaries and can receive non-achievement memorial copies only after owner approval.

**Architecture:** A pure service module owns validation, authorization, deterministic identifiers, and state transitions. A thin CloudBase adapter supplies authenticated OPENID and transactions, while an in-memory adapter exercises the same contracts without credentials or network access.

**Tech Stack:** Node.js CommonJS, `node:test`, `crypto`, `wx-server-sdk@4.0.2`, CloudBase document transactions.

**Spec:** Controller task for mutual friendship, explicit species sharing, owner-approved memorial copies, revoke/block, and replay protection.

## Global Constraints

- Create new files only; do not edit native UI, `app.js`, `cloudfunctions/initCollections`, or existing documentation.
- Derive the caller exclusively from `getWXContext().OPENID`.
- Never expose or persist photos, file IDs, locations, coordinates, notes, or arbitrary client card fields in social projections.
- Never treat a local card or client-supplied species payload as a verified discovery.
- Every copy is `kind: 'memorial_copy'`, `sourceType: 'friend_copy'`, `isObservation: false`, `countsForAchievements: false`, and `countsAsDiscovery: false`.
- Approval must be atomic, idempotent for the same key, and reject a different-key replay.

---

### Task 1: Pure social state machine and tests

**Files:**
- Create: `cloudfunctions/natureSocial/core.js`
- Create: `cloudfunctions/natureSocial/memory-repository.js`
- Create: `tests/nature-social.security.cjs`

**Interfaces:**
- Consumes: a repository exposing `get`, `query`, and `runTransaction`, plus server time and secure token generators.
- Produces: `createSocialService(deps).execute(openid, event)` and deterministic document-key helpers.

- [ ] Write failing tests for forged ownership, unverified local cards, explicit per-friend sharing, private-field redaction, revoke/block behavior, expired requests, one-time approval, and approval replay conflicts.
- [ ] Run `node --test tests/nature-social.security.cjs` and confirm the missing module failure.
- [ ] Implement validation, invitation acceptance, relationship state transitions, attestation registration, explicit sharing, copy requests, and approval/rejection transactions.
- [ ] Run the isolated test file and confirm every security case passes.

### Task 2: CloudBase runtime adapter

**Files:**
- Create: `cloudfunctions/natureSocial/cloudbase-repository.js`
- Create: `cloudfunctions/natureSocial/index.js`
- Create: `cloudfunctions/natureSocial/package.json`
- Create: `cloudfunctions/natureSocial/package-lock.json`
- Create: `cloudfunctions/natureSocial/sdk.js`

**Interfaces:**
- Consumes: `wx-server-sdk@4.0.2`, CloudBase `getWXContext()`, database reads, and database transactions.
- Produces: `main(event)` responses shaped as `{status:'ready', code, ...}` or `{status:'failed', code}`.

- [ ] Add a runtime test proving client `_openid`, `owner`, and private projection fields are rejected or ignored and unauthenticated calls fail safely.
- [ ] Implement the adapter without accepting client identity fields and cap all queries at 100 documents.
- [ ] Install the exact production SDK dependency to generate the lockfile and copy the repository's audited SDK entry module.
- [ ] Run isolated security tests and the repository Cloud SDK security integration.

### Task 3: Release evidence and integration handoff

**Files:**
- Test only; no additional files.

**Interfaces:**
- Consumes: `trustedObservations/{sha256(owner+'|'+observationId)}` attestations written only after server verification.
- Produces: stable action and collection contracts for the native-client developer and deployment owner.

- [ ] Confirm memorial-copy exclusion fields match the native collection model guard.
- [ ] Run `node --test tests/nature-social.security.cjs` and module syntax checks.
- [ ] Inspect the diff and verify only new files from this task are included.
- [ ] Commit only these new files with an isolated Git index; if Git refuses because other work is present, leave the files uncommitted and report the exact state.
