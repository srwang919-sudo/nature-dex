# Paid-order retry and section isolation

- Confirmed PAID reconciliation retires the pending order and the matching plan's idempotency key. A different plan's key is untouched; the next purchase creates a new request.
- Pending order records now carry plan and request key. A concurrently replaced pending order is not cleared. Older records can use the server-returned plan for retirement.
- A create-payment response for an already paid order is explicitly labelled an existing payment, not a new successful purchase. Current entitlement remains separate.
- Settings section changes clear service errors/payment/share messages and invalidate late UI results.
- Catalog/UI prices are unchanged pending the controller's resolution of the user's price choice. Merchant configuration remains fail-closed; no external payment or deployment occurred.

Evidence: focused client/page tests **10/10**; actual worktree `npm test` **172/172**; `npm run build:weapp` passed. Tests cover PAID cleanup, fresh retry key, other-plan preservation, existing ACTIVE entitlement with unpaid order, existing paid order wording, section clearing and late result suppression. Live merchant behavior remains unverified.
