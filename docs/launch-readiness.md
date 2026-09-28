# 上线就绪审计 · 2026-09-27

整体状态：**阻塞正式发布**。本地修复与自动检查已完成一轮；云端部署、真实权限及真机验收尚无本轮证据。历史上传/部署记录不代表当前未提交工作区已上线。

## 本轮问题与处理

| 模块 | 已证实问题 | 处理与验证 |
|---|---|---|
| 管理员权限 | 未设置环境变量时使用仓库公开默认认领码；并发认领可能覆盖名单 | 取消默认码，未配置即关闭认领；事务读写保留既有名单；授权/并发/读取失败回归通过 |
| 私隐授权 | 监听 API 拼写错误、第二参数误作 reject，递归 requirePrivacyAuthorize | 全页面共享真实 agreePrivacyAuthorization 按钮；正确监听、同意/拒绝/离页处理；并发与取消回归通过 |
| 删除/恢复 | 明确删卡误用仅清理未完成观察的接口；retained 丢失重试意图，恢复可复活 | 本机移除前持久记录删除意图；重试显式删除接口；恢复过滤墓碑；缺照片 fileId 仍按观察 ID 清理；存储失败保卡 |
| 旧 AI 入口 | natureAI2 遗留付费入口不走当前额度/账号控制 | 无当前客户端调用，直接退休；不再触达供应商。generateIllustration 同步停用提示 |
| 依赖/CI | 4 个函数缺锁文件、退休函数仍装 SDK；CI 没装全函数、没跑独立支付测试 | 补锁；停用函数删除未用依赖；CI 枚举全函数安装/审计，quality 纳入支付测试 |
| 发布配置 | 环境变量模板遗漏支付/管理员/定时任务；包忽略遗漏潜在凭证与归档 | 补无密钥模板；排除 .env 前缀、.git、.github、cloudfunction-packages；密钥模式扫描无命中 |
| 界面 | 品牌色偏浅、图鉴触控偏小/卡架留空、拍摄标题窄屏拥挤、徽章等级样式未接线 | 深森林 #173F35；纸白背景；触控至少 88rpx；标题自适应；铜/银/金/铂金边缘及放大预览等级一致；去掉“原型”和重复背景规则 |

## 本地证据

- `npm run quality`：主测试 **314/314**，支付独立测试 **14/14**，无跳过；原生源码/JavaScript/JSON 验证通过。
- 本地保守未压缩主包估算 **1,121,803 bytes / 146 files**；并非微信上传后实际大小，上传包仍须独立核对。
- 本轮新增回归覆盖默认关闭认领、并发名单、存储失败保卡、删除重试与防复活、隐私按钮/并发/离页。
- 最后补充缺 fileId 删卡用例独立通过；`git diff --check` 通过；CI 同规则密钥扫描无命中。
- analytics-aggregate、printAdmin 新锁各审计 104 包，零已知漏洞；三个退休函数无运行时依赖。完整全函数最终审计以发布候选实跑为准。
- 上述 build 是源码验证，**不等于**微信官方 WXML/WXSS 编译、真机视觉验收、云端服务可用或正式上传。
- 独立微信官方编译器检查：**18 个 WXML、20 个 WXSS 全部退出 0**；这不代表完整开发者工具运行或真机验收。当前电脑锁屏，未取得本轮移动界面截图，UI 视觉仍待验。
- 根项目及 **15 个云函数（共 16 包）**独立 audit 全部退出 0，已知漏洞数 0；仅复制清单/锁文件至独立临时目录逐一执行 npm ci --ignore-scripts 全部成功，未修改原项目 node_modules。
- 隐私接口依据：微信官方 [api-typings](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.api.d.ts)。真实授权行为仍需在配置好隐私指引的体验版验证。

## 候选证据 · 2026-09-28

- 候选提交 SHA：`7b8ecc74f567aaa06c6defc51fffa6bf5ef38ec3`（HEAD，已推送 origin/main，工作树 clean）。
- 离线已验证：`git diff --check` 通过；`npm run quality` = 主测试 **314/0** + 支付测试 **14/14** + `build:weapp` PASS；本地 `node_modules` 齐备（主仓与各云函数）。
- 密钥/令牌模式扫描（`AKID|secretId|secretKey|sk-|PRIVATE KEY|access ?key` 等）**无真实密钥命中**：仅 `cloudfunctions/natureMembership/lib/config.js` 中的正则校验片段；仓库未跟踪 `.env`/`.pem`/`.key`/`credentials` 类文件。
- 待补项已闭环（代理恢复可达）：修复 analytics-aggregate 入口对「显式 null 运行时」与「未注入运行时」的区分——`{cloud:null}` 现确定性返回 `runtime_unavailable`（测试 29），而生产默认 `undefined` 仍回退模块级单例 `cloud`，行为不变；最终 `npm run quality` = 主测试 **314/0** + 支付测试 **14/14** + `build:weapp` PASS。
- `npm ci --ignore-scripts` 已对各云函数重装（含此前被中断脚本清空的 claimGift/generateIllustration/natureAI2/printAdmin；其中三者的 0 依赖状态为正常），`npm audit --omit=dev --audit-level=moderate` 对**根仓 + 15 个云函数（共 16 包）全部 0 已知漏洞**，退出码 0。
- 结论：候选在**代码/仓库层**证据齐备；云端部署、真实账号/审批/真机验收等发布门仍阻塞（见 USER_LAUNCH_PLAN.md）。

## 剩余风险与发布门

补充修复：分析事件队列满 200 条时的常量重新赋值异常、客户端事件 ID 被服务端错误拒绝、未确认接收便移除事件及并发新增事件丢失。写入 ID 按用户隔离，并复用账号清除事务门，防止清除后重新写回个人事件；端到端边界回归通过。隐私草稿已修正 OpenID、云端卡记录、事件上报及获赠打印访问表述，主体/留存期/联系方式仍需所有者补齐。

1. 已部署旧默认管理员口令可能曾被使用；必须复核 natureAdmin/main 名单与日志，撤销不认识的身份、轮换/关闭认领口令。
2. 修复只在本地；当前线上旧函数可能仍存在旧入口或删除行为，部署后必须回归。
3. 支付、模型权限、数据库规则、隐私审批与素材权利需要真实账号证据；自动测试不能替代它们。
4. 持久删除墓碑防止本设备自动恢复已删除卡；卸载会清除本机意图，云端删除失败必须继续跟踪至成功。
5. UI 已做代码层优化；相机原生层、权限弹窗、字体放大与不同屏宽须真机复核。

所有者结构化清单见 [USER_LAUNCH_PLAN.md](USER_LAUNCH_PLAN.md)，工程发布门见 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)。
