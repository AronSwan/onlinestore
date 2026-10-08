import { AggregateRoot } from '@nestjs/cqrs';

/**
 * 支付订单聚合根
 * 参考temp_congomall的DDD设计和gopay的支付模型
 */
export class PaymentOrderAggregate extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly subject: string,
    public readonly body: string,
    public readonly payMethod: string,
    public readonly userId: string,
    public readonly clientIp: string,
    public status: PaymentStatus = PaymentStatus.PENDING,
    public tradeNo?: string,
    public paidAmount?: number,
    public paidAt?: Date,
    public expireTime?: Date,
    public payInfo?: any,
    public gatewayData?: any,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    private refunds: RefundOrder[] = [],
  ) {
    super();
  }

  /**
   * 创建支付订单
   */
  static create(params: {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    subject: string;
    body?: string;
    payMethod: string;
    userId: string;
    clientIp: string;
    expireMinutes?: number;
  }): PaymentOrderAggregate {
    const expireTime = new Date();
    expireTime.setMinutes(expireTime.getMinutes() + (params.expireMinutes || 30));

    const order = new PaymentOrderAggregate(
      params.id,
      params.orderId,
      params.amount,
      params.currency,
      params.subject,
      params.body || '',
      params.payMethod,
      params.userId,
      params.clientIp,
      PaymentStatus.PENDING,
      undefined,
      undefined,
      undefined,
      expireTime,
    );

    // 发布订单创建事件
    order.apply(
      new PaymentOrderCreatedEvent(
        order.id,
        order.orderId,
        order.amount,
        order.payMethod,
        order.userId,
      ),
    );

    return order;
  }

  /**
   * 更新支付信息
   */
  updatePaymentInfo(payInfo: any): void {
    this.payInfo = payInfo;
    this.updatedAt = new Date();
  }

  /**
   * 从回调更新状态
   */
  updateFromCallback(callbackInfo: {
    status: string;
    tradeNo?: string;
    paidAmount?: number;
    paidAt?: Date;
    buyerInfo?: any;
    gatewayData?: any;
  }): boolean {
    const oldStatus = this.status;

    // 更新状态
    this.status = this.mapCallbackStatus(callbackInfo.status);

    // 更新交易信息
    if (callbackInfo.tradeNo) {
      this.tradeNo = callbackInfo.tradeNo;
    }

    if (callbackInfo.paidAmount) {
      this.paidAmount = callbackInfo.paidAmount;
    }

    if (callbackInfo.paidAt) {
      this.paidAt = callbackInfo.paidAt;
    }

    if (callbackInfo.gatewayData) {
      this.gatewayData = callbackInfo.gatewayData;
    }

    this.updatedAt = new Date();

    // 发布状态变更事件
    if (oldStatus !== this.status) {
      this.apply(
        new PaymentStatusChangedEvent(this.id, this.orderId, oldStatus, this.status, this.tradeNo),
      );

      // 支付成功事件
      if (this.status === PaymentStatus.SUCCESS) {
        this.apply(
          new PaymentSuccessEvent(
            this.id,
            this.orderId,
            this.amount,
            this.paidAmount || this.amount,
            this.currency,
            this.payMethod,
            this.tradeNo || '',
            this.userId,
            this.paidAt || new Date(),
          ),
        );
      }

      return true;
    }

    return false;
  }

  /**
   * 同步状态
   */
  syncStatus(queryResult: any): boolean {
    return this.updateFromCallback({
      status: queryResult.status,
      tradeNo: queryResult.tradeNo,
      paidAmount: queryResult.paidAmount,
      paidAt: queryResult.paidAt,
      gatewayData: queryResult.rawData,
    });
  }

  /**
   * 创建退款
   */
  createRefund(params: {
    refundAmount: number;
    refundReason: string;
    operatorId: string;
    outRefundNo?: string;
  }): RefundOrder {
    // 验证退款条件
    if (!this.canRefund()) {
      throw new Error('订单状态不允许退款');
    }

    if (params.refundAmount > this.getRefundableAmount()) {
      throw new Error('退款金额超过可退款金额');
    }

    // 创建退款订单
    const refund = RefundOrder.create({
      id: params.outRefundNo || this.generateRefundId(),
      paymentId: this.id,
      refundAmount: params.refundAmount,
      refundReason: params.refundReason,
      operatorId: params.operatorId,
    });

    this.refunds.push(refund);
    this.updatedAt = new Date();

    // 发布退款创建事件
    this.apply(
      new RefundCreatedEvent(
        refund.id,
        this.id,
        params.refundAmount,
        params.refundReason,
        params.operatorId,
      ),
    );

    return refund;
  }

  /**
   * 关闭订单
   */
  close(reason: string, operatorId?: string): void {
    if (!this.canClose()) {
      throw new Error('订单状态不允许关闭');
    }

    this.status = PaymentStatus.CANCELLED;
    this.updatedAt = new Date();

    // 发布订单关闭事件
    this.apply(new PaymentOrderClosedEvent(this.id, this.orderId, reason, operatorId));
  }

  /**
   * 检查是否可以退款
   */
  canRefund(): boolean {
    return this.status === PaymentStatus.SUCCESS;
  }

  /**
   * 检查是否可以关闭
   */
  canClose(): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(this.status);
  }

  /**
   * 获取可退款金额
   */
  getRefundableAmount(): number {
    const totalRefunded = this.refunds
      .filter(refund => refund.status === RefundStatus.SUCCESS)
      .reduce((sum, refund) => sum + refund.refundAmount, 0);

    return (this.paidAmount || this.amount) - totalRefunded;
  }

  /**
   * 检查是否已过期
   */
  isExpired(): boolean {
    return !!(this.expireTime && new Date() > this.expireTime);
  }

  /**
   * 映射回调状态到内部状态
   */
  private mapCallbackStatus(callbackStatus: string): PaymentStatus {
    const statusMap = {
      // 支付宝状态映射
      WAIT_BUYER_PAY: PaymentStatus.PENDING,
      TRADE_SUCCESS: PaymentStatus.SUCCESS,
      TRADE_FINISHED: PaymentStatus.SUCCESS,
      TRADE_CLOSED: PaymentStatus.CANCELLED,

      // 微信状态映射
      NOTPAY: PaymentStatus.PENDING,
      USERPAYING: PaymentStatus.PROCESSING,

      PAYERROR: PaymentStatus.FAILED,
      CLOSED: PaymentStatus.CANCELLED,
      REVOKED: PaymentStatus.CANCELLED,

      // 银联状态映射
      '00': PaymentStatus.SUCCESS,
      '01': PaymentStatus.FAILED,
      '02': PaymentStatus.PROCESSING,
      '03': PaymentStatus.PENDING,

      // 通用状态
      PENDING: PaymentStatus.PENDING,
      PROCESSING: PaymentStatus.PROCESSING,
      SUCCESS: PaymentStatus.SUCCESS,
      FAILED: PaymentStatus.FAILED,
      CANCELLED: PaymentStatus.CANCELLED,
    };

    return statusMap[callbackStatus as keyof typeof statusMap] || PaymentStatus.FAILED;
  }

  /**
   * 生成退款ID
   */
  private generateRefundId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `RF${timestamp}${random}`.toUpperCase();
  }
}

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  PENDING = 'PENDING', // 待支付
  PROCESSING = 'PROCESSING', // 处理中
  SUCCESS = 'SUCCESS', // 支付成功
  FAILED = 'FAILED', // 支付失败
  CANCELLED = 'CANCELLED', // 已取消
  REFUNDED = 'REFUNDED', // 已退款
  PARTIAL_REFUNDED = 'PARTIAL_REFUNDED', // 部分退款
}

