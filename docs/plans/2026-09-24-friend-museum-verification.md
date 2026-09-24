# Friend Museum — local verification, 2026-09-24

## Implemented boundary

Profile sharing is off by default. The owner explicitly chooses a nickname and one of four project-authored text avatar symbols before confirming publication. Turning it off removes the alias/symbol from the server profile and blocks subsequent shared-species, museum, like and request/approval reads. Re-enabling intentionally restores still-valid explicit shares, disclosed in the confirmation. Already viewed information cannot be withdrawn from screenshots or memory.

Museum pages derive the other party from the authenticated friendship, use owner/relationship/generation-bound cursors and recheck friendship, profile, account state and verified observation in the final doc-only transaction. No original image, location, note or raw identity is projected. Counts are explicitly limited to loaded, valid recipient-specific shares; they are not private lifetime totals. Badges remain “暂不公开”. Featuring is explicit per share, not invented popularity. The homepage loads at most three share summaries only on user action; the bounded existing list is not an exhaustive globally recent feed.

`natureSocialProfiles` is added to collection initialization and account erasure. It must remain server-only; no collection was created or permissions changed during this work.

## Current local evidence

- Working-tree `npm test`: 190/190 passed, including prior untracked UI tests.
- Isolated index checkout: root `npm ci --ignore-scripts` and `npm ci --ignore-scripts --prefix cloudfunctions/natureSocial`, then `npm test` 190/190 and `npm run build:weapp` passed. The first isolated run correctly failed without the function SDK installed; no test was skipped to hide that dependency.
- `npm run build:weapp`: native release-source/syntax verification passed; it does not upload.
- Official `wcc -d -o /tmp/nature-museum-wcc.js <file>` and `wcsc -o /tmp/nature-museum-wcsc.js <file>` passed for home, settings and friend-museum (six templates/styles).
- `node --check` passed for natureSocial/core.js, managePrivacy/core.js and initCollections/index.js.
- Security tests cover default-off profile, revocation, foreign relationship/cursor, 20+3 pagination, inactive friendship, sanitized projection and source verification. Native tests cover no automatic home query, cancellation without network calls, failed access clearing stale content, and honest partial counts.

## External gates and limits

No deployment, model call, payment or printing changes. Real CloudBase ACL/index provisioning, multi-client privacy races and device rendering remain unverified. User aliases need the production content-moderation/review policy before launch. Avatar support here is an authored symbol, not a private photograph upload. Existing share picker is limited to six local choices; some existing lists are bounded at 100. A proactive owner-initiated Gift is separate from the implemented request/approval copy flow. This batch is not a whole-product release claim.
