# Unlicensed Static Asset Removal Implementation Plan

> **For agentic workers:** Execute this approved plan inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every listed static asset whose commercial permission cannot be confirmed, retain a recoverable external backup, and keep the mini program usable with project-authored geometric visuals.

**Architecture:** Runtime asset helpers stop producing paths to removed files. The home hero becomes markup and CSS, while one auditable geometric leaf asset replaces image-dependent badge and share previews.

**Tech Stack:** WXML, WXSS, CommonJS, SVG, PNG, Node.js `node:test`.

**Spec:** `docs/plans/2026-09-23-unlicensed-asset-removal-design.md`

## Global Constraints

- Never touch user private captures or CloudBase storage.
- Modify only the controller-approved file list.
- Back up each exact static source and historical dist copy outside the repository before removal.
- Do not edit `app.js`, observe/card/library/settings pages, `card-export.js`, or existing cloud functions.

---

### Task 1: Recoverable exact-file backup

**Files:**
- Back up and remove only the approved files under `assets/images`, `dist/assets/images`, `assets/illustrations`, `assets/badges`, `assets/theme/exploration-hero.jpg`, `assets/fonts`, and `dist/assets/fonts`.

- [ ] Enumerate the approved files and assert the expected count before any move.
- [ ] Copy them with relative paths to the dedicated outside-repository backup.
- [ ] Generate a manifest containing relative path, byte size, and SHA-256.
- [ ] Compare backup hashes to source hashes.
- [ ] Remove only the enumerated source files with an exact patch.

### Task 2: Project-authored visual replacement

**Files:**
- Create: `assets/theme/share-safe-leaf.svg`
- Create: `assets/theme/share-safe-leaf.png`
- Modify: `native/pages/home/index.wxml`
- Modify: `native/pages/home/index.wxss`
- Modify: `native/lib/badge-model.js`
- Modify: `native/lib/example-cards.js`
- Modify: `native/lib/species-illustration.js`

- [ ] Add an 800×640 geometric leaf source using only project colors and basic paths.
- [ ] Export the source deterministically to PNG and verify dimensions and PNG signature.
- [ ] Replace the JPG home hero with semantic decorative markup and CSS.
- [ ] Return no bundled example cards and no local species illustration paths.
- [ ] Point all achievement placeholders to the approved neutral leaf PNG.

### Task 3: Contracts and release verification

**Files:**
- Create: `tests/approved-static-assets.cjs`
- Modify: `tests/badge-assets.cjs`
- Modify: `tests/badge-pack-size.cjs`
- Modify: `tests/native-example-cards.cjs`
- Modify: `tests/native-official-art.cjs`
- Modify: `tests/native-card-presentation.cjs`
- Modify: `tests/native-direct-camera.cjs`
- Modify: `tests/native-c-second-pass.cjs`
- Modify: `tests/natural-history-badges-baseline.cjs`

- [ ] Lock the exact removed paths and reject stale runtime references.
- [ ] Verify the approved leaf dimensions, source markers, and reuse by badge definitions.
- [ ] Verify the home CSS illustration and empty example/illustration mappings.
- [ ] Run focused tests, `npm test`, and `npm run build:weapp`.
- [ ] Inspect remaining asset references and Git tracked state.
- [ ] Commit only this task's files through an isolated Git index.
