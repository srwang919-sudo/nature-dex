# 发布检查门 · 2026-09-27

本地通过不代表云端部署完成。最终候选须记录提交 SHA；当前工作区变更仍待纳入发布候选。

## 可重复安装与验证

在一个新的专用检出目录（不要删除现有目录）检查所选候选提交：

```sh
npm ci --ignore-scripts
for manifest in cloudfunctions/*/package.json; do
  npm ci --ignore-scripts --prefix "${manifest%/package.json}" || exit 1
done
npm run quality
npm audit --omit=dev --audit-level=moderate
for manifest in cloudfunctions/*/package.json; do
  npm audit --omit=dev --audit-level=moderate --prefix "${manifest%/package.json}" || exit 1
done
git diff --check
git status --short
```

quality 包含主 tests、natureMembership 独立支付测试、原生源码与 JavaScript 验证。CI 也枚举全部函数安装和审计，退休函数虽无依赖也要保留锁文件。不要以根目录零依赖代替函数审计。

- [ ] 干净候选安装、测试、全函数 audit 通过，记录 SHA、测试数量与审计结果。
- [ ] 微信官方 wcc/wcsc 编译全部注册页面及组件 WXML/WXSS。
- [ ] 上传包大小与资源引用正确；不含 .env、密钥、备份、日志、node_modules、cloudfunction-packages。
- [ ] 私钥/令牌模式检查无命中；人工确认无真实用户数据被纳入候选。
- [ ] 深森林主题、按钮居中/触控区、图鉴滑动、徽章等级及放大、拍照页和隐私弹层移动端通过。

## 云端与外部验证

- [ ] 已部署修复后的管理员认领；审计旧 natureAdmin/main 名单并轮换/关闭旧码。
- [ ] 已部署 natureAI2 / generateIllustration 退休版本，旧客户端不能绕过当前配额调用付费模型。
- [ ] 删除/恢复明确区分私人显式删除与未完成观察清理；断网队列恢复后成功，无跨账号删除。
- [ ] 所有私有集合为服务端权限；索引、初始化和定时任务真实可用。
- [ ] 百度/混元权限、并发额度和全站费用报警就位；已授权测试照片全链路通过。
- [ ] 真实隐私指引、类目/接口审批与 AI 标识相符；授权拒绝/同意/离页真机通过。
- [ ] 支付商户与签名回调、退款/对账、会员状态实测；未启用服务保持明确关闭。
- [ ] 好友/获赠副本/打印授权双账号验证；私人照片及地点不会越权暴露。
- [ ] iPhone/Android 上相机、相册、头像、定位、导出、字体放大及 375/390/430 屏宽完成验收。
- [ ] 素材来源/许可、打印打样、客户反馈渠道由所有者确认。
- [ ] 体验版和审核截图来自实际候选；审核批准及所有者发布操作完成。

结构化所有者任务与完成标准见 [USER_LAUNCH_PLAN.md](USER_LAUNCH_PLAN.md)；本轮本地证据见 [launch-readiness.md](launch-readiness.md)。
