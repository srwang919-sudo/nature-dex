# Account erasure and unfinished-upload retention — deployment gates

Local implementation dated 2026-09-23; not deployed or live verified.

This revision supersedes the read-only guard in checkpoint 19c2c56. Under snapshot isolation, reading a missing marker is insufficient. Each sensitive write transaction now writes the same accountPrivacy active-generation document; erasure changes that same document to erasing. Social operations touch both related identities, and membership order reservation touches the payer guard. Snapshot-isolation tests deliberately allow nonconflicting reads, then verify writer/erasure write-set conflicts and rejected retry. Production transaction semantics still require the live gate below.

`managePrivacy` derives owner solely from CloudBase OPENID. User calls accept only `action`: requestErasure, status, continueErasure. Request creates the durable accountPrivacy barrier first. Continue processes bounded batches, retains failed private references, removes owned source/generated files and nonfinancial recognition/social records, and reports erased only after transactional final private-file checks. Settings has two explicit confirmations and a separate status/retry button. It never substitutes local clear for server success. Local records/backups remain until the user chooses local clear separately.

Private source deletion reuses the fail-closed observation deletion implementation. Only storage status 0 counts as deletion: ambiguous -1, permission or network errors remain retryable. Historical files with no registry cannot be silently called deleted. Late generated art can reopen an erasing job with a server-derived private file reference. Public speciesWatercolors is never deleted. Financial orders, payment event inbox and reconciliation records are excluded; retention purpose/period/minimization still require owner/legal review before release.

## Operator retention

The fixed action `sweepExpired` requires a configured server-only `NATURE_RETENTION_JOB_TOKEN`. Do not put it in the client or ordinary user requests. Use an authenticated server scheduler; provisioning it is not performed here. No caller-supplied owner, collection, path or file ID is accepted.

Only recognition registry rows with valid server-created createdAt/expiresAt and elapsed expiresAt are eligible (current upload tickets use a 24-hour window). At most 20 rows per invocation. Live generation leases defer cleanup. Ready art is exempted, and the unfinished decision is serialized with the observation deletion marker to prevent racing successful publication. Generic storage failure remains partial, not success. A row that was never actually uploaded may require provider-specific confirmed-absence handling; this remains a live storage-contract gate, not a guessed status code.

## Configuration and verification

- Install `accountPrivacy` and all fixed collections in initCollections; deny all client reads/writes. Deploy all account-gated functions coherently before offering erasure.
- New function dependencies: exact wx-server-sdk 4.0.2 and the same tested axios/lodash compatibility overrides; lockfile committed. Local npm ci/audit reports 0 findings.
- Tests cover identity forgery, retry after storage failure, duplicate request, foreign-user preservation, public/financial exclusions, guarded retention, frontend partial-state copy and two confirmations.
- Current worktree full suite: 108 tests before the additional confirmation test; rerun is recorded in the implementation report. Build and official settings WXML/WXSS compile passed.
- Required external checks: two-identity live erasure/races; production SDK transactions with query reads; CloudBase getUploadMetadata and absent-file semantics; operator scheduler/auth; payment retention/minimization policy; user export and local-clear instructions. No cloud configuration, model call, upload or preview was performed.
