/**
 * 支付失败事件
 */
export class PaymentFailedEvent {
  constructor(
    public readonly paymentOrderId: string,
    public readonly merchantOrderId: string,
    public readonly failureReason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
