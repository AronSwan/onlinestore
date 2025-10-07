import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface CryptoPaymentRequest {
  orderId: string;
  amount: number;
  currency: string; // USDT, BTC, ETH
  network: string; // TRC20, ERC20, BEP20
  userId: number;
  expireMinutes?: number;
  metadata?: any;
}

export interface CryptoPaymentResponse {
  success: boolean;
  paymentId?: string;
  address?: string;
  amount?: number;
  qrCode?: string;
  expiredAt?: Date;
  message?: string;
}

export interface CryptoQueryResponse {
  success: boolean;
  status: string;
  txHash?: string;
  confirmations?: number;
  paidAt?: Date;
  actualAmount?: number;
  message?: string;
}

@Injectable()
export class CryptoGatewayService {
  private readonly logger = new Logger(CryptoGatewayService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('CRYPTO_GATEWAY_URL', 'http://localhost:8081');
    this.apiKey = this.configService.get<string>('CRYPTO_API_KEY') || undefined;
    this.apiSecret = this.configService.get<string>('CRYPTO_API_SECRET') || undefined;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    // 请求拦截器
    this.httpClient.interceptors.request.use(config => {
      const timestamp = Date.now().toString();
      const signature = this.generateSignature(config.data, timestamp);

      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Signature'] = signature;

      return config;
    });

    // 响应拦截器
    this.httpClient.interceptors.response.use(
      response => response,
      error => {
        this.logger.error(`Crypto Gateway Error: ${error.message}`, error.stack);
        throw new HttpException(
          `加密货币支付网关错误: ${error.response?.data?.message || error.message}`,
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
    );
  }

  async createPayment(request: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
    try {
      this.logger.log(
        `创建加密货币支付: ${request.orderId}, ${request.currency}-${request.network}`,
      );

      const response = await this.httpClient.post('/api/v1/crypto/payment/create', request);

      this.logger.log(`加密货币支付创建成功: ${request.orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`创建加密货币支付失败: ${request.orderId}`, error.stack);
      throw error;
    }
  }

  async queryPayment(paymentId: string): Promise<CryptoQueryResponse> {
    try {
      this.logger.log(`查询加密货币支付状态: ${paymentId}`);

      const response = await this.httpClient.get(`/api/v1/crypto/payment/query/${paymentId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`查询加密货币支付状态失败: ${paymentId}`, error.stack);
      throw error;
    }
  }

  async getAddressBalance(address: string, currency: string, network: string): Promise<number> {
    try {
      const response = await this.httpClient.get('/api/v1/crypto/address/balance', {
        params: { address, currency, network },
      });

      return response.data.balance || 0;
    } catch (error) {
      this.logger.error(`获取地址余额失败: ${address}`, error.stack);
      return 0;
    }
  }

  async validateTransaction(txHash: string, currency: string, network: string): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/v1/crypto/transaction/validate', {
        params: { txHash, currency, network },
      });

      return response.data.valid || false;
    } catch (error) {
      this.logger.error(`验证交易失败: ${txHash}`, error.stack);
      return false;
    }
  }

  validateCallback(data: any, signature: string): boolean {
    const expectedSignature = this.generateCallbackSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  private generateSignature(data: any, timestamp: string): string {
    const payload = JSON.stringify(data || {});
    const signString = `${this.apiKey}${timestamp}${payload}${this.apiSecret}`;
    return crypto.createHash('sha256').update(signString).digest('hex');
  }

  private generateCallbackSignature(data: any): string {
    const keys = Object.keys(data).sort();
    const signString =
      keys
        .filter(key => key !== 'signature' && data[key] !== undefined && data[key] !== '')
        .map(key => `${key}=${data[key]}`)
        .join('&') + `&secret=${this.apiSecret}`;

    return crypto.createHash('sha256').update(signString).digest('hex');
  }
}
