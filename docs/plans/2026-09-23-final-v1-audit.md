# Final V1 — authoritative audit and migration

The 3907-line `V1 Product + Design Master Plan — Final` supplied on 2026-09-23 supersedes the previous private-museum UI plan. Its local attachment is `/Users/w/.codex/attachments/48fac4da-f54e-4218-b0ba-fb53cdf34a8f/已粘贴的文本.txt`. All lines were inspected. The user's withdrawal of 33 tracked unverified assets remains in force.

## Evidence and gaps

| System | Current inspected implementation | Final V1 migration |
|---|---|---|
| Runtime | Root app.js + native; build:weapp validates native | Extend this runtime, preserve old card data |
| Identity/recognition | recognizeObservation owner/file-bound receipts; explicit candidate confirmation | Retain confirmation; no invented taxonomy or automatic final identification |
| Cards | observation-card.js reads original/art assets; local card IDs | Introduce Species, SpeciesArtwork, Observation, UserSpeciesDiscovery, Card; local IDs are never Discovery Numbers |
| Global discovery | No global allocation service | Unique owner/species record and per-species atomic counter; allocate only with verified saved observation, never for gifts/repeats |
| Artwork | createArtCard always private generation; speciesIllustration ready cache has no review | Reuse approved official art first; candidate creator-only; explicit review required before official/default; old ready caches stay unreviewed |
| Usage | Daily operational limits 3 art / 3 watercolor / 20 recognition | Keep abuse guards distinct from consumer monthly 5 free / 30 member / initial 10; add reserve/commit/release ledger, provider failures release |
| Membership | Server catalog 1800/18000 fen; fail-closed merchant integration; UI unavailable | New orders 1990/19800 fen, preserve existing order totals; never grant from client callbacks |
| Social | Owner-approved memorial copy, live attestation checks | Like/Request/Gift with approved public derivatives; no feed or DM; gifts never inflate discovery |
| Printing | Local PNG, previous 63.5×88.9mm format | Separate V1 24-card/5990-fen product, 63×88mm, 3mm bleed, 300dpi; frozen order snapshot, PDF/package/fulfillment workflow |
| UI | HEAD old three tabs; uncommitted five-tab prototype | Final five entries, living nature world, real today/recent/past, two-column/shelf collection, quiet reveal |
| Privacy | 80fbf66 doc-only transactions, active generation write fencing, recipient invite and paginated relationship cleanup | Retain these boundaries in every new write; public watercolor excluded from account erasure |

## Version and trust rules

Legacy cards remain readable and are not silently promoted to verified discoveries or approved artworks. Original photographs stay private. A candidate image can be used by its creator but never presented as official without a server review decision. Missing artwork is an honest placeholder; the neutral owned leaf is not species artwork. Science uses confirmed Baidu/local sources and one compact missing-state. No static case assets are restored.

Monetary values use integer fen: monthly 1990, annual 19800, physical 24-card set 5990. Existing paid/order snapshots are immutable. Consumer quota policy is 5/30 monthly and 10 initial, distinct from operational anti-abuse limits; a displayed policy must not imply the wallet is deployed.

## Independently verifiable stages

1. Compatible core projection and authoritative new-order price/policy constants.
2. Server verified discovery transaction and approved-artwork repository; migrate old cache as candidate, not official.
3. Idempotent quota reservations and usage ledger; official reuse consumes zero units; failures release.
4. Generation/recognition integration with existing consent, cancellation, owner gate and private original.
5. Final tokens, nature-world placement, five routes, collection/detail/reveal and real temporal projections. Replace incompatible uncommitted old UI rather than commit it as-is.
6. Membership entitlement integration, Like/Request/Gift and print selection/order/artifact pipeline.
7. Analytics without photos/coordinates and complete clean-checkout/static/device release validation.

These stages map to the final specification's 16 phases; this document does not claim later stages are implemented.

## External release gates

Cloud database collections/indexes/rules and atomic transaction behavior, reviewed licensed official artwork, live provider success/cancellation, merchant binding and signed payment/refund callbacks, physical fulfillment and shipping policy, WeChat privacy declaration/review, real-device camera/export/location/accessibility, and retention scheduler/legal financial retention must all be verified externally. No deployment, preview, provider request or production mutation is authorized for this local implementation stage.
