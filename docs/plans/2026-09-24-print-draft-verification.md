# Phase 14 print draft — local evidence, 2026-09-24

## Available locally

Atlas → 制作实体卡: select 24 distinct owner server-verified observation cards, preserve/reorder positions, generate individual front/back PNG previews with the existing renderer, obtain a server-owned 5990-fen quote, save an immutable private draft snapshot and a local safe receipt. Stored request key is reused after uncertainty/restart. Changing selection invalidates the displayed quote/draft. Cached drafts are explicitly labelled as requiring online revalidation.

Gifted copies are shown only on explicit load, disabled with “素材未授权”. No friend's photograph is accessed. Examples, local-only legacy cards, missing verified numbers and deleted records are excluded. The quote API accepts only card IDs, never owner, prices, addresses, file IDs or payment state. Server reads saved owner Card/Observation, source receipt, private original path, valid candidate/official art, deletion marker and fences. It writes the observation/account/artwork fences in the same doc-only transaction. Source edits invalidate the digest; replay is idempotent; closed/paid/refunded/cancelled state is not reopened. New drafts have a provisional 10-per-owner/day storage-abuse cap; replay is not charged. `printOrderDrafts` is server-only and included in account erasure.

## Renderer specification

63×88 mm trimmed at 300 DPI → 744×1039 px; plus 3 mm bleed on each edge → 815×1110 px. Fractions are rounded to the nearest pixel. Existing 821×1121 logical drawing is mapped to the print canvas; share exports retain their old geometry. Crop marks use the new physical trim bounds. Print text has at least 6 mm output-edge inset; the original-photo region is shortened slightly to keep its footer in that safe zone. Effective source DPI is recalculated for the actual printed image frame; PNG upscaling does not claim to restore detail.

## Local checks

- Focused server/native/export/collection setup: 11/11 passed.
- Working-tree `npm test`: 204/204 passed.
- `npm run build:weapp`: passed native-source/syntax checks.
- Official wcc/wcsc: print, library and card pages (six files) passed.
- Server syntax and `git diff --check`: passed.
- Isolated index checkout after clean root/natureSocial installation: 204/204 tests, build and the same six official template/style compilations passed. Unrelated existing dirty files/hunks were excluded.

Tests cover deterministic ordering, duplicate/missing/foreign/gift/deleted rejection, modified-card digest rejection, immutable snapshot, concurrent duplicate creation, deletion-write conflict, terminal/refund boundary, client amount/address rejection, selection/reorder, request key reuse and physical PNG/safety geometry. These are isolated local mocks, not CloudBase production evidence.

## Not ready for purchase or production

No deployment or external changes were performed. Provision `printOrderDrafts` with client reads/writes denied and deploy the createArtCard additions only after review. Test real CloudBase transaction duration/conflicts with 24 records, account erasure and private resource ACL. The quote/draft is not a paid order or manufacturing package: no merchant transaction, address, refund processing, fulfillment, PDF/batch package, or printer API is connected. Actual device PNG quality, all 24 front/back approvals, final server-side print package generation and manufacturing proof are still required. The current preview reads local displayed metadata while the immutable draft uses server metadata; a production renderer must render exclusively from the final snapshot before purchase is enabled. Gift original-photo/source attribution authorization remains explicitly unresolved and disabled. This is a non-purchasable preparation slice, not a launch-ready print service.
