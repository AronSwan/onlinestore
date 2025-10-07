import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentStrategy,
  PaymentRequest,
  PaymentResponse,
  PaymentQueryResponse,
  PaymentCallbackResponse,
  RefundRequest,
  RefundResponse,
} from './payment-strategy.interface';
import { GopayGatewayService } from '../gateways/gopay-gateway.service';
import { PaymentMethod } from '../entities/payment.entity';

@Injectable()
export class GopayStrategy extends PaymentStrategy {
  private readonly logger = new Logger(GopayStrategy.name);

  constructor(
    private readonly gopayGateway: GopayGatewayService,
    private readonly method: PaymentMethod,
  ) {
    super();
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const gopayRequest = {
        method: this.method,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        subject: `订单支付-${request.orderId}`,
        body: `用户${request.userId}的订单支付`,
        returnUrl: request.returnUrl,
        notifyUrl: request.notifyUrl,
        expireMinutes: request.expireMinutes || 30,
        metadata: request.metadata,
      };

      const response = await this.gopayGateway.createPayment(gopayRequest);

      if (response.success && response.data) {
        return {
          success: true,
          paymentId: response.data.paymentId,
          redirectUrl: response.data.redirectUrl,
          qrCode: response.data.qrCode,
          deepLink: response.data.deepLink,
          thirdPartyTransactionId: response.data.paymentId,
          expiredAt: response.data.expiredAt ? new Date(response.data.expiredAt) : undefined,
        };
      } else {
        return {
          success: false,
          message: response.message || '创建支付失败',
        };
      }
    } catch (error) {
      this.logger.error(`Gopay策略创建支付失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '支付服务异常',
      };
    }
  }

  async queryPayment(paymentId: string): Promise<PaymentQueryResponse> {
    try {
      const response = await this.gopayGateway.queryPayment(paymentId);

      if (response.success && response.data) {
        return {
          status: this.mapStatus(response.data.status),
          thirdPartyTransactionId: response.data.thirdPartyTransactionId,
          paidAt: response.data.paidAt ? new Date(response.data.paidAt) : undefined,
          amount: response.data.amount,
        };
      } else {
        return {
          status: 'failed',
          message: response.message || '查询支付状态失败',
        };
      }
    } catch (error) {
      this.logger.error(`Gopay策略查询支付失败: ${error.message}`, error.stack);
      return {
        status: 'failed',
        message: error.message || '查询支付状态异常',
      };
    }
  }

  async handleCallback(data: any): Promise<PaymentCallbackResponse> {
    try {
      if (!this.validateCallback(data)) {
        return {
          success: false,
          paymentId: data.paymentId || '',
          status: 'failed',
          message: '回调签名验证失败',
        };
      }

      return {
        success: true,
        paymentId: data.paymentId,
        status: this.mapStatus(data.status),
        amount: data.amount,
        thirdPartyTransactionId: data.thirdPartyTransactionId,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      };
    } catch (error) {
      this.logger.error(`Gopay策略处理回调失败: ${error.message}`, error.stack);
      return {
        success: false,
        paymentId: data.paymentId || '',
        status: 'failed',
        message: error.message || '处理回调异常',
      };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const response = await this.gopayGateway.refundPayment(
        request.paymentId,
        request.amount,
        request.reason,
      );

      if (response.success && response.data) {
        return {
          success: true,
          refundId: response.data.paymentId,
        };
      } else {
        return {
          success: false,
          message: response.message || '退款失败',
        };
      }
    } catch (error) {
      this.logger.error(`Gopay策略退款失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '退款服务异常',
      };
    }
  }

  validateCallback(data: any): boolean {
    try {
      return this.gopayGateway.validateCallback(data, data.signature);
    } catch (error) {
      this.logger.error(`Gopay策略验证回调失败: ${error.message}`, error.stack);
      return false;
    }
  }

  private mapStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'pending',
      processing: 'processing',
      success: 'success',
      paid: 'success',
      failed: 'failed',
      cancelled: 'cancelled',
      expired: 'expired',
    };

    return statusMap[status.toLowerCase()] || 'failed';
  }
}
