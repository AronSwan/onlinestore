export type GatewayResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export const isSuccessResponse = <T>(r: GatewayResult<T>): r is { success: true; data: T } =>
  r.success === true && r.data !== undefined;

export interface CreatePaymentData {
  paymentId: string;
  redirectUrl?: string;
  qrCode?: string;
  deepLink?: string;
  cryptoAddress?: string;
  thirdPartyTransactionId?: string;
  expiredAt?: Date;
}

export interface QueryPaymentData {
  status: string; // 使用统一的 PaymentStatus 字符串表示
  thirdPartyTransactionId?: string;
  blockchainTxHash?: string;
  paidAt?: Date;
  amount?: number;
}

export interface CallbackData {
  paymentId: string;
  status: string; // 使用统一的 PaymentStatus 字符串表示
  amount?: number;
  thirdPartyTransactionId?: string;
  blockchainTxHash?: string;
  paidAt?: Date;
  message?: string;
  raw?: unknown;
}

export interface RefundData {
  refundId: string;
  status?: 'SUCCESS' | 'FAILED';
  message?: string;
}
