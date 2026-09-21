# Baidu Card Gallery and Badge Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace puzzle browsing with a horizontal card shelf, improve natural-history art and app-owned typography, preserve confirmed Baidu science sources, and enable full-screen badge previews.

**Architecture:** Keep the active native release source and existing CardV2/strict-save boundary. Use pure view-model adapters for layouts and card metadata; normalize provider science on the server, retain it transiently with its candidate, and persist it only through the confirmed observation transaction. Keep payment/social unavailable and all cloud execution outside this local implementation authorization.

**Tech Stack:** Native WeChat JS/WXML/WXSS, existing Canvas exporter and CloudBase Node functions, node:test with VM mocks, official wcc/wcsc.

**Spec:** `docs/plans/2026-09-21-baidu-card-gallery-badge-design.md`

## Global Constraints

- Original seven examples, source species data and image hashes are immutable; examples never become real collection progress.
- Real cards retain art front/original-photo back. No silent original-front fallback; generation/resource/save/late-response failures must not persist a card, observation or achievement or navigate to reveal.
- Every recognition result remains a candidate requiring explicit confirmation. Do not infer scientific facts, protection, Latin names or fine-grained categories.
- Public card/share/export location is “地点未公开”; no coordinates. Private editor remains “仅自己可见”.
- No payment, social backend, deployment, preview upload, production model call, credential reading or cloud-console mutation.
- Never overwrite unrelated dirty changes. Current cloudfunctions/createArtCard/index.js and untracked prompt.js/species.js contain earlier uncommitted work: compare HEAD/worktree and stage only reviewed hunks. Use a distinct natural-history-prompt.js for the new prompt variant; any inseparable prerequisite requires controller approval before commit.
- Existing native-c-accessibility test is untracked and depends on unrelated dirty card close-control changes; do not import it as a prerequisite. Use committed motion/interaction tests.
- Initial baseline is product commit a92690136c1bf0c7dbd165705e87ea890fa87391 (65 committed test files). This plan follows later documentation commits without assuming dirty files are part of the baseline.
- Tasks are tests-first and independently committed after clean-index checkout verification. Stop after each task for controller review; no Git initialization or broad staging.

---

### Task 1: Shelf layout model and preference migration

**Files:**
- Modify: `native/lib/collection-model.js`, `native/lib/badge-model.js`, `app.js`
- Modify: `native/pages/library/index.js`, `native/pages/library/index.wxml`, `native/pages/library/index.wxss`
- Create: `tests/native-card-shelf.cjs`
- Update: `tests/native-collection-layout.cjs`, `tests/native-condition-achievements.cjs`

**Interfaces:**
- `normalizeCollectionPreference(value): {layout:'neat'|'shelf', puzzleUsed:boolean, shelfUsed:boolean}`; puzzle maps to shelf, all other unknown layout values map to neat. Existing flags are preserved only when strictly true.
- `recordShelfUse(preference, realCount)` returns a new preference with shelfUsed=true only if realCount>0; no storage inside the pure model.
- Achievement id/name remain puzzle/拼图成画; desc becomes 使用一次卡架布局（原拼图布局）. Earned when real cards exist and puzzleUsed or shelfUsed is true.

- [ ] **Step 1: Add failing model and VM tests.** Include:
  ```js
  assert.equal(normalizeCollectionPreference({layout:'puzzle',puzzleUsed:true}).layout,'shelf');
  assert.equal(normalizeCollectionPreference({layout:'puzzle',puzzleUsed:true}).puzzleUsed,true);
  assert.equal(recordShelfUse({layout:'shelf',shelfUsed:false},0).shelfUsed,false);
  assert.equal(recordShelfUse({layout:'shelf',shelfUsed:false},1).shelfUsed,true);
  ```
  VM tests swipe-change without navigate, card tap navigates correct real id, sample/failed cards absent, quota keeps prior preference, empty shelf earns nothing; legacy puzzle event still earns the same badge.
- [ ] **Step 2:** Run `node --test tests/native-card-shelf.cjs`; expect missing exports before implementation.
- [ ] **Step 3:** Implement pure preference functions; library refresh derives normalized layout and writes migration only inside try/catch. Use a non-autoplay horizontal `swiper` with current-index text and card children for shelf; keep neat grid. Use swiper change to update index only, avoid manual touch-to-tap translation. Preserve detail navigation, footprints, real counts, low motion and empty CTA. Persist shelf use only after rendered layout and nonempty real collection; add shelfUsed to app.achievementContext without deleting puzzleUsed.
- [ ] **Step 4:** Run `node --test tests/native-card-shelf.cjs tests/native-collection-layout.cjs tests/native-condition-achievements.cjs tests/native-library-runtime.cjs tests/native-footprints.cjs`, then `npm run build:weapp`. Inspect 375/390/430 widths if local simulator available without upload; otherwise record unverified.
- [ ] **Step 5:** Review exact scoped diff in temporary index, run `git diff --cached --check`, commit `feat: replace puzzle layout with privacy-safe card shelf`.

