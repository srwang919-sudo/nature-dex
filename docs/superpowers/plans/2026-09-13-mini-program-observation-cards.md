# 微信小程序观察卡片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Taro WeChat Mini Program turn a user-selected photo into a locally stored, confirmed observation card with lightweight reveal and interactive viewing.

**Architecture:** Keep camera acquisition, draft/identification state, card rendering, and collection persistence separate. Persist photo files with Taro and persist only metadata in storage. Use CSS transform interaction, not WebView or WebGL, for the first mini-program card scene.

**Tech Stack:** Taro 4.2.1, React 18, TypeScript 5.3, WeChat Mini Program APIs, SCSS.

**Spec:** `docs/plans/2026-09-13-mini-program-design.md`

## Global Constraints

- Preserve the existing App; work only in `去大自然里-mini`.
- Photo capture and identification are separate user actions.
- The demo recognizer must label its result as local demo and never claim to recognize arbitrary pixels.
- Unknown results create no card.
- Use `Taro.saveFile` for photo persistence; never store Base64 image bytes in synchronous storage.
- Card ratio is 5:7; first release uses native mini-program components and CSS transforms, never a WebView.
- Do not implement cloud accounts, transfers, public sharing, real recognition, or print fulfilment.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/observations.ts` | Typed draft/card persistence, saved-file lifecycle, demo identification, confirmation transaction |
| `src/utils/observations.test.ts` | Unit tests using mocked Taro storage/filesystem APIs |
| `src/components/CollectibleCard/index.tsx` | Reusable 5:7 card and pointer/tap interaction |
| `src/components/CollectibleCard/index.module.scss` | Card material themes, front/back, motion-off styles |
| `src/pages/viewfinder/index.tsx` | Acquire photo, create draft, initiate demo identification, explicit confirmation/unknown flow |
| `src/pages/reveal/index.tsx` | One-time reveal and card handoff to collection/detail |
| `src/pages/card/index.tsx` | Render a persisted card by card id and display accessible flip control |
| `src/pages/home/index.tsx` | Render local collection count and cards from storage |
| `src/app.config.ts` | Register reveal page |
| `src/utils/storage.ts` | Versioned storage keys only |
| `package.json` | Add test script and minimal test dependencies if not already available |

### Task 1: Establish testable observation persistence

**Files:**
- Create: `src/utils/observations.ts`
- Create: `src/utils/observations.test.ts`
- Modify: `src/utils/storage.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `ObservationDraft`, `CollectedCard`, `createDraft(tempPath: string, source: DraftSource): Promise<ObservationDraft>`, `identifyDemo(draft: ObservationDraft, target?: SpeciesKey): Promise<IdentifyResult>`, `confirmCard(draft: ObservationDraft, speciesId: SpeciesKey): CollectedCard`, `listCards(): CollectedCard[]`, `findCard(cardId: string): CollectedCard | null`, `markRevealSeen(cardId: string): void`, and `deleteDraft(draftId: string): Promise<void>`.
- Consumes `SpeciesKey` from `src/data/species.ts` and Taro file/storage APIs.

- [ ] **Step 1: Add a test runner, then write failing tests for photo persistence and confirmation**

Add `"test": "vitest run"` and dev dependencies `vitest`, `@testing-library/react`, `react-test-renderer`, and `miniprogram-simulate`. Add `vitest.config.ts` with a lightweight `@tarojs/taro` mock for storage and file APIs. Then add:

```ts
it('saves the selected temporary photo before creating a ready draft', async () => {
  mockSaveFile.mockResolvedValue({ savedFilePath: 'wxfile://saved.jpg' })
  await expect(createDraft('wxfile://temp.jpg', 'camera'))
    .resolves.toMatchObject({ photoPath: 'wxfile://saved.jpg', status: 'ready' })
})

it('creates one card only after explicit candidate confirmation', async () => {
  const draft = await createDraft('wxfile://temp.jpg', 'album')
  await expect(confirmCard(draft, 'kingfisher')).resolves.toMatchObject({ speciesId: 'kingfisher' })
  expect(listCards()).toHaveLength(1)
})
```

- [ ] **Step 2: Run the new unit test to verify it fails**

Run: `npm test -- observations.test.ts`

Expected: FAIL because `observations.ts` and its exports do not exist.

- [ ] **Step 3: Implement typed metadata persistence and failure handling**

```ts
export async function createDraft(tempPath: string, source: DraftSource): Promise<ObservationDraft> {
  const saved = await Taro.saveFile({ tempFilePath: tempPath })
  const draft = { id: createId(), photoPath: saved.savedFilePath, createdAt: new Date().toISOString(), source, status: 'ready' as const }
  writeDrafts([...readDrafts(), draft])
  return draft
}

export function confirmCard(draft: ObservationDraft, speciesId: SpeciesKey): CollectedCard {
  if (draft.status !== 'ready' && draft.status !== 'unknown') throw new Error('DRAFT_NOT_CONFIRMABLE')
  const card = { id: createId(), draftId: draft.id, speciesId, photoPath: draft.photoPath, createdAt: new Date().toISOString(), finish: finishFor(draft.id), revealSeen: false }
  writeCards([...listCards(), card])
  writeDrafts(readDrafts().map(value => value.id === draft.id ? { ...value, status: 'confirmed', candidateId: speciesId } : value))
  return card
}
```

