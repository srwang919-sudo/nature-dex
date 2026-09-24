# C Visual Second Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved C direction through scene art and clearer observer/collection structure.

**Architecture:** Native templates consume existing real records. Derived labels and six statistics do not mutate storage. Theme artwork is independent of seven protected examples.

**Tech Stack:** Native WXML/WXSS, CommonJS, Node VM tests.

**Spec:** docs/plans/2026-09-20-bright-nature-exploration-design.md and controller-approved second-pass scope.

## Global Constraints

No cloud operations, no example/source-image changes, no collectible front changes. Keep strict failure policy. No Git commits. Device inspection must be separately evidenced.

### Task 1: Observer and species structures

**Files:** native/lib/profile-model.js; native/pages/profile/index.js/index.wxml/index.wxss; native/pages/library/index.js/index.wxml/index.wxss; tests/native-c-second-pass.cjs.

**Interfaces:** profile.stats retains species/count/days/badges, adds repeat and notes; localLevel label derives only from chapter xp. Chapter cells add zh/latin without changing lit.

- [ ] Add assertions: `buildProfile([{speciesId:'kingfisher'},{speciesId:'kingfisher'}]).stats.repeat===1`; zero records have zero repeats; sample records excluded; templates include six statistics and named chapter thumbnails.
- [ ] Run `node --test tests/native-c-second-pass.cjs` and observe failure.
- [ ] Derive `repeat=count-species`, notes from actual stored note values; display local level via xp thresholds 0,3,6,7 without reward changes. Add circle CSS observer avatar and badge shelf.
- [ ] Run new test plus `node --test tests/*.cjs`.

### Task 2: Scene hero and verification

**Files:** native/pages/home/index.wxml/index.wxss; assets/theme/exploration-hero.jpg; docs/plans/2026-09-20-bright-nature-exploration-verification.md. Delivered PNG is preserved outside the package; 1200px JPEG is the local display derivative to avoid adding 2.8MB to the package.

**Interfaces:** hero is decorative image with no user data, no navigation or cloud side effects. Existing task and capture event handlers unchanged.

- [ ] Test home for `exploration-hero` and unchanged `bindtap="observe"`/`bindtap="album"`.
- [ ] Integrate controller-delivered illustration in a full-width scene beneath open title; task panel overlaps scene edge with restrained paper framing.
- [ ] Run `node --test tests/*.cjs`, `npm run build:weapp`, native JS/JSON checks, official single-file wcc/wcsc and protected SHA baseline comparison.
- [ ] Record results and remaining screenshot/physical-device limitations; hand off without claiming visual parity before controller inspection.