### Task 2: Art-front metadata, no-text prompt variant and export parity

**Files:**
- Create: `cloudfunctions/createArtCard/natural-history-prompt.js`, `tests/native-natural-history-front.cjs`, `tests/cloud-natural-history-prompt.cjs`
- Modify: `cloudfunctions/createArtCard/index.js` only new prompt import/use hunks
- Modify: `native/lib/card-presentation.js`, `native/lib/card-export.js`
- Modify: `native/components/collectible/index.js`, `native/components/collectible/index.wxml`, `native/components/collectible/index.wxss`
- Update: `tests/native-export.cjs`, `tests/native-card-v2.cjs`

**Interfaces:**
- `buildNaturalHistoryPrompt({speciesId,latin,habitat}):string`: consumes only existing server-validated canonical identity; optional latin/habitat only from trusted server catalogue, never client free text.
- `NATURAL_HISTORY_STYLE_VERSION='natural-history-front-v1'` distinguishes new requests; does not regenerate or overwrite old cards.
- `presentCard(card).front` adds categoryLabel and locationLabel while retaining existing photo/name/latin/no/finish/starText fields. locationLabel always public-safe; English/Latin is displayed only when an existing trusted field is available.
- Canvas and collectible consume the same presentation values and frontSource/backSource helpers.

- [ ] **Step 1: Write failing tests.**
  ```js
  const v=presentCard({schemaVersion:2,zh:'海芋',no:'N-001',location:{label:'私密地点',latitude:31,longitude:121}});
  assert.equal(v.front.locationLabel,'地点未公开');
  assert.ok(!JSON.stringify(v.front).includes('latitude'));
  assert.match(buildNaturalHistoryPrompt({speciesId:'海芋'}),/no text/i);
  ```
  Add long Chinese/Latin name, missing scientific name, unknown category, ordinary/foil variants and recorded Canvas text assertions. Assert dynamic valid species not restricted to seven/twelve names; prompt excludes client-supplied prompt. Keep art source failure strict and original photo only on back.
- [ ] **Step 2:** Run `node --test tests/native-natural-history-front.cjs tests/cloud-natural-history-prompt.cjs`, confirm failures precede changes.
- [ ] **Step 3:** Add full-subject natural-history painting prompt with natural background, clear silhouette, illustration texture and explicit no text/no watermark/no invented numbering. Integrate after current canonical validation, leaving provider/model/API behavior unchanged. Inspect operation-id/style cache semantics; old ready operations return existing art, new style applies only to new operations.
  Build one metadata hierarchy: image dominates, Chinese name, trusted English/Latin, category, separate collection stars/craft badge, real card number and private-location label. Do not imply stars equal confidence or protection. Fit text within export safe area; do not print fabricated placeholder Latin or serials. Preserve old-case rendering through sample/legacy compatibility branch. No generated imagery replaces original back.
- [ ] **Step 4:** Run `node --test tests/native-natural-history-front.cjs tests/cloud-natural-history-prompt.cjs tests/native-export.cjs tests/native-export-error.cjs tests/native-export-image-object.cjs tests/native-card-image.cjs tests/native-card-interaction.cjs tests/natural-history-badges-baseline.cjs`, `npm run build:weapp`, `node --check cloudfunctions/createArtCard/natural-history-prompt.js`. No model call.
- [ ] **Step 5:** Compare HEAD and dirty prompt/index changes; request approval for any inseparable dependency, otherwise stage only task hunks. Clean-checkout tests, `git diff --cached --check`, commit `feat: align natural history art metadata and export rendering`.

### Task 3: Verified Baidu contract, safe candidate science and confirmation-only persistence

**Files:**
- Create: `docs/plans/2026-09-21-baidu-science-contract.md`
- Create: `cloudfunctions/recognizeObservation/science.js`, `tests/cloud-baidu-science.cjs`, `tests/native-confirmed-science.cjs`
- Modify: `cloudfunctions/recognizeObservation/index.js`
- Modify: `native/lib/recognition-result.js`, `native/lib/observation-card.js`, `native/pages/observe/index.js`, `native/pages/observe/index.wxml`
- Modify: `native/contracts/services.js` only documented response-contract fields if required by current validator
- Update: `tests/native-auto-card.cjs` for confirmed-source capture without weakening strict failure assertions

