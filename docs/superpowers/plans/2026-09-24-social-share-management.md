# Sent Shares and Gifted Copy Management Plan

> **For agentic workers:** implement tests first, preserve all unrelated dirty work, no deployment/payment/provider calls.

**Goal:** Manage sent shares across sessions with owner-bound pagination; delete/revoke gifted copies without restoring discoveries or exposing private source data.

**Architecture:** Add read-only sorted document-ID pagination to the social repository, outside transactions. Cursors are opaque, owner/purpose-bound and independently authorized by owner query. Recipient deletion and source-owner withdrawal replace the uniquely keyed copy with a minimal tombstone in a doc-only transaction; approval replay must not resurrect it. Attribution is an anonymous server-verified species projection, never nickname/OPENID/photo/location/note.

**Tech Stack:** CloudBase Node repository and account fences; native settings service/UI; Node tests.

## Task 1 — Server tests and implementation
- [ ] Extend `tests/nature-social.security.cjs`: >20 sent shares, cursor owner rejection, foreign revoke, duplicate delete, replay after delete, delete/revoke concurrency and safe attribution.
- [ ] Implement `page` in `cloudbase-repository.js`/`memory-repository.js` and visibility-preserving wrapper in `account-gate.js`.
- [ ] Implement `listSentShares`, `deleteGiftedCopy`, `revokeGiftedCopy`, safe copy tombstones/provenance in `core.js`.

## Task 2 — Native management
- [ ] Extend `account-services.js`, `settings-services.js`, settings WXML with sent-share pagination/revocation, received-copy deletion and anonymous provenance.
- [ ] Test scoped action payloads and retry/stale behavior; preserve no automatic page-entry network.

## Task 3 — Verify and isolate
- [ ] `node --test tests/nature-social.security.cjs tests/nature-social-account-gate.cjs tests/native-services-page.cjs`.
- [ ] Actual worktree and isolated checkout `npm test` / `npm run build:weapp`; official settings WXML/WXSS compile and service JS syntax.
- [ ] Document live ACL/transaction/index deployment gates and remaining proactive Gift/scope limits; commit only task hunks.
