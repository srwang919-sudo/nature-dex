# Private Nature Museum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing native mini-program into a readable, private, image-led nature collection with five primary destinations and real service states.

**Architecture:** Reuse observation/art/save and collectible models; add a pure timeline projection for exploration/journey, shared WXSS tokens and a five-item navigation model. Service UI calls the existing membership/social contracts, never creates pretend success.

**Tech Stack:** Native WeChat JS/WXML/WXSS, Node tests, existing CloudBase clients; no new runtime dependency.

**Spec:** `docs/plans/2026-09-23-private-nature-museum-design.md`.

## Global Constraints

- No deployment, preview, provider invocation, external account changes or unverified image/font restoration.
- Only realCards count. No invented nearby counts, memories, weather, taxonomy or locations.
- Art front/original back, explicit recognition selection, per-generation consent, failed transaction never saves, remain intact.
- Paper #F5F2E9, ink #243028, action #49634E, reward #C99B48; system typography and Latin serif italic.
- Low motion, 88rpx hit targets and safe areas apply to all tasks.
- Preserve unrelated dirty work; use an isolated index and clean checkout for each commit.

### Task 1: Timeline projection, five destinations and first exploration page

**Files:** Create `native/lib/museum-timeline.js`, `native/styles/museum.wxss`, `native/pages/journey/index.js`, `index.json`, `index.wxml`, `index.wxss`; modify `app.json`, `app.wxss`, `native/lib/tab-model.js`, `native/components/navigation/index.js`, `index.wxml`, `index.wxss`, `native/pages/home/index.js`, `index.wxml`, `index.wxss`; test `tests/native-museum-timeline.cjs`, `tests/native-museum-navigation.cjs` and update superseded three-tab expectations.

**Interfaces:** `buildMuseumTimeline(cards, now)` returns `{today,recent,memory,groups,dateLabel}` with cards intact but no added location; routes use discover/collection/capture/journey/me keys. Discovery navigates `observe/index?source=camera` exactly once.

- [ ] Write failing tests:
```js
assert.deepEqual(buildMuseumTimeline([],now).today,[]);
assert.equal(buildMuseumTimeline([example,failed,real],now).recent.length,1);
assert.deepEqual(navigationItems.map(x=>x.label),['探索','图鉴','发现','旅程','我的']);
```
- [ ] Run `node --test tests/native-museum-timeline.cjs tests/native-museum-navigation.cjs`; expect missing module/new-route assertion failures.
- [ ] Implement local-date grouping, reject invalid/future timestamps, cap first-screen cards, use first real past anniversary only. Build date/hero/今日/最近/过去 sections with honest empty media and journey chronological groups. Add token import and small-corner navigation.
```js
const records=realCards(cards).filter(c=>Number.isFinite(c.createdAt)&&c.createdAt<=now).sort((a,b)=>b.createdAt-a.createdAt);
```
- [ ] Run new tests plus `node --test tests/native-direct-camera.cjs tests/native-collection-layout.cjs`, `npm test`, `npm run build:weapp`; compile changed templates with official wcc/wcsc. Record viewport evidence or explicit not-run state.
- [ ] Commit only timeline/navigation/home/journey/tokens and affected expectations via isolated index.

### Task 2: Collection, card readability and science empty state

**Files:** `native/pages/library/index.wxml`, `index.wxss`; `native/components/collectible/index.js`, `index.wxml`, `index.wxss`; `native/pages/card/index.wxml`, `index.wxss`; `native/lib/card-presentation.js`; tests `tests/native-museum-card.cjs` and existing card/export/gesture tests.

**Interfaces:** Extend existing presentation output only with `hasScience` and `scienceUnavailableText`; maintain legacy fields and CardV2 original-back contract.

- [ ] Test sourceScience absent + all local facts absent produces one unavailable state; known facts retain sources; long name and Latin remain bounded.
```js
assert.equal(presentation.scienceUnavailableText,'资料暂缺');
assert.equal(v2.backPhotoPath,originalPhotoPath);
```
- [ ] Run `node --test tests/native-museum-card.cjs`; capture failing assertions.
- [ ] Keep two-column and nonautoplay shelf structure; remove duplicate card caption, use token typography/radius; gate empty science rows behind data and one fallback message. No changes to storage/card fields or export source selection.
- [ ] Run `npm test`, `npm run build:weapp`, official compiler for collectible/library/card, inspect long-content and missing-image states.
- [ ] Isolated commit only this task's hunks.

### Task 3: Discovery camera and quiet reveal

