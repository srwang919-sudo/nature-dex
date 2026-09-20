# Recognition consent and card recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Remove repeated identification prompts without uploading before consent, and allow correcting an uncollected card.
**Architecture:** A versioned local consent helper is shared by observe and settings. Pending card corrections retain identity, photo and finish; collected cards cannot be changed.
**Tech Stack:** Native WeChat JavaScript/WXML, Node VM tests.
**Spec:** Parent-approved task: one-time explicit consent, no cloud prerequisite for local cards, no reroll.

## Global Constraints
No credentials, deployment, or cloud configuration changes. No Git initialization.

### Task 1: Consent
Files: native/lib/recognition-consent.js; native/pages/observe/index.js and index.wxml; native/pages/settings/index.js and index.wxml; tests/native-identify-button.cjs.
- [ ] Assert first identify sets needsRecognitionConsent without cloud or modal.
- [ ] Implement hasConsent() reading nature.recognitionConsent.v1 and setConsent(value) persisting version/provider/acceptedAt.
- [ ] Accept button saves before identify; settings supports withdrawal. Direct identifyConsented checks consent.
- [ ] Run node --test tests/native-identify-button.cjs tests/native-consent-runtime.cjs.

### Task 2: Local correction
Files: app.js; native/pages/observe/index.js; tests/native-card-correction.cjs.
- [ ] Assert changing pending species retains card id and finish, and cannot mutate an already collected card.
- [ ] Add prepareCard(speciesId, {correctPending:true}); persist replacement in draft before navigation.
- [ ] Keep default conflict protection; display actionable storage/navigation errors.
- [ ] Run node --test tests/*.cjs and npm run build:weapp, official single-file wcc/wcsc compilation.
