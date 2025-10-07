import { Injectable } from '@nestjs/common';
import { SECURITY_CONSTANTS, SENSITIVE_FIELD_PATTERNS } from './security.constants';

@Injectable()
export class LogSanitizerService {
  /**
   * 清理日志中的敏感信息
   */
  sanitizeLog(data: any): any {
    if (typeof data === 'string') {
      return this.maskSensitiveString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeLog(item));
    }

    if (data && typeof data === 'object') {
      return this.sanitizeObject(data);
    }

    return data;
  }

  /**
   * 清理对象中的敏感字段
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskValue(value);
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeLog(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 检查字段名是否敏感
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();

    // 检查预定义的敏感字段
    if (
      SECURITY_CONSTANTS.LOG_MASK.SENSITIVE_FIELDS.some(field =>
        lowerField.includes(field.toLowerCase()),
      )
    ) {
      return true;
    }

    // 检查正则模式
    return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
  }

  /**
   * 掩码敏感值
   */
  private maskValue(value: any): string {
    if (value === null || value === undefined) {
      return value;
    }

    const str = String(value);
    const { MASK_CHAR, VISIBLE_CHARS } = SECURITY_CONSTANTS.LOG_MASK;

    if (str.length <= VISIBLE_CHARS * 2) {
      return MASK_CHAR.repeat(str.length);
    }

    const start = str.substring(0, VISIBLE_CHARS);
    const end = str.substring(str.length - VISIBLE_CHARS);
    const middle = MASK_CHAR.repeat(Math.max(4, str.length - VISIBLE_CHARS * 2));

    return `${start}${middle}${end}`;
  }

  /**
   * 掩码敏感字符串内容
   */
  private maskSensitiveString(str: string): string {
    // 掩码可能的信用卡号
    str = str.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, match =>
      this.maskValue(match.replace(/[\s-]/g, '')),
    );

    // 掩码可能的手机号
    str = str.replace(/\b1[3-9]\d{9}\b/g, match => this.maskValue(match));

    // 掩码可能的邮箱
    str = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, match => {
      const [local, domain] = match.split('@');
      return `${this.maskValue(local)}@${domain}`;
    });

    return str;
  }

  /**
   * 清理支付相关敏感信息
   */
  sanitizePaymentLog(paymentData: any): any {
    const sanitized = this.sanitizeLog(paymentData);

    // 特殊处理支付相关字段
    if (sanitized.thirdPartyTransactionId) {
      sanitized.thirdPartyTransactionId = this.maskValue(sanitized.thirdPartyTransactionId);
    }

    if (sanitized.blockchainTxHash) {
      sanitized.blockchainTxHash = this.maskValue(sanitized.blockchainTxHash);
    }

    if (sanitized.cryptoAddress) {
      sanitized.cryptoAddress = this.maskValue(sanitized.cryptoAddress);
    }

    // 清理元数据中的敏感信息
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeLog(sanitized.metadata);
    }

    return sanitized;
  }
}
