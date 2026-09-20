# 开始识别按钮无反馈：定位与验证

根因：native/pages/observe/index.js的wx.showModal传入confirmText“同意并鉴别”，长度5。微信参数最多4字符，本地miniprogram-api-typings/types/wx/lib.wx.api.d.ts约10836行明确限制。缺少fail回调导致参数失败无页面反馈，未进入云调用。

按钮bindtap=identify正确，app.onLaunch已有wx.cloud.init。云配置是否已部署不影响此前弹窗的参数失败。本次检索当日开发者工具WeappLog，没有找到可用的持久化showModal失败条目；未声称取得真机日志证据。

先添加严格模拟API字符限制的tests/native-identify-button.cjs，旧代码失败：valid 4-character confirmation must actually open。修复confirmText为“同意鉴别”，增加fail与同步异常兜底，页面可见identifyError；保存中、无照片、草稿缺失、wx.cloud缺失均给明确提示，不绕过同意。

改动仅observe/index.js、observe/index.wxml、新增回归测试和本文。未改变云环境、密钥或服务端。

验证：独立按钮回归通过；node --test tests/*.cjs为23/23通过；npm run build:weapp通过；官方24个WXML/WXSS单文件编译通过，无stderr警告。仍需手机刷新当前本地版本后点击确认弹窗；后续百度服务能否成功属于独立云部署验证。本轮未上传或preview。
