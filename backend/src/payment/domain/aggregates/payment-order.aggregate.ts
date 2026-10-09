import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';
import { Money } from '../value-objects/money.value-object';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { CreatePaymentOrderCommand } from '../../application/commands/create-payment-order.command';
import {
  RefundCurrencyMismatchError,
  RefundNotAllowedError,
  RefundOverpaidError,
} from '../errors/refund.errors';
import {
  PaymentAlreadySucceededError,
  PaymentCloseNotAllowedError,
  PaymentFailedAfterSuccessError,
} from '../errors/payment-transition.errors';

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
}

/**
 * 退款状态枚举
 */
export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

/**
 * 退款聚合
 */
export class RefundAggregate {
  constructor(
    public readonly id: PaymentOrderId,
    public readonly amount: Money,
    public readonly reason: string,
    public readonly operatorId: string,
    public readonly status: RefundStatus = RefundStatus.PENDING,
    public readonly createdAt: Date = new Date(),
    public gatewayRefundId?: string,
    public completedAt?: Date,
  ) {}

  /**
   * 更新网关信息
   */
  updateGatewayInfo(gatewayRefundId: string): void {
    this.gatewayRefundId = gatewayRefundId;
  }

  /**
   * 标记为成功
   */
  markAsSucceeded(): void {
    (this as { status: PaymentStatus | RefundStatus }).status = RefundStatus.SUCCEEDED;
    (this as { completedAt?: Date }).completedAt = new Date();
  }

  /**
   * 标记为失败
   */
  markAsFailed(): void {
    (this as { status: PaymentStatus | RefundStatus }).status = RefundStatus.FAILED;
    (this as { completedAt?: Date }).completedAt = new Date();
  }
}

/**
 * 支付订单聚合根
 */
export class PaymentOrderAggregate {
  private uncommittedEvents: unknown[] = [];

  constructor(
    public readonly id: PaymentOrderId,
    public readonly merchantOrderId: string,
    public readonly amount: Money,
    public readonly paymentMethod: PaymentMethod,
    public readonly subject: string,
    public readonly userId: string,
    public readonly status: PaymentStatus = PaymentStatus.PENDING,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly description?: string,
    public paymentUrl?: string,
    public qrCode?: string,
    public gatewayOrderId?: string,
    public paidAmount?: Money,
    public paidAt?: Date,
    public failureReason?: string,
    public expireTime?: Date,
    public closedAt?: Date,
    public refunds: RefundAggregate[] = [],
  ) {}

  /**
   * 创建支付订单
   */
  static create(command: CreatePaymentOrderCommand): PaymentOrderAggregate {
    const id = PaymentOrderId.generate();

    const order = new PaymentOrderAggregate(
      id,
      command.merchantOrderId,
      command.amount,
      command.paymentMethod,
      command.subject,
      command.userId,
      PaymentStatus.PENDING,
      new Date(),
      new Date(),
      command.description || '',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      command.expireTime,
      undefined,
      [],
    );

    return order;
  }