**Interfaces:**
- Server `sanitizeScience(raw,{speciesId,route,retrievedAt})` returns `{status:'available'|'missing',speciesId,summary,source:{provider:'baidu',route,retrievedAt,url?}}`. A safe URL without summary does not set available.
- Provider adapter reads only fields proven by official documentation; internal sanitizeScience input summary/url is not a claim about undocumented provider field names.
- `mergeCandidateRoutes(routeResults)` retains candidate route provenance, warnings and requiresConfirmation=true; disagreement or partial failure never auto-finalizes.
- Candidate adds optional sourceScience; existing speciesId/name/confidence remain compatible.
- `scienceForConfirmedCandidate(candidate,confirmedSpeciesId,localScience)` rejects mismatched identities; merges source summary with existing trusted local fields without inventing facts/IUCN/protection.
- Only existing commitObservationCard success path persists scienceSnapshot; pending candidate data remains page memory and is invalidated with the current observation token.

- [ ] **Step 1: Research before implementation.** Read current official Baidu animal/plant/general documentation, linked parameter/result reference and SDK versions if needed. Record exact URLs, access date, supported endpoint/HTTP encoding, baike request/result fields if documented, score meanings and error codes in the contract document. Do not inspect keys, enable services or call production. If general/baike schema cannot be verified, explicitly record that route as blocked/unavailable and implement only verified animal/plant normalization; do not guess an endpoint.
- [ ] **Step 2: Write failing tests using sanitized documented response fixtures.** Test animal/plant/general separately only when documented; mock combined partial failures and disagreements. Include:
  ```js
  const missing=sanitizeScience({summary:'',url:'https://baike.baidu.com/item/example'},{speciesId:'海芋',route:'plant',retrievedAt:1});
  assert.equal(missing.status,'missing');
  const safe=sanitizeScience({summary:'<script>bad()</script>摘要',url:'javascript:alert(1)'},{speciesId:'海芋',route:'plant',retrievedAt:1});
  assert.equal(safe.source.url,undefined);
  assert.ok(!safe.summary.includes('<script>'));
  ```
  Cover script content removal, controls, overlength truncation, HTTPS host allowlist, userinfo and redirect/query rejection; unknown fields do not leak. VM spy: zero generation/storage before confirmation; confirm B never uses A science; no automatic first-candidate finalization; hide/change photo invalidates late response.
- [ ] **Step 3:** Run `node --test tests/cloud-baidu-science.cjs tests/native-confirmed-science.cjs`, confirm failing tests.
- [ ] **Step 4:** Implement only the verified route adapters. Keep request-body image encoding, asset ownership, env-only credentials and current time limits. Bound summary to 1200 code points and identity/route strings to existing validated limits; strip HTML/script/style and control characters; accept only exact baike.baidu.com HTTPS sources with no userinfo, port or redirect/query parameters. Do not fetch returned URLs. Unknown/malformed sources yield missing or safe provider-response failure, never executable markup.
  Preserve per-route scores (no uncalibrated averages), broad categories and safe warnings. Returning a high score may retain internal recognized compatibility status but must always require explicit UI confirmation. Attach cleaned science only to its matching candidate.
- [ ] **Step 5:** On explicit confirmation, assemble snapshot from the selected candidate and trusted local fields, not arbitrary user-written facts. If local data exists, preserve its facts/family/habitat/knowledge/protection. Use provider summary as sourced summary, not inferred structured facts. Missing data shows honest missing text; provider request failure stays a failure/retry, not a successful missing snapshot. Persist only in the existing verified-resource transaction after art success; remove no cancellation guards.
- [ ] **Step 6:** Run `node --test tests/cloud-baidu-science.cjs tests/native-confirmed-science.cjs tests/native-auto-card.cjs tests/native-strict-create.cjs tests/native-consent-runtime.cjs tests/recognition-errors.cjs tests/native-security-boundary.cjs` and `npm run build:weapp`; `node --check cloudfunctions/recognizeObservation/index.js` and science.js. If any named existing test is absent, stop and check repository history rather than silently replacing coverage.
- [ ] **Step 7:** Commit only researched contract, adapters and focused tests after independent checkout: `feat: preserve sanitized Baidu science after candidate confirmation`. Report separately any general/baike capability blocked by unavailable official evidence or console entitlement; no deployment.

### Task 4: Full-screen badge preview

**Files:**
- Modify: `native/pages/profile/index.js`, `native/pages/profile/index.wxml`, `native/pages/profile/index.wxss`
- Create: `tests/native-badge-preview.cjs`

**Interfaces:**
- `openBadge(event)` accepts only an existing badge id from getBadges model; populates selectedBadge and badgePreviewOpen.
- `closeBadge()` clears preview state without changing progress or scroll.
- `previewBadgeError()` switches image to readable fallback; no unlock/storage call.

