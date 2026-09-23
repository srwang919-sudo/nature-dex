# Verified card numbering and single-action reveal

Final Master visual migration Task 3, local only.

The shared presentation/export model now shows Discovery No. only for an actual server-card ID with a verified positive safe integer discovery number. Legacy local serials, samples, memorial copies and non-observations do not display a discovery number. Canvas uses the same label and enough plaque width; the front retains art/name/scientific name/stars/craft and original-photo back.

The arrival screen's single “查看收藏卡” action persists reveal state and opens the card. The second hold-to-unseal interaction and delayed direct-open button are removed; the short transition settles in 240ms. Reduced motion settles immediately. Returning after interruption respects the persisted reveal state. Collection, duplicate observation, flip, detail and post-save honour behavior are retained. Reveal image loading now uses the shared consent-aware component.

Tests-first numbering and single-action reduced-motion contracts failed before the change. Isolated full suite: **156/156 pass**, native build pass. Official WXML/WXSS compilation of reveal and collectible: **4 pass**. No deployment/model/preview.

Real-device motion, dynamic typography and exported visual comparison remain unverified. This is a UI/presentation boundary, not proof of production discovery-counter migration or cloud availability.