  /**
   * 更新网关信息
   */
  updateGatewayInfo(gatewayOrderId: string, paymentUrl?: string, qrCode?: string): void {
    this.gatewayOrderId = gatewayOrderId;
    if (paymentUrl) this.paymentUrl = paymentUrl;
    if (qrCode) this.qrCode = qrCode;
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  /**
   * 标记为成功（W-3⑥前置守卫）
   *
   * @returns true=本次迁移生效;false=同网关单号幂等重放(no-op,paidAt 保首写)
   * @throws PaymentAlreadySucceededError 已成功但网关单号不同(首写胜出拒覆盖)
   */
  markAsSucceeded(gatewayOrderId: string, paidAmount: Money, paidAt?: Date): boolean {
    if (this.status === PaymentStatus.SUCCEEDED) {
      if (this.gatewayOrderId === gatewayOrderId) {
        return false;
      }
      throw new PaymentAlreadySucceededError(this.id, this.gatewayOrderId ?? '', gatewayOrderId);
    }
    this.gatewayOrderId = gatewayOrderId;
    this.paidAmount = paidAmount;
    this.paidAt = paidAt || new Date();
    (this as { status: PaymentStatus | RefundStatus }).status = PaymentStatus.SUCCEEDED;
    (this as { updatedAt: Date }).updatedAt = new Date();
    return true;
  }

  /**
   * 标记为失败
   *
   * @returns true=状态/原因更新;false=同原因幂等重放(no-op)
   * @throws PaymentFailedAfterSuccessError 已成功(钱已到账,失败矛盾)
   */
  markAsFailed(failureReason: string): boolean {
    if (this.status === PaymentStatus.SUCCEEDED) {
      throw new PaymentFailedAfterSuccessError(this.id, failureReason);
    }
    if (this.status === PaymentStatus.FAILED && this.failureReason === failureReason) {
      return false;
    }
    this.failureReason = failureReason;
    (this as { status: PaymentStatus | RefundStatus }).status = PaymentStatus.FAILED;
    (this as { updatedAt: Date }).updatedAt = new Date();
    return true;
  }

  /**
   * 关闭订单
   * @throws PaymentCloseNotAllowedError 已成功的单不可关闭(收款记录不可抹成 cancelled)
   */
  close(operatorId: string): void {
    if (this.status === PaymentStatus.SUCCEEDED) {
      throw new PaymentCloseNotAllowedError(this.id);
    }
    (this as { status: PaymentStatus | RefundStatus }).status = PaymentStatus.CLOSED;
    (this as { closedAt?: Date }).closedAt = new Date();
    (this as { updatedAt: Date }).updatedAt = new Date();
  }

  /**
   * 创建退款
   *
   * 守卫三连（W-3 席根因批）：状态前置、币种一致、累计不超可退余额。
   * 累计口径=非 FAILED 退款（在途先占额防并发超退，FAILED 释放）；
   * 金额比较走 toMinorUnits 整数（浮点直加有 0.1+0.2 尾差）。
   * 已知边界：ETH(18位)的 factor=1e18 超 Number.MAX_SAFE_INTEGER，
   * toMinorUnits 自身失真——Money 全局精度问题，随金额校验批（W-3 ④）另断。
   */
  createRefund(refundAmount: Money, reason: string, operatorId: string): RefundAggregate {
    if (this.status !== PaymentStatus.SUCCEEDED) {
      throw new RefundNotAllowedError(this.id.value, this.status);
    }
    if (refundAmount.currency !== this.amount.currency) {
      throw new RefundCurrencyMismatchError(
        this.id.value,
        this.amount.currency,
        refundAmount.currency,
      );
    }

    const refundable = this.paidAmount ?? this.amount;
    const reservedMinor = this.refunds
      .filter(r => r.status !== RefundStatus.FAILED)
      .reduce((sum, r) => sum + r.amount.toMinorUnits(), 0);
    const requestedMinor = refundAmount.toMinorUnits();
    if (reservedMinor + requestedMinor > refundable.toMinorUnits()) {
      throw new RefundOverpaidError(
        this.id.value,
        refundable.currency,
        refundable.toMinorUnits(),
        requestedMinor,
        reservedMinor,
      );
    }

    const refundId = PaymentOrderId.generate();
    const refund = new RefundAggregate(refundId, refundAmount, reason, operatorId);

    this.refunds.push(refund);
    (this as { updatedAt: Date }).updatedAt = new Date();

    return refund;
  }

  /**
   * 是否已成功
   */
  isSucceeded(): boolean {
    return this.status === PaymentStatus.SUCCEEDED;
  }

  /**
   * 获取未提交的事件
   */
  getUncommittedEvents(): unknown[] {
    return [...this.uncommittedEvents];
  }

  /**
   * 清除未提交的事件
   */
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}
