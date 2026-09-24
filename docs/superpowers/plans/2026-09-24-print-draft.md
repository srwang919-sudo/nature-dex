# Own-observation print draft Implementation Plan

> **For agentic workers:** Execute inline under controller approval, tests first. Preserve all unrelated dirty work; no deployment or payment calls.

**Goal:** Build a safe 24-card print selection/preview/draft flow at server-priced ¥59.9.

**Architecture:** Existing createArtCard function owns doc-only quote/draft transactions. Native print page persists ordered IDs and uses current card PNG renderer for previews; unsupported gifts are disabled. No new provider or payment integration.

**Tech Stack:** Native mini-program, CloudBase server SDK, Node tests.

**Spec:** `docs/plans/2026-09-24-print-draft-design.md`.

## Global Constraints
- 63×88mm trim, 3mm bleed, 300dpi, exactly 24 distinct cards, server 5990 fen.
- Own saved real observations only; gifted copies “素材未授权”. Never upload addresses or read another owner's photos.
- Fail closed on changed/deleted/foreign source, no payment or refunded-order resurrection.

### Task 1: Server quote and immutable draft
**Files:** cloudfunctions/createArtCard/print-draft.js and index.js; initCollections/index.js; managePrivacy/core.js; tests/cloud-print-draft.cjs; tests/cloud-collection-setup.cjs.
**Interface:** `printOrder({db,owner,event,now,wait})` consumes actions print_quote/print_draft and ordered cardIds; returns safe quote or draft receipt.
- [ ] Create failing fixture tests for 24 IDs, order, foreign/deleted/source edits, idempotency, terminal status, transactional conflicts and unknown fields.
- [ ] Implement server snapshot builder with account and observation fences; hash `{sku,items}`; draft ID `sha256(owner+'|print|'+idempotencyKey)`.
- [ ] Run `node --test tests/cloud-print-draft.cjs tests/cloud-collection-setup.cjs` and confirm green.

### Task 2: Shared physical renderer
**Files:** native/lib/card-export.js; native/pages/card/index.wxml; tests/native-export.cjs; tests/native-print-flow.cjs.
**Interface:** PRINT_SPEC becomes `{width:815,height:1110,trimWidth:744,trimHeight:1039,bleedMm:3,dpi:300}`. Print render scales existing 821×1121 logical drawing, physical crop marks use rounded trim; nonprint exports retain their existing dimensions.
- [ ] Assert `Math.round((63+6)*300/25.4)===815` and corresponding height/trim; verify safe-zone geometry and unchanged share export.
- [ ] Update one renderer and quality calculations; run `node --test tests/native-export.cjs tests/native-print-flow.cjs`.

### Task 3: Ordered selection and honest preview
**Files:** native/lib/print-order.js; native/pages/print/index.js,index.wxml,index.wxss; app.json; native/pages/library/index.js,index.wxml; tests/native-print-flow.cjs.
**Interface:** safe selections contain serverCardId only; local key `nature.print.selection.v1`, draft receipt `nature.print.draft.v1`. Explicit preview opens existing card PNG controls; server draft is not a payment/order success.
- [ ] Test gift/example/legacy exclusions, selection order/reorder, stale quote invalidation and absence of payment/address calls.
- [ ] Implement 0/24 selection, ordered preview and server quote/draft buttons; show payment unavailable. Keep denied gifts visible and reasons explicit.
- [ ] Run full `npm test`, `npm run build:weapp`, node syntax/JSON, official wcc/wcsc for print/library/card; isolate files/hunks, verify clean checkout, commit `feat: add own-card print selection and safe draft quotes`.
