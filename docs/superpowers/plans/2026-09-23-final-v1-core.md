# Final V1 Compatible Core and Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a backward-compatible, non-fabricating card projection and the final specification's price/quota policy without claiming undeployed services.

**Architecture:** Keep the native runtime and old records unchanged. Pure presentation adapters project explicit artwork/discovery state, and server catalog prices apply to new orders only. Broader stages are separated in the authoritative audit to avoid mixing unfinished UI with safety commits.

**Tech Stack:** CommonJS, native WeChat mini-program, Node test runner, existing CloudBase server modules.

**Spec:** `docs/plans/2026-09-23-final-v1-audit.md`

## Global Constraints

- No deployment, provider calls, preview, new unverified assets or modification of unrelated dirty work.
- Final prices: ¥19.9/month, ¥198/year, 24 physical cards ¥59.9.
- Monthly creation policy: free 5/member 30; initial bonus 10. Policy is not an active wallet.
- Never infer global Discovery Number, official review, entitlement or discovery credit from local card count or gifts.

### Task 1: Compatible artwork/discovery projection

**Files:** Create `native/lib/v1-card-model.js`, `tests/native-v1-card-model.cjs`; modify `native/lib/observation-card.js`.

**Interfaces:** `projectV1Card(card)` returns `{cardType, artworkState, discoveryNumber, countsAsDiscovery}`; `normalizeCard(card)` merges this projection without mutating input. `discoveryNumber` is null unless a persisted discovery has `status:'verified'` and a positive safe integer number. It is never allocated by this client adapter.

- [ ] Write tests: legacy local number produces null; candidate/ready cache never official; approved+isOfficial art is official; memorial copy has no discovery number/credit; original/art asset compatibility remains.
  ```js
  assert.equal(projectV1Card({number:12}).discoveryNumber,null);
  assert.equal(projectV1Card({kind:'memorial_copy'}).countsAsDiscovery,false);
  ```
- [ ] Run `node --test tests/native-v1-card-model.cjs`; expect missing-module failure.
- [ ] Implement the pure adapter using explicit states, `Number.isSafeInteger` and gift exclusion; import and merge it in `normalizeCard`.
- [ ] Run `node --test tests/native-v1-card-model.cjs tests/native-card-v2.cjs` and `npm run build:weapp`.
- [ ] Commit only these model/test files using an isolated index after `git diff --cached --check`.

### Task 2: Final prices and explicit quota policy

**Files:** Create `native/lib/v1-policy.js`, `tests/native-v1-policy.cjs`; modify `native/lib/availability-model.js`, `tests/native-membership-social-boundary.cjs`, `cloudfunctions/natureMembership/lib/catalog.js`, `cloudfunctions/natureMembership/test/security.test.js`, `cloudfunctions/natureMembership/README.md`.

**Interfaces:** `POLICY` contains integer `monthlyFen:1990`, `annualFen:19800`, `print24Fen:5990`, `freeMonthly:5`, `memberMonthly:30`, `initialBonus:10`; `membershipView()` retains unavailable until real entitlement wiring. Server `productFor(planId)` stays unchanged in signature and changes only new-order catalog values.

- [ ] Write test assertions for exact prices/policy, server/frontend parity and rounded annual saving 40.8 yuan/17.1%.
  ```js
  assert.equal(productFor('monthly').total,1990);
  assert.equal(membershipView().saving,40.8);
  ```
- [ ] Run `node --test tests/native-v1-policy.cjs`; expect old-price failure.
- [ ] Set exact fen constants; calculate saving in fen before converting; replace expected new-order totals in membership security fixtures, not historical stored-order migration logic.
- [ ] Run `node --test tests/native-v1-policy.cjs tests/native-membership-social-boundary.cjs cloudfunctions/natureMembership/test/security.test.js`; run `npm run build:weapp`.
- [ ] Commit only this task's files through isolated index; report external payment/wallet gates explicitly.

## Follow-on boundary

Server numbering, official artwork approval and wallet reservations require their own transaction-focused plans before implementation. UI cannot manufacture these states while their services are absent. The remaining final-spec stages are listed in the audit and are not marked complete by this narrow core deliverable.
