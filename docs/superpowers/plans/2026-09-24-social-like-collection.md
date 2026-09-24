# Friend Like and Gifted Collection Implementation Plan

> **For agentic workers:** REQUIRED: implement task-by-task, tests first; preserve unrelated dirty work. No deployment, payment work, provider calls or new visual assets.

**Goal:** Extend the existing authenticated friend-share flow with idempotent Like/unlike, requester cancellation, owner approval/rejection, and clearly non-discovery Gifted Collection Copy.

**Architecture:** Each existing `natureSpeciesShares` document is already unique for owner/recipient/card, so store recipient like state there without a new public counter or collection. Copy decisions and cancellation write the same request/slot documents in doc-only transactions. Existing account-generation guards, friendship generation and live observation verification remain mandatory. Preserve legacy memorial-copy fields, adding `cardType: gifted_collection` and no discovery fields; no ownership transfer or private photo copying.

**Tech Stack:** Native WeChat JS/WXML, CloudBase Node service, Node test mocks.

## Task 1 — Service contract and security
- [ ] Add tests to `tests/nature-social.security.cjs`: Like replay/unlike/foreign user/revoked source; cancel replay/foreign requester/approve race; gifted-copy flags and one copy.
- [ ] Implement `setLike`, `cancelCopyRequest`, `listMyCopyRequests` in `cloudfunctions/natureSocial/core.js`; update public projections only, no private fields.
- [ ] Run `node --test tests/nature-social.security.cjs tests/nature-social-account-gate.cjs`.

## Task 2 — Actual user actions
- [ ] Extend `native/lib/account-services.js` action allowlist and `native/lib/settings-services.js` handlers; add controls in `native/pages/settings/index.wxml`.
- [ ] Reset a canceled request's local retry key so a subsequent intentional request is new. Keep pending/approved flows idempotent.
- [ ] Test client field boundaries, no entry-time network and state messages in `tests/native-service-clients.cjs`/`tests/native-services-page.cjs`.

## Task 3 — Verification and isolated commit
- [ ] Run actual-worktree `npm test`, `npm run build:weapp`, service JS syntax and official settings WXML/WXSS compilation.
- [ ] Record exact evidence and external CloudBase multi-account/transaction/ACL verification requirements. No mock result is live evidence.
- [ ] Commit only these task files/hunks; leave prior user edits intact. Historical sharing pagination/deletion and broader proactive Gift remain explicit separate scope if not implemented.
