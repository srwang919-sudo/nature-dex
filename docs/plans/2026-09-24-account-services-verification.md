# Account services UI slice — local verification

## Implemented

- Profile routes to membership and friend services rather than static unavailable buttons. Page entry performs no service calls; explicit connection is required.
- Membership uses `natureMembership.getMembership/createPayment/queryOrder`, validates the returned plan, CNY amount (1990/19800 fen), and RSA payment parameters. A successful payment callback never creates entitlement. Pending order ID and idempotency key survive retry; server state alone controls the label.
- Friends use existing `natureSocial` actions for invitations, acceptance, listing, explicit owner-verified species sharing, requesting and approving/rejecting memorial copies, and ending relationships. No photo, note, coordinates or client-supplied owner is accepted by the action-field allowlist. Copies remain outside observation/discovery counts.
- Hidden/unloaded pages ignore late UI results. Safe service errors are readable without exposing raw provider responses.
- `projectV1Card` and shared card presentation use one Discovery Number eligibility rule: stable server card ID, verified positive safe integer, and no sample, example, gifted, memorial, non-observation or non-discovery flags. Canvas export consumes the same presentation.

## Inspected evidence

Isolated index exported to `/tmp/nature-resolver-check.P6qaas/checkout` (does not include unrelated pre-existing dirty files):

- `npm test`: **163 passed, 0 failed**.
- `npm run build:weapp`: native release source and syntax passed; no preview/upload.
- Official `wcc -d -o /tmp/nature-service-compile.js` and `wcsc -o /tmp/nature-service-compile.js` for settings/profile: **4 passed**.
- `node --check` for account-services, settings-services, settings page: **3 passed**.
- `git diff --cached --check` with isolated index: passed.

The working directory also contains two older untracked visual tests that fail against the final design; they were not silently deleted or added to this commit. All tracked tests in the isolated candidate pass.

## External gates / remaining scope

No cloud deployment, provider call, payment, invite, or production-state mutation was performed. Merchant binding/certificates, notification endpoints, order reconciliation/refund behavior, CloudBase deployed function versions/collection permissions and real-device identity must be verified by an authorized live test before release. Local mocks are not CloudBase evidence.

The existing social contract offers approval-based memorial copies, not the final Master Plan's complete Like/Gift workflows. Those remain separate work. Sharing currently offers up to six local server-verified records per action sheet; a scalable selector and durable sent-share management are still required for large collections. Revocation of the last share is available in the current page session. No fake friend names/avatars are supplied.

Real device typography, payment return lifecycle and 320/390px layout remain unverified. Price display and service-ready state are not a claim that the merchant is configured or that purchases are currently possible.
