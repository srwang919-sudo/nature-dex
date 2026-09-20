# Local Parity Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 修复本地收藏清理安全性、导出隐私竞态和印刷输出边界。

**Architecture:** 保留原生入口和现有存储键，删除采用先记录清理意图的顺序；导出以清除代次和页面令牌拒绝迟到结果。画布科学字段限制到独立保护区前，打印清晰度按原图裁切比例计算。

**Tech Stack:** 微信原生小程序 JavaScript / WXML / WXSS、Node VM 测试、官方 wcc / wcsc。

**Spec:** docs/plans/2026-09-13-local-parity-design.md，以及本轮已确认的审查修复清单。

## Global Constraints

- 不上传、不preview，不修改AppID。
- 不初始化Git、不提交；当前项目非Git仓库。
- 保留照片、翻面和鉴别边界；真实微信验收仍未完成。

### Task 1: 清理与导出事务边界

**Files:** app.js、native/pages/settings/index.js、tests/native-local-parity.cjs。

- [x] 注入 cleanup 存储失败以及 drafts 存储失败，断言草稿仍存在；使用 held writeFile 回调模拟清除后迟到success。
- [x] 在删除前持久化清理意图；清除递增 getDataEpoch；导出捕获 epoch/token 并删除失效JSON。
- [x] 运行 `node tests/native-local-parity.cjs`，quota和迟到私密JSON测试通过。

### Task 2: 输出边界

**Files:** native/lib/card-export.js、native/pages/card/index.js、native/pages/card/index.wxml、tests/native-export.cjs、README.md。

- [x] 加入最长名称与科学字段、安全区 x>=71、工艺实底先于文字绘制和DPI测试。
- [x] 科普内容底线为800px，保护区域独立；前后文字在安全区内；工艺标签使用暖纸实色底。
- [x] 使用 `Math.floor(Math.min(image.width/821,image.height/855)*300)` 计算覆盖裁切后的有效DPI；卡背文字不伪造照片DPI。
- [x] 运行 `node tests/native-export.cjs`，所有断言通过。

### Task 3: 文案、动态和回归

**Files:** native/pages/home/index.js、native/pages/home/index.wxml、native/pages/home/index.wxss、native/pages/card/index.wxss、native/pages/settings/index.wxml、native/pages/settings/index.wxss。

- [x] 主图鉴计数为种，筛选空态适用所有类别；低动效禁用格子动画；缩略图不压缩、长文可换行。
- [x] 运行 tests/native-*.cjs 全部六个脚本，JS语法、JSON解析通过。
- [x] 官方单文件编译全部16个模板/样式通过：wcc -d -o /tmp/nature-review-0.js native/components/collectible/index.wxml；其余WXML同参数，WXSS用wcsc -o。
- [ ] 微信真机验证相册保存、Canvas清晰度警告、照片清除与实际印刷打样。此项不能以静态测试替代。
