# Friend Museum correction — 2026-09-24

Request-copy failure now clears profile, cards, recent/featured projections, pagination and stale success messages, including permission withdrawal/network rejection.

Home no longer uses the legacy first-100 list. `listRecentSharedSpecies` reads at most 20 raw recipient/status-bound rows plus one lookahead, ordered by `createdAt desc, _id asc`. Owner-bound signed tuple cursors seek across invalid rows. Each result is reread in a document-only transaction through account guards; profile sharing, relationship/generation and source attestation must still be valid. Home explicitly starts sequential requests, stops at three valid summaries or exhaustion, and cancels continuation when hidden. This is not a snapshot across all pages: concurrent new shares appear on refresh. No infinite feed or automatic background loading is introduced.

Local evidence: 31/31 focused tests; 195/195 full worktree tests; native build passed; official wcc/wcsc passed for home and friend-museum (four files); syntax checks passed for changed cloud modules. Tests cover 120 older records, tied timestamps, 25 invalid newer rows, multiple cursor pages, source withdrawal through exhaustion, foreign cursors, compound repository query shape, denied request clearing and page-hide cancellation.

Isolated index checkout after clean root and natureSocial `npm ci --ignore-scripts`: 195/195 tests and native build passed. The commit excludes all pre-existing dirty documentation, profile/card styles and settings color changes.

Official Node SDK multi-field sorting and query operators were checked at https://github.com/TencentCloudBase/node-sdk/blob/master/docs/database/database.md on 2026-09-24. Production compound-index requirements and actual SDK/database concurrency remain external deployment/staging gates. No cloud configuration, provider call or deployment was performed. Existing unrelated dirty work is excluded from this change.
