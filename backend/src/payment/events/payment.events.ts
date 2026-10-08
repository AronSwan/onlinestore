export interface PaymentSettledEvent {
  paymentId: string;
  orderId: string;
  userId: number;
  amount: number;
  method: string;
  settledAt: string; // ISO string
  requestId?: string;
}

export interface PaymentFailedEvent {
  paymentId?: string;
  orderId: string;
  userId?: number;
  amount?: number;
  method: string;
  reason: string;
  failedAt: string; // ISO string
  requestId?: string;
}
