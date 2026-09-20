# Bright Nature Exploration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved bright, playful nature-exploration direction to the native mini-program without changing collection integrity or the seven examples.

**Architecture:** Keep app.js/native as the sole release source. Share visual tokens in app.wxss and derive all tasks/experience from saved real cards through small pure models. Keep capture, recognition, strict-success creation, cloud adapters, card presentation and persistence contracts intact.

**Tech Stack:** Native WeChat JS/WXML/WXSS, existing local assets, Node assert/VM tests, official wcc/wcsc.

**Spec:** docs/plans/2026-09-20-bright-nature-exploration-design.md

## Global Constraints

- Only the developer role modifies files. No cloud operations, deployments, previews/uploads, credentials or production settings.
- Do not change the seven example records or their existing assets. No assets/images replacements, species source edits, public-cache registration or private user images as decorations.
- Card fronts retain photograph, identifier, finish, name, Latin name, fixed five star positions and existing earned star value.
- Failed recognition/art/back generation never becomes a saved observation. No automatic original-image fallback.
- Unknown/empty states remain honest. No fake location, distance, weather, login, rewards, subscription or friends.
- Navigation camera is an action, not a fourth persistent tab.
- Chapter experience means unique real target species, capped at the seven actual targets; duplicates increase records only. Existing category badge thresholds remain unchanged.
- No new fonts or runtime libraries. No glass blur, continuous motion, bounce, gradient text or decorative Unicode icons.
- No Git initialization or commits: this directory is not a Git repository. Each task ends with a file/test evidence report.
- Approval applies to this plan's scope, not a new reward economy. If implementation discovers a conflicting reward contract, stop that task for controller resolution.

## File ownership and interfaces

New pure model: native/lib/exploration-model.js exports buildExploration(cards, targetIds, nowMs), returning task {kind, title, current, total, complete}, today array, found, total.
Existing chapter-model exports chapter and computeChapterProgress(input,cards); add total based on actual non-null cells, retain cells/milestones contract.
Existing profile-model buildProfile(cards,state) retains all current fields; xp/nextXp become chapter found/total, stats.species remains all real unique species.
Existing tab-model keeps tabs and additionally exports navigationItems; each item adds action 'tab' or 'capture'.
No persistent storage migrations are required.

## Task 1: Global C visual foundation and immutable-example guard

**Files:** Modify app.wxss; create tests/native-c-theme.cjs. Read-only native/lib/example-cards.js, app.js, src/data/species.ts and assets/images.

**Interfaces:** CSS variables --paper, --surface, --ink, --muted, --moss, --lake, --orange, --sun, --line; existing .primary/.secondary/.page/.title/.section/.sub keep their selectors.

- [ ] Step 1: Before changes capture SHA-256 baseline outside the app, covering assets/images recursively and the three read-only data files:

  ```sh
  node -e "const f=require('fs'),p=require('path'),c=require('crypto');let files=['native/lib/example-cards.js','app.js','src/data/species.ts'];function walk(d){for(const e of f.readdirSync(d,{withFileTypes:true})){const x=p.join(d,e.name);e.isDirectory()?walk(x):files.push(x)}}walk('assets/images');console.log(JSON.stringify(Object.fromEntries(files.map(x=>[x,c.createHash('sha256').update(f.readFileSync(x)).digest('hex')])))));" > /tmp/nature-c-baseline.json
  ```
  This command writes only a generated verification artifact, not project source.
- [ ] Step 2: Add failing theme test with actual expected token values:

  ```js
  const assert=require('node:assert/strict'),fs=require('node:fs');
  const css=fs.readFileSync('app.wxss','utf8');
  for(const [key,value] of Object.entries({paper:'#FFF8E8',surface:'#FFFCF4',ink:'#183F36',muted:'#52635A',moss:'#647B42',lake:'#3C7F92',orange:'#C45431',sun:'#F2CF70',line:'#DED8C6'}))
    assert.ok(css.toLowerCase().includes('--'+key+':'+value.toLowerCase()));
  ```
- [ ] Step 3: Run node --test tests/native-c-theme.cjs; verify missing C tokens fail.
- [ ] Step 4: Implement variables on page with the exact values above; use paper background, ink text, 32rpx page gutters, 44/34/28/24rpx heading/section/body/helper scale, body line-height 1.55. Primary buttons use orange, paper text and min-height:88rpx; secondary uses surface/ink. Keep collectible styles isolated.
- [ ] Step 5: Extend test with computed sRGB contrast assertions for ink/paper, muted/paper, paper/orange (>=4.5), and primary outlines (>=3). If a pair fails, darken its foreground locally and document the corrected value before proceeding. Run test and report results. No artwork generation or replacement in this task.

