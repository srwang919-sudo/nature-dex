# Final Master Visual Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. These skills are unavailable in this session; the approved controller/developer workflow executes inline with independent read-only review instead.

**Goal:** Deliver the authorized final Master interface around real observations, reviewed artwork and trustworthy recovery/service states, without restoring withdrawn assets.

**Architecture:** Reuse native pages and pure presentation models. Commit consent, world/navigation, card/reveal, badges/science and service UI as separate reviewable boundaries; preserve unrelated worktree changes until each is deliberately reconciled. Model functions operate only on realCards and verified server fields, never seed content.

**Tech Stack:** Native WeChat WXML/WXSS/JavaScript, existing CloudBase clients, node:test, official wcc/wcsc.

**Spec:** `/Users/w/.codex/attachments/48fac4da-f54e-4218-b0ba-fb53cdf34a8f/已粘贴的文本.txt` (Final, supersedes earlier brief); product register in `PRODUCT.md`; local domain audit `docs/plans/2026-09-23-final-v1-audit.md`.

## Global Constraints

- Five labels: 探索｜图鉴｜发现｜旅程｜我的; central 发现 opens the real camera once.
- Paper `#F5F2E9`, ink `#243028`, plant green `#49634E`, gold `#C99B48`; system UI font, italic serif Latin names.
- Panels 12–16 px, buttons 10–12 px, artwork cards 6–10 px, restrained shadows; artwork is more prominent than UI.
- No fake locations, weather, species art, count, discovery number, member state, feed or direct messages. No withdrawn image/font assets.
- Official artwork reuse is the default; custom art remains honestly unavailable until its separate safe path exists. Original photo is private card back.
- Prices are ¥19.9/month, ¥198/year and 24 physical cards ¥59.9; price display is not a payment/fulfilment success state.
- Default-denied independent recovery consent; no list_owned/card_resource calls until granted. No deployment, preview, provider generation, credential access or external configuration changes.

---

### Task 1: Close cloud-read consent before UI migration

**Files:** `native/lib/recovery-consent.js`, `native/lib/card-recovery.js`, `app.js`, `native/pages/settings/index.js/index.wxml`, `native/pages/library/index.js/index.wxml`, `cloudfunctions/createArtCard/recovery-consent.js/owned-cards.js/index.js`, `cloudfunctions/initCollections/index.js`, `cloudfunctions/managePrivacy/core.js`; tests `native-recovery-consent.cjs`, `cloud-recovery-consent.cjs`, `cloud-owned-cards.cjs`.

**Interfaces:** `allowed(wx): boolean`; `setRecoveryConsent(wx, accepted): Promise<boolean>`; server `set_sync_consent {version:1,accepted:boolean}`. Revocation immediately denies local reads; pending server revocation is retried without fetching cards.

- [ ] Write denied/revoke tests: `assert.equal((await recoverCards({}, api)).status, 'disabled'); assert.equal(calls.length, 0)`.
- [ ] Run `node --test tests/native-recovery-consent.cjs tests/cloud-recovery-consent.cjs`; confirm failure before modules exist.
- [ ] Gate every recovery stage with `epoch === app.getDataEpoch() && allowed(wx)`; gate server resource return with a consent-document write transaction. Add explicit privacy switch and retained-data explanation.
- [ ] Run `node --test tests/*consent.cjs tests/cloud-owned-cards.cjs tests/native-card-recovery.cjs tests/cloud-card-recovery-integration.cjs`.
- [ ] Isolate and commit only consent hunks with `git diff --cached --check`; record clean full-suite evidence.

### Task 2: Five-entry shell and real natural-world canvas

**Files:** `app.json`, `app.wxss`, `native/styles/museum.wxss`, `native/lib/tab-model.js`, `native/components/navigation/index.js/index.wxml/index.wxss`, `native/lib/museum-timeline.js`, `native/pages/home/index.js/index.wxml/index.wxss`, `native/pages/journey/index.js/index.json/index.wxml/index.wxss`; tests `native-museum-navigation.cjs`, `native-museum-timeline.cjs`, `native-final-world.cjs`.

**Interfaces:** `buildMuseumTimeline(cards, now)` produces `dateLabel,today,recent,memory,groups` from true observation dates; recovered unknown capture dates do not become made-up memories. Home adds a date/season world canvas taking 45–55% of the first viewport, with real artwork when available and an explicitly empty natural world otherwise.

- [ ] Write `assert.deepEqual(tabs.map(x=>x.label), ['探索','图鉴','发现','旅程','我的'])`; assert empty input yields empty today/recent/memory.
- [ ] Run `node --test tests/native-museum-navigation.cjs tests/native-museum-timeline.cjs tests/native-final-world.cjs`; inspect failures against old three-tab expectations.
- [ ] Reconcile the existing uncommitted five-tab foundation. Use `min-height:48vh` for the hero canvas, actual authorized card art only, subtle project-authored topographic geometry explicitly as UI decoration, no leaf pretending to be a species. Remove dashboard/chapter scores from exploration. Place 今天→最近→过去 below the world canvas.
- [ ] Make journey use only real observation dates and voluntary coarse places; an empty journey invites the first observation. Show no distance or automatic location.
- [ ] Run the three tests, `npm run build:weapp`, and official compile on navigation/home/journey; commit this boundary only.

### Task 3: Museum cards and one-tap discovery

