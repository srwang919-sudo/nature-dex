# Owned-card recovery and review-race verification — 2026-09-23

## Implemented locally

The library now queries `createArtCard.list_owned` on entry, recovers missing finalized observations, validates authorized artwork/original URLs and saves the original locally before atomically updating the collection. It uses stable serverCardId, never calls generation/finalize, and preserves the already assigned Discovery Number. Pagination is bounded to 20 records; opaque owner-bound cursors are checked, while authorization always uses server OPENID and owner queries. No user-supplied owner or file ID is accepted.

`card_resource` signs only the current owner's saved, nondeleted observation's original or permitted artwork, then rechecks the account/observation write fences before returning a URL. URLs expire in 600 seconds and can be requested again. Query responses exclude location, notes and explicit owner fields. Pending-ready local cards merge by serverCardId rather than becoming duplicate records. Original capture dates are not invented when the server only has a save timestamp; legacy local-only notes and places are not uploaded by sync.

Automatic cleanup now retains saved observations inside the deletion transaction. Explicit user deletion remains destructive and owner-derived. The same observation fence conflicts with finalize, so abandoned-upload cleanup cannot silently delete a successfully saved observation after a failed local commit. Local delete/clear invalidates in-flight recovery with the data epoch.

The three review findings are addressed:

1. First-unlock approval checks the observation tombstone and writes the shared trustedObservations fence. A snapshot interleaving with deletion aborts approval. The unapproved derivative is removed; failed removal remains in a durable review job.
2. Private candidate URL signing rechecks account state in a write-fenced transaction after signing and before returning the URL. Mid-signing erasure returns an error, not the URL.
3. Observation deletion removes owner-bound rejected/deprecated candidate metadata as well as candidate metadata. Approved public derivatives remain untouched.

## Verification evidence

Isolated index checkout: `/tmp/nature-resolver-check.P6qaas/checkout`. Unrelated uncommitted five-tab/old UI work was excluded, not deleted.

- `npm test`: **140 passed, 0 failed**.
- `npm run build:weapp`: passed (native verification, no upload).
- `node --check`: **119 native/cloud/app JS files**; **26 JSON files** parsed.
- Official single-file `wcc -d -o ...` and `wcsc -o ...`: **12 WXML / 12 WXSS** passed, including the library syncing/error/retry template.
- End-to-end isolated test: finalize succeeds → no local card → automatic cleanup retains server data → library recovery finds one card with original number → repeated recovery remains one → explicit deletion removes it → subsequent sync removes the local listing.
- Boundary tests: owner pagination/cursor replay, foreign card resources, erasing/deleted data, image/storage/epoch failures, review/delete snapshot conflict, mid-signing erase, provider metadata/final-DB failures, network cleanup retry, generic -1 failure and approved-art preservation.

## What this does NOT prove

No cloud function was deployed, no provider invoked, no production account/configuration changed, and no simulator/device screenshot was taken. Tests use isolated CloudBase-shaped mocks with write-set conflicts; they are not live CloudBase concurrency evidence. Real storage ACLs, signed URL renewal, collection indexes (owner + status + _id), scheduler credentials and leases, reviewer provisioning, discovery baselines and real-device image/storage behavior still require deployment acceptance.

This closes the prior **local implementation** gap for cold-start owned-card recovery. Production recovery remains gated by deployment and true-device validation. Cloud recovery restores server-owned observation/artwork/discovery data; unsynced local-only note/location and legacy random finish information absent from the server cannot be reconstructed. Restored records use standard finish unless an existing pending local card supplies its finish; this does not change rarity or grant a numbered edition.

The broader final V1 UI, custom art, private contributor UI, payment/print/social acceptance and release authorization are not completed by this slice.
