# Friend Museum Implementation Plan

> **For agentic workers:** Tests-first; preserve dirty work, no deployment/payment/printing or unauthorized images.

**Goal:** An authenticated friend museum showing only recipient-specific shared species, with separately opted-in alias and authored avatar symbol.

**Architecture:** `natureSocialProfiles` is server-only, owner-keyed and disabled by default. Explicit save enables a short alias and allowlisted geometric avatar symbol; no private local avatar upload. Museum requires current friendship and account gates on every page and rechecks source verification. Owner/purpose/relationship-bound cursor; recipient-specific cards only. Counts reflect loaded disclosed records, not hidden personal totals. No trustworthy public badge ledger exists: show “徽章未公开”, not invented zero. Recent/featured are labelled shared-content views, not a global feed.

**Tech Stack:** Existing CloudBase repository and account guard, native page, Node tests.

## Tasks
- [ ] Add server tests for profile default/off/revoke, foreign role/relationship, source revocation, museum pagination and payload minimization.
- [ ] Add `getMySocialProfile`, `setSocialProfile`, `getFriendMuseum`, `setShareFeatured`; extend init collection allowlist/account erasure ownership mapping. No external collection creation.
- [ ] Add `native/pages/friend-museum/index.js/wxml/wxss`, native route and settings friend/profile controls, frontend allowlist and tests.
- [ ] Optionally expose only a maximum-three explicit recent-share preview on home; never automatic infinite feed or fabricated discoveries.
- [ ] Full worktree/isolated tests/build, official changed templates, safe-projection review. Record real cloud ACL/index/content moderation/consent and device gates.
