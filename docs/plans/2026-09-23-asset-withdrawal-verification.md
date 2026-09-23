# Rights-unverified static asset withdrawal

User decision on 2026-09-23: rights cannot be confirmed; remove these assets. This supersedes historic acceptance rules requiring seven unchanged example photographs.

33 tracked assets were removed: 7 species JPG photographs, 8 species SVGs, 12 badge PNGs, 2 hero JPGs and 4 WOFF2 fonts. Eleven ignored historical dist copies (7 photographs and 4 fonts) were also removed from this working directory. Neither user photographs, private cloud files nor generated-image originals outside this project were touched.

Recoverable copy: `/Users/w/WorkBuddy/2026-09-23-unlicensed-assets-backup/去大自然里-mini-20260923-asset-removal/`. The manifest contains all 44 paths and SHA-256 values. All 44 copies were independently re-hashed and matched; total 2,570,827 bytes. Backups are outside the release repository/package and must not be republished.

Replacement: `assets/theme/share-safe-leaf.svg` is project-authored geometry and `share-safe-leaf.png` is its mechanical raster export (800×640, 45,472 bytes; SHA-256 `0c1c7067aaf38d3c0b824eba3b5f51c67bb293443c13a03d1b433f5800adb328`). It is a neutral nature mark, not a species illustration or scientific evidence. Achievements retain twelve distinct names/conditions; they now share this neutral mark. Legacy card backs use the same neutral mark. CardV2 original-photo backs remain unchanged.

Home uses the already-authored CSS landscape replacement. Example-card provider returns no cards; real collections remain intact. Seven factual species records remain, without example-image fields. Cached legacy asset mappings and the old upload setup page cannot restore or upload withdrawn images. Sharing specifies the neutral image explicitly, never a default screenshot of a private card and never the old external sample host.

Verification: full working-tree tests passed 97/97 and native build passed after updating retired-asset expectations. An isolated staged checkout passed 95/95 tests, native build and official WXML/WXSS compilation for home/setup. Conservative main-package inventory: 253,970 bytes across 79 files. The two extra working-tree tests are preserved pre-existing untracked visual/accessibility checks, not silently included in this commit. Asset reference tests enforce no old image fields and no old public-share URL. No deployment, upload, preview or provider invocation occurred. New design-brief visual work and device rendering remain separate, unverified gates.
