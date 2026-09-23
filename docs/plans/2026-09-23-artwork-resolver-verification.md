# Reviewed artwork resolver — local verification, 2026-09-23

This is a local integration boundary, **not a release approval or production verification**.

## Implemented path

`observe.confirm → speciesIllustration.resolve → approved official reuse OR explicit-consent generate → authorized resource URL / image validation → original local save → createArtCard.finalize → local ready card`.

- Approved official art uses neither provider nor creation reservation. Legacy `speciesWatercolors` entries are not official; legacy `ensure` is closed.
- New species-only text generation creates an owner-private candidate. Every attempt has its own operation document and controlled private file path, with upload intent recorded before provider work. Original observation photos are not generation references.
- Wallet reservation settles once: success commits, failure/timeout releases. Expired attempts become cleanup work. Account and observation write fences prevent snapshot-isolation deletion races from publishing late output.
- Review requires a server-owned reviewer grant, independent official derivative, revision check and audit. Public artwork removes owner/observation identifiers. First-unlock contribution credit remains in a separate private owner/species record; account erasure removes it.
- Authorized resource URLs expire after 600 seconds. Nonowners cannot request candidate URLs. Observation deletion removes private candidates, never approved derivatives.
- The old `createArtCard.submit/status` custom I2I path is disabled (`custom_art_unavailable`). Only strict finalize remains. Custom artwork is not offered as an implemented feature in this boundary.
- Local storage failure after finalize is explicitly shown as **cloud saved / pending sync**, not as an unsaved observation. An in-page retry reuses the completed card without allocating again.

## Inspected local evidence

Clean isolated index checkout: `/tmp/nature-resolver-check.P6qaas/checkout` (excludes unrelated historical UI changes).

- `npm ci --ignore-scripts` and clean `npm ci --prefix cloudfunctions/natureSocial --ignore-scripts`, `npm ci --prefix cloudfunctions/natureMembership --ignore-scripts`: passed. These install outputs are not a new audit claim for every cloud function.
- `npm test`: **129 tests passed, 0 failed**.
- `npm run build:weapp`: passed; native root remains canonical, no upload/preview output.
- `node --check` over native/cloud code plus app: **117 JS files passed**. **26 JSON files parsed**.
- Official single-file `wcc -d -o ...` / `wcsc -o ...`: **12 WXML and 12 WXSS files passed**.
- Targeted default flow includes official zero-provider/zero-quota, private attempts, refund, timeout/deletion/erasure late output, review derivative, private contribution, owner-only URL, and claim-vs-delete snapshot/write-set conflict.
- Native tests cover official reuse without consent prompt, candidate consent, resource/save/finalize failures, stale response and the distinct pending-sync message.

## Remaining release gates (not completed)

1. **P1: cold-start / cross-device saved-card recovery.** Local storage failure can be retried only in the current page/session. There is not yet an authenticated list-owned-cards + resource restoration path on library reopen. Pending sync is not durably recoverable after process termination. Release must remain blocked until this is implemented and tested; do not characterize this as a complete launchable vertical slice.
2. Production deployment, CloudBase doc-only transaction concurrency, missing-document conflict behavior, file permissions, temporary URL expiry and real provider execution have **not** been tested here. No cloud changes or provider calls were made.
3. Initialize the ten additional collections via the updated allowlist; deny direct client reads/writes to artwork candidates, wallets, review jobs, reviewer grants and contribution records. Official URLs must only be issued by the authorization function, not permissive storage rules.
4. An authorized operator must establish reviewed historical discovery-counter baselines. Missing baseline safely prevents generation/finalize; local tests do not establish any production baseline.
5. Configure a trusted scheduler invoking `speciesIllustration` action `reconcile` with server-held `NATURE_ARTWORK_JOB_TOKEN`. It is bounded to 20 rows per phase, must be invoked repeatedly and monitored for partial failures. No scheduler or token was configured here. Review jobs and hard-killed provider attempts require this operational cleanup.
6. Provision reviewer grants only via trusted administration; review derivative storage, review revocation, private original long-term retention and account erasure require a real-environment acceptance run. There is no reviewer administration UI in this slice.
7. Private contributor award retrieval/UI, explicit custom-art flow, final V1 UI, payment/print fulfilment and complete social product flows remain separate work. Do not imply that this integration completes them.

Transaction reference: https://docs.cloudbase.net/database/transaction (inspected 2026-09-23); writes share account/observation guard documents because reads alone do not acquire the conflict fence.
