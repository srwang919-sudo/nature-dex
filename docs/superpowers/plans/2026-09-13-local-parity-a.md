# 收藏可靠性与完整资料 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. User has approved inline developer execution; no Git repository exists, do not initialize or commit.

**Goal:** 版本4多草稿、旧值迁移、删除文件重试、组合筛选、完整资料。

**Architecture:** Native pages consume shared local state and pure export helpers; no external backend mutation.

**Tech Stack:** WXML/WXSS/JavaScript, native storage/Canvas, Node VM tests.

**Spec:** `docs/plans/2026-09-13-local-parity-design.md`.

## Global Constraints

- No upload/preview, no position permission, no false identification or social service.
- Keep existing photographs, card identity, craft probabilities and flip/read behavior.
- No invented science data; use existing source text.

### Task 1: Test contracts first

**Files:** `tests/native-local-parity.cjs`.
**Interfaces:** state: getDrafts/createDraft/selectDraft/deleteDraft; export: publicShare/printSpec/renderPlan; pages consume existing decorate(card).

- [x] Write Node VM assertions for 版本4多草稿、旧值迁移、删除文件重试、组合筛选、完整资料.
- [x] Run `node tests/native-local-parity.cjs`; record expected initial failure.

### Task 2: Implement module

**Files:** app.js; native/pages/observe/*; native/pages/home/*; native/pages/card/*.

- [x] Implement the approved scope, preserving previous routes and storage keys with forward migration.
- [x] Run `node tests/native-local-parity.cjs` to green; inspect failure handling and missing-data states.

### Task 3: Regression verification

- [x] Run all `tests/native-*.cjs` scripts and JavaScript/JSON syntax checks.
- [x] Compile every native WXML individually with `wcc -d -o /tmp/nature-check.js <file>`, and WXSS with `wcsc -o /tmp/nature-check.js <file>`.
- [x] Report unverified phone-only behaviors, especially image export memory, permissions and filesystem deletion. Do not claim device evidence without a device run.

## Evidence and remaining device gate

Local tests and all 16 native WXML/WXSS files compile individually with the official compiler. JavaScript/JSON syntax passes. Initial missing API/module tests failed before implementation, then passed. No upload/preview was performed.

- [ ] Real WeChat device: camera/album permissions, filesystem cleanup, share landing, Canvas export and photo-album save remain unverified. Do not report these as tested.
