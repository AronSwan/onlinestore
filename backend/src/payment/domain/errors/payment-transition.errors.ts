/**
 * 支付状态机域错误（W-3⑤⑥批,2026-10-09）
 *
 * 病灶:聚合状态迁移零前置守卫——重复成功回调覆盖 paidAt(账目首写时间失真)、
 * 成功后失败回调可把已收款的单抹成 failed、已收款单可被关闭翻成 cancelled
 * (CLOSED 落库映射即 cancelled=金额记录被伪造)。
 * 回调协议注意:这些冲突在应用层按"首写胜出+ACK"处理(告警日志,不毒化网关
 * 重试),不能让网关无限重打同一冲突。
 */
import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';

/** 已成功的支付收到另一网关单号的二次成功回调(首写胜出,拒绝覆盖) */
export class PaymentAlreadySucceededError extends Error {
  constructor(
    readonly paymentOrderId: PaymentOrderId,
    readonly recordedGatewayOrderId: string,
    readonly incomingGatewayOrderId: string,
  ) {
    super(
      `支付订单已成功,拒绝不同网关单号覆盖(${paymentOrderId.value}:已录 ` +
        `${recordedGatewayOrderId},来报 ${incomingGatewayOrderId})——首写胜出`,
    );
    this.name = 'PaymentAlreadySucceededError';
  }
}

/** 已成功的支付收到失败回调(钱已到账,失败矛盾——保留收款态) */
export class PaymentFailedAfterSuccessError extends Error {
  constructor(
    readonly paymentOrderId: PaymentOrderId,
    readonly incomingReason: string,
  ) {
    super(`支付订单已成功,拒绝失败回调覆盖(${paymentOrderId.value},来报原因: ${incomingReason})`);
    this.name = 'PaymentFailedAfterSuccessError';
  }
}

/** 已成功的支付被关闭(收款记录不可被关闭抹成 cancelled) */
export class PaymentCloseNotAllowedError extends Error {
  constructor(readonly paymentOrderId: PaymentOrderId) {
    super(`已成功的支付订单不可关闭(${paymentOrderId.value})——退款走退款通道`);
    this.name = 'PaymentCloseNotAllowedError';
  }
}
