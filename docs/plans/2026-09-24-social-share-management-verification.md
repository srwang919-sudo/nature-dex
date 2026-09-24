# Sent shares and gifted copies — second local slice

## Implemented contract

- `listSentShares({cursor})` derives owner from CloudBase context. Sorted `_id` seek pagination returns 20 records with one-row lookahead; cursor is opaque and owner/purpose-bound. The owner query remains the authorization boundary even with cursor possession. Pagination executes outside transactions; erased counterpart rows may be filtered without losing the raw continuation boundary.
- Share history can be loaded after reopening the app, continued and individually revoked via `revokeSpeciesShare`. Original source owners can find an active approved copy ID from their sent-share row and call `revokeGiftedCopy`.
- `deleteGiftedCopy({copyId})` requires recipient; `revokeGiftedCopy({copyId})` requires original source owner. Both serialize on the same copy document and replace it with a minimal removed tombstone. Tombstone retains internal authorization parties, status and non-discovery flags, but removes species/provenance/source-share payload. Existing account-erasure collection coverage removes these records. No private metadata is emitted.
- Copy list excludes removed rows. Repeated deletion is idempotent; original approval replay returns `copy_removed`, never recreates the copy. The approved slot stays reserved to prevent varying request keys from restoring it. Original observations/cards are unaffected.
- New approved copies take species from the server's original species-card document, after live source verification. Public provenance is only `approved_friend_copy`, “匿名收藏者” and species ID. No nickname consent model exists, so no nickname/avatar/OPENID is fabricated or exposed. Legacy copies receive the same anonymous safe projection.
- Settings offers history load/more/revoke, received-copy delete and source withdrawal; all are explicit user actions with confirmation and server completion before successful UI state.

## Evidence

- Working-tree `npm test`: **182/182**.
- `npm run build:weapp`: passed.
- Official settings `wcc`/`wcsc` single-file compile: **2/2**.
- `node --check`: **4/4**, social core/repository/memory adapter/account gate.
- Regression coverage includes 26-share pagination without duplicates, cross-owner cursor denial, foreign revocation/deletion denial, concurrent recipient deletion/source withdrawal, idempotency, no resurrection through approval replay, private-field-free provenance, native page continuation/deduplication and API-only deletion.
- Repository test confirms owner filter, `_id` greater-than seek, ascending order and 21-row bounded fetch. Concurrency tests use the local serialized transaction repository; they are not live CloudBase proofs.

## External / remaining gates

No deployment, production calls, payment/printing changes, asset restoration or private-data deletion occurred during implementation. Production collection ACL, compound query/index availability, actual CloudBase conflict/retry behavior and two-account device flows require deployment and explicit live verification.

Only sent-share history is newly paginated. Other social lists retain their existing 100-record limit, and the share picker still exposes six local observations. Proactive owner-initiated Gift is separate from the implemented request/approval copy. A public profile/nickname consent model is absent by design; provenance remains anonymous. Previously cached client copy views may display stale text until refreshed, but the server no longer returns a deleted record. No discovery/number/achievement is issued by any of these actions.
