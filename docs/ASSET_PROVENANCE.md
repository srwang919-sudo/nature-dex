# Asset provenance

This file is a release gate. An asset may enter the public repository only after its source and permitted use are recorded here.

| Asset group | Current source | Public-release status | Action before publication |
|---|---|---|---|
| Application code and UI styles | Project-authored | Review required | Confirm the contributor owns the code and has permission to publish it |
| Third-party npm packages | Package registries and package lock | Review required | Preserve package licenses and check transitive notices |
| Species photographs and reference JPGs | Historical local/project resources | Not approved by default | Record original source and license, or remove from public release |
| Generated watercolor and card art | Provider-generated or local outputs | Not approved by default | Record provider terms and generation provenance, or replace with approved fixtures |
| Fonts and icons | Mixed project and third-party sources | Not approved by default | Record license and attribution for every file |

Do not use a missing provenance record as evidence that an asset is project-owned. The public mock flow must work without any private or unverified asset.
