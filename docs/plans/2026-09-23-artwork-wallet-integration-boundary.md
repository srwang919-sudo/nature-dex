# Artwork / wallet integration checkpoint

The new repository and wallet primitives are not yet exposed by production entry points. No quota or official-library availability is claimed by the UI. Existing daily operational caps remain unchanged until resolver wiring and refund handling land together.

## Implemented primitives

- `officialArtwork`: only approved + is_official entries selected through a canonical-species index. Never reads legacy speciesWatercolors.ready.
- `reviewArtwork`: a server-controlled artworkReviewers hashed-identity document must be active; its generation is written to fence role revocation. Writes revisioned review audit events with reviewer hash, decision and time; no image bytes, raw prompt, notes or location.
- Review permits platform_generated and user_first_unlock species-level candidates, never custom_user_generated photo derivatives. Approval requires a separately published server derivative, removes owner/observationId, preserves nonpersonal source classification, and marks contributor anonymous.
- `reserveCreation` / `settleCreation`: lifetime 10 bonus, UTC monthly free 5 / authoritative ACTIVE membership 30; idempotent operation and attempt IDs; reservation and usage ledger; commit/release and rejection of stale/expired commit. Caller must run these in account-fenced transactions.

## Necessary next integration work, not completed

1. Each generation attempt needs a distinct private file path and durable attempt row before invoking the provider. Reusing one operation path after timeout risks late output overwriting a new image.
2. Finalization and cleanup must write the same attempt/account fences. A late output during erasure must enter the existing erasure-only retry mechanism; a direct unguarded write could resurrect user data.
3. Approval must publish a reviewed derivative independently of the creator's private source. Removing the creator's private observation must not delete shared official artwork. Published provenance must be anonymized on erasure; candidates remain owner-scoped and deleted.
4. Cross-user official files need server-authorized temporary URL renewal (bounded 600 seconds), not a client download of another user's private cloud file. Candidate renewal is creator-only; deprecated/rejected access fails closed.
5. The resolver must preflight the historical discovery baseline and official lookup before any paid call. Approved reuse bypasses provider/reservation entirely; no official artwork leads to explicit candidate creation.
6. Hard timeout reconciliation requires an authenticated scheduled worker or an equivalent durable sweep; a caught provider error alone does not cover a terminated cloud function. Its release must be idempotent and fenced against late success.

These concerns require coherent changes to createArtCard, speciesIllustration, deleteObservationAssets, cleanupObservationAssets, managePrivacy and client resource renewal. A partially wired resolver draft was removed rather than expose unsafe cleanup or announce a finished vertical flow. This checkpoint does not satisfy the full Phase 4–8 delivery by itself.
