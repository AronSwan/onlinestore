import { Money } from '../../domain/value-objects/money.value-object';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';

/**
 * 创建支付订单命令
 */
export class CreatePaymentOrderCommand {
  constructor(
    public readonly merchantOrderId: string,
    public readonly amount: Money,
    public readonly paymentMethod: PaymentMethod,
    public readonly subject: string,
    public readonly userId: string,
    public readonly clientIp: string,
    public readonly userAgent: string,
    public readonly description?: string,
    public readonly idempotencyKey?: string,
    public readonly notifyUrl?: string,
    public readonly returnUrl?: string,
    public readonly expireTime?: Date,
    public readonly extraParams?: Record<string, any>,
  ) {}

  /**
   * 创建命令实例
   */
  static create(params: {
    merchantOrderId: string;
    amount: Money;
    paymentMethod: PaymentMethod;
    subject?: string;
    description?: string;
    userId: string;
    clientIp: string;
    userAgent: string;
    idempotencyKey?: string;
    notifyUrl?: string;
    returnUrl?: string;
    expireTime?: Date;
    extraParams?: Record<string, any>;
  }): CreatePaymentOrderCommand {
    return new CreatePaymentOrderCommand(
      params.merchantOrderId,
      params.amount,
      params.paymentMethod,
      params.subject || '',
      params.userId,
      params.clientIp,
      params.userAgent,
      params.description || '',
      params.idempotencyKey,
      params.notifyUrl,
      params.returnUrl,
      params.expireTime,
      params.extraParams,
    );
  }
}