- [ ] **Step 1: Write failing VM and template tests.**
  ```js
  page.openBadge({currentTarget:{dataset:{id:'first'}}});
  assert.equal(page.data.selectedBadge.id,'first');
  assert.equal(storageWrites,0);
  page.closeBadge();
  assert.equal(page.data.badgePreviewOpen,false);
  ```
  Cover invalid id, earned/unearned rules and progress, asset path from model only, grayscale locked state, image failure, reduce-motion static display and backdrop/content tap separation.
- [ ] **Step 2:** Run `node --test tests/native-badge-preview.cjs`; expect missing handlers.
- [ ] **Step 3:** Add accessible tap affordance to badge cells and fixed full-screen overlay with safe-area padding, close button, large transparent image, name, rule and current/target. Use catchtap inside content to avoid closing when tapping text; no body scroll reset or timer. Locked assets stay grayscale; overlay references same immutable model. Do not add separate badge collection or paid unlock.
- [ ] **Step 4:** Run `node --test tests/native-badge-preview.cjs tests/native-species-badges.cjs tests/native-condition-achievements.cjs tests/badge-assets.cjs tests/native-profile-settings.cjs` and `npm run build:weapp`.
- [ ] **Step 5:** Stage task-only profile hunks from HEAD, excluding remaining historical avatar/six-stat styling; `git diff --cached --check`; commit `feat: preview natural achievements without altering progress`.

### Task 5: Independent final validation and external acceptance gates

**Files:**
- Create: `docs/plans/2026-09-21-baidu-card-gallery-badge-verification.md`
- Update: `docs/RELEASE_ACCEPTANCE.md` only a new independent section

**Interfaces:** Evidence separates local mock/static validation, actual-device inspection and externally enabled capabilities; none implies another.

- [ ] **Step 1:** Export the reviewed staged tree into a clean temporary directory, excluding all unrelated dirty files. Run `node --test tests/*.cjs`, `npm run build:weapp`, `node --test tests/badge-assets.cjs tests/badge-pack-size.cjs tests/natural-history-badges-baseline.cjs`. Record exact counts, failure details and conservative package bytes; original hashes may never be updated to hide a case change.
- [ ] **Step 2:** Run native and modified-cloud JS/JSON checks and official single-file template compiles:
  ```js
  const fs=require('fs'),cp=require('child_process'),path=require('path');
  const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
  const native=walk('native'),bin='/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/',out=fs.mkdtempSync('/tmp/nature-gallery-compile-');
  for(const p of ['app.js',...native.filter(p=>p.endsWith('.js')),...walk('cloudfunctions/recognizeObservation').filter(p=>p.endsWith('.js')&&!p.includes('node_modules')),'cloudfunctions/createArtCard/index.js','cloudfunctions/createArtCard/natural-history-prompt.js'])cp.execFileSync(process.execPath,['--check',p]);
  for(const p of ['app.json','project.config.json','sitemap.json',...native.filter(p=>p.endsWith('.json'))])JSON.parse(fs.readFileSync(p,'utf8'));
  for(const p of native){if(p.endsWith('.wxml'))cp.execFileSync(bin+'wcc',['-d','-o',out+'/w.js',p]);if(p.endsWith('.wxss'))cp.execFileSync(bin+'wcsc',['-o',out+'/s.js',p]);}
  ```
  Execute with Node from clean checkout; report counts and any warnings. Do not start a preview that syncs cloud resources.
- [ ] **Step 3:** If safe local simulator is already available, inspect 375/390/430, large fonts, shelf gestures, front typography, photo back, badge overlay/grayscale/close and reduced motion. Otherwise explicitly mark each unverified. Actual generated artwork quality, accurate species morphology and real Canvas photo decoding require separate authorized real-service/device evidence.
- [ ] **Step 4:** Document external gates: official contract gaps; Baidu per-route/baike permissions and quotas; actual provider response calibration; CloudBase function deployment separately authorized; real timeout/cancellation/storage and image quality; WeChat location declaration/review; payment/friends still unavailable. Do not add model calls merely to make this report look complete.
- [ ] **Step 5:** `git diff --cached --check`; commit only evidence section and new verification document with `docs: record gallery science and badge verification gates`. Report unresolved blockers without claiming all goals complete.

## Plan self-review

- Coverage: Task1 implements neat/shelf plus legacy achievement semantics; Task2 art-front hierarchy and export parity; Task3 verified routes, confirmed-source science and security; Task4 badge preview; Task5 evidence and external gates.
- No undocumented endpoint is specified. Contract discovery is an executable bounded first step with an explicit stop condition, not permission to invent unsupported service behavior.
- Types: shelf migration retains puzzleUsed, adds shelfUsed; sourceScience remains candidate-only until scienceSnapshot transaction; existing CardV2/strict-save interface is preserved.
- Dirty-file isolation applies to every task. No source implementation is included in this plan commit; execution requires controller/user authorization.
