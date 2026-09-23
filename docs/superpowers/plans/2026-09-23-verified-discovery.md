# Verified Observation and Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save verified private observations/cards and allocate a unique first-discovery number atomically, then require the saved receipt in the local confirmation path.

**Architecture:** Extend createArtCard with `action:'finalize'`, using its existing owner-bound ready operation and recognition receipt. Deterministic hashed document IDs enforce owner/species uniqueness; the Species document is the shared write-locked counter. Account guard and the attestation shared with deletion are written in the same doc-only transaction to fence erasure/deletion. No new provider or deployment.

**Tech Stack:** wx-server-sdk 4.0.2, Node CommonJS, native mini-program, isolated snapshot transaction tests.

**Spec:** `docs/plans/2026-09-23-final-v1-audit.md`

## Global Constraints

- No client-supplied owner, file IDs, number, gift flag or species in finalize; only operationId.
- Gifts and repeats do not allocate numbers. A failed transaction writes nothing. Deleted allocations are never reassigned.
- Finalize reads ready art and complete recognition receipt inside the transaction; no network/model calls in transaction.
- CloudBase official contract checked 2026-09-23: https://docs.cloudbase.net/database/transaction and https://docs.cloudbase.net/error-code/DATABASE_TRANSACTION_CONFLICT . Transactions are server-only and doc-only; reads alone do not fence writes. Deterministic document IDs plus writes serialize uniqueness; up to three explicit conflict retries with short backoff, no retry for permission/validation failures.
- True production contention/collection availability is an external deployment gate. Local tests prove implementation behavior only.
- An absent historical counter is unknown, not zero. Require an operator-reviewed baselineVersion and initialized counter; otherwise fail with discovery_baseline_unavailable before any saved receipt.

### Task 1: Server save and allocation

**Files:** Create `cloudfunctions/createArtCard/discovery.js`, `tests/cloud-discovery.cjs`; modify `cloudfunctions/createArtCard/index.js` and `cloudfunctions/initCollections/index.js`.
**Interface:** `finalizeObservation({db,owner,operationId,now,wait})` → `{status:'saved',observationId,cardId,discovery:{status:'verified',number},isFirstDiscovery}`. Tables: natureObservations/natureCards keyed owner+observation hash; userSpeciesDiscoveries keyed owner+canonical species hash; natureSpecies keyed canonical species hash. Existing operation supplies photo/species; receipt supplies candidate identity. All private tables owner-scoped and server-only.
- [ ] Add failing tests for identical retries, two observations/same owner, two owners concurrent, unknown receipt, forged input, erasing owner and delete fencing. Snapshot test permits doc only and conflicts on changed write sets.
  ```js
  assert.equal(first.discovery.number,repeat.discovery.number);
  assert.notEqual(ownerA.discovery.number,ownerB.discovery.number);
  ```
- [ ] Run `node --test tests/cloud-discovery.cjs`; expect missing-module failure.
- [ ] Implement one transaction: touch account guard and deletion generation; verify operation/receipt; reuse saved observation; write species counter only for new owner/species; write discovery/history observation/card; return saved projection. Retry only named write conflict.
- [ ] Run `node --test tests/cloud-discovery.cjs` and add the four fixed collection names to initialization.

### Task 2: Local gate and deletion linkage

**Files:** Create `native/lib/save-observation.js`, `tests/native-save-observation.cjs`; modify `native/pages/observe/index.js`, `cloudfunctions/deleteObservationAssets/index.js`, `cloudfunctions/managePrivacy/core.js`, `tests/native-auto-card.cjs`.
**Interface:** `saveObservation({api,operationId,isCurrent})` calls finalize and rejects missing/mismatched saved receipt; no local invented number. Observe invokes it after resource verification and before local commit. Local save failure leaves server record recoverable through idempotent finalize, with no local card/navigation; it does not falsely report success.
- [ ] Test saved/failed/unavailable/stale contracts before adding the helper; `node --test tests/native-save-observation.cjs` must initially fail.
- [ ] Merge server receipt into normalized card only after successful finalize. Preserve original photo and science. Deletion tombstones observation/card in its initial transaction; decrement active count once but never rewind global counter. Account erase removes private domain rows/discovery ownership; species aggregate remains nonpersonal.
- [ ] Run `node --test tests/cloud-discovery.cjs tests/native-save-observation.cjs tests/native-auto-card.cjs tests/cloud-account-erasure.cjs`.
- [ ] Build isolated index checkout; run `npm test`, `npm run build:weapp`, syntax checks; stage only task files and commit after `git diff --cached --check`.

## Recovery and external gates

Transport loss after server commit is recoverable by same operation ID, not another allocation. Local storage failure cannot roll back a completed remote transaction; retry reuses the saved record. Formal cloud save is the numbering boundary; local reveal waits for its receipt. Offline/deployment-missing fails closed. New collections/rules and real concurrent CloudBase behavior need external verification before enabling production. Artwork official review/wallet remain separate next stages.
