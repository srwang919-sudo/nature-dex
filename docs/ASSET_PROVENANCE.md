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

## 2026-09-21 自然博物徽章（本地新增）

由主控提供的12次独立 imagegen 输出，珐琅/古铜自然物种主题，无用户照片。来源文件均保留，不覆盖原图。根据用户后续包体要求，部署副本为256×256 RGBA PNG；16色RGB量化后重新附加原缩放alpha，避免量化污染透明背景。UI缩略图112rpx，未解锁通过CSS灰度而非第二套图片。发布前仍需确认生成服务条款，不能由来源记录推定商业授权。

| 文件 | 字节 | SHA-256 |
|---|---:|---|
| assets/badges/chinese-alligator.png | 29273 | 08bed0c55685bd99ac3cab5b27f8400b44f852cd7ea8cae8a069d298f57927a2 |
| assets/badges/common-kingfisher.png | 30369 | e58c5dcaa715ecb549b4c61d11ace23d3a8bf6eaa224d9ae4fa721ced2029392 |
| assets/badges/fly-agaric.png | 31455 | 35062edcbf71eb576c3d531825d8d4f8a35990b3de5ce68e1241a3c6325d974a |
| assets/badges/giant-panda.png | 32628 | 3aac3b2f3895194282275b87d8d2d0516fcc3c0ade5c4f9e1f2f221c29207ba9 |
| assets/badges/ginkgo.png | 24901 | 9f216265de83a435c1c4a654b69d8613ac176762d9f7c16819b962f65892e89b |
| assets/badges/golden-pheasant.png | 29192 | 0faaab816bd148b665f33b16066294c62aad709f6f69a2cdfaf1768b9db9e860 |
| assets/badges/ibis.png | 31611 | 750f54d5eeb4bc78eafe3a6147c95fcb6719fc110102125be415b66e2a36f4c6 |
| assets/badges/monarch-butterfly.png | 28152 | ae5a84c5a3a3214dac97b4b119fbb14cd1e09e4868a898f0985a1e09fd483507 |
| assets/badges/red-crowned-crane.png | 26380 | 6c3bc376fafe98f123f91c8cc437dd1cf00faa37e2c76bd60f61cc20fe469436 |
| assets/badges/red-fox.png | 30213 | ba068d9a62b9dd55a0624aef6e9145b1001e12b474c0ce871450b7c915b37b58 |
| assets/badges/sika-deer.png | 29684 | 7ccfcc64a9a675a46094e65a124df26cecca7887420ba8af3c105ee41ef96267 |
| assets/badges/snow-leopard.png | 29899 | 8abcd77cd478207a2d9fcfbf37c403c8c12e2bde64524a058a1f0bdd75ce4ae3 |

来源映射：
- red-fox: exec-12d5447f-215e-4fa4-9f13-ea78386dbcfc.png
- red-crowned-crane: exec-f4b8ce6b-a5ff-4f0d-8c58-2b0d97b2e020.png
- monarch-butterfly: exec-30eb6f35-50b1-4d1a-80fb-3518d1b9f22c.png
- fly-agaric: exec-4b0010da-154f-47f0-9f5a-14cab2537b5c.png
- ginkgo: exec-3da68d02-5cde-49c1-a881-44f745956f54.png
- sika-deer: exec-93718c39-b791-4810-8b29-22974b971a30.png
- ibis: exec-e0f5b9d9-e6f0-4913-ae7e-aafa1a898956.png
- giant-panda: exec-8a20b151-b667-4827-8b86-cbc507004f4f.png
- chinese-alligator: exec-6cc34c3c-efbe-4f12-8ef0-55a0b2681715.png
- golden-pheasant: exec-b8a9acd3-7be6-475f-8061-daeaff7d90f9.png
- snow-leopard: exec-13823766-04f8-46cd-9b76-b1da0b34cbdb.png
- common-kingfisher: exec-45c2a3c1-e8cc-46f2-bf20-dcf23e64889c.png
