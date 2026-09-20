# Art Card Watercolor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strict-success HY art fronts and privately generated, publicly reusable species watercolor backs.

**Architecture:** Native remains the sole release source. New server adapters isolate HY transport and public-cache orchestration; client sessions remain transient until both card faces are ready. Existing collected cards are preserved.

**Tech Stack:** Native WeChat JS/WXML/WXSS, CloudBase server SDK, Node built-in test runner, official wcc/wcsc.

**Spec:** docs/plans/2026-09-18-art-card-watercolor-design.md

## Approved T2I amendment — 2026-09-18
This supersedes Task 2's reference-image/catalog requirements. Keep all seven example assets untouched. No speciesReferences collection is required.
- [x] Verify official server API at https://docs.cloudbase.net/ai/image-model/wx-server-sdk: exact model HY-Image-3.0-Plus-4090-Tob-v1.0, prompt/size/revise only, data[0].url response.
- [x] Add tests/cloud-watercolor-t2i.cjs and update tests/cloud-species-watercolor.cjs for no image/reference input, invalid species rejection, confirmed name, cache single-flight and reuse.
- [x] Change cloudfunctions/speciesIllustration/provider.js and index.js; update native/pages/observe/index.js to send confirmed species name, never photo to public cache.
- [x] Run node --test tests/*.cjs (36 pass), npm run build:weapp, function syntax checks.
- [x] Deploy createArtCard, speciesIllustration, cleanupObservationAssets to nature-prod-d0gufarx064489f0f with remote npm installation; all three success:true on retry after initial Creating state.
- [ ] Verify production collections/rules, one real generation, cross-user public output access, and real-phone complete flow before marking release-ready.

## Global Constraints
- Production environment: nature-prod-d0gufarx064489f0f.
- Model: HY-Image-v3.0-I2I-ToB-v1.0.1. No DashScope fallback.
- No API-key inspection; no deployment in documentation phase.
- Unknown/failed recognition cannot create a card. Failed art cannot silently use original.
- Public cache must never contain private user input. Existing collections cannot be deleted.
- Current project has no Git repository. Each task's submission is a reviewed file/test report, not a Git commit; do not initialize Git or fabricate commit IDs.

### Task 1: Verify CloudBase HY transport and create private art service
**Files:** Create cloudfunctions/createArtCard/index.js, package.json, provider.js; tests/cloud-hy-art.cjs.
**Interfaces:** provider.submit({model,imageFileId,prompt,idempotencyKey}) -> {taskId}; provider.poll(taskId) -> {status,assetFileId,code}. main(event, deps) uses injected provider in tests.
- [ ] Step 1: Inspect official CloudBase model API and installed server SDK documentation. Record exact SDK version, method, required parameters and observed response schema in the design document before implementing provider.js. If unavailable, stop transport implementation with an explicit API-contract blocker; do not guess a method.
- [ ] Step 2: Add failing tests:
  ```js
  assert.equal((await main({action:'submit',confirmed:false},deps)).code,'confirmation_required');
  assert.equal((await main(foreignPhotoEvent,deps)).code,'forbidden');
  assert.equal((await main(validEvent,deps)).status,'processing');
  assert.equal(provider.calls[0].model,'HY-Image-v3.0-I2I-ToB-v1.0.1');
  assert.equal((await main(validEvent,deps)).taskId,first.taskId);
  ```
  Fixtures validEvent/foreignPhotoEvent use test OPENID u1, observation d1 and private photo paths; deps records provider calls and in-memory task ownership.
- [ ] Step 3: Run node --test tests/cloud-hy-art.cjs and observe missing module/failing assertions.
- [ ] Step 4: Implement owner-checked submit/poll/cancel. Use operationId for idempotency, trusted species name in fixed prompt, private task and asset storage, allowlisted safe failure codes, no provider error payload passthrough.
- [ ] Step 5: Run the same test; assert rejected ownership never invokes provider, failed provider never returns ready, repeated submit does not charge twice.
- [ ] Step 6: Submit files and exact test output to controller; no Git commit.

### Task 2: Public species watercolor cache
**Files:** Create cloudfunctions/speciesIllustration/index.js, package.json, catalog.js; tests/cloud-species-watercolor.cjs. Modify native/lib/species-illustration.js.
**Interfaces:** main({action:'ensure',speciesId,styleVersion:'watercolor-v1'},deps) -> {status,cacheKey,assetFileId?,code?}; public record is immutable by version once ready.
- [ ] Step 1: Create catalog fixtures for seven existing IDs and trusted reference file IDs; test missing reference yields reference_unavailable before provider call.
- [ ] Step 2: Add tests:
  ```js
  assert.equal(first.cacheKey,secondUser.cacheKey);
  assert.equal(provider.submitCount,1);
  assert.equal(await clientWritePublicRecord(),false);
  assert.ok(!JSON.stringify(publicRecord).includes('private-user-photo'));
  assert.equal((await ensure('unknown',deps)).code,'reference_unavailable');
  ```
  Use a transaction-capable in-memory store to interleave two ensure requests, failed task retries and expired leases.
- [ ] Step 3: Run node --test tests/cloud-species-watercolor.cjs and confirm failures.
- [ ] Step 4: Implement SHA-256 canonical cache key, lease/transaction single-flight, ready-only public reads, trusted reference watercolor generation and safe asset validation. Ignore client owner/prompt/image overrides. Keep user photos out of public generation entirely.
- [ ] Step 5: Native resolver consumes successful pinned backAssetFileId/backStyleVersion, not user photo or the current hard-coded mountain artwork. Legacy cards retain an explicitly historical visual fallback.
- [ ] Step 6: Run tests including concurrent requests, unsafe URLs, output decode rejection and version changes; submit evidence without commit.

### Task 3: Strict transient observation state
**Files:** Create native/lib/observation-session.js; modify native/pages/observe/index.js, app.js; tests/native-strict-session.cjs.
**Interfaces:** createSession({photoPath}) -> session; transition(session,event) -> next; commitReadySession(session,storage) -> completeCard. Ready requires confirmed candidate and available front/back.
- [ ] Step 1: Add failure tests:
  ```js
  for(const state of ['recognitionFailed','artFailed','backFailed']){
    assert.throws(()=>commitReadySession({...base,state},storage));
    assert.equal(storage.cards.length,0); assert.equal(storage.drafts.length,0);
  }
  assert.equal(transition(artFailed,{type:'USE_ORIGINAL'}).frontMode,'original');
  assert.equal(transition(recognitionFailed,{type:'USE_ORIGINAL'}).state,'recognitionFailed');
  ```
  base has operationId, temp photo, candidate provenance and empty face resources; fake storage records all writes.
- [ ] Step 2: Run node --test tests/native-strict-session.cjs and observe failures.
- [ ] Step 3: Replace new capture createDraft/saveFile path with in-memory session. Keep old storage APIs for legacy export/clear only. Recognition success still requires explicit candidate confirmation; unknown/failed stops.
- [ ] Step 4: Implement successful atomic commit after durable files are ready, preserve selected craft across retries, reject stale epoch callbacks. Do not claim success on storage quota failure.
- [ ] Step 5: Test migration preserves old cards/notes/files and does not list old drafts; duplicate clicks, cancellation, clear races and art failure write zero observations.
- [ ] Step 6: Submit implementation/test evidence, no commit.

### Task 4: Replace client art orchestrator and visible actions
**Files:** Modify native/lib/art-card.js; native/pages/observe/index.js, index.wxml; native/pages/settings/index.js, index.wxml; tests/native-art-card.cjs; tests/native-consent-runtime.cjs.
**Interfaces:** generateArt(session,{api,onProgress}) -> ready asset or typed failure, never fallback; retry reuses active operation/task; chooseOriginal(session) is explicit.
- [ ] Step 1: Replace prior fallback assertions with:
  ```js
  assert.equal(result.status,'failed'); assert.equal(navigations.length,0);
  assert.equal(savedCards.length,0);
  page.useOriginal(); assert.equal(page.data.frontMode,'original');
  assert.ok(!markup.includes('未完成的观察')&&!markup.includes('草稿管理'));
  ```
  page is a VM-loaded observe page with fake API and storage; markup concatenates observe/settings WXML.
- [ ] Step 2: Run node --test tests/native-art-card.cjs tests/native-consent-runtime.cjs; verify failure before changes.
- [ ] Step 3: Call createArtCard rather than natureAI2, expose separate recognizing/artGenerating/backGenerating messages and explicit retries; remove auto fallback and manual bypass after recognition failure. Remove draft list and handlers from visible pages without deleting legacy data.
- [ ] Step 4: Ready gate waits for both faces. Use original only after explicit click and only after recognized confirmed species; no long new authorization modal.
- [ ] Step 5: Test task reuse, timeout as retryable not success, no automatic navigation, direct original path and buttons unavailable on unknown.
- [ ] Step 6: Submit evidence without commit.

### Task 5: Resource lifecycle, showcase and export consistency
**Files:** Modify native/lib/card-presentation.js, native/lib/card-export.js, native/pages/card/index.js, native/pages/reveal/index.js/index.wxml, native/components/collectible/index.js/index.wxml; create cloudfunctions/cleanupObservationAssets/index.js/package.json; tests/native-watercolor-card.cjs; tests/cloud-asset-expiry.cjs.
**Interfaces:** card stores frontMode, artPhotoPath?, photoPath, backAssetFileId, backStyleVersion. Cleanup accepts operationId only and verifies owner; scheduled expiry does not touch referenced completed cards or public cache.
- [ ] Step 1: Tests assert front uses selected source and back uses pinned watercolor, export resolves the identical resources; missing new-card watercolor is an error, not mountain/photograph substitution.
- [ ] Step 2: Run new tests to failure.
- [ ] Step 3: Decode both faces before commit; persist complete reveal state before animation, keep reduceMotion path. On failure/cancel delete temporary local/cloud resources; expiry worker cleans abandoned private operations. Reference checks protect saved originals and public watercolors.
- [ ] Step 4: Test:
  ```js
  assert.equal(expiredOperation.deleted,true);
  assert.equal(completedCard.deleted,false);
  assert.equal(publicWatercolor.deleted,false);
  assert.equal(reducedMotion.vibrations,0);
  assert.equal(reopenedCompleteCard.id,original.id);
  ```
- [ ] Step 5: Keep natural-history existing fields and honest missing-data labels. Do not implement automatic encyclopedia until its provenance/review decision is approved.
- [ ] Step 6: Submit tests and lifecycle evidence without commit.

### Task 6: Integration and controlled deployment gate
**Files:** Update tests/native-local-parity.cjs, tests/native-official-art.cjs, tests/native-production-static.cjs to new approved expectations; add docs/plans/2026-09-18-watercolor-verification.md.
- [ ] Step 1: Run node --test tests/*.cjs; do not delete safety assertions to obtain green tests.
- [ ] Step 2: Run npm run build:weapp and node --check for each new cloudfunction index.js/provider.js.
- [ ] Step 3: For every native WXML run /Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/wcc -d -o /tmp/nature-watercolor-wxml.js followed by that exact file path; for each WXSS run sibling wcsc -o /tmp/nature-watercolor-wxss.js followed by its path. Record all exit statuses.
- [ ] Step 4: Controller reviews database public-read/server-write rules, private files, cache concurrency and cleanup schedule before separate deployment. Do not inspect environment-variable values.
- [ ] Step 5: On separately authorized production test, test one known species end-to-end, then same species second user cache hit, failed recognition, rejected art, explicit original, failed back, interrupted generation, reduced motion and export. Record safe status/request IDs only.
- [ ] Step 6: Final handoff distinguishes mocked/local evidence from real HY output and true-device evidence. No completion claim while any required cloud/model/reference dependency is unverified.