`createDraft` must return a meaningful error to the page when `saveFile` rejects. `listCards` must drop records whose `photoPath` is empty; no image bytes may be placed in storage.

- [ ] **Step 4: Run unit tests and build**

Run: `npm test -- observations.test.ts && npm run build:weapp`

Expected: PASS; build emits `dist/` with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json src/utils/storage.ts src/utils/observations.ts src/utils/observations.test.ts
git commit -m "feat: persist local observation drafts and cards"
```

### Task 2: Make photo confirmation and identification explicit

**Files:**
- Modify: `src/pages/viewfinder/index.tsx`
- Modify: `src/pages/viewfinder/index.module.scss`
- Test: `src/pages/viewfinder/index.test.tsx`

**Interfaces:**
- Consumes `createDraft`, `identifyDemo`, `confirmCard` from `utils/observations`.
- Produces navigation to `/pages/reveal/index?cardId=<id>` only after `confirmCard` returns.

- [ ] **Step 1: Write failing page tests**

```tsx
it('shows a confirmation state after a photo is saved and does not identify until the button is tapped', async () => {
  mockChooseMedia.mockResolvedValue({ tempFiles: [{ tempFilePath: 'wxfile://temp.jpg' }] })
  render(<Viewfinder />)
  await tap('拍照')
  expect(screen.getByText('开始鉴别')).toBeTruthy()
  expect(identifyDemo).not.toHaveBeenCalled()
})

it('keeps an unknown result as a draft and does not navigate to reveal', async () => {
  identifyDemo.mockResolvedValue({ kind: 'unknown' })
  await tap('开始鉴别')
  expect(Taro.navigateTo).not.toHaveBeenCalled()
  expect(screen.getByText('暂未确认')).toBeTruthy()
})
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- viewfinder/index.test.tsx`

Expected: FAIL because the current shutter immediately launches a fixed `setTimeout` result.

- [ ] **Step 3: Replace the target-cycle simulation with a clear local-demo flow**

Use four explicit states: `empty`, `draftReady`, `identifying`, `candidate | unknown`. The primary actions must read “拍照”, “从相册选”, then “开始鉴别”. Put demo target controls behind a small “演示选项” disclosure. Candidate copy must include `本地演示结果，请根据照片核对` and buttons `确认生成卡片`, `不是这个`, `手动选择`.

- [ ] **Step 4: Run focused test and build**

Run: `npm test -- viewfinder/index.test.tsx && npm run build:weapp`

Expected: PASS; no route points to card detail before confirmation.

- [ ] **Step 5: Commit**

```bash
git add src/pages/viewfinder/index.tsx src/pages/viewfinder/index.module.scss src/pages/viewfinder/index.test.tsx
git commit -m "feat: separate photo capture from card confirmation"
```

### Task 3: Add a reusable lightweight collectible card

**Files:**
- Create: `src/components/CollectibleCard/index.tsx`
- Create: `src/components/CollectibleCard/index.module.scss`
- Test: `src/components/CollectibleCard/index.test.tsx`

**Interfaces:**
- Consumes `CollectedCard` and `SPECIES`.
- Props: `card: CollectedCard`, `reducedMotion?: boolean`, `onFlip?: (back: boolean) => void`.
- Renders real `card.photoPath`, not `species.img`, as its front image.

- [ ] **Step 1: Write failing component tests**

```tsx
it('uses the card photo and displays a 5:7 card shell', () => {
  render(<CollectibleCard card={fixtureCard} />)
  expect(image('你拍摄的普通翠鸟').props.src).toBe('wxfile://saved.jpg')
  expect(shell.props.className).toContain('ratio')
})

