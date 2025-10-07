/**
 * 增强的Password值对象，基于PrestaShop设计模式
 * 提供密码强度验证和安全规则
 */

import { ValueObjectBase } from './value-object.base';
import { UserConstraintException } from '../errors/user.errors';
import * as bcrypt from 'bcrypt';

export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

export class EnhancedPassword extends ValueObjectBase<string> {
  /**
   * 最小密码长度
   */
  public static readonly MIN_LENGTH = 8;

  /**
   * 最大密码长度（bcrypt限制）
   */
  public static readonly MAX_LENGTH = 72;

  /**
   * 常见弱密码列表
   */
  private static readonly COMMON_PASSWORDS = [
    'password',
    '123456',
    '123456789',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
  ];

  constructor(value: string) {
    super(value);
    this.validate();
  }

  protected validate(): void {
    this.assertPasswordIsWithinAllowedLength(this.value);
    this.assertPasswordMeetsStrengthRequirements(this.value);
    this.assertPasswordIsNotCommon(this.value);
  }

  private assertPasswordIsWithinAllowedLength(password: string): void {
    const length = password.length;

    if (length < EnhancedPassword.MIN_LENGTH) {
      throw new UserConstraintException(
        `Password is too short. Minimum length is ${EnhancedPassword.MIN_LENGTH}`,
        'INVALID_PASSWORD',
      );
    }

    if (length > EnhancedPassword.MAX_LENGTH) {
      throw new UserConstraintException(
        `Password is too long. Maximum length is ${EnhancedPassword.MAX_LENGTH}`,
        'INVALID_PASSWORD',
      );
    }
  }

  private assertPasswordMeetsStrengthRequirements(password: string): void {
    const strength = this.calculateStrength(password);

    if (strength === PasswordStrength.WEAK) {
      throw new UserConstraintException(
        'Password is too weak. Must contain uppercase, lowercase, numbers, and special characters',
        'WEAK_PASSWORD',
      );
    }
  }

  private assertPasswordIsNotCommon(password: string): void {
    const lowerPassword = password.toLowerCase();

    if (EnhancedPassword.COMMON_PASSWORDS.includes(lowerPassword)) {
      throw new UserConstraintException(
        'Password is too common. Please choose a more secure password',
        'COMMON_PASSWORD',
      );
    }
  }

  private calculateStrength(password: string): PasswordStrength {
    let score = 0;

    // 长度评分
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // 字符类型评分
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // 复杂性评分
    if (
      password.length >= 10 &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)
    ) {
      score += 1;
    }

    if (score <= 3) return PasswordStrength.WEAK;
    if (score <= 5) return PasswordStrength.MEDIUM;
    if (score <= 7) return PasswordStrength.STRONG;
    return PasswordStrength.VERY_STRONG;
  }

  public getStrength(): PasswordStrength {
    return this.calculateStrength(this.value);
  }

  public getStrengthScore(): number {
    const strength = this.getStrength();
    switch (strength) {
      case PasswordStrength.WEAK:
        return 25;
      case PasswordStrength.MEDIUM:
        return 50;
      case PasswordStrength.STRONG:
        return 75;
      case PasswordStrength.VERY_STRONG:
        return 100;
      default:
        return 0;
    }
  }

  public async hash(saltRounds: number = 12): Promise<string> {
    return await bcrypt.hash(this.value, saltRounds);
  }

  public async verify(hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(this.value, hashedPassword);
  }

  /**
   * 获取原始值
   */
  public getValue(): string {
    return this.value;
  }

  public meetsMinimumRequirements(): boolean {
    return this.getStrength() !== PasswordStrength.WEAK;
  }

  public static getRequirements(): string[] {
    return [
      `At least ${EnhancedPassword.MIN_LENGTH} characters long`,
      'Contains uppercase letters (A-Z)',
      'Contains lowercase letters (a-z)',
      'Contains numbers (0-9)',
      'Contains special characters (!@#$%^&*)',
      'Not a common or easily guessable password',
    ];
  }
}
