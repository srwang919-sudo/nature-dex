# Verified discovery vertical slice — local evidence

## Actual implementation

`createArtCard.finalize` accepts only action/operationId. OPENID is server-derived. It rereads the existing private ready operation and owner/photo-bound completed recognition receipt, then saves natureObservations and natureCards in the same transaction as userSpeciesDiscoveries and natureSpecies's monotonic per-species counter. Canonical species comes from the receipt matched against the existing operation, never a finalize free-text argument.

Deterministic SHA-256 document IDs enforce observation idempotency and owner/species uniqueness. The species document is written for each new discoverer; same-owner repeated observations update history/count but retain number. No random/local serial becomes a Discovery Number. Gift flags, species overrides and client numbers are rejected. Original photo remains private and art remains candidate/nonofficial.

The account marker is written through the existing generation gate; finalize also writes the attestation shared with deletion and the art operation shared with cancellation. These writes—not reads alone—force conflicts. Named transaction conflicts get up to three bounded retries. No provider or network operation runs inside the transaction.

Deletion revokes domain records idempotently, removes their private asset references and decrements active observation count once; never rewinds the species counter. Account erasure includes all three owner-bound domain tables; the nonpersonal species counter survives. cleanupObservationAssets includes the identical deletion implementation.

Native observe calls finalize only after photo/art/science verification, and persists/navigates only on a valid matching saved receipt. Generation/service/resource/storage/stale failures do not create a local card. If the server committed but transport/local storage failed, same-operation retry recovers its receipt; a remote transaction cannot be rolled back by a failed local write. Leaving the abandoned observation uses the existing durable cleanup queue. Server savedAt is not presented as an invented capture time.

## Local verification

- Isolated index checkout: `/tmp/nature-discovery-oU4u1v/checkout` (excludes unrelated old UI work).
- `npm test`: 121 tests passed, 0 failed; `/tmp/nature-discovery-tests.log`.
- `npm run build:weapp`: native source/syntax passed.
- Focused tests: snapshot write-set conflicts for concurrent owners, idempotent repeat, missing/foreign receipt, erasure/deletion after snapshot, gift/number injection, repeated deletion, unavailable/stale client responses, local save failure and confirmed science preservation.
- Tests deliberately reject transaction `where`; collection queries are not used in finalize.

## Official contract and external gates

Checked 2026-09-23: [CloudBase transactions](https://docs.cloudbase.net/database/transaction), [transaction conflict](https://docs.cloudbase.net/error-code/DATABASE_TRANSACTION_CONFLICT). The service follows documented server-side doc operations and conflict semantics. Mock tests do not establish real production concurrency or runtime compatibility.

Before deployment, create natureSpecies/natureObservations/natureCards/userSpeciesDiscoveries through the fixed initialization allowlist, with client read/write denied; deploy matching createArtCard/deleteObservationAssets/cleanupObservationAssets/managePrivacy together. Verify real concurrent first saves, retry after lost response, account erasure, private file access and operation history. Collections missing or old cloud code fail closed; this version is not claimed production-enabled.

Historical baseline is a mandatory additional gate. The service never treats an absent Species counter as zero. An operator-reviewed migration must set `counterStatus:'initialized'`, a nonempty `baselineVersion`, and an integer `lastDiscoveryNumber` after reconciling old observations. Tests explicitly seed a reviewed empty fixture and separately assert unknown baseline rejection / baseline 50 → next 51. There is no client initialization endpoint. Unknown baseline returns `discovery_baseline_unavailable` and local UI says not collected. Do not enable the paid generation flow in production until migration/preflight is verified, to avoid generating an image before discovering a blocked save.

Known next-stage blockers remain real: speciesIllustration's historical ready cache has no review gate, and operational daily generation caps do not release failed work. This slice neither exposes that cache as official artwork nor claims the quota wallet is implemented. Both need code changes and their own verification before release.

Still outside this slice: approved shared SpeciesArtwork lookup/review, quota reservation/refund ledger, restore/list remote observations after reinstall, final UI/number typography, actual membership connection, Like/Gift refinements and physical printing. No deployment, provider call, preview or asset restoration was performed.
