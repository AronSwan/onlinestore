import { PaymentOrderId } from '../../domain/value-objects/payment-order-id.value-object';
import { Money } from '../../domain/value-objects/money.value-object';

/**
 * 创建退款命令
 */
export class CreateRefundCommand {
  constructor(
    public readonly paymentOrderId: PaymentOrderId,
    public readonly refundAmount: Money,
    public readonly reason: string,
    public readonly operatorId: string,
    public readonly description?: string,
  ) {}

  /**
   * 创建命令实例
   */
  static create(params: {
    paymentOrderId: PaymentOrderId;
    refundAmount: Money;
    reason: string;
    operatorId: string;
    description?: string;
  }): CreateRefundCommand {
    return new CreateRefundCommand(
      params.paymentOrderId,
      params.refundAmount,
      params.reason,
      params.operatorId,
      params.description,
    );
  }
}
