// 用途：密码值对象，封装密码验证和加密逻辑
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

import { ValueObject } from '../../../common/domain/value-object';
import { WeakPasswordError } from '../errors/weak-password.error';
import * as bcrypt from 'bcrypt';

export class Password extends ValueObject {
  toString(): string {
    return this.value;
  }
  private readonly hashedPassword: string;

  private constructor(hashedPassword: string) {
    super();
    this.hashedPassword = hashedPassword;
  }

  /**
   * 从明文创建密码
   */
  public static async createFromPlain(plainPassword: string): Promise<Password> {
    if (!Password.isStrongEnough(plainPassword)) {
      throw new WeakPasswordError('密码强度不足');
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    return new Password(hashedPassword);
  }

  /**
   * 从哈希值创建密码
   */
  public static createFromHash(hashedPassword: string): Password {
    return new Password(hashedPassword);
  }

  /**
   * 验证密码强度
   */
  private static isStrongEnough(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    );
  }

  /**
   * 验证密码是否匹配
   */
  public async compare(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.hashedPassword);
  }

  /**
   * 获取哈希值
   */
  public get hash(): string {
    return this.hashedPassword;
  }

  /**
   * 比较两个密码是否相等
   */
  public equals(other: Password): boolean {
    return this.hashedPassword === other.hashedPassword;
  }

  /**
   * 值对象相等性比较（抽象方法实现）
   */
  protected valueEquals(other: this): boolean {
    return this.hashedPassword === other.hashedPassword;
  }

  /**
   * 获取值
   */
  get value(): string {
    return this.hashedPassword;
  }

  /**
   * 获取密码强度评分
   */
  public static getStrengthScore(password: string): number {
    let score = 0;

    // 长度评分
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // 字符类型评分
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return score;
  }
}
