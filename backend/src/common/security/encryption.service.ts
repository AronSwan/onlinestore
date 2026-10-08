import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SECURITY_CONSTANTS } from './security.constants';
import { CipherGCM, DecipherGCM } from './crypto.types';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');

    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // 强制要求64字符密钥长度，提供最高安全性
    const requiredKeyLength = 32; // 32字节 = 64字符

    if (key.length !== requiredKeyLength * 2) {
      throw new Error(
        `ENCRYPTION_KEY must be ${requiredKeyLength * 2} hex characters (32 bytes) for security`,
      );
    }

    this.encryptionKey = Buffer.from(key, 'hex');
  }

  /**
   * 加密敏感数据 (AES-GCM现代化实现)
   * @param plaintext 明文数据
   * @returns 格式: iv:encrypted:authTag (hex编码)
   */
  encrypt(plaintext: string): string {
    try {
      // 生成随机IV (GCM推荐12字节)
      const iv = crypto.randomBytes(SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH);

      // 使用createCipheriv而非不安全的createCipher
      const cipher = crypto.createCipheriv(
        SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM,
        this.encryptionKey,
        iv,
      ) as unknown as CipherGCM;

      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 获取GCM认证标签
      const authTag = cipher.getAuthTag();

      // 返回格式: iv:encrypted:authTag (所有部分都是hex编码)
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * 解密敏感数据 (AES-GCM现代化实现)
   * @param encryptedData 格式: iv:encrypted:authTag (hex编码)
   * @returns 解密后的明文
   */
  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format. Expected: iv:encrypted:authTag');
      }

      const [ivHex, encrypted, authTagHex] = parts;

      if (!ivHex || !encrypted || !authTagHex) {
        throw new Error('Missing required encryption components');
      }

      // 解析组件
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // 验证IV和认证标签长度
      if (iv.length !== SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH) {
        throw new Error(`Invalid IV length. Expected: ${SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH}`);
      }

      if (authTag.length !== SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH) {
        throw new Error(
          `Invalid auth tag length. Expected: ${SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH}`,
        );
      }

      // 使用createDecipheriv而非不安全的createDecipher
      const decipher = crypto.createDecipheriv(
        SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM,
        this.encryptionKey,
        iv,
      ) as unknown as DecipherGCM;

      // 设置认证标签用于验证
      decipher.setAuthTag(authTag);

      // 解密数据
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * 生成安全的随机字符串
   */
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成 HMAC 签名
   */
  generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * 验证 HMAC 签名
   */
  verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  /**
   * 生成支付回调 nonce
   */
  generatePaymentNonce(): string {
    const timestamp = Date.now();
    const random = this.generateSecureRandom(16);
    return `${timestamp}_${random}`;
  }

  /**
   * 验证支付回调 nonce 是否有效
   */
  validatePaymentNonce(nonce: string): boolean {
    try {
      const [timestampStr] = nonce.split('_');
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const maxAge = SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES * 60 * 1000;

      return now - timestamp <= maxAge;
    } catch {
      return false;
    }
  }
}
