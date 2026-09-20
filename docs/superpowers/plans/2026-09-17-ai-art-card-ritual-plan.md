# AI Art Card Ritual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Direct local science and shared illustration, optional consent-by-selection photo art, recoverable reveal.
**Architecture:** Native remains the release source. Bundled species illustration files are the shared official cache and fallback. Art work uses private uploads, owner-checked natureAI2 tasks and persisted pending cards; local photo is never replaced or deleted.
**Tech Stack:** Native WeChat, CloudBase, existing DashScope adapter, Node tests.
**Spec:** Parent-approved AI art and reveal task, 2026-09-17.

## Global Constraints
No secrets read, no deployment, no fabricated recognition. Art is never evidence for species identification. Reduced motion disables decorative motion and vibration.

### Task 1: Local science and official illustration
Files: native/pages/card/index.js, index.wxml; native/lib/card-presentation.js.
- [ ] Remove enrich/checkArt cloud invocation UI; local full science remains visible.
- [ ] Use illustrationFor(speciesId) for shared bundled art, including unknown fallback.
- [ ] Assert no cloud request or authorization modal from former card-back actions.

### Task 2: Explicit AI art
Files: native/lib/art-card.js; native/pages/observe/index.js, index.wxml; cloudfunctions/natureAI2/index.js.
Interface: createArtCard({api,card,onUpdate,wait}) -> updated card. Button calls confirmArt(), never a modal.
- [ ] Test failed cloud returns original card plus artStatus fallback; consent true on calls only from explicit AI choice.
- [ ] Persist original pending card before upload; use upload_ticket/register_asset owner checks; submit image edit, persist task id, poll boundedly.
- [ ] Preserve originalPhotoPath, use artPhotoPath for display/export, and keep original fallback on any failure.
- [ ] Prompt preserves real species morphology, extracts subject and uses artistic photography composition.

### Task 3: Reveal and verification
Files: native/pages/reveal/index.js, index.wxml; tests/native-art-card.cjs.
- [ ] Reveal uses existing sealed/split/lift/settled state machine, persisted revealed flag and reduced-motion branch.
- [ ] Add light vibration only without reduced motion; explicit finished collection control.
- [ ] Run node --test tests/*.cjs, npm run build:weapp, node --check cloudfunctions/natureAI2/index.js, and official single-file wcc/wcsc compilation.
No Git initialization or commit. Deployment remains a separately authorized manual cloud-console operation.
