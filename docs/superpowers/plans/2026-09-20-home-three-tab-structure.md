# Home Three Tab Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three persistent destinations and one prominent home capture action.

**Architecture:** Preserve internal route keys; change navigationItems to the existing three tabs. Reuse home.observe() without changing the capture flow.

**Tech Stack:** Native WXML/WXSS/CommonJS and Node VM tests.

**Spec:** docs/plans/2026-09-20-home-three-tab-structure-design.md

## Global Constraints

No cloud deployment. Preserve seven examples, recognition/art/reveal logic and failure policy. No Git submission in this local task.

### Task 1: Three destination navigation

**Files:** native/lib/tab-model.js; native/components/navigation/index.js/index.wxml/index.wxss; tests/native-c-navigation.cjs.

**Interfaces:** tabs/navigationItems retain keys discover/collection/me and old URLs; labels become 首页/图鉴/我的. Invalid capture key performs no action.

- [ ] Update test to `assert.deepEqual(model.navigationItems.map(x=>x.label),['首页','图鉴','我的'])`; run `node --test tests/native-c-navigation.cjs` expecting failure.
- [ ] Remove capture entry/branch and elevated-disc markup/styles; keep safe-area, aria-label and hidden-flow behavior.
- [ ] Re-run navigation test expecting pass.

### Task 2: Home capture action and regression

**Files:** native/pages/home/index.wxml/index.wxss; tests/native-tabs.cjs; tests/native-home-three-tabs.cjs.

**Interfaces:** record button binds existing observe(); album remains album(). No new storage or service calls.

- [ ] Assert one `bindtap="observe"`, visible 记录一下, and `home-record` class in homepage; run new test expecting failure.
- [ ] Add centered round CSS camera button after scene and before task; remove repeated task main CTA. Add reduced-motion override.
- [ ] Run `node --test tests/*.cjs`, `npm run build:weapp`, native syntax/JSON and official wcc/wcsc single-file compile.
- [ ] Record results; preserve protected resource SHA baseline and hand off for actual-device layout review.
