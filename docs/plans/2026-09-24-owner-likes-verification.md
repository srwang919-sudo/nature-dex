# Owner likes — local verification

This slice adds **喜欢你的发现** in the Friends settings section. It is an explicitly refreshed, owner-only list, not a notification inbox, feed, public like count or popularity ranking. Existing per-recipient `likedByRecipient` is reused; no collection is added.

Each page contains at most 10 source rows with an owner/purpose-bound cursor. Final doc-only authorization rechecks share, active relationship generation, owner profile visibility and verified observation. Writing the same observation fence serializes source deletion; share/friend/profile writes also conflict with concurrent withdrawal. Nicknames are exposed only when the liker enables profile sharing; otherwise the label is 匿名好友. Owner sharing off hides all entries. No original photos, coordinates, notes or raw OPENID are returned.

The UI replaces pages rather than retaining cumulative stale projections, clears before requests and on failure/hide/section changes or other service operations, and rejects late responses. It does not persist likes locally. Another device's already rendered content cannot be retroactively erased; refresh checks current authorization, and this is not a live subscription.

## Checks

- `node --test tests/nature-social-owner-likes.cjs`: 8 focused cases, including 43 rows, foreign cursor/scope, opt-out anonymity, revoked source, snapshot/write-set conflict, and late-response/failure clearing.
- `npm test`: 215/215 passed in the actual working tree and isolated-index checkout, including existing untracked tests.
- `npm run build:weapp`: passed in the working tree and isolated-index checkout; native source/syntax gate only, not an upload.
- `node --check cloudfunctions/natureSocial/core.js`.
- Official compilers at `/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/`: `wcc -d -o /tmp/owner-likes-wxml.js native/pages/settings/index.wxml` and `wcsc -o /tmp/owner-likes-wxss.js native/pages/settings/index.wxss`.

## External gates

No deployment, provider call or preview was performed. Real CloudBase write-conflict/ACL/index behavior and device visual/accessibility rendering remain unverified. Index requirements use the existing shares collection filtered by owner/status/likedByRecipient and ordered by `_id`; provision any requested index only during authorized deployment. No payment or print behavior changed.