**Files:** `native/lib/card-presentation.js`, `native/lib/card-export.js`, `native/components/collectible/index.wxml/index.wxss`, `native/pages/library/index.wxss`, `native/pages/reveal/index.js/index.wxml/index.wxss`, `native/pages/card/index.js/index.wxml/index.wxss`; tests `native-final-card.cjs`, `native-final-reveal.cjs`, existing card/export/interaction tests.

**Interfaces:** `presentCard(card).front.no` uses a verified positive integer discovery number only: `card.discovery?.status === 'verified' ? 'Discovery No. ' + card.discovery.number : ''`. Gift and unverified records never gain a number. The same presentation feeds export.

- [ ] Write tests for verified/unverified/gift numbering and one explicit reveal action; no second 700 ms hold is required.
- [ ] Run `node --test tests/native-final-card.cjs tests/native-final-reveal.cjs` and observe old behavior failing.
- [ ] Keep two-column grid and horizontal shelf. Apply modest card corners, readable bounded name/Latin typography, no fabricated edition number. Discovery presents actual art with a short reveal or static reduced-motion result, then immediately exposes flip/view/collect; remove the second sealed-pack gate.
- [ ] Detail order: artwork and verified discovery, original back, available sourced science, known capture time/private location, own observation history, explicitly available friend controls. No absent-data rows pretending to be facts.
- [ ] Run existing `tests/native-card-interaction.cjs`, `tests/native-export.cjs` plus the new tests; build/compile and commit separately.

### Task 4: Distinct geometric honours and compact science

**Files:** create `native/components/nature-badge/index.js/index.json/index.wxml/index.wxss`; modify `native/lib/badge-model.js`, `native/pages/profile/index.json/index.wxml/index.wxss`, `native/pages/reveal/index.json/index.wxml`, `native/pages/card/index.wxml`; tests `native-final-badges.cjs`, `native-achievements.cjs`, `native-badge-preview.cjs`, `native-final-science.cjs`.

**Interfaces:** badges keep their existing immutable condition IDs/rules/progress; `motif` is a project-authored abstract geometry ID, not a species illustration or external image. The component supports `earned` and `large` without writing progress.

- [ ] Assert 12 unique motifs: `assert.equal(new Set(definitions.map(x=>x.motif)).size, 12)`; assert preview does not call storage setters.
- [ ] Run `node --test tests/native-final-badges.cjs tests/native-final-science.cjs` before changing renderers.
- [ ] Build 12 original enamel-like geometric faces using CSS lines/rings/segments and palette tones. Locked state is grayscale; full-screen preview preserves name/rule/progress and close/backdrop access.
- [ ] Render only available science fields and one compact “资料暂缺” state with source when present; do not repeat missing-field placeholders.
- [ ] Run badge/achievement/science regression tests, build and compile component/profile/reveal/card; commit without sample assets.

### Task 5: Honest service-connected personal area

**Files:** create `native/lib/personal-services.js`; modify `native/pages/settings/index.js/index.wxml/index.wxss`, `native/pages/profile/index.js/index.wxml`; tests `native-personal-services.cjs` and existing membership/social boundary tests.

**Interfaces:** `loadMembership(api)` calls `natureMembership/getMembership`; `loadFriends(api)` calls `natureSocial/listFriends`. Calls run only after explicit service entry. `createPayment`/`queryOrder` use existing backend contracts; client payment success never grants membership. Invitation/accept/share/copy approval use the existing owner-derived social API, no fixtures or new backend mutations during development.

- [ ] Test `service_unavailable`, not-configured, empty, loading and ready separately; assert a failed call never creates membership/friends locally.
- [ ] Run `node --test tests/native-personal-services.cjs` before implementing adapters.
- [ ] Add actual state query/retry buttons and existing authorised backend actions. Show the exact not-configured reason rather than fake open UI; show configured active states only from service results. Payment cancellation preserves order identity for safe query; no entitlement on `requestPayment.success`.
- [ ] Keep privacy/help/about, default-hidden locations, local avatar and no automatic feedback upload. Print price may be shown with explicit service availability, never a fake submitted order.
- [ ] Run personal-services plus existing membership/social tests and build; commit separately.

### Task 6: Final local verification and visual evidence

**Files:** new `docs/plans/2026-09-23-final-master-visual-verification.md`; independent append to `docs/RELEASE_ACCEPTANCE.md` only after checking prior content.

- [ ] Run clean isolated `npm test`, `npm run build:weapp`, `node --check` on native/cloud files and JSON parse.
- [ ] Compile each WXML/WXSS with installed official wcc/wcsc. Verify released package excludes archives and remains under the 2 MiB main-package limit.
- [ ] If non-deploying DevTools is usable, inspect 375/390/430 widths, large text, empty/loading/error/permission states and reduce motion; otherwise explicitly record unverified screenshots/true-device feel rather than invent evidence.
- [ ] Confirm no withdrawn image/font assets reappear; preserve unrelated user edits. Commit evidence only after checking actual counts/output.

## External gates outside these local tasks

Cloud deployment and real transactions/ACL/URL renewal, reviewer and scheduler setup, Discovery baseline migration, merchant binding/payment/refund notifications, friends on multiple real identities, print fulfilment, privacy declaration/chooseLocation review and real-device camera/export/storage remain externally verified release gates. They cannot be made “passed” by local interface polish or mocks.

## Plan self-review

The immediate consent gate, all five final navigation labels, natural-world exploration, museum grid/shelf, actual discovery numbering, one-step reveal, unique honours, sourced science, service states, low motion and verification each have a task. Interfaces preserve existing native modules; no external image/credential/deployment task is hidden in UI work. Final V1 backend gaps are tracked by the domain plans rather than claimed solved here.
