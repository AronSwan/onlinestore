import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface GopayRequest {
  method: string;
  orderId: string;
  amount: number;
  currency: string;
  subject: string;
  body?: string;
  returnUrl?: string;
  notifyUrl?: string;
  expireMinutes?: number;
  metadata?: any;
}

export interface GopayResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    paymentId: string;
    redirectUrl?: string;
    qrCode?: string;
    deepLink?: string;
    expiredAt?: string;
  };
}

export interface GopayQueryResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    paymentId: string;
    status: string;
    amount: number;
    paidAt?: string;
    thirdPartyTransactionId?: string;
  };
}

@Injectable()
export class GopayGatewayService {
  private readonly logger = new Logger(GopayGatewayService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly appId?: string;
  private readonly appSecret?: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('GOPAY_GATEWAY_URL', 'http://localhost:8080');
    this.appId = this.configService.get<string>('GOPAY_APP_ID') || undefined;
    this.appSecret = this.configService.get<string>('GOPAY_APP_SECRET') || undefined;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Caddy-Shopping-Site/1.0',
      },
    });

    // 请求拦截器 - 添加签名
    this.httpClient.interceptors.request.use(config => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      config.headers['X-App-Id'] = this.appId;
      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Nonce'] = nonce;
      config.headers['X-Signature'] = this.generateSignature(config.data, timestamp, nonce);

      return config;
    });

    // 响应拦截器 - 验证签名和处理错误
    this.httpClient.interceptors.response.use(
      response => {
        if (!this.verifyResponseSignature(response)) {
          throw new HttpException('响应签名验证失败', HttpStatus.BAD_REQUEST);
        }
        return response;
      },
      error => {
        this.logger.error(`Gopay Gateway Error: ${error.message}`, error.stack);
        throw new HttpException(
          `支付网关错误: ${error.response?.data?.message || error.message}`,
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
    );
  }

  async createPayment(request: GopayRequest): Promise<GopayResponse> {
    try {
      this.logger.log(`创建支付订单: ${request.orderId}, 方式: ${request.method}`);

      const response = await this.httpClient.post('/api/v1/payment/create', request);

      this.logger.log(`支付订单创建成功: ${request.orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`创建支付订单失败: ${request.orderId}`, error.stack);
      throw error;
    }
  }

  async queryPayment(paymentId: string): Promise<GopayQueryResponse> {
    try {
      this.logger.log(`查询支付状态: ${paymentId}`);

      const response = await this.httpClient.get(`/api/v1/payment/query/${paymentId}`);

      return response.data;
    } catch (error) {
      this.logger.error(`查询支付状态失败: ${paymentId}`, error.stack);
      throw error;
    }
  }

  async refundPayment(paymentId: string, amount: number, reason?: string): Promise<GopayResponse> {
    try {
      this.logger.log(`发起退款: ${paymentId}, 金额: ${amount}`);

      const response = await this.httpClient.post('/api/v1/payment/refund', {
        paymentId,
        amount,
        reason,
      });

      this.logger.log(`退款成功: ${paymentId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`退款失败: ${paymentId}`, error.stack);
      throw error;
    }
  }

  validateCallback(data: any, signature: string): boolean {
    const expectedSignature = this.generateCallbackSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  private generateSignature(data: any, timestamp: string, nonce: string): string {
    const payload = JSON.stringify(data || {});
    const signString = `${this.appId}${timestamp}${nonce}${payload}${this.appSecret}`;
    return crypto.createHash('sha256').update(signString).digest('hex');
  }

  private generateCallbackSignature(data: any): string {
    const keys = Object.keys(data).sort();
    const signString =
      keys
        .filter(key => key !== 'signature' && data[key] !== undefined && data[key] !== '')
        .map(key => `${key}=${data[key]}`)
        .join('&') + `&key=${this.appSecret}`;

    return crypto.createHash('sha256').update(signString).digest('hex');
  }

  private verifyResponseSignature(response: any): boolean {
    const signature = response.headers['x-signature'];
    if (!signature) return false;

    const timestamp = response.headers['x-timestamp'];
    const nonce = response.headers['x-nonce'];
    const expectedSignature = this.generateSignature(response.data, timestamp, nonce);

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }
}
