# Release checklist — current gates, 2026-09-23

本表刻意不自动勾选：本地通过不能替代发布分支、真实设备与控制台证据。当前没有部署/上传/正式发布操作。

## 可重复的干净检出

在本项目已有可信本地仓库路径运行（不从脏工作区复制未提交文件）：

```sh
git clone --no-local /Users/w/WorkBuddy/2026-09-13-12-50-14/去大自然里-mini /tmp/nature-release-clean
cd /tmp/nature-release-clean
npm ci --ignore-scripts
npm test
npm run build:weapp
npm audit
git diff --check
git status --short
```

若目标路径已存在，换用一个不存在的专用目录，不删除现有目录。审核应记录所验 commit SHA。云函数依赖在各函数目录独立安装，根项目零依赖并不证明云 SDK 无漏洞。

- [ ] 干净检出以上命令全部通过，记录 SHA、测试数和审计范围。
- [ ] 使用微信官方 wcc/wcsc 对全部 native WXML/WXSS逐文件编译。
- [ ] 实际上传包主包≤2MiB；badge alpha/尺寸与七案例hash一致。
- [ ] 私密配置、环境文件、用户照片、备份、日志和部署压缩包不在发布包/仓库。
- [ ] 资源授权/来源、AI图声明、README 与当前产品一致；Changelog 有 Unreleased。

## 外部发布阻断门

- [ ] 新版删除/同意/每日限额函数已部署；observationDeletions、usageQuotas 服务端私有权限已验证。
- [ ] 两微信身份隔离：原图/艺术图、任务、删除/取消/迟到响应不会串号或假成功；公共水彩不被私人删除波及。
- [ ] Hunyuan 模型、百度三路真实权限/额度/错误码/超时验证；只用明确授权的测试照片，完成识别校准。
- [ ] 控制台全站预算/告警、生成并发控制、照片保留/清理/撤回渠道由所有者确认；每人限额不是全站预算。
- [ ] 隐私指引第三方列表与单次同意一致；chooseLocation 隐私声明和接口审核通过。
- [ ] iPhone/Android 微信真机相机、头像、地点、导出、拒绝权限、断网/后台/字体放大和375/390/430小屏已验。
- [ ] 原图背面和私人导出风险明确；纸张/DPI/颜色仅在打样后确认。
- [ ] 真实登录/好友授权仍未实现；支付商户、订单与回调未实现。未开放 UI 不可解释为已开通。
- [ ] 版本、审核截图和发布材料基于实际运行版本，不用概念图代替。只有所有门具备证据才打正式标签。

详见 OWNER_SETUP_GUIDE.md；当前本地验证记录独立保存在 docs/plans/2026-09-23-release-readiness-verification.md。
