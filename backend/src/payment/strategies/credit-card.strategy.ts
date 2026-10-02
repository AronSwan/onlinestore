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
    // 整改（M2，2026-10-02）：回调必须先通过验签（fail-closed），验签失败直接拒绝，
    // 堵住"PaymentModule 接线即被伪造回调置为支付成功"的绕过路径。
    if (!this.validateCallback(data)) {
      return {
        success: false,
        message: '回调验签失败',
      };
    }
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
    // 通用HMAC-SHA256验签：使用 PAYMENT_SIGNATURE_SECRET，
    // 未配置密钥或签名不匹配一律拒绝（fail-closed）
    return this.verifyCallbackSignature(data);
  }
}
