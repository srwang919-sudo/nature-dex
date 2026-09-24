# Authorized Gift Printing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow explicitly print-authorized gifts in the existing 24-card quote/draft flow without opening private photos through social APIs.

**Architecture:** Approval records versioned print consent and a server-derived source card reference. Quote resolves a stable copy ID to retained owner/observation/art/photo in a doc-only fenced transaction; ordinary shares and historical non-authorized gifts remain ineligible.

**Tech Stack:** CloudBase Node services, native WeChat, node:test.

**Spec:** Approved Master §70/73 gift printing clarification, 2026-09-24.

## Global Constraints

- SKU remains 24 cards ¥59.9, 63×88mm plus 3mm bleed; no payment/address/fulfillment/deployment.
- Preserve dirty work. No client owner/file IDs, new discovery number, achievement or generic social photo access.
- Locations remain hidden: no server-side explicit print-location consent exists.

### Task 1: Approval grant and source validation

**Files:** `cloudfunctions/natureSocial/core.js`, `cloudfunctions/createArtCard/print-draft.js`, `tests/nature-social.security.cjs`, `tests/cloud-print-draft.cjs`.
**Interface:** `approveCopy` optionally accepts exactly `printConsent:'gift-print-v1'`; new UI sends this after explicit disclosure. Internal copy stores sourceCardId and printAuthorization; public DTO only exposes eligibility. `print_quote/cardIds` accepts stable own-card or authorized gift-copy IDs; returned items include anonymous/consented source attribution, never files.

- [ ] Add failing tests: authorized gift selected; old gift/share rejected; deleted/revoked/foreign/erasing rejected; source-fence conflict; grant replay unchanged.
- [ ] Run `node --test tests/cloud-print-draft.cjs tests/nature-social.security.cjs`.
- [ ] Implement grant only from server source and consent; final quote writes source, gift and both account fences. Snapshot `originalDiscoverer`, `giftedFrom`, original date/number and private photo reference; source profile disabled means anonymous labels.
- [ ] Re-run focused tests.

### Task 2: Existing local print UI and verification

**Files:** `native/lib/account-services.js`, `native/lib/settings-services.js`, `native/lib/print-order.js`, `native/pages/print/index.js`, `native/pages/print/index.wxml`, `tests/native-print-flow.cjs`.
**Interface:** copied DTO eligibility uses `printAuthorized===true`, stable copy ID mapped to selection ID; service quote remains authority. Gift PNG is not fabricated from a missing local photo; this draft-stage UI shows server snapshot and clearly labels production preview unavailable.

- [ ] Add tests asserting approval disclosure includes physical print/original back/source signature and gifts remain non-discovery.
- [ ] Implement selected gift merge and server snapshot attribution display; never persist private gift photos or manufacture a PNG.
- [ ] Run `npm test`, `npm run build:weapp`, `node --check cloudfunctions/createArtCard/print-draft.js`; official wcc/wcsc for settings and print pages.
- [ ] Review isolated index; `git diff --cached --check`; commit only this task's files and preserve unrelated dirty hunks.

## External Gates

Actual cloud deployment, ACL/concurrency and source retention, print renderer against immutable production snapshot, merchant/payment and fulfillment remain unverified. No safe approved-location server grant exists, so even gifts always say 地点未公开. Previously approved gifts cannot acquire photo rights by replay.
