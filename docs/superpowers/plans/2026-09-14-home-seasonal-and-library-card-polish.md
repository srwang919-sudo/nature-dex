# Home Seasonal and Library Card Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the approved home seasonal cards and library card proportions while preserving local-data semantics and navigation.

**Architecture:** `home/index.js` supplies fixed editorial seasonal copy plus real-card-first collection data. WXML/CSS own the reference layout. `library/index.js` continues to consume only owned cards; its WXML/CSS render fixed-ratio cards and chapter thumbnails.

**Tech Stack:** WeChat Mini Program WXML/WXSS/JavaScript, Node `assert`, official `wcc` and `wcsc` compilers.

**Spec:** `docs/plans/2026-09-14-home-seasonal-and-library-card-polish-design.md`

## Global Constraints

- Do not upload, preview, commit, or initialize Git.
- Use only local project assets and actual stored cards for personal data.
- Examples are read-only and never count as owned cards.
- All tap targets are at least `88rpx` high or wide.
- Preserve reveal, 3D, flip, export and return behavior.

---

### Task 1: Home seasonal card model and routes

**Files:**
- Modify: `native/pages/home/index.js`
- Modify: `native/pages/home/index.wxml`
- Test: `tests/native-home-polish-runtime.cjs`

**Interfaces:**
- Consumes: `app.globalData.species`, `app.decorate(card)`, `getExampleCards()`.
- Produces: page data `{todayCards, seasonalCards, usingExamples}` and methods `library`, `nearby`, `openSeasonal`.

- [ ] **Step 1: Write the failing runtime test**

```js
home.refresh();
assert.deepEqual(home.data.seasonalCards.map(card=>card.title), ['春日观察','水边的生灵']);
assert.equal(home.data.seasonalCards.length, 2);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-home-polish-runtime.cjs`

Expected: failure because `seasonalCards` is absent.

- [ ] **Step 3: Implement the fixed editorial model and route methods**

```js
const seasonalCards=[
 {id:'spring',title:'春日观察',subtitle:'万物复苏的相遇',image:'/assets/images/camellia.jpg'},
 {id:'waterside',title:'水边的生灵',subtitle:'发现身边的野趣',image:'/assets/images/egret.jpg'}
];
this.setData({seasonalCards});
```

Route `library()` to `/native/pages/library/index`, `nearby()` to the actual nearby route, and `observe()` to `/native/pages/observe/index`.

- [ ] **Step 4: Implement the reference WXML**

```xml
<text class="more" bindtap="nearby">更多 ›</text>
<view class="seasonal-list"><view wx:for="{{seasonalCards}}" class="seasonal-card">...</view></view>
```

Do not render `latin`, `habitat`, or `season` on these cards.

- [ ] **Step 5: Run the targeted test**

Run: `node tests/native-home-polish-runtime.cjs`

Expected: PASS.

### Task 2: Home reference CSS and hit targets

**Files:**
- Modify: `native/pages/home/index.wxss`
- Test: `tests/native-production-static.cjs`

**Interfaces:**
- Consumes: `.seasonal-card`, `.entry`, `.hero-camera` in home WXML.
- Produces: two-column seasonal cards and pressed feedback classes.

- [ ] **Step 1: Write failing static assertions**

```js
assert.ok(homeCss.includes('width:329rpx') && homeCss.includes('height:285rpx'));
assert.ok(homeCss.includes('height:160rpx'));
assert.ok(homeCss.includes(':active'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-production-static.cjs`

Expected: failure on missing seasonal dimensions.

- [ ] **Step 3: Implement exact size rules**

```css
.seasonal-card{width:329rpx;height:285rpx;padding:0}
.seasonal-card image{height:160rpx;width:100%}
.entry{min-height:160rpx}.entry:active,.seasonal-card:active{transform:scale(.98)}
```

Ensure buttons/cards use a minimum `88rpx` touch size.

- [ ] **Step 4: Run the targeted test**

Run: `node tests/native-production-static.cjs`

Expected: PASS.

### Task 3: Library card ratio and chapter thumbnails

**Files:**
- Modify: `native/pages/library/index.wxml`
- Modify: `native/pages/library/index.wxss`
- Test: `tests/native-library-runtime.cjs`
- Test: `tests/native-production-static.cjs`

**Interfaces:**
- Consumes: `chapter.cells` with `{speciesId, lit}` and decorated card images.
- Produces: `5:7` card wrappers and thumbnail/placeholder chapter cells.

- [ ] **Step 1: Write failing static assertions**

```js
assert.ok(libraryCss.includes('width:278rpx;height:389rpx'));
assert.ok(libraryCss.includes('height:430rpx'));
assert.ok(!library.includes("item.lit?'●':'○'"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/native-production-static.cjs`

Expected: failure because the old chapter text glyphs and wrapper dimensions remain.

- [ ] **Step 3: Render thumbnails and placeholders**

```xml
<image wx:if="{{item.lit}}" src="{{item.image}}" mode="aspectFill"/>
<view wx:else class="chapter-placeholder">未发现</view>
```

Create page data that maps a lit chapter cell to its owned card image. Keep unlit values private and generic.

- [ ] **Step 4: Implement ratio-safe CSS**

```css
.collection-card{height:389rpx}
.example-item{width:278rpx;height:389rpx}
.example-scroll{height:430rpx}
.example-item collectible,.collection-card collectible{display:block;width:100%;height:100%}
```

Delete the external duplicate example label.

- [ ] **Step 5: Run library tests**

Run: `node tests/native-library-runtime.cjs && node tests/native-production-static.cjs`

Expected: PASS.

### Task 4: Full validation

**Files:**
- Test: `tests/*.cjs`

- [ ] **Step 1: Run all behavioral tests**

Run: `for f in tests/*.cjs; do node "$f"; done`

Expected: every test prints PASS.

- [ ] **Step 2: Run syntax and official template compilers**

Run:

```bash
node --check app.js
for f in $(find native cloudfunctions -name '*.js'); do node --check "$f"; done
for f in $(find native -name '*.wxml'); do wcc -o /tmp/out.js "$f"; done
for f in $(find native -name '*.wxss'); do wcsc -o /tmp/out.wxss "$f"; done
```

Expected: exit status 0.

- [ ] **Step 3: Check resource budget**

Run: `find assets -type f -size +200k -print`

Expected: no active asset is reported.
