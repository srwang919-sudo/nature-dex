# Owned Card Recovery Implementation Plan

> **For agentic workers:** implement each task with tests first and verify before commit.

**Goal:** Recover successfully finalized owner records after local storage failure or cold start, without generating artwork, spending quota or reallocating Discovery Numbers.

**Architecture:** Owner-derived read service in createArtCard, bounded cursor pagination; original/art resource URLs issued only after owner/card/observation/artwork authorization. Native library sync validates images before one atomic local collection write. Automatic unfinished-upload cleanup must refuse saved observations in its deletion transaction.

**Tech Stack:** Native WeChat JavaScript, CloudBase server SDK doc-only transactions, node:test.

## Task 1: Protect saved observations from automatic cleanup

- [x] Add `tests/cloud-saved-cleanup.cjs` proving saved retention, explicit deletion compatibility, foreign-owner denial.
- [x] Update `cloudfunctions/cleanupObservationAssets/index.js`, deployment-local `delete-observation.js` and `native/lib/cloud-cleanup.js`.
- [x] Run `node --test tests/cloud-saved-cleanup.cjs tests/cloud-observation-delete.cjs`.

## Task 2: Owner card query and resource authorization

- [x] Add `tests/cloud-owned-cards.cjs`: own-only pagination, invalid cursor, deleted/erasing exclusion and authorized original/art URLs.
- [x] Add `cloudfunctions/createArtCard/owned-cards.js`, route list_owned/card_resource before operationId validation in index.js. Do not expose owner, location or private notes.
- [x] Run `node --test tests/cloud-owned-cards.cjs tests/cloud-discovery.cjs`.

## Task 3: Library recovery

- [x] Add `tests/native-card-recovery.cjs` covering empty state, duplicate sync, pagination, image/storage failure and clear epoch.
- [x] Add `native/lib/card-recovery.js`; integrate app.syncCards and library status/retry. Do not call generation/finalize while restoring.
- [x] Run `node --test tests/native-card-recovery.cjs tests/native-library-runtime.cjs`.

## Task 4: Independent verification

- [x] Run clean staged `npm test`, `npm run build:weapp`, JS/JSON checks and official WXML/WXSS compilers.
- [x] Record remaining live permission/concurrency/URL/device gates; commit only the recovery files/hunks. No cloud deployment or provider calls.