## Task 2: Central elevated capture action

**Files:** Modify native/lib/tab-model.js; native/components/navigation/index.js/index.wxml/index.wxss; tests/native-tabs.cjs. Create tests/native-c-navigation.cjs.

**Interfaces:** tabs remains discover/collection/me. navigationItems is [discover,collection,capture,me]; capture.url='/native/pages/observe/index', action='capture'. Component go(event) reads dataset.key.

- [ ] Step 1: Add model assertions:

  ```js
  const assert=require('node:assert/strict'),{tabs,navigationItems}=require('../native/lib/tab-model');
  assert.deepEqual(tabs.map(x=>x.key),['discover','collection','me']);
  assert.deepEqual(navigationItems.map(x=>x.key),['discover','collection','capture','me']);
  assert.equal(navigationItems[2].action,'capture');
  ```
  Add a VM Component harness with wx.navigateTo and wx.reLaunch spies; tapping capture must call navigateTo once, not reLaunch. Tapping active tab calls neither.
- [ ] Step 2: Run node --test tests/native-c-navigation.cjs and verify missing navigationItems fails.
- [ ] Step 3: Export navigationItems using unchanged tabs, label collection “图鉴” only in UI; implement capture branch before tab selection:

  ```js
  if(item.action==='capture'){wx.navigateTo({url:item.url});return;}
  if(item.key===this.data.currentKey)return;
  wx.reLaunch({url:item.url});
  ```
  Render four equal touch regions; camera 112rpx orange circle raised16rpx, visible “拍摄” label, CSS camera icon. Dock content112rpx plus env(safe-area-inset-bottom), matching page bottom spacing. Do not show the dock during capture/reveal flows.
- [ ] Step 4: Update native-tabs.cjs assertions rejecting capture to the approved action contract, not to blanket success. Preserve registered-page and tab tests. Run node --test tests/native-tabs.cjs tests/native-c-navigation.cjs.
- [ ] Step 5: Inspect 375/390/430px screenshots: no overlapping label or last row, selected state not assigned to capture. Report evidence without commit.

## Task 3: Real exploration task and today's collection

**Files:** Create native/lib/exploration-model.js, tests/native-c-exploration.cjs. Modify native/pages/home/index.js/index.wxml/index.wxss.

**Interfaces:** buildExploration(cards,targetIds,nowMs) filters kind==='example' and sample; uses local calendar date, not UTC slice; found counts unique targetIds only. task.kind is first/next/complete. today contains successful saved real cards in reverse creation order.

- [ ] Step 1: Add failing pure tests:

  ```js
  const assert=require('node:assert/strict'),{buildExploration}=require('../native/lib/exploration-model');
  const now=new Date(2026,8,20,12).getTime(),ids=['kingfisher','camellia'];
  assert.equal(buildExploration([],ids,now).task.kind,'first');
  const cards=[{id:'a',speciesId:'kingfisher',createdAt:now},{id:'b',speciesId:'kingfisher',createdAt:now},{id:'s',speciesId:'camellia',kind:'example',createdAt:now}];
  const x=buildExploration(cards,ids,now);
  assert.equal(x.found,1);assert.equal(x.today.length,2);assert.equal(x.task.kind,'next');
  assert.equal(buildExploration(cards.concat({id:'c',speciesId:'camellia',createdAt:now}),ids,now).task.kind,'complete');
  ```
  Add previous-day 23:59/today00:01 and invalid date fixtures.
- [ ] Step 2: Run node --test tests/native-c-exploration.cjs; confirm missing module failure.
- [ ] Step 3: Implement filtering/dedup/date comparison. Titles: first “收录第一次遇见”; next “发现本章一种新物种”; complete “本章已完成，继续记录新的遇见”. Counts found/targetIds.length, no randomized or timed task.
- [ ] Step 4: home.refresh derives cards from app.getCards and chapter target IDs. Render compact brand, open paper illustration area with local CSS leaf/flower shapes, task paper sign, primary “去拍摄”, secondary “从相册选择”, today cards, “探索生境”. For album route pass source=album; in Task6 consume it without automatic upload. Remove seasonal claims like “春日观察” outside season; retain case access in library. Do not modify source images.
- [ ] Step 5: Run model test plus tests/native-page-data-contract.cjs; update obsolete ink-cover expectations in native-tabs only. VM-test home with empty/example-only/duplicate data and verify no fake completion. Report screenshots and test output.

