# Owner Likes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner manually inspect friends who liked still-valid explicitly shared discoveries.

**Architecture:** Reuse per-recipient shares, owner-bound keyset cursors and doc-only final authorization transactions. Touch the observation fence to conflict with deletion; do not create notifications, feed, public popularity or new collections.

**Tech Stack:** Native WeChat templates, Node CloudBase service, node:test.

**Spec:** Approved Phase13 owner-likes request, 2026-09-24.

## Global Constraints

- No deployment, provider calls, payment changes or assets.
- Owner sharing off hides entries; liker sharing off hides identity only.
- No photos, notes, locations or OPENID in DTOs. Preserve unrelated dirty hunks.

### Task 1: Authorized projection and manual UI

**Files:** Modify `cloudfunctions/natureSocial/core.js`, `native/lib/account-services.js`, `native/lib/settings-services.js`, `native/pages/settings/index.js`, `native/pages/settings/index.wxml`; create `tests/nature-social-owner-likes.cjs`.

**Interfaces:** `listReceivedLikes({cursor})` returns `{likes:[{shareId,species,liker:{nickname,anonymous}}],nextCursor}`. Page size 10 bounds final transaction documents; replacement rather than cumulative stale UI.

- [ ] Write tests for anonymous/opt-in identity, foreign request, revocation, source deletion, bounded pagination and failure clearing. Assertion: `assert.equal((await call('owner')).likes.length,1)`.
- [ ] Run `node --test tests/nature-social-owner-likes.cjs` and observe missing-action failures.
- [ ] Implement `listReceivedLikes` using `repo.page` outside transaction, then `tx.get/put` only; write verified observation fence before emitting DTO.
- [ ] Implement `loadReceivedLikes` with cleared projection before request; clear on hide/section change and sensitive mutation.
- [ ] Run focused test, `npm test`, `npm run build:weapp`, `node --check cloudfunctions/natureSocial/core.js`, official `wcc -d -o /tmp/owner-likes-wxml.js native/pages/settings/index.wxml` and `wcsc -o /tmp/owner-likes-wxss.js native/pages/settings/index.wxss`.
- [ ] Inspect isolated index, run `git diff --cached --check`, commit only task hunks as `feat: owner-only discovery likes`.

## External Gates

CloudBase ACL/indexes, live write-conflict behavior and device rendering remain deployment acceptance checks. Manual refresh is not a push notification: already-seen screen data cannot be retroactively erased from another device.
