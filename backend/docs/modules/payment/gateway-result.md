统一网关返回形态（GatewayResult）设计与迁移指南

概述
- 目标：统一 Alipay、WeChat、Crypto 等支付策略的返回形态为 `{ success: boolean; data?: T; message?: string }`，与已采用的 Gopay 模式保持一致，提升类型安全与可维护性。
- 好处：
  - 统一的外层结构，便于复用类型守卫 `isSuccessResponse<T>`。
  - 失败分支不再访问 `.data`，避免空数据访问导致的错误。
  - 跨网关业务处理（创建、查询、回调、退款）具有一致的读取模式。

统一类型
- 文件：`backend/src/payment/common/gateway-result.ts`
- 定义：
  - `export type GatewayResult<T> = { success: boolean; data?: T; message?: string }`
  - 数据载体示例：
    - `CreatePaymentData`：`paymentId`, `redirectUrl?`, `qrCode?`, `deepLink?`, `cryptoAddress?`, `thirdPartyTransactionId?`, `expiredAt?`
    - `QueryPaymentData`：`status: PaymentStatus`, `thirdPartyTransactionId?`, `blockchainTxHash?`, `paidAt?`, `amount?`
    - `CallbackData`：`paymentId`, `status: PaymentStatus`, `thirdPartyTransactionId?`, `blockchainTxHash?`, `paidAt?`, `amount?`, `raw?`
    - `RefundData`：`refundId`, `status?`, `message?`

类型守卫
- 位置：`backend/src/common/helpers/response.guard.ts`
- 用法：
  - `if (isSuccessResponse<CreatePaymentData>(res)) { /* 安全访问 res.data */ } else { /* 仅使用 res.message */ }`

接口签名调整
- 文件：`backend/src/payment/strategies/payment-strategy.interface.ts`
- 将 `createPayment/queryPayment/handleCallback/refund` 返回类型统一为 `Promise<GatewayResult<...Data>>`。

策略实现修改
- 受影响文件：
  - `backend/src/payment/strategies/alipay.strategy.ts`
  - `backend/src/payment/strategies/wechat-pay.strategy.ts`
  - `backend/src/payment/strategies/crypto.strategy.ts`
  - （同步）`backend/src/payment/strategies/gopay.strategy.ts` 与 `credit-card.strategy.ts` 也包裹为统一形态。
- 改造要点：
  - 成功时返回 `{ success: true, data: { ... } }`
  - 失败时返回 `{ success: false, message }`
  - 状态统一映射到 `PaymentStatus` 枚举（如 `success/failed/processing` 等）。

读点位更新
- 文件：`backend/src/payment/payment.service.ts`
- 典型改动：
  - `handlePaymentCallback` 使用 `isSuccessResponse` 并在成功分支读取 `result.data.paymentId` / `result.data.status`。
  - `updatePaymentWithResult` 在成功分支读取 `result.data.thirdPartyTransactionId/redirectUrl/qrCode/...`。
- 文件：`backend/src/payment/controllers/clean-payment.controller.ts`
  - 保持以 `result.success` 输出平台所需响应；失败消息从 `result.message || result.data?.message` 读取。

测试适配
- 文件：`backend/src/payment/payment.service.spec.ts`
- 将策略 mock 的返回值改为统一包裹：
  - 成功：`{ success: true, data: { paymentId, status: PaymentStatus.SUCCESS, ... } }`
  - 失败：`{ success: false, message: '...' }`
- 断言读取：
  - `expect(result.success).toBe(true/false)` 保持不变
  - 如需读取数据，改为 `result.data?.paymentId` 等。

迁移步骤
1) 新增 `gateway-result.ts` 并落地数据结构。
2) 调整接口签名为 `GatewayResult<...>`。
3) 修改 Alipay/WeChat/Crypto（同步 Gopay/CreditCard）策略实现为统一包裹。
4) 更新服务读点位与控制器的消息读取。
5) 适配单测：更新 mock 与断言。
6) 运行 `npm run -s typecheck` 验证类型一致性，然后回归单测。

注意事项
- 仅在 `success === true` 时访问 `.data`；失败分支避免读取 `.data`。
- 状态建议统一为 `PaymentStatus`，避免跨策略比较差异。
- 回调响应控制器对外格式不变（支付宝字符串、微信 XML 字段等），内部统一使用 `GatewayResult<CallbackData>`。