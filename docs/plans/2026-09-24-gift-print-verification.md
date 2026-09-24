# Gift printing authorization — 2026-09-24

This supersedes the earlier draft-stage blanket exclusion of gifts. Explicitly approved gifts can now join the 24-card ¥59.9 quote/draft flow. No payment, address collection, production submission or deployment was added.

## Rights boundary

Approval explains physical printing including the original back photo and attribution, with version `gift-print-v1` and server timestamp. The server derives sourceCardId from the verified observation; clients cannot submit owner/file IDs. Historical approvals without that grant remain “素材未授权”. Replaying a historical approval cannot add rights; the owner must withdraw the previous copy, then approve a new request under the current disclosure.

Ordinary share/museum/copy DTOs never include photo IDs or URLs. Public copies contain only `printAuthorized`, not the private source reference. Printing rechecks current recipient, copy retained state, source owner account, saved source card/observation, verified fence, private original path, recognition receipt, and approved or source-owned candidate artwork. Transactions write the copy, both account gates, observation fence, artwork and profile so concurrent revoke/deletion/erasure conflicts and retries fail closed.

The immutable private draft item retains original artwork/photo references, original discovery number and date, sourceCardId, Original Discoverer and Gifted From. Display names come only from enabled server profile sharing; otherwise anonymous labels. There is no public-place consent field in the current backend, so location remains 地点未公开 and coordinates/notes never enter the snapshot. Gift copies never gain their own discovery number or achievement credit.

## Preview and external gates

The current gift UI supports selection, ordering and safe server snapshot review, not a fabricated local PNG. Gift PNG buttons are disabled with a clear production-preview-unavailable explanation. No general social endpoint was expanded to read a friend's original photo. A future production renderer must revalidate the grant/source before using the immutable private snapshot; the snapshot alone is not authorization after withdrawal.

Cloud deployment, real database ACL/transaction behavior and storage retention, narrowly scoped gift production-resource access, printing/attribution layout proofing, merchant payment, address and fulfillment remain external or subsequent implementation gates. Existing own-card local PNG remains illustrative, not a production file. Already printed/copied content cannot be remotely withdrawn, as disclosed in approval.

## Local checks

Focused server/native tests include explicit approval and replay, ordinary share exclusion, old gift denial, authorized selection, withdrawn/deleted/erasing source, snapshot write-conflict retry, enabled/anonymous signatures, hidden location and stable quote hash. `npm test` passed 223/223 in both actual worktree and isolated-index checkout; `npm run build:weapp` passed in both. `node --check` passed for both modified cloud function files. Official wcc/wcsc compiled `native/pages/print/index.wxml`, `native/pages/print/index.wxss`, `native/pages/settings/index.wxml`, and `native/pages/settings/index.wxss` in both worktree and isolated checkout. No provider or production calls were made.
