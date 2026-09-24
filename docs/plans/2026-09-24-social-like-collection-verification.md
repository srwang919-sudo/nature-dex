# Friend Like and Gifted Collection — first local slice

## Contract and behavior

- `natureSocial.setLike({shareId,liked})`: caller must be the share recipient, both accounts active, friendship generation current, share active and source observation still verified. Like state is stored on the existing uniquely keyed owner/recipient/species-card share, so retries do not create duplicate likes or counters. A new friendship generation resets old like state.
- `cancelCopyRequest({copyRequestId})`: only the requester can cancel a pending request. It atomically writes the same request and slot documents used by owner approve/reject; repeat cancellation is safe, approval cannot follow cancellation, and cancellation cannot erase an approved copy.
- `listMyCopyRequests({})`: owner-derived requester query, safe species summary/state only. Client shows pending, approved, rejected, canceled or expired and offers cancellation only while pending.
- Existing owner approval/rejection remains authenticated and source/relationship checked. Approved results add `cardType: gifted_collection`, retaining `kind: memorial_copy`, `sourceType: friend_copy`, `isObservation: false`, `countsAsDiscovery: false`, `countsForAchievements: false`. Neither original ownership nor source observation changes. No Discovery Number, private photo, note or location is copied.
- Native UI supports Like/unlike, request status/cancel, owner decisions and received gifted-copy list. Canceled/terminal requests retire their local retry key so a later intentional request is new. No entry-time automatic social network calls.

All writes use existing collections/owner cleanup coverage; no collection, permission or production configuration was changed. Server identity is derived from CloudBase context, not client owner/role fields.

## Verification

- Focused service/account guard/client page suite: **23/23**.
- Actual worktree `npm test`: **178/178**, including migrated prior UI tests.
- Native `npm run build:weapp`: passed.
- `node --check cloudfunctions/natureSocial/core.js`: passed.
- Official single-file `wcc`/`wcsc` compilation of settings WXML/WXSS: **2/2**.

New regressions cover recipient-only and replay-safe Like/unlike, revoked-source denial, foreign-request cancellation denial, repeat cancellation, canceled-then-approval denial, approval/cancellation serialization, exactly one non-discovery gifted copy and preservation of the source observation. This uses a local serialized transaction mock, not a live CloudBase concurrency proof.

## External and remaining scope

No deploy, payment, model call, preview/upload or copyrighted asset restoration occurred. Deployment/version matching, multi-account WeChat identity, private collection ACL and real transaction contention remain external gates. Existing list limits are 100 records; historical sent-share management, scalable pagination, single-copy deletion and proactive owner-initiated Gift are not completed here. This slice implements **request → owner approval → Gifted Collection Copy**, not ownership transfer or the entire final social roadmap.
