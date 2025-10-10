import { PaymentStrategy, PaymentRequest, RefundRequest } from './payment-strategy.interface';
import {
  GatewayResult,
  CreatePaymentData,
  QueryPaymentData,
  CallbackData,
  RefundData,
} from '../common/gateway-result';

export class CreditCardStrategy extends PaymentStrategy {
  async createPayment(request: PaymentRequest): Promise<GatewayResult<CreatePaymentData>> {
    // TODO: 集成信用卡支付网关（如Stripe、银联等）
    // 这里是模拟实现

    const paymentId = `CARD_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      success: true,
      data: {
        paymentId,
        redirectUrl: `https://payment-gateway.com/pay?payment_id=${paymentId}`,
        thirdPartyTransactionId: paymentId,
      },
    };
  }

  async queryPayment(paymentId: string): Promise<GatewayResult<QueryPaymentData>> {
    // TODO: 查询信用卡支付状态
    return {
      success: true,
      data: {
        status: 'success',
        thirdPartyTransactionId: paymentId,
      },
    };
  }

  async handleCallback(data: any): Promise<GatewayResult<CallbackData>> {
    // TODO: 处理信用卡支付回调
    return {
      success: true,
      data: {
        paymentId: data.payment_id,
        status: 'success',
        thirdPartyTransactionId: data.transaction_id,
      },
    };
  }

  async refund(request: RefundRequest): Promise<GatewayResult<RefundData>> {
    // TODO: 信用卡退款
    return {
      success: true,
      data: {
        refundId: `REFUND_${request.paymentId}_${Date.now()}`,
        status: 'SUCCESS',
        message: '退款成功',
      },
    };
  }

  validateCallback(data: any): boolean {
    // TODO: 验证信用卡支付回调签名
    // 这里应该验证支付网关的签名
    return true;
  }
}
