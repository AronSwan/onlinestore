/**
 * 退款创建事件
 */
export class RefundCreatedEvent {
  constructor(
    public readonly refundId: string,
    public readonly paymentOrderId: string,
    public readonly merchantOrderId: string,
    public readonly refundAmount: number,
    public readonly currency: string,
    public readonly reason: string,
    public readonly operatorId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
