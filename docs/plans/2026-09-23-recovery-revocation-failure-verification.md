# Recovery revocation failure matrix

## Fixed locally

Revocation first attempts an independent persistent denial/retry marker, then replaces the old grant with denied state. If the grant write fails, it attempts non-destructive removal of that grant only. Either surviving denial wins over stale accepted data after module reload. No other user storage is cleared.

Remote failure returns `sync_revoke_pending` only when retry intent was actually stored; otherwise `sync_revoke_incomplete` explicitly asks the user to stay on the page, restore connectivity/free storage and retry. It does not claim revocation or automatic retry succeeded. Successful remote revocation does not remove the independent denial marker unless old grant replacement/removal is confirmed.

Physical limit: if all persistent writes AND removal are rejected and the network is unavailable, code cannot persist knowledge that revocation was requested. The current process is blocked, but a new process may read the unchanged old grant. This branch is tested and shown as an incomplete privacy operation, not disguised as success. Closing the app before resolving this warning is not safe revocation.

Previously issued bearer URLs are not retroactively invalidated. UI now states their maximum 600-second lifetime; revocation prevents subsequent authorized issuance/return, not use of an existing URL before expiry.

## Alternate endpoint audit

`speciesIllustration.resource` previously allowed owner-private candidates even after their observation became saved. It now checks the saved observation and independent recovery consent before signing, then writes the consent fence together with account/observation fences before returning. A revoke during signing denies the result. Approved public artwork and immediate, not-yet-saved generation remain separate access cases.

## Evidence

- Tests-first: new failure-matrix and alternate-resource tests failed before implementation.
- Focused consent/artwork/recognition checks: 15 pass.
- Isolated full checkout: **153/153 tests pass**.
- Native build and changed cloud-function syntax checks pass.
- Official settings WXML compile passes.
- No deployment, provider call, key read or preview.

The unchanged platform ACL/deployment/real-device gates remain external. In particular actual OS storage failure, account revocation concurrency and URL expiry need production-equivalent device/cloud verification.
