# Reference Mini Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This task is already assigned to the developer agent and approved for direct execution; missing workflow skills do not require repeating user approval.

**Goal:** Restore the approved reference's complete collection → capture → identify → reveal → 3D → file flow, then verify it under this product's independent WeChat identity.

**Architecture:** Native WeChat pages share one physical-card component and one navigation component. Existing `nature.cards.v2` is preserved; durable photo drafts and idempotent filing are added. Project configurations omit appid until a developer-tools test identity or the independent product AppID is selected and verified.

**Tech Stack:** WeChat WXML/WXSS/JavaScript. No Taro runtime.

**Spec:** the approved visual reference and native-flow design for this project, including final material and square-card overrides.

## Global Constraints

- Cream #FFFBF2, white surfaces, mint #6FE0C0 actions, fine lines, soft shadows.
- One 5:7 square-corner card master; photo, solid metadata strip, number and finish badges.
- Three-column nine-slot home; current seven-species catalog uses attainable 7/7 chapter target.
- Samples are visibly marked, never counted as observations. Unavailable recognition never invents a candidate.
- Photo is durably saved before identification. Unknown drafts survive restart.
- Never use another product's AppID. No upload or phone-preview command until independent AppID/name/owner are verified.
- No fabricated `subPackages` entry to mask an undefined IDE app configuration.
- No final completion claim without inspected cold-start, WeChat-visible, and real-device flow evidence.

---

### Task 1: Persistent observation state

**Files:** `app.js`, `tests/native-flow.cjs`.

**Interfaces:** `getDraft()/saveDraft(draft)`, `prepareCard(speciesId)`, `addCard(card)`, `decorate(card)`.

- [x] Implement saved photos, 72/20/7/1 finish distribution, legacy normalization, same-draft finish identity, conflict rejection and duplicate-safe filing.
- [x] Verify unknown retention, failed saving, late callback cancellation, species conflicts and duplicate counts with `node tests/native-flow.cjs`.

### Task 2: Shared card and complete native flow

**Files:** `app.wxss`, `native/components/collectible/*`, `native/components/navigation/*`, `native/pages/{home,observe,reveal,card,note,settings}/*`.

**Interfaces:** card component consumes decorated record; navigation opens registered native routes.

- [x] Implement source-aligned three-column collection, examples, chapter/filter controls and floating navigation.
- [x] Implement embedded camera single shutter, album selection, durable save, separate identify action, unknown draft and explicit manual demonstration.
- [x] Implement 700ms unseal, direct-open accessibility, 3D flip/tilt, filing, duplicate progress and saved observation notes.
- [x] Remove unsupported component selectors; retain explicit local-only service boundaries.
- [x] Run JS/JSON and official offline WXML/WXSS compilation.

### Task 3: Independent identity and cold-start compatibility

**Files:** `project.config.json`, `project.private.config.json`, `dist/project.config.json`, `README.md`.

**Interfaces:** IDE reads root config; old dist is inactive but must not retain another product's AppID.

- [x] Remove appid from both project configurations after this DevTools rejected `touristappid`; invalidate earlier wrong-identity QR evidence.
- [x] Compare existing working project configurations; remove forced `useCompilerModule`, pin installed 3.17.2, enable cover-view camera controls.
- [ ] Close/reopen only this project via CLI; inspect latest IDE logs and rendered native homepage after cold start.
- [ ] Receive and verify independent AppID with product name and owner; only then bind that independently verified identity.
- [ ] Generate fresh phone preview for the correct identity and verify it is visibly “去大自然里” in WeChat.

### Task 4: Final acceptance

**Files:** update this evidence ledger only after each external check succeeds.

- [ ] On iPhone, capture → persist → identify (unknown/manual explicitly labeled) → generate → unseal → 3D flip/tilt → file → reopen succeeds.
- [ ] Cancel camera/album, deny permission, background during identification, reopen pending card, and repeat filing preserve valid state.
- [ ] Compare reference screenshots with WeChat screens; record remaining system-font/icon/3D differences without claiming pixel identity.
- [ ] Confirm independent AppID, cold start and all phone acceptance results are current before reporting completion.

**Current blocker:** independent AppID is not supplied. Local compilation is allowed; upload and phone preview are blocked until identity is verified.
