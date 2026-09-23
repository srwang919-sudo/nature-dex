# natureMembership 安全支付后端

该普通 CloudBase 云函数同时承载三种严格分离的入口：

- 小程序通过 `wx.cloud.callFunction` 调用 `createPayment` / `queryOrder` / `getMembership`。
- CloudBase HTTP 网关只向微信支付公开 `POST /wechatpay/notify` 和 `POST /wechatpay/refund-notify`。
- 每分钟的定时触发器调用 `reconcileInbox`，处理已验签、已解密、已持久化的 inbox 事件。

HTTP 回调只负责验签、检查 5 分钟时钟窗口、AES-256-GCM 解密和幂等入箱，然后返回 204。会员权益仅由后台作业对微信支付查单后授予；`wx.requestPayment` 前端成功回调永远不开通权益。

## 上线前必须配置

所有值都只能从 CloudBase 环境变量/密钥管理注入，不得写入代码或配置文件：

- `WXPAY_APP_ID`：已与商户号绑定的小程序 AppID。
- `WXPAY_MCH_ID`：普通商户号。
- `WXPAY_MERCHANT_SERIAL_NO`：商户 API 证书序列号。
- `WXPAY_MERCHANT_PRIVATE_KEY_PEM`：商户 RSA 私钥 PEM。
- `WXPAY_API_V3_KEY`：严格 32 字节的 APIv3 密钥。
- `WXPAY_PUBLIC_KEY_ID`：微信支付公钥 ID，格式 `PUB_KEY_ID_*`。
- `WXPAY_PUBLIC_KEY_PEM`：与上述 ID 对应的微信支付公钥 PEM。
- `WXPAY_NOTIFY_URL`：支付通知的完整公网 HTTPS URL。
- `WXPAY_REFUND_NOTIFY_URL`：退款通知的完整公网 HTTPS URL。
- `MEMBERSHIP_JOB_TOKEN`：长度 16–128 的高熵后台作业令牌。
- 可选 `WXPAY_API_BASE`（默认 `https://api.mch.weixin.qq.com`）、`WXPAY_REQUEST_TIMEOUT_MS`（默认 5000）。

任一必填商户配置缺失或无效时，所有入口默认关闭（`merchant_config_missing` / `merchant_config_invalid`），不会使用测试价格或伪造身份降级运行。

## HTTP 触发器契约

使用「普通云函数 + CloudBase HTTP 网关路由」，不要改成只能通过 API 网关调用的 Web Function。生产环境绑定已备案自定义域名和 TLS 证书，两条路由均只允许 POST。网关必须原样传递：

- `event.body` 必须是未被解析或重新序列化的字符串；`isBase64Encoded=true` 时按 Base64 解码。
- `Wechatpay-Serial` / `Wechatpay-Signature` / `Wechatpay-Timestamp` / `Wechatpay-Nonce` 请求头必须原样传递。
- 不得为回调路由启用需要微信用户登录的身份鉴权；真实性由 APIv3 RSA 验签保证。

CloudBase 官方 HTTP 访问契约明确 `event` 包含 `path` / `httpMethod` / `headers` / 字符串 `body` / `isBase64Encoded`。部署后需先用测试商户完成一次端到端原始 body 验签验收。

## 小程序契约

```js
wx.cloud.callFunction({
  name: 'natureMembership',
  data: { action: 'createPayment', planId: 'monthly', idempotencyKey: 'client_generated_opaque_key' }
})
```

月度价格固定为 1800 分，年度价格固定为 18000 分。云函数只从 `getWXContext().OPENID` 取用户身份，且严格拒绝额外的 `openid` / `amount` / `price` / `status` 字段。成功结果中的 `requestPayment` 可直接交给 `wx.requestPayment`。

## 数据集与索引

部署前手工创建下列数据集，并将权限设为「仅云函数可读写」：

- `membershipOrders`：唯一索引 `outTradeNo`，普通索引 `openid + status`。
- `membershipEntitlements`：文档 ID 即 OPENID，普通索引 `status + expiresAt`。
- `wechatPayEvents`：文档 ID 即微信支付通知 ID，普通索引 `state + nextAttemptAt`。
- `membershipReconciliationRuns`：保留对账作业摘要。

## 运维钩子和上线边界

- `requestFullRefund(orderId, reason)` 是仅供受信任运营后台调用的全额退款钩子，没有暴露给小程序。退款权益只在权威查询返回全额 `SUCCESS` 后撤回。
- `expireMemberships()` 是到期扫描钩子；`getMembership` 也会惰性收敛过期状态。
- 重复购买会以当前到期时间为起点顺延 1 或 12 个 UTC 日历月；退款时会从权益账本重算。
- 这是用户主动购买的普通小程序支付，不是委托代扣，因此不声称无感自动续费。若要自动续费，必须先获得微信支付对应代扣产品权限并单独接入签约/解约契约。
- 本仓库不含真实密钥，也不会在本地测试中调用微信支付。在商户资料、公网域名和 HTTP 路由未就绪前，不得宣称真实支付已上线。

## 官方依据

- 微信支付：`https://pay.wechatpay.cn/doc/v3/merchant/4012791911`（小程序支付开发指引）
- 微信支付：`https://pay.wechatpay.cn/doc/v3/merchant/4012791897`（JSAPI/小程序下单）
- 微信支付：`https://pay.wechatpay.cn/doc/v3/merchant/4012791898`（小程序调起支付）
- 微信支付：`https://pay.wechatpay.cn/doc/v3/merchant/4012791900`（商户订单号查单）
- 微信支付：`https://pay.wechatpay.cn/doc/v3/merchant/4012791902`（支付成功通知）
- 微信支付：`https://pay.wechatpay.cn/doc/v3/merchant/4012791906`（退款通知）
- CloudBase：`https://docs.cloudbase.net/service/access-cloud-function`（HTTP 访问云函数的 event 契约）
