# Baidu Private Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 原生唯一发布源、百度唯一识别、确认且同意后调用百炼，移除源码密钥并保护用户照片。

**Architecture:** CloudBase函数校验身份与文件归属，百度负责候选，natureAI2仅科普/授权生成。前端同意先于上传，异步操作绑定草稿与清除代次。

**Tech Stack:** 原生微信小程序、Node HTTPS、wx-server-sdk、Node测试和微信编译器。

**Spec:** docs/plans/2026-09-17-baidu-private-cloud-design.md

## 执行证据（2026-09-17）

本地已实现唯一原生发布源、环境变量凭据、百度识别、确认且明确同意后的百炼。22个测试全过、原生构建通过、24个官方模板/样式编译通过。外部部署、规则、凭据和真实精度校准未执行。

测试基线同步：旧测试要求空个人页显示157物种及nash、首页旧四格、七个本地PNG。这些不符合当前真实实现，现改为零收藏、当前首页和云资源映射契约；保留示例隔离、持久化失败、公开分享、DPI、翻面测试。七个PNG缺失是已报告资源缺口，路径契约不能证明资源可用。

发布条件仍包括私有规则与部署、旧密钥轮换、百度精度校准、云资产实际删除（当前函数仅排队）、七物种云资源和真机显示。本轮未上传或preview。

## Global Constraints

- 不读取新密钥、不上传、不操作云控制台、不初始化Git。
- 原生root/native为唯一发布源；旧Taro为非发布实验。
- 识别无百炼，百炼需确认物种和显式同意，示例不计真实统计。

### Task 1: 安全边界与云端接口

**Files:** cloudfunctions/natureAI2/index.js、cloudfunctions/recognizeObservation/index.js、tests/cloud-recognition.cjs、tests/cloud-illustration.cjs、tests/native-security-boundary.cjs

- [ ] 加测试：`assert.equal((await main({consent:false})).code,'consent_required')`；百度mock返回低分时needs_confirmation，无候选unknown，非本人文件forbidden。
- [ ] 运行 `node --test tests/cloud-recognition.cjs tests/native-security-boundary.cjs`，确认旧实现不满足。
- [ ] 移除硬编码fallback；token请求使用 `new URLSearchParams({grant_type:'client_credentials',client_id:process.env.BAIDU_API_KEY,client_secret:process.env.BAIDU_SECRET_KEY})`。服务端获取OPENID后校验assets记录owner，才downloadFile。natureAI2拒绝recognize，科普与生成均检查consent和confirmed。
- [ ] 重新执行云函数测试；只用假测试凭据与mock HTTP，不调用真实第三方。

### Task 2: 同意、草稿绑定与真实统计

**Files:** native/pages/observe/index.js、native/pages/reveal/index.js、native/pages/card/index.js、native/pages/card/index.wxml、app.js、native/lib/profile-model.js、native/pages/profile/index.wxml、native/contracts/services.js、tests/native-flow.cjs、tests/native-profile-page-runtime.cjs

- [ ] 写无同意零上传、切换草稿拒绝迟到响应、reveal不调用生成、零收藏统计为0测试。
- [ ] 照片保存取消自动上传；识别modal明确CloudBase与百度，确认后调用recognizeObservation；fileID附本人assets归属记录。手动确认本地卡不依赖科普API。
- [ ] 卡详情分别提供科普与手绘授权；将 `consent:true` 限制到modal确认分支；禁用旧后台自动提交生成。模型计算前过滤sample/kind=example。
- [ ] 跑相关测试，校准已批准新语义而不降低身份/同意/持久化断言。

### Task 3: 发布源与总验证

**Files:** package.json、scripts/verify-native.cjs、project.config.json、README.md、tests/native-security-boundary.cjs

- [ ] 新测试断言 `package.scripts['build:weapp']==='node scripts/verify-native.cjs'`，原生root/native可达，src/dist不进入发布包。
- [ ] build:weapp只验证原生，Taro脚本明确命名experiment:taro；原生验证遍历JS/JSON并验证app页面存在。
- [ ] 执行 `node --test tests/*.cjs`、`npm run build:weapp`；官方wcc -d -o /tmp/native-template.js逐文件编译WXML，wcsc -o /tmp/native-style.js逐文件编译WXSS。
- [ ] README记录环境变量名、私有数据库/存储规则和控制台部署步骤、旧密钥吊销、外部服务未校准；不得写真实值。报告实际测试结果，不宣称已部署。
