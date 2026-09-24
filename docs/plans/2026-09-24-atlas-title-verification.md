# Atlas single-title correction

Removed the redundant species-name caption outside collectible cards from both the neat grid and horizontal shelf. The actual collectible footer title and each item's accessible species label remain. Removed the unused caption styles; no card data or image asset was changed.

Working-tree tests: **174/174 passed**; native build passed. New regression checks both layout labels, the single visible title structure, and 320/390px grid sizing using the current global page padding. These are static layout checks, not a claim of actual WeChat screenshot verification; controller device inspection remains required.

Missing local artwork/original-photo content is not replaced with invented or withdrawn assets. Cards with valid cloud ownership may use the separately consented recovery flow. A stale local-only photo cannot be recovered from a missing file without the user's original; this is a content-recovery limitation, not permission to delete their record.