**Files:** `native/pages/observe/index.wxml`, `index.wxss`; `native/pages/reveal/index.wxml`, `index.wxss`; `native/lib/reveal-machine.js` only if timing needs shared token; test `tests/native-museum-discovery.cjs` plus existing auto-card/reveal/consent tests.

**Interfaces:** Existing capture/identify/manualconfirm handlers and reveal intro/continue/open/collect states stay unchanged.

- [ ] Assert all existing event bindings remain, reduced motion bypasses grayscale/fade, failure never enables reveal.
```js
assert.match(observeTemplate,/bindtap="identify"/);
assert.match(revealTemplate,/continueDiscovery/);
```
- [ ] Run `node --test tests/native-museum-discovery.cjs` before styling.
- [ ] Use full-height capture stage, slim controls, visible state/errors; reveal final-image grayscale to color once with opacity/transform only. Retain explicit continue and collection action, no looping sparkles or invented contour data.
- [ ] Run full suite/build and official templates; inspect empty/candidate/error/reduce-motion pages.
- [ ] Isolated commit; no cloud code changes.

### Task 4: Authored achievement visual system and profile

**Files:** `native/lib/badge-model.js`, `native/pages/profile/index.js`, `index.wxml`, `index.wxss`; new reusable `native/components/achievement-mark/index.js`, `index.json`, `index.wxml`, `index.wxss`; register in profile/reveal JSON; tests `tests/native-museum-achievements.cjs`.

**Interfaces:** Preserve all 12 achievement IDs/rules/progress. Add deterministic `symbol`/`tone` presentation; no new points/check-in incentive. Component takes badge and earned, renders authored geometry + clear short label.

- [ ] Assert 12 distinct labels, locked/earned state, unchanged progress from existing fixtures and no withdrawn asset URL.
```js
assert.equal(new Set(badges.map(x=>x.id)).size,12);
assert.equal(realProgress,previousProgress);
```
- [ ] Run new failing test; replace repeated leaf media with CSS emblem component. Keep large preview readable, explicit earned rule/progress, no animation on reduce.
- [ ] Run all achievement/profile/asset tests and full build/compiler, compare empty and established profile.
- [ ] Commit scoped profile/component/badge presentation changes, preserving historical unrelated hunks.

### Task 5: Real membership and friendship UI

**Files:** Create `native/lib/member-service.js`, `native/lib/friend-service.js`; modify `native/pages/settings/index.js`, `index.wxml`, `index.wxss`, `native/lib/availability-model.js`; tests `tests/native-member-service.cjs`, `tests/native-friend-service.cjs`.

**Interfaces:** Member calls getMembership/createPayment/queryOrder; client payment callback triggers query, never grants. Friend calls createInvite/acceptInvite/listFriends/registerVerifiedSpecies/setSpeciesPublic/listSharedSpecies/requestCopy/listCopyRequests/approveCopy/rejectCopy/listMemorialCopies. No automatic photo sharing; copies remain nonobservations.

- [ ] Test missing cloud/merchant fails closed, cancellation preserves state, forged client payment success grants nothing, sharing requires explicit selected friend+card, approval required for copy.
```js
assert.equal(afterClientSuccess.memberActive,false);
assert.equal(copy.countsForAchievements,false);
```
- [ ] Run new tests before implementation. Implement compact inline status/list/actions, manual invite-code input/copy, deliberate share toggles; available state is returned by service only.
- [ ] Run backend social/member security suites, all client tests, build/compiler. Mark true two-user/payment callback test external, not passed.
- [ ] Commit only service UI/client boundaries.

### Task 6: Final visual, accessibility and release evidence

**Files:** New `docs/plans/2026-09-23-private-nature-museum-verification.md`; update independent section in `docs/RELEASE_ACCEPTANCE.md` only; tests `tests/native-museum-accessibility.cjs`.

- [ ] Add token/88rpx targets/low-motion/no-withdrawn-asset assertions and run them.
- [ ] Run `npm test`, `npm run build:weapp`, JS/JSON parse, official single-file wcc/wcsc across active native, package budget script used by build.
- [ ] Inspect 320/375/390/430 equivalent layout with long names and large-font state. Record screenshots only from actually rendered current code; no preview/deploy. If tools unavailable, list unverified visual/device gates.
- [ ] Verify no cloud mutation or static-asset restoration; write exact counts/package bytes and separate external cloud/payment/privacy review blockers.
- [ ] Commit evidence only after isolated clean-checkout verification. Do not claim full launch readiness from local tests.

## Self-review

All seven brief execution areas map to Tasks 1–6. No public feed/nearby numeric placeholder. References, data projection and privacy rules are explicit. Existing test filenames in Task 1 were resolved from the current repository; no new business architecture is inferred from visual styling.
