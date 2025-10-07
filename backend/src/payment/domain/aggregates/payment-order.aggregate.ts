import { PaymentOrderId } from '../value-objects/payment-order-id.value-object';
import { Money } from '../value-objects/money.value-object';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { CreatePaymentOrderCommand } from '../../application/commands/create-payment-order.command';

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
    (this as any).status = RefundStatus.SUCCEEDED;
    (this as any).completedAt = new Date();
  }

  /**
   * 标记为失败
   */
  markAsFailed(): void {
    (this as any).status = RefundStatus.FAILED;
    (this as any).completedAt = new Date();
  }
}

/**
 * 支付订单聚合根
 */
export class PaymentOrderAggregate {
  private uncommittedEvents: any[] = [];

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
    (this as any).updatedAt = new Date();
  }

  /**
   * 标记为成功
   */
  markAsSucceeded(gatewayOrderId: string, paidAmount: Money, paidAt?: Date): void {
    this.gatewayOrderId = gatewayOrderId;
    this.paidAmount = paidAmount;
    this.paidAt = paidAt || new Date();
    (this as any).status = PaymentStatus.SUCCEEDED;
    (this as any).updatedAt = new Date();
  }

  /**
   * 标记为失败
   */
  markAsFailed(failureReason: string): void {
    this.failureReason = failureReason;
    (this as any).status = PaymentStatus.FAILED;
    (this as any).updatedAt = new Date();
  }

  /**
   * 关闭订单
   */
  close(operatorId: string): void {
    (this as any).status = PaymentStatus.CLOSED;
    (this as any).closedAt = new Date();
    (this as any).updatedAt = new Date();
  }

  /**
   * 创建退款
   */
  createRefund(refundAmount: Money, reason: string, operatorId: string): RefundAggregate {
    if (this.status !== PaymentStatus.SUCCEEDED) {
      throw new Error('只有成功的支付订单才能退款');
    }

    const refundId = PaymentOrderId.generate();
    const refund = new RefundAggregate(refundId, refundAmount, reason, operatorId);

    this.refunds.push(refund);
    (this as any).updatedAt = new Date();

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
  getUncommittedEvents(): any[] {
    return [...this.uncommittedEvents];
  }

  /**
   * 清除未提交的事件
   */
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}
