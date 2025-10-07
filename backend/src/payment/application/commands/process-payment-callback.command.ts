import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';

/**
 * 处理支付回调命令
 */
export class ProcessPaymentCallbackCommand {
  constructor(
    public readonly paymentMethod: PaymentMethod,
    public readonly outTradeNo: string,
    public readonly gatewayOrderId: string,
    public readonly tradeStatus: string,
    public readonly totalAmount: number,
    public readonly receiptAmount?: number,
    public readonly gmtPayment?: Date,
    public readonly signature?: string,
    public readonly rawData?: Record<string, any>,
  ) {}

  /**
   * 创建命令实例
   */
  static create(params: {
    paymentMethod: PaymentMethod;
    outTradeNo: string;
    gatewayOrderId: string;
    tradeStatus: string;
    totalAmount: number;
    receiptAmount?: number;
    gmtPayment?: Date;
    signature?: string;
    rawData?: Record<string, any>;
  }): ProcessPaymentCallbackCommand {
    return new ProcessPaymentCallbackCommand(
      params.paymentMethod,
      params.outTradeNo,
      params.gatewayOrderId,
      params.tradeStatus,
      params.totalAmount,
      params.receiptAmount,
      params.gmtPayment,
      params.signature,
      params.rawData,
    );
  }
}
