export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  userId: number;
  metadata?: any;
  returnUrl?: string;
  notifyUrl?: string;
  expireMinutes?: number;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  qrCode?: string;
  deepLink?: string;
  cryptoAddress?: string;
  thirdPartyTransactionId?: string;
  message?: string;
  expiredAt?: Date;
}

export interface PaymentQueryResponse {
  status: string;
  thirdPartyTransactionId?: string;
  blockchainTxHash?: string;
  paidAt?: Date;
  amount?: number;
  message?: string;
}

export interface PaymentCallbackResponse {
  success: boolean;
  paymentId: string;
  status: string;
  amount?: number;
  thirdPartyTransactionId?: string;
  blockchainTxHash?: string;
  paidAt?: Date;
  message?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
  metadata?: any;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  message?: string;
}

export abstract class PaymentStrategy {
  abstract createPayment(request: PaymentRequest): Promise<PaymentResponse>;

  abstract queryPayment(paymentId: string): Promise<PaymentQueryResponse>;

  abstract handleCallback(data: any): Promise<PaymentCallbackResponse>;

  abstract refund(request: RefundRequest): Promise<RefundResponse>;

  abstract validateCallback(data: any): boolean;
}
