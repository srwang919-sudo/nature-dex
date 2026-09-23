# Release-readiness local verification — 2026-09-23

## Scope and isolation

Plan: `docs/superpowers/plans/2026-09-23-release-readiness-remediation.md`.
Base commit: `d738a92ddda12b0568d1220041428f77e909c7fd`.
Project: `/Users/w/WorkBuddy/2026-09-13-12-50-14/去大自然里-mini`.
Isolated index `/tmp/nature-remediation-CoEF3F/index`; independent checkout `/tmp/nature-remediation-CoEF3F/clean`.

Pre-existing prompt/species modules, cloud diagnostics, profile/card/settings visual hunks, historical docs/tests and untracked assets tooling are not staged. Mixed createArtCard/speciesIllustration/observe/recognition-errors/test files were synthesized against HEAD with only this task's changes. No reset of working content, deployment, preview, model call, key access or external configuration was performed.

## Inspected results

| Gate | Result |
|---|---|
| `node --test tests/*.cjs`, existing worktree | 80 pass / 0 fail, includes3 pre-existing untracked suites |
| `npm ci --ignore-scripts`, independent checkout | success;1 package audited |
| `npm test`, independent checkout | 77 pass / 0 fail |
| `npm run build:weapp`, both | pass, native root only |
| `npm audit`, root lockfile | 0 vulnerabilities; cloud SDK dependency trees not included |
| `node --check`, independent checkout | 59 app/native/cloud JS files passed |
| JSON parsing, independent checkout | 19 files passed |
| `node --check`, current worktree | 63 files passed (includes4 old untracked prompt/species files) |
| official compiler, both trees | 12 WXML +12 WXSS, exit0, no emitted warnings |
| conservative native pack allowlist | 110 files,1,919,323 bytes;177,829 bytes below2MiB |
| badge header inspection |12 PNG,256×256 RGBA, each≤60KiB |
| `tests/natural-history-badges-baseline.cjs` | seven original images +example module +species source byte-identical |
| isolated staged diff | `git diff --cached --check` passed |

Official compiler location used: `/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/`. Each WXML used `wcc -d -o /tmp/nature-remediation-wxml.js input`; each WXSS used `wcsc -o /tmp/nature-remediation-wxss.js input`. Package measurement respects project.config exclusions and excludes dot metadata; it is a conservative local file-size estimate, not an uploaded WeChat package receipt.

## Behavioral evidence

- Deletion tests: derived OPENID, forbidden client owner fields, owner-scoped original/art enumeration, public watercolor untouched, failed storage deletion retains retry markers and original registration, idempotent retry, unknown registry does not report success.
- Generation/delete race: active lease returns deletion_pending; tombstone prevents publication and later operation-ID restart; cancellation removes late generated private asset. Client failure retains local card and note, sends only observationId, awaits server completion.
- Consent: separate modal explicitly names Tencent private storage and Tencent Hunyuan; decline creates no output; server validates operation/observation/provider/version/timestamp binding. This is an auditable assertion, not an authentication signature or replacement for OPENID.
- Cost: transaction reserves before provider call, defaults art3/watercolor3/recognition20 per owner per UTC day, configurable0–100 with0 disabled; cache/status excluded; failed attempts consumed. Daily counters are independent of client operation IDs. Separate owner/day, cap and stop-switch covered in isolated tests. Global budget/anti-Sybil controls remain external.
- Typography contract: normal name28rpx, secondary24rpx; large secondary24rpx; min-width and bounded ellipsis/wrapping keep long names inside metadata. No real-device screenshot was taken in this task.

## Remaining release blockers / intentionally not claimed

1. Deploy matching client/functions and create private observationDeletions/usageQuotas collections/rules; actual CloudBase transaction/storage semantics and180s configuration need two-identity live verification.
2. Orphan original file with no asset registry cannot safely be inferred from an envId alone. Server returns asset_registry_missing, preserves local card and tombstone; owner must inventory/clean historic orphan paths. Deletion of files already copied to device albums/backups is not claimed. Local clear is not cloud-account deletion.
3. Quotas are provisional operational values, not pricing entitlements. Owner must confirm/tune, set global budget alerts/limits and retention; daily owner cap does not stop multi-account/storage-upload abuse.
4. Runtime front provider inspected as Tencent Hunyuan, not Alibaba Bailian. Dormant legacy natureAI2 must remain unavailable or separately reviewed; privacy documents must match deployed provider, not historical architecture.
5. True Baidu permissions/accuracy/baike coverage, actual art quality/latency, private download/export and cloud deletion were not exercised. No provider/model call made.
6. WeChat privacy declarations, chooseLocation interface review; real iPhone/Android camera/avatar/export/location;375/390/430 layout, font scaling, interaction and motion remain unverified.
7. No actual payments/friends/login synchronization or formal publication. Merchant orders/callbacks and friend authorization remain unavailable.

Conclusion: local code/test/documentation gates above have evidence. This is not an assertion that production or all product goals are complete.
