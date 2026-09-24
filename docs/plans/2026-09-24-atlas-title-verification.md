# Atlas single-title correction

Removed the redundant species-name caption outside collectible cards from both the neat grid and horizontal shelf. The actual collectible footer title and each item's accessible species label remain. Removed the unused caption styles; no card data or image asset was changed.

Working-tree tests: **174/174 passed**; native build passed. New regression checks both layout labels, the single visible title structure, and 320/390px grid sizing using the current global page padding. These are static layout checks, not a claim of actual WeChat screenshot verification; controller device inspection remains required.

Missing local artwork/original-photo content is not replaced with invented or withdrawn assets. Cards with valid cloud ownership may use the separately consented recovery flow. A stale local-only photo cannot be recovered from a missing file without the user's original; this is a content-recovery limitation, not permission to delete their record.

## Official compiler reproduction — 2026-09-24

Re-ran against the current working-tree Atlas files after commit `12e52c3` (not a generated copy), from the project root:

```sh
/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/wcc -d -o /tmp/nature-atlas-current-wxml.js native/pages/library/index.wxml
/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/wcsc -o /tmp/nature-atlas-current-wxss.js native/pages/library/index.wxss
```

Both commands exited **0**, without compiler diagnostics. Coverage is exactly `native/pages/library/index.wxml` and `native/pages/library/index.wxss`; it is a template/style compile check, not simulator rendering or image-file availability verification. No application code was changed for this recheck.
