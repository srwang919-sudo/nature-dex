# Cloud SDK compatibility remediation — local evidence

This supersedes the earlier six-function audit finding only for the locked dependency trees in this change. It is not evidence that production functions were updated.

## Implementation

The six existing active/operations functions retain wx-server-sdk 4.0.2; the two image functions retain @cloudbase/ai 2.30.0. Exact overrides select axios 0.33.0 and registry aliases of maintained lodash 4.18.1 for lodash.set/lodash.unset. No SDK downgrade or audit suppression is used.

Each function's sdk.js loads the actual database dependency's utility modules, then exposes the maintained set/unset functions in the CommonJS shape expected by @cloudbase/database before loading wx-server-sdk. This is a private compatibility boundary, not an upstream patch. Deployment must include sdk.js and its lockfile. Direct imports of wx-server-sdk bypass this boundary and must not be added.

## Reproduction

From the project root, for each of recognizeObservation, createArtCard, speciesIllustration, deleteObservationAssets, cleanupObservationAssets and initCollections:

```sh
npm ci --ignore-scripts --prefix cloudfunctions/recognizeObservation
npm audit --prefix cloudfunctions/recognizeObservation
node tests/cloud-sdk-security.integration.js
```

Replace only the function directory in the first two commands for the other five. The integration command checks all six installed dependency trees: ordinary dotted/array paths, malicious prototype paths, database query construction, offline transaction commit and rollback, and the axios version. The transaction transport is injected; no provider, network, or database call occurs.

All six clean installs and integration cases passed locally on 2026-09-23. Each of the six separate npm audits reported 0 low, 0 moderate, 0 high and 0 critical findings. Initial file-relative vendor overrides and contaminated temporary locks failed clean installation and were discarded; they are not release evidence.

## Maintenance / external gate

Re-run clean installs, full audits and this integration test whenever either SDK or utility versions change. Review the database's utility imports again, and retire the compatibility boundary when upstream removes the vulnerable standalone dependencies. An audit with no known findings is not proof of absence of vulnerabilities. A controlled live database transaction and provider smoke test in the actual CloudBase runtime remain required before release; neither was executed here.
