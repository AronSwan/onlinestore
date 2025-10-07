import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { LogSanitizerService } from './log-sanitizer.service';
import { SECURITY_CONSTANTS } from './security.constants';
import * as crypto from 'crypto';

@Injectable()
export class PaymentSecurityService {
  private readonly nonceCache = new Map<string, number>();

  constructor(
    private encryptionService: EncryptionService,
    private logSanitizer: LogSanitizerService,
    private configService: ConfigService,
  ) {
    // 定期清理过期的nonce
    setInterval(() => this.cleanExpiredNonces(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 验证支付请求的安全性
   */
  validatePaymentRequest(request: any): void {
    // 验证金额
    this.validateAmount(request.amount);

    // 验证幂等性键
    this.validateIdempotencyKey(request.idempotencyKey);

    // 验证请求签名（如果提供）
    if (request.signature) {
      this.validateRequestSignature(request);
    }

    // 验证时间戳（防重放攻击）
    if (request.timestamp) {
      this.validateTimestamp(request.timestamp);
    }
  }

  /**
   * 验证支付回调的安全性
   */
  validatePaymentCallback(callback: any, expectedSignature: string): void {
    // 验证nonce（防重放）
    if (callback.nonce) {
      this.validateNonce(callback.nonce);
    }

    // 验证回调签名
    this.validateCallbackSignature(callback, expectedSignature);

    // 验证回调时间戳
    if (callback.timestamp) {
      this.validateTimestamp(callback.timestamp);
    }

    // 记录已使用的nonce
    if (callback.nonce) {
      this.markNonceAsUsed(callback.nonce);
    }
  }

  /**
   * 生成安全的支付请求
   */
  generateSecurePaymentRequest(paymentData: any): any {
    const secureRequest = {
      ...paymentData,
      nonce: this.encryptionService.generatePaymentNonce(),
      timestamp: Date.now(),
    };

    // 生成请求签名
    const signature = this.generateRequestSignature(secureRequest);
    secureRequest.signature = signature;

    return secureRequest;
  }

  /**
   * 验证金额的合法性
   */
  private validateAmount(amount: number): void {
    if (!amount || amount <= 0) {
      throw new BadRequestException('支付金额必须大于0');
    }

    if (amount > SECURITY_CONSTANTS.PAYMENT.MAX_AMOUNT_PER_TRANSACTION) {
      throw new BadRequestException('支付金额超过单笔交易限额');
    }

    // 检查金额精度（最多8位小数）
    if (!/^\d+(\.\d{1,8})?$/.test(amount.toString())) {
      throw new BadRequestException('支付金额格式不正确');
    }
  }

  /**
   * 验证幂等性键
   */
  private validateIdempotencyKey(key: string): void {
    if (!key) {
      throw new BadRequestException('幂等性键不能为空');
    }

    if (key.length < 16 || key.length > 64) {
      throw new BadRequestException('幂等性键长度必须在16-64字符之间');
    }

    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      throw new BadRequestException('幂等性键只能包含字母、数字、下划线和连字符');
    }
  }

  /**
   * 验证时间戳（防重放攻击）
   */
  private validateTimestamp(timestamp: number): void {
    const now = Date.now();
    const maxAge = SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES * 60 * 1000;

    if (Math.abs(now - timestamp) > maxAge) {
      throw new UnauthorizedException('请求时间戳已过期');
    }
  }

  /**
   * 验证nonce（防重放）
   */
  private validateNonce(nonce: string): void {
    // 检查nonce格式
    if (!this.encryptionService.validatePaymentNonce(nonce)) {
      throw new UnauthorizedException('无效的nonce格式');
    }

    // 检查nonce是否已被使用
    if (this.nonceCache.has(nonce)) {
      throw new UnauthorizedException('nonce已被使用');
    }
  }

  /**
   * 标记nonce为已使用
   */
  private markNonceAsUsed(nonce: string): void {
    this.nonceCache.set(nonce, Date.now());
  }

  /**
   * 清理过期的nonce
   */
  private cleanExpiredNonces(): void {
    const now = Date.now();
    const maxAge = SECURITY_CONSTANTS.PAYMENT.NONCE_EXPIRY_MINUTES * 60 * 1000;

    for (const [nonce, timestamp] of this.nonceCache.entries()) {
      if (now - timestamp > maxAge) {
        this.nonceCache.delete(nonce);
      }
    }
  }

  /**
   * 生成请求签名
   */
  private generateRequestSignature(request: any): string {
    const secret = this.configService.get<string>('PAYMENT_SIGNATURE_SECRET');
    if (!secret) {
      throw new Error('PAYMENT_SIGNATURE_SECRET not configured');
    }

    // 创建签名数据（排除signature字段）
    const { signature, ...dataToSign } = request;
    const sortedData = this.sortObjectKeys(dataToSign);
    const dataString = JSON.stringify(sortedData);

    return this.encryptionService.generateHMAC(dataString, secret);
  }

  /**
   * 验证请求签名
   */
  private validateRequestSignature(request: any): void {
    const providedSignature = request.signature;
    const expectedSignature = this.generateRequestSignature(request);

    const secret = this.configService.get<string>('PAYMENT_SIGNATURE_SECRET');
    if (!secret) {
      throw new Error('PAYMENT_SIGNATURE_SECRET not configured');
    }

    if (
      !this.encryptionService.verifyHMAC(
        JSON.stringify(this.sortObjectKeys(request)),
        providedSignature,
        secret,
      )
    ) {
      throw new UnauthorizedException('请求签名验证失败');
    }
  }

  /**
   * 验证回调签名
   */
  private validateCallbackSignature(callback: any, expectedSignature: string): void {
    const secret = this.configService.get<string>('PAYMENT_CALLBACK_SECRET');
    if (!secret) {
      throw new Error('PAYMENT_CALLBACK_SECRET not configured');
    }

    const sortedData = this.sortObjectKeys(callback);
    const dataString = JSON.stringify(sortedData);
    const computedSignature = this.encryptionService.generateHMAC(dataString, secret);

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(computedSignature, 'hex'),
      )
    ) {
      throw new UnauthorizedException('回调签名验证失败');
    }
  }

  /**
   * 对象键排序（确保签名一致性）
   */
  private sortObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sortedObj: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sortedObj[key] = this.sortObjectKeys(obj[key]);
      });

    return sortedObj;
  }

  /**
   * 安全日志记录
   */
  logSecurityEvent(event: string, data: any, level: 'info' | 'warn' | 'error' = 'info'): void {
    const sanitizedData = this.logSanitizer.sanitizePaymentLog(data);

    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      data: sanitizedData,
      level,
    };

    // 这里可以集成到日志系统
    console.log(`[PAYMENT_SECURITY] ${JSON.stringify(logEntry)}`);
  }
}