/**
 * 退款订单
 */
export class RefundOrder {
  constructor(
    public readonly id: string,
    public readonly paymentId: string,
    public readonly refundAmount: number,
    public readonly refundReason: string,
    public readonly operatorId: string,
    public status: RefundStatus = RefundStatus.PENDING,
    public refundNo?: string,
    public refundedAt?: Date,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  static create(params: {
    id: string;
    paymentId: string;
    refundAmount: number;
    refundReason: string;
    operatorId: string;
  }): RefundOrder {
    return new RefundOrder(
      params.id,
      params.paymentId,
      params.refundAmount,
      params.refundReason,
      params.operatorId,
    );
  }

  /**
   * 更新退款结果
   */
  updateRefundResult(result: any): void {
    this.status = this.mapRefundStatus(result.status);
    this.refundNo = result.refundNo;

    if (this.status === RefundStatus.SUCCESS) {
      this.refundedAt = result.refundedAt || new Date();
    }

    this.updatedAt = new Date();
  }

  /**
   * 映射退款状态
   */
  private mapRefundStatus(status: string): RefundStatus {
    const statusMap = {
      SUCCESS: RefundStatus.SUCCESS,
      PROCESSING: RefundStatus.PROCESSING,
      FAILED: RefundStatus.FAILED,
    };

    return statusMap[status as keyof typeof statusMap] || RefundStatus.FAILED;
  }
}

/**
 * 退款状态枚举
 */
export enum RefundStatus {
  PENDING = 'PENDING', // 待处理
  PROCESSING = 'PROCESSING', // 处理中
  SUCCESS = 'SUCCESS', // 退款成功
  FAILED = 'FAILED', // 退款失败
}

// 领域事件
export class PaymentOrderCreatedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly payMethod: string,
    public readonly userId: string,
  ) {}
}

export class PaymentStatusChangedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly oldStatus: PaymentStatus,
    public readonly newStatus: PaymentStatus,
    public readonly tradeNo?: string,
  ) {}
}

export class PaymentSuccessEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly paidAmount: number,
    public readonly currency: string,
    public readonly payMethod: string,
    public readonly tradeNo: string,
    public readonly userId: string,
    public readonly paidAt: Date,
  ) {}
}

export class RefundCreatedEvent {
  constructor(
    public readonly refundId: string,
    public readonly paymentId: string,
    public readonly refundAmount: number,
    public readonly refundReason: string,
    public readonly operatorId: string,
  ) {}
}

export class PaymentOrderClosedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly reason: string,
    public readonly operatorId?: string,
  ) {}
}
