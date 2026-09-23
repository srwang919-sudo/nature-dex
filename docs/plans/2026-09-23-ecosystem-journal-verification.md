# Ecosystem and species journal refinement

Follow-up to read-only aesthetic review of 34f2cbe, under the existing final Master visual migration plan.

- World representatives deduplicate canonical species, sort by stable canonical key, choose latest dated observation with ID tie-break, independent of input order.
- Authored neutral tree canopy/branch/ground/water geometry replaces the tilted card wall. Scene art uses the existing consent-aware image resolver, not an alternate fetch. It is explicitly labelled a scene illustration, not actual habitat/distribution. Maximum two specimens per zone and six overall prevent overlap.
- Missing artwork is honestly labelled awaiting recovery. No sample species/image/font is restored.
- Journey groups repeated observations under one species portrait and dated journal links. Unknown capture dates remain unknown.
- Removed old museum-today/small-card breakpoint styles; new world rules explicitly cover max-width 390 and 320.

Tests-first new cases failed before implementation. Isolated checkout full suite: **155/155 pass**. Native build passes. Official WXML/WXSS compilers pass all six changed component/home/journey template/style files. No deployment or model call.

Breakpoint tests are static contract assertions, not screenshot/device evidence. Real 320/390 rendering, accessibility font enlargement and ecosystem visual balance still require independent visual inspection. Remaining card/reveal/badge/service phases are not claimed complete.
