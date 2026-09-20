# Natural History Card Back Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. User has approved design and assigned the developer to execute inline.

**Goal:** Replace the photographic back with a readable, truthful natural-history record.

**Architecture:** Keep the existing single-face card flip. Change the shared back markup and styles; a fixed header/footer surround a scrollable record area so long source text remains available.

**Tech Stack:** Native WXML/WXSS/JavaScript and Node assertions.

**Spec:** `docs/plans/2026-09-13-natural-history-card-back-design.md`.

## Global Constraints

- No back image, invented content, English sub-brand, added animation, Canvas or fonts.
- IUCN assessment and Chinese protection are distinct fields; tagline is an observation note.
- Existing data and front appearance remain unchanged.
- No Git initialization or commit; this directory is not a Git repository.
- AppID inspection is read-only and cannot establish ownership; no upload or preview.

### Task 1: Write and run failing contract tests

**Files:** Create `tests/native-card-back.cjs`.

**Interfaces:** Read component markup/style; assert no back image, conditional existing fields, separate labels, readable sizes and scrollable long text.

- [x] Write assertions for `观察札记`, `IUCN 评估`, `中国保护信息`, conditional fields and absence of `back-photo`.
- [x] Run `node tests/native-card-back.cjs`; expect failure against the photographic back.

### Task 2: Implement record layout

**Files:** Modify `native/components/collectible/index.wxml` and `index.wxss`; change `index.js` only if a component event is needed to keep scrolling separate from card dragging.

**Interfaces:** Consume unchanged `card.zh/latin/tagline/habitat/iucn/protection/no/date/localSerial/sample`; no fabricated default fields.

- [x] Replace the back with Chinese brand header, name/Latin, labeled optional record fields, and existing-only footer.
- [x] Use flexible wrapping and vertical scrolling, keeping protection text complete.
- [x] Run `node tests/native-card-back.cjs`; expect pass for long names, long protection and absent metadata contracts.

### Task 3: Regression verification and identity inspection

**Files:** Read `project.config.json`; update this plan's checked steps after verification.

- [x] Run `node tests/native-card-interaction.cjs` and `node tests/native-flow.cjs`.
- [x] Run `node --check native/components/collectible/index.js`, parse project/component JSON, and compile all native WXML/WXSS using installed official `wcc-exec/wcc` and `wcc-exec/wcsc`.
- [x] Compare configured AppID to `wxa3481cc78cf9885f` and validate `/^wx[0-9a-f]{16}$/`; report syntax/configuration only, not ownership.
- [ ] Device layout and long-record scrolling still require real-device inspection; no phone preview or upload was performed.

## Evidence

### Supplement: Existing science data and gesture integration

- [x] Write `tests/native-science-data.cjs` first; observe failure at missing kingfisher.family.
- [x] Synchronize seven species family/season/facts[0]/know from `src/data/species.ts` as text into `app.js`; execute no TypeScript.
- [x] Add classification, identification/behavior, knowledge and season sections; details page carries full text.
- [x] Isolate scroll-area gestures within collectible; scroll/cancel suppresses flip, short tap emits recordtap to card and reveal pages.
- [x] Run `node tests/native-science-data.cjs` and all existing native tests; all pass.
- [x] Compile with official single-file commands: `wcc -d -o /tmp/nature-card-back-wxml.js native/components/collectible/index.wxml` and `wcsc -o /tmp/nature-card-back-wxss.js native/components/collectible/index.wxss`.

- Red: `node tests/native-card-back.cjs` failed first with `back must not contain a photograph`.
- Green: card-back, card-interaction and native-flow test scripts all pass.
- All native JavaScript syntax, JSON and official WXML/WXSS compilation pass.
- Configured AppID is `wxa3481cc78cf9885f`, syntactically valid and matches requested value. Product ownership has not been verified.
