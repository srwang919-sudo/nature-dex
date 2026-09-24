# Master UI polish and test migration

This slice follows the final Master Plan; it does not change production configuration or call cloud/payment providers.

## Changes

- Retained both previously untracked C-era test files, migrating their intent to current navigation labels, authored world zones, real statistics, accessible close target, and reduced-motion behavior. No tests were ignored or removed.
- Membership displays **current entitlement** separately from **this order's queried payment status**, including retry reconciliation. Existing ACTIVE membership cannot label an unpaid renewal successful.
- Settings displays selected content only: local records/notes/recent observations under 本机记录; motion, recognition consent and backup/clear under 隐私; member/friend service screens no longer append every unrelated local-data module.
- Badge locked state is grayscale once, without compounded opacity; earned rim/highlight is distinct. Under 340px the wall uses two columns and larger motifs/labels. These are static layout rules, not real-device screenshot proof.
- Science requires both title and body for fact pairs, uses compact field-guide hierarchy and an explicit copy-source action rather than an exposed long URL. Existing empty-state and source safety remain.
- Profile copy no longer claims all cloud/member functionality is unopened.

## Verification

- Actual working tree `npm test` including the two formerly untracked tests: **169 passed, 0 failed**.
- Isolated-index checkout `npm test`: **169 passed, 0 failed**.
- `npm run build:weapp`: passed in both working tree and isolated checkout.
- Official single-file WXML/WXSS compile: **8 passed**, for settings/profile/card/nature-badge.
- Isolated `git diff --cached --check`: passed.

No cloud deployment, live payment, model invocation or preview/upload occurred. Device rendering at 320/390px, visual comfort and actual payment-return lifecycle still require device validation.

## Remaining social scope

The earlier service slice's selection limit (six records), current-session-only sent-share revocation, missing received-copy deletion, and full Master Like/Gift workflows are **not resolved by this polish commit**. They require coordinated backend/UI changes with security tests; no alternate behavior is labelled as completed. Merchant configuration, deployed function versions and live CloudBase authorization remain external gates.