it('flips via its explicit control even when motion is reduced', async () => {
  render(<CollectibleCard card={fixtureCard} reducedMotion />)
  await tap('看背面')
  expect(screen.getByText('观察档案')).toBeTruthy()
})
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- CollectibleCard/index.test.tsx`

Expected: FAIL because `CollectibleCard` does not exist.

- [ ] **Step 3: Implement card front, back, finishes, and gestures**

Use CSS `aspect-ratio: 5 / 7`, an image with `mode='aspectFill'`, finish-specific classes, `onTouchStart/onTouchMove/onTouchEnd` to clamp tilt to ±8 degrees, and an explicit `onTap` flip control. Record `moved` only after a 6px threshold so dragging never flips the card. When `reducedMotion` is true, suppress tilt and shine but preserve explicit flip.

- [ ] **Step 4: Run component test and build**

Run: `npm test -- CollectibleCard/index.test.tsx && npm run build:weapp`

Expected: PASS; the 5:7 card uses a saved photo path.

- [ ] **Step 5: Commit**

```bash
git add src/components/CollectibleCard
git commit -m "feat: add tactile local-photo collectible cards"
```

### Task 4: Add reveal routing and persistent card detail

**Files:**
- Create: `src/pages/reveal/index.tsx`
- Create: `src/pages/reveal/index.config.ts`
- Create: `src/pages/reveal/index.module.scss`
- Modify: `src/pages/card/index.tsx`
- Modify: `src/app.config.ts`
- Test: `src/pages/reveal/index.test.tsx`

**Interfaces:**
- Consumes `findCard`, `markRevealSeen` and `CollectibleCard`.
- Accepts `cardId` route parameter.
- Produces one-time reveal, then card detail or home navigation.

- [ ] **Step 1: Write failing tests for first/repeated visit**

```tsx
it('shows the sealed card only before the first reveal', () => {
  mockFindCard.mockReturnValue({ ...fixtureCard, revealSeen: false })
  render(<Reveal />)
  expect(screen.getByText('轻点揭晓')).toBeTruthy()
})

it('opens an already revealed card without replaying the sealed state', () => {
  mockFindCard.mockReturnValue({ ...fixtureCard, revealSeen: true })
  render(<Reveal />)
  expect(screen.queryByText('轻点揭晓')).toBeNull()
})
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- reveal/index.test.tsx`

Expected: FAIL because the route and page are absent.

- [ ] **Step 3: Implement reveal and card lookup**

Register the page. The reveal page marks `revealSeen` only after user taps `轻点揭晓`, then shows `CollectibleCard` and “查看收藏”. Card detail reads a `cardId` first and must render the persisted photo; retain existing species detail only for a direct legacy `id` route.

- [ ] **Step 4: Run focused test and build**

Run: `npm test -- reveal/index.test.tsx && npm run build:weapp`

Expected: PASS; direct route to a missing card shows a recoverable “卡片暂不可用” state.

- [ ] **Step 5: Commit**

```bash
git add src/pages/reveal src/pages/card src/app.config.ts
git commit -m "feat: reveal observation cards once and reopen them safely"
```

### Task 5: Drive collection home from local cards and verify in WeChat

**Files:**
- Modify: `src/pages/home/index.tsx`
- Modify: `src/pages/home/index.module.scss`
- Modify: `README.md`
- Test: `src/pages/home/index.test.tsx`

**Interfaces:**
- Consumes `listCards` and `CollectibleCard` preview data.
- Produces photo-first collection grid and empty state with route to viewfinder.

- [ ] **Step 1: Write failing collection tests**

```tsx
it('shows only persisted cards in the collected grid and an accurate count', () => {
  mockListCards.mockReturnValue([fixtureCard])
  render(<Home />)
  expect(screen.getByText('已收藏 1 张')).toBeTruthy()
  expect(image('普通翠鸟收藏卡').props.src).toBe('wxfile://saved.jpg')
})

it('shows the empty invitation when no local card exists', () => {
  mockListCards.mockReturnValue([])
  render(<Home />)
  expect(screen.getByText('去拍一只吧')).toBeTruthy()
})
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- home/index.test.tsx`

Expected: FAIL because home uses its current fixed species-based collection state.

- [ ] **Step 3: Implement photo-first grid and documentation**

Render local cards as 5:7 thumbnail images; direct taps to `/pages/card/index?cardId=<id>`. Keep category filters only if they filter persisted cards, not sample records. Update README instructions for WeChat developer tools, local demo disclosure, test command, and the required real-device checklist.

- [ ] **Step 4: Run all tests and build**

Run: `npm test && npm run build:weapp`

Expected: PASS; WeChat build output is produced.

- [ ] **Step 5: Perform true-device acceptance**

In WeChat Developer Tools, preview to an iPhone and verify: camera permission → photo confirmation → separate identify tap → manual confirmation → reveal → drag and flip → force-close/reopen → photo card remains. Also test cancel, save failure, unknown result, and album import. Record which cases ran and their device/base-library versions in README.

- [ ] **Step 6: Commit**

```bash
git add src/pages/home src/pages/home/index.test.tsx README.md
git commit -m "feat: make local observation cards the collection"
```

## Plan self-review

- Spec coverage: Tasks 1–2 cover persistent photo draft and honest identification; Task 3 covers 5:7 material card, flip, tilt and reduced motion; Task 4 covers one-time reveal/reopen; Task 5 covers collection and required real-device acceptance.
- Deliberate gaps: real recognition, cloud storage/account, user-photo sharing, printing and WebGL remain explicitly out of scope per spec.
- Type consistency: `ObservationDraft`, `CollectedCard`, `createDraft`, `confirmCard`, `listCards`, `findCard`, and `markRevealSeen` form the single state boundary. Task 1 exports the lookup and reveal update functions that Task 4 consumes.
- Placeholder scan: no unresolved implementation placeholders are used; real-device acceptance is explicitly external verification, not an unassigned code item.
