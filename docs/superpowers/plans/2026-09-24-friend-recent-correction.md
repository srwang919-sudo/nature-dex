# Friend recent correction Implementation Plan

> **For agentic workers:** Execute inline as approved by the controller; steps use checkbox syntax. Do not delegate writes.

**Goal:** Clear denied museum requests and obtain the true newest valid recipient shares without a first-100 truncation.

**Architecture:** Add a bounded recent-share page ordered by createdAt descending and document ID ascending. Signed owner-bound tuple cursors traverse invalid rows; a final doc-only transaction revalidates each row. Home follows pages until three valid summaries or exhaustion, and cancels on hide.

**Tech Stack:** Existing Node CloudBase repository, native mini-program, node:test.

**Spec:** `docs/plans/2026-09-24-friend-museum-verification.md` and controller correction request.

## Global Constraints
- Default-off profile consent, active friendship/generation, verified source and account gates remain mandatory.
- No deployment, photos, precise location, payment or unrelated dirty edits.
- Query pagination outside transactions; transaction operations are document-only.

### Task 1: Failed requests clear data
**Files:** native/pages/friend-museum/index.js; tests/native-friend-museum.cjs.
**Interface:** request failure resets museumView([]), profile, cursor and success message.
- [ ] Add rejected request regression; run `node --test tests/native-friend-museum.cjs` expecting the stale-card assertion to fail.
- [ ] Apply `this.setData({...museumView([]),profile:null,nextCursor:'',message:'',error:e.message})` in request catch and rerun.

### Task 2: Stable recent pages
**Files:** cloudfunctions/natureSocial/{core,cloudbase-repository,memory-repository,account-gate}.js; native/lib/account-services.js; native/pages/home/index.js; tests/nature-social.security.cjs; tests/nature-social-pagination.cjs.
**Interface:** `listRecentSharedSpecies({cursor?}) -> {species,nextCursor}` returns up to three verified shares, scanning at most twenty database rows per call. `recentPage(collection,where,after,20)` orders `createdAt desc,_id asc` and uses `(createdAt < t) OR (createdAt == t AND _id > id)`.
- [ ] Test >100 old rows, tied dates, invalid latest sources, cross-page continuity and foreign cursor rejection before implementation.
- [ ] Implement the repository query, signed tuple cursor and final transaction rechecks. Home accumulates at most three summaries and never runs automatically.
- [ ] Run `node --test tests/nature-social.security.cjs tests/nature-social-pagination.cjs tests/native-friend-museum.cjs`.
- [ ] Run `npm test`, `npm run build:weapp`, official wcc/wcsc for home and friend-museum, then isolate only these hunks and commit `fix: clear denied museum views and seek newest valid shares`.

External gate: CloudBase composite index for recipient/status/createdAt/_id and real SDK query behavior need staging verification. Official syntax reference: https://github.com/TencentCloudBase/node-sdk/blob/master/docs/database/database.md (checked 2026-09-24). No production state is changed here.
