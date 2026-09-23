# Account erasure write gate — local checkpoint

2026-09-23. This checkpoint is not an account-deletion feature completion claim.

- `accountPrivacy/{sha256(OPENID)}` is a durable write barrier. Recognition receipt transactions, private art claims/publication, and new public illustration generation claims fail closed if a marker exists or its collection cannot be read.
- Private art arriving after the barrier records its cancelled file reference before deletion. A storage failure retains that reference for the upcoming erasure worker; it cannot create an attestation.
- Public species illustration outputs already in flight may finish into the nonpersonal shared library. They contain no user picture; account deletion must not delete that shared library.
- Social access checks the authenticated account and every related account in transactional reads. Shares from an erasing source disappear before bulk deletion finishes. New membership checkout is blocked; already-started authoritative payment reconciliation data is retained, not blindly deleted.
- Fixed collection setup now includes accountPrivacy, all nine social collections (including trustedObservations), and four membership collections. All must deny client database access; installing collections/rules is an external deployment gate, not done here.

Evidence: current worktree `npm test` 105/105; `npm run build:weapp` passed; `node --test cloudfunctions/natureMembership/test/*.test.js` 14/14. Focused tests assert unavailable-collection fail-closed behavior, late art deletion retry, social visibility and checkout rejection. No provider, deployment, preview or cloud data access occurred.

Still required: bounded owner erasure/retention worker, client explicit erasure control, live two-account races, storage absent-file contract, financial retention/legal review. Do not enable an erasure button until those local pieces exist.
