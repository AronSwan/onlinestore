/**
 * 增强的Email值对象，基于PrestaShop设计模式
 * 提供更强的验证和业务规则
 */

import { ValueObjectBase } from './value-object.base';
import { UserConstraintException } from '../errors/user.errors';

export class EnhancedEmail extends ValueObjectBase<string> {
  /**
   * 最大允许长度
   */
  public static readonly MAX_LENGTH = 255;

  /**
   * 最小允许长度
   */
  public static readonly MIN_LENGTH = 5;

  /**
   * 禁止的邮箱域名列表
   */
  private static readonly BLOCKED_DOMAINS = [
    'tempmail.org',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
  ];

  /**
   * 企业邮箱域名列表
   */
  private static readonly BUSINESS_DOMAINS = [
    'gmail.com',
    'outlook.com',
    'yahoo.com',
    'hotmail.com',
    'qq.com',
    '163.com',
    '126.com',
  ];

  constructor(value: string) {
    super(value);
    this.validate();
  }

  protected validate(): void {
    this.assertEmailIsString(this.value);
    this.assertEmailIsNotEmpty(this.value);
    this.assertEmailDoesNotExceedAllowedLength(this.value);
    this.assertEmailHasValidFormat(this.value);
    this.assertEmailDomainIsNotBlocked(this.value);
  }

  /**
   * 验证邮箱是字符串类型
   */
  private assertEmailIsString(email: any): void {
    if (typeof email !== 'string') {
      throw new UserConstraintException('Email must be of type string', 'INVALID_EMAIL');
    }
  }

  /**
   * 验证邮箱不为空
   */
  private assertEmailIsNotEmpty(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new UserConstraintException('Email must not be empty', 'INVALID_EMAIL');
    }

    if (email.trim().length < EnhancedEmail.MIN_LENGTH) {
      throw new UserConstraintException(
        `Email is too short. Minimum length is ${EnhancedEmail.MIN_LENGTH}`,
        'INVALID_EMAIL',
      );
    }
  }

  /**
   * 验证邮箱长度不超过限制
   */
  private assertEmailDoesNotExceedAllowedLength(email: string): void {
    // 解码HTML实体后计算长度
    const decodedEmail = this.decodeHtmlEntities(email);

    if (decodedEmail.length > EnhancedEmail.MAX_LENGTH) {
      throw new UserConstraintException(
        `Email is too long. Maximum allowed length is ${EnhancedEmail.MAX_LENGTH}`,
        'INVALID_EMAIL',
      );
    }
  }

  /**
   * 验证邮箱格式
   */
  private assertEmailHasValidFormat(email: string): void {
    // 更严格的邮箱验证正则表达式
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email.trim())) {
      throw new UserConstraintException(`Invalid email format: ${email}`, 'INVALID_EMAIL');
    }

    // 检查是否包含连续的点
    if (email.includes('..')) {
      throw new UserConstraintException('Email cannot contain consecutive dots', 'INVALID_EMAIL');
    }

    // 检查是否以点开始或结束
    const localPart = email.split('@')[0];
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      throw new UserConstraintException(
        'Email local part cannot start or end with a dot',
        'INVALID_EMAIL',
      );
    }
  }

  /**
   * 验证邮箱域名不在黑名单中
   */
  private assertEmailDomainIsNotBlocked(email: string): void {
    const domain = this.getDomain().toLowerCase();

    if (EnhancedEmail.BLOCKED_DOMAINS.includes(domain)) {
      throw new UserConstraintException(`Email domain ${domain} is not allowed`, 'INVALID_EMAIL');
    }
  }

  /**
   * 解码HTML实体
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * 获取邮箱域名
   */
  public getDomain(): string {
    return this.value.split('@')[1] || '';
  }

  /**
   * 获取邮箱本地部分
   */
  public getLocalPart(): string {
    return this.value.split('@')[0] || '';
  }

  /**
   * 检查是否为企业邮箱
   */
  public isBusinessEmail(): boolean {
    const domain = this.getDomain().toLowerCase();
    return !EnhancedEmail.BUSINESS_DOMAINS.includes(domain);
  }

  /**
   * 检查是否为个人邮箱
   */
  public isPersonalEmail(): boolean {
    return !this.isBusinessEmail();
  }

  /**
   * 获取标准化的邮箱地址（小写）
   */
  public getNormalized(): string {
    return this.value.toLowerCase().trim();
  }

  /**
   * 检查是否与另一个邮箱相等（忽略大小写）
   */
  public isEqualTo(other: EnhancedEmail): boolean {
    return this.getNormalized() === other.getNormalized();
  }

  /**
   * 获取邮箱的哈希值（用于隐私保护）
   */
  public getHash(): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(this.getNormalized()).digest('hex');
  }

  /**
   * 获取原始值
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * 获取掩码邮箱（用于显示）
   */
  public getMasked(): string {
    const [localPart, domain] = this.value.split('@');
    const maskedLocal =
      localPart.length > 2
        ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
        : localPart;
    return `${maskedLocal}@${domain}`;
  }
}
