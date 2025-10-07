/**
 * 支付订单创建事件
 */
export class PaymentOrderCreatedEvent {
  constructor(
    public readonly paymentOrderId: string,
    public readonly merchantOrderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly paymentMethod: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
