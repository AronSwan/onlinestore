/**
 * 支付成功事件
 */
export class PaymentSucceededEvent {
  constructor(
    public readonly paymentOrderId: string,
    public readonly merchantOrderId: string,
    public readonly paidAmount: number,
    public readonly currency: string,
    public readonly gatewayOrderId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
