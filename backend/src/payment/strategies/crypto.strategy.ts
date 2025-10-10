import { Injectable, Logger } from '@nestjs/common';
import { PaymentStrategy, PaymentRequest, RefundRequest } from './payment-strategy.interface';
import {
  GatewayResult,
  CreatePaymentData,
  QueryPaymentData,
  CallbackData,
  RefundData,
} from '../common/gateway-result';
import { CryptoGatewayService } from '../gateways/crypto-gateway.service';
import { PaymentMethod } from '../entities/payment.entity';

@Injectable()
export class CryptoStrategy extends PaymentStrategy {
  private readonly logger = new Logger(CryptoStrategy.name);

  constructor(
    private readonly cryptoGateway: CryptoGatewayService,
    private readonly method: PaymentMethod,
  ) {
    super();
  }

  async createPayment(request: PaymentRequest): Promise<GatewayResult<CreatePaymentData>> {
    try {
      const { currency, network } = this.parseCryptoMethod(this.method);

      const cryptoRequest = {
        orderId: request.orderId,
        amount: request.amount,
        currency,
        network,
        userId: request.userId,
        expireMinutes: request.expireMinutes || 60,
        metadata: request.metadata,
      };

      const response = await this.cryptoGateway.createPayment(cryptoRequest);

      if (response.success) {
        return {
          success: true,
          data: {
            paymentId: response.paymentId!,
            cryptoAddress: response.address,
            qrCode: response.qrCode,
            thirdPartyTransactionId: response.paymentId!,
            expiredAt: response.expiredAt,
          },
        };
      } else {
        return {
          success: false,
          message: response.message || '创建加密货币支付失败',
        };
      }
    } catch (error: any) {
      this.logger.error(`加密货币策略创建支付失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '加密货币支付服务异常',
      };
    }
  }

  async queryPayment(paymentId: string): Promise<GatewayResult<QueryPaymentData>> {
    try {
      const response = await this.cryptoGateway.queryPayment(paymentId);

      if (response.success) {
        return {
          success: true,
          data: {
            status: this.mapStatus(response.status),
            blockchainTxHash: response.txHash,
            paidAt: response.paidAt,
            amount: response.actualAmount,
          },
          message: response.message,
        };
      } else {
        return {
          success: false,
          message: response.message || '查询加密货币支付状态失败',
        };
      }
    } catch (error: any) {
      this.logger.error(`加密货币策略查询支付失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '查询加密货币支付状态异常',
      };
    }
  }

  async handleCallback(data: any): Promise<GatewayResult<CallbackData>> {
    try {
      if (!this.validateCallback(data)) {
        return {
          success: false,
          message: '加密货币回调签名验证失败',
        };
      }

      if (data.txHash) {
        const { currency, network } = this.parseCryptoMethod(this.method);
        const isValid = await this.cryptoGateway.validateTransaction(
          data.txHash,
          currency,
          network,
        );

        if (!isValid) {
          return {
            success: false,
            message: '区块链交易验证失败',
          };
        }
      }

      return {
        success: true,
        data: {
          paymentId: data.paymentId,
          status: this.mapStatus(data.status),
          amount: data.amount,
          blockchainTxHash: data.txHash,
          paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
        },
      };
    } catch (error: any) {
      this.logger.error(`加密货币策略处理回调失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || '处理加密货币回调异常',
      };
    }
  }

  async refund(request: RefundRequest): Promise<GatewayResult<RefundData>> {
    this.logger.warn(`加密货币支付不支持自动退款: ${request.paymentId}`);
    return {
      success: false,
      message: '加密货币支付不支持自动退款，请联系客服处理',
    };
  }

  validateCallback(data: any): boolean {
    try {
      return this.cryptoGateway.validateCallback(data, data.signature);
    } catch (error: any) {
      this.logger.error(`加密货币策略验证回调失败: ${error.message}`, error.stack);
      return false;
    }
  }

  private parseCryptoMethod(method: PaymentMethod): { currency: string; network: string } {
    switch (method) {
      case PaymentMethod.USDT_TRC20:
        return { currency: 'USDT', network: 'TRC20' };
      case PaymentMethod.USDT_ERC20:
        return { currency: 'USDT', network: 'ERC20' };
      case PaymentMethod.USDT_BEP20:
        return { currency: 'USDT', network: 'BEP20' };
      case PaymentMethod.BTC:
        return { currency: 'BTC', network: 'BTC' };
      case PaymentMethod.ETH:
        return { currency: 'ETH', network: 'ETH' };
      default:
        throw new Error(`不支持的加密货币支付方式: ${method}`);
    }
  }

  private mapStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'pending',
      confirming: 'processing',
      confirmed: 'success',
      success: 'success',
      failed: 'failed',
      expired: 'expired',
    };

    return statusMap[status.toLowerCase()] || 'failed';
  }
}
