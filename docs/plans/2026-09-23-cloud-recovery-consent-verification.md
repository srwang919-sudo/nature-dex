# Cloud card recovery consent — local verification

Date: 2026-09-23. No deployment, provider invocation or preview.

Independent default-off permission now gates app recovery, paginated owner lists, original/art resources, saved-card detail/export reads, and automatic thumbnails. Server grants are owner-derived, versioned, revoked with the same transactional consent fence used before URL return. Recognition and current generation consent are separate.

Current successful creation saves verified art as well as the original locally before finalizing. These local files remain viewable without recovery permission. A missing local file cannot silently use the general artwork resource endpoint for a finalized server card. Clear/delete cleanup now includes the art cache; replacing a pending observation queues its local cache for cleanup.

The privacy switch explains retrieval, local caching, independence from recognition, and that revoking recovery does not erase existing cloud records. Pending remote revocation retries on launch. Persistent storage and network both failing still require the user to retry; no device can guarantee a durable preference when its storage rejects writes.

## Inspected evidence

Isolated index exported to a separate checkout, preserving unrelated five-tab/UI work.

- `npm test`: **148 tests, 148 pass, 0 fail**.
- `npm run build:weapp`: PASS native canonical source and syntax; no upload produced.
- `node --check`: 121 JavaScript files including root app.
- JSON parsing: 26 files including root app.json.
- Official single-file `wcc -d -o /tmp/out.js file.wxml`: 12 templates pass.
- Official single-file `wcsc -o /tmp/out.js file.wxss`: 12 stylesheets pass.
- `git diff --cached --check`: pass.

Focused tests cover denied zero calls, recognition independence, revoked mid-list no resource request/no local write, single saved-card resource gating, offline cache, durable server grant/revoke, and current generation atomicity.

## External release gates

Production function deployment, the new server-only `cardRecoveryConsents` collection and client-deny rules, real CloudBase concurrency/ACL checks, and real-device grant/revoke/clear/cache behavior remain unverified. Local mock success is not cloud or device evidence. Broader Master Plan UI work remains a separate stage.