## Task 4: Achievable chapter, collection/example separation

**Files:** Modify native/lib/chapter-model.js; native/pages/library/index.js/index.wxml/index.wxss; tests/native-example-cards.cjs; tests/native-library-runtime.cjs. Create tests/native-c-chapter.cjs. Never edit native/lib/example-cards.js.

**Interfaces:** chapter.cells contains seven real species cells; computeChapterProgress returns {found,total,milestones,cells}. milestones=[3,6,7] restricted by found. This is chapter display feedback, separate from app.getBadges category achievements.

- [ ] Step 1: Create tests/native-c-chapter.cjs:

  ```js
  const assert=require('node:assert/strict'),{chapter,computeChapterProgress}=require('../native/lib/chapter-model');
  assert.equal(chapter.cells.length,7);
  const cards=chapter.cells.map((x,i)=>({id:String(i),speciesId:x.speciesId}));
  assert.equal(computeChapterProgress(chapter,cards).total,7);
  assert.equal(computeChapterProgress(chapter,cards.concat(cards)).found,7);
  assert.deepEqual(computeChapterProgress(chapter,cards).milestones,[3,6,7]);
  assert.throws(()=>computeChapterProgress(chapter,[{kind:'example',speciesId:'kingfisher'}]));
  ```
- [ ] Step 2: Run node --test tests/native-c-chapter.cjs, observing current9/null-cell failure.
- [ ] Step 3: Remove only the two null cells from chapter-model. Derive total from non-null species IDs, never add species records. Render chapter.total rather than hardcoded9, stamp-style milestone labels, category/finish pills with selected text indicator. Keep app.matchesFilters and existing card identifiers.
- [ ] Step 4: Separate real empty/filter-no-match states; keep seven-case strip headed “案例，不计入收藏”. Preserve card ratios and collectible component. Add VM filter-combination assertions for bird+holo, plant+standard, no-match and reset.
- [ ] Step 5: Run node --test tests/native-c-chapter.cjs tests/native-example-cards.cjs tests/native-library-runtime.cjs tests/native-local-parity.cjs tests/native-tabs.cjs and then node --test tests/*.cjs for full regressions. Fix old9 expectations specifically; do not remove privacy/example tests. Report asset hash parity.

## Task 5: My real experience and badge record

**Files:** Modify native/lib/profile-model.js; native/pages/profile/index.js/index.wxml/index.wxss; tests/native-profile-page-runtime.cjs; create tests/native-c-profile.cjs.

**Interfaces:** buildProfile(cards,state) internally consumes chapter/computeChapterProgress; xp=progress.found,nextXp=progress.total. Existing stats species/count/days remain real. Profile page uses app.getBadges().badges without changing thresholds; stats.badges is earned.length.

- [ ] Step 1: Add failing assertions:

  ```js
  const assert=require('node:assert/strict'),{buildProfile}=require('../native/lib/profile-model');
  assert.equal(buildProfile([{speciesId:'new-species'}]).xp,0);
  const x=buildProfile([{speciesId:'kingfisher'},{speciesId:'kingfisher'},{speciesId:'camellia',sample:true}]);
  assert.equal(x.xp,1);assert.equal(x.nextXp,7);assert.equal(x.stats.count,2);
  ```
  VM-test zero cards produces zero earned badges/notes; fixture earned true badge count matches display.
- [ ] Step 2: Run node --test tests/native-c-profile.cjs; verify current all-species xp fails.
- [ ] Step 3: Derive chapter xp, keep global species stats. Replace fixed level display with “本地观察者” and “探索经验”; show explanation “每收录本章一种新物种，增加1经验”. No points/check-in button. Badge shapes use CSS motifs and text conditions, not emoji; show actual got/need and earned status.
- [ ] Step 4: Profile keeps real notes and local identity; remove wording implying unimplemented large-text or screen-reader settings exist. Actual low-motion toggle stays. Empty notes “给一次遇见写下几句话”, with explicit card selection route rather than invented note.
- [ ] Step 5: Run node --test tests/native-c-profile.cjs tests/native-profile-page-runtime.cjs tests/native-page-data-contract.cjs. Verify zero/partial/full chapter and unknown species screenshots, report without commit.

## Task 6: Align capture, reveal, detail and secondary pages

**Files:** Modify native/pages/observe/index.js/index.wxml/index.wxss; reveal/index.wxml/index.wxss; card/index.wxml/index.wxss; nearby/index.wxml/index.wxss; settings/index.wxml/index.wxss; note/index.wxml/index.wxss. Create tests/native-c-flow-visual.cjs. Do not modify cloudfunctions, card-models or collectible front.

**Interfaces:** observe.onLoad(options) accepts source==='album' and schedules existing album() once; no identify invocation. Existing reveal hold/open/collect/flip and card touch contracts stay unchanged.

- [ ] Step 1: Add VM test of album entry using existing observe harness: onLoad({source:'album'}) invokes chooseMedia once, no wx.cloud calls, no app.saveCards/saveDraft. Add WXML checks for no navigation on reveal/observe and preserved identify/confirmArt/useOriginal/collect handlers.
- [ ] Step 2: Run node --test tests/native-c-flow-visual.cjs; confirm album route and old glyph assertions fail before changes.
- [ ] Step 3: Implement the single-use album entry guarding onHide/unload; reuse existing album handler. Convert decorative camera/album/location Unicode glyphs to local WXSS icons. Rename nearby entry “探索生境”, clarify static guide and no location/distance.
- [ ] Step 4: Apply paper/green/orange vocabulary to candidate states and inline failure notices. Preserve provider error text, explicit recognition consent, confidence caveats and artwork label. Keep photo frame and card details structure. Use max one short transform/opacity success effect; no infinite animations, no new timers, no stored state changes.
- [ ] Step 5: Run node --test tests/native-c-flow-visual.cjs tests/native-card-interaction.cjs tests/native-strict-create.cjs tests/native-strict-session.cjs tests/native-reveal-machine.cjs. Report capture/unknown/candidate/failure/reveal/front/back screenshots.

## Task 7: Accessibility, small screens, low motion and final verification

**Files:** Create tests/native-c-accessibility.cjs; modify only task1–6 styles/templates where verification requires; create docs/plans/2026-09-20-bright-nature-exploration-verification.md.

**Interfaces:** Every active page reads existing nature.reduceMotion and uses class reduce-motion where animation exists. No new persistent preference keys.

- [ ] Step 1: Add failing static assertions that animated page templates expose reduceMotion/reduce, icons include readable labels, no animation:...infinite or backdrop-filter exists in redesigned page CSS. Add VM checks for low motion reveal skipping vibration and card tilt without changing existing tests.
- [ ] Step 2: Run node --test tests/native-c-accessibility.cjs; record failures, then add missing classes and disable transitions/animations in reduce-motion selectors. Keep text feedback visible.
- [ ] Step 3: Inspect actual DevTools at375/390/430px and large system text; check safe area,44px touch targets, long species name and Latin wrap, protection text, empty notes, seven examples and failure messages. Record observed results; if a real-phone check is unavailable, label it unverified.
- [ ] Step 4: Run node --test tests/*.cjs and npm run build:weapp. Check JS and JSON plus official single-file compiler:

  ```sh
  node - <<'NODE'
  const fs=require('fs'),cp=require('child_process'),path=require('path');
  const bin='/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec';
  function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.js'))cp.execFileSync(process.execPath,['--check',p]);else if(p.endsWith('.json'))JSON.parse(fs.readFileSync(p,'utf8'));else if(/\.(wxml|wxss)$/.test(p)){const xml=p.endsWith('.wxml');cp.execFileSync(path.join(bin,xml?'wcc':'wcsc'),[...(xml?['-d']:[]),'-o','/tmp/nature-c-compile.js',p],{stdio:'pipe'});}}}
  walk('native');JSON.parse(fs.readFileSync('app.json','utf8'));
  console.log('PASS native syntax, JSON and official templates');
  NODE
  ```
- [ ] Step 5: Compare every baseline entry from /tmp/nature-c-baseline.json with current SHA-256 using Node crypto; require zero changes. Capture exact test counts, compile result, screenshots and known cloud429 blocker in verification doc. No cloud validation/deployment under this UI task.
- [ ] Step 6: Controller reviews evidence for each spec acceptance gate. Only after screenshot and behavioral review mark UI implemented; do not equate it with the blocked AI service being production-ready.

## Plan self-review

- Spec coverage: C palette/type/assets Task1; capture navigation Task2; true home tasks Task3; chapter/cases Task4; real experience/badges Task5; flow/secondary alignment Task6; reduced motion/readability/safety/integrity Task7.
- Interface consistency: tabs remains3; navigationItems adds only capture action. buildExploration and computeChapterProgress use identical target IDs. buildProfile retains public shape, changes only chapter xp derivation. No new cloud APIs.
- No production calls, new example records, fake rewards or new source-image files are planned.
- Design scope is approved; execution remains paused until controller authorizes implementation. This document does not change application behavior.
