# Cloud Card Recovery Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Neither execution skill is available here; the controller approved inline execution with independent read-only review.

**Goal:** Default-denied, revocable permission for reading finalized owner cloud cards and restoring their images locally, separate from recognition consent.

**Architecture:** A local versioned grant gates app and recovery calls; a server-owned versioned consent document gates list_owned/card_resource. Grant writes server acknowledgement before enabling local reads. Revoke immediately blocks local calls and records retry intent when the server is unreachable. Consent and resource transactions write the same consent document to fence revocation. Existing finalized cloud data remains until explicit deletion/account erasure.

**Tech Stack:** Native mini-program JavaScript, CloudBase server doc transactions, node:test.

**Spec:** Final Master Plan at `/Users/w/.codex/attachments/48fac4da-f54e-4218-b0ba-fb53cdf34a8f/已粘贴的文本.txt`; independent recovery permission required by the privacy audit.

## Global Constraints

- Recognition consent does not grant saved-card recovery permission.
- Default denied; revocation stops all future list and resource calls. Existing cloud data remains until explicit deletion/account erasure.
- Local cached art and original photos remain usable offline. No upload of pre-existing local content.
- No provider calls, deployment, preview, credential reads or restoration of withdrawn assets.

---

## Task 1: Server consent

- [ ] Add denied/revoked/foreign-caller tests to `tests/cloud-owned-cards.cjs` and dedicated `tests/cloud-recovery-consent.cjs`.
- [ ] Add `cloudfunctions/createArtCard/recovery-consent.js`, route set_sync_consent, and gate `owned-cards.js` before queries and signed resource return.
- [ ] Add consent collection to initCollections and account erasure; test collection contract.

## Task 2: Local consent and privacy UI

- [ ] Add `tests/native-recovery-consent.cjs` proving denied zero calls, robust grant/revoke and recognition independence.
- [ ] Add `native/lib/recovery-consent.js`; gate app.syncCards and card-recovery, including every awaited stage to prevent late restore after revoke.
- [ ] Add a clear default-off privacy switch and library opt-in link. Explain retrieved metadata/original/art, local storage, no upload of existing local content, and retained cloud data after revoke.

## Task 3: Validation

- [ ] Run `node --test tests/*consent.cjs tests/cloud-owned-cards.cjs tests/cloud-card-recovery-integration.cjs tests/native-card-recovery.cjs`.
- [ ] Run isolated `npm test`, `npm run build:weapp`, JS/JSON checks and official WXML/WXSS compilation. No deployment/provider/preview.
- [ ] Commit only consent-related hunks, keeping prior uncommitted UI intact. Then resume final-spec UI in a separate boundary.
