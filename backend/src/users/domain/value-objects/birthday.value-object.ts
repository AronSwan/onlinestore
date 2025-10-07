/**
 * 基于PrestaShop设计模式的Birthday值对象
 * 提供生日验证和业务规则封装
 */

import { ValueObjectBase } from './value-object.base';
import { UserConstraintException } from '../errors/user.errors';

export class Birthday extends ValueObjectBase<string> {
  /**
   * 空生日值（占位符）
   */
  public static readonly EMPTY_BIRTHDAY = '0000-00-00';

  /**
   * 最小年龄限制（13岁）
   */
  public static readonly MIN_AGE = 13;

  /**
   * 最大年龄限制（120岁）
   */
  public static readonly MAX_AGE = 120;

  constructor(value: string) {
    super(value);
    this.validate();
  }

  /**
   * 创建空生日
   */
  public static createEmpty(): Birthday {
    return new Birthday(Birthday.EMPTY_BIRTHDAY);
  }

  /**
   * 从Date对象创建
   */
  public static fromDate(date: Date): Birthday {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return new Birthday(`${year}-${month}-${day}`);
  }

  protected validate(): void {
    this.assertBirthdayIsInValidFormat(this.value);
    this.assertBirthdayIsNotAFutureDate(this.value);
    this.assertBirthdayMeetsAgeRequirements(this.value);
  }

  /**
   * 验证生日格式
   */
  private assertBirthdayIsInValidFormat(birthday: string): void {
    if (birthday === Birthday.EMPTY_BIRTHDAY) {
      return;
    }

    if (!birthday || typeof birthday !== 'string') {
      throw new UserConstraintException('Invalid birthday format provided', 'INVALID_BIRTHDAY');
    }

    // 验证日期格式 YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthday)) {
      throw new UserConstraintException(
        'Birthday must be in YYYY-MM-DD format',
        'INVALID_BIRTHDAY',
      );
    }

    // 验证是否为有效日期
    const date = new Date(birthday);
    if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) {
      throw new UserConstraintException(`Invalid birthday date: ${birthday}`, 'INVALID_BIRTHDAY');
    }
  }

  /**
   * 验证生日不是未来日期
   */
  private assertBirthdayIsNotAFutureDate(birthday: string): void {
    if (birthday === Birthday.EMPTY_BIRTHDAY) {
      return;
    }

    const birthdayDate = new Date(birthday);
    const now = new Date();
    now.setHours(23, 59, 59, 999); // 设置为今天的最后一刻

    if (birthdayDate > now) {
      throw new UserConstraintException(
        `Birthday cannot be in the future: ${birthday}`,
        'INVALID_BIRTHDAY',
      );
    }
  }

  /**
   * 验证年龄要求
   */
  private assertBirthdayMeetsAgeRequirements(birthday: string): void {
    if (birthday === Birthday.EMPTY_BIRTHDAY) {
      return;
    }

    const age = this.calculateAge(birthday);

    if (age < Birthday.MIN_AGE) {
      throw new UserConstraintException(
        `User must be at least ${Birthday.MIN_AGE} years old`,
        'INVALID_BIRTHDAY',
      );
    }

    if (age > Birthday.MAX_AGE) {
      throw new UserConstraintException(
        `Invalid age: ${age}. Maximum age is ${Birthday.MAX_AGE}`,
        'INVALID_BIRTHDAY',
      );
    }
  }

  /**
   * 计算年龄
   */
  private calculateAge(birthday: string): number {
    const birthdayDate = new Date(birthday);
    const today = new Date();

    let age = today.getFullYear() - birthdayDate.getFullYear();
    const monthDiff = today.getMonth() - birthdayDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdayDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * 检查是否为空生日
   */
  public isEmpty(): boolean {
    return this.value === Birthday.EMPTY_BIRTHDAY;
  }

  /**
   * 获取年龄
   */
  public getAge(): number | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.calculateAge(this.value);
  }

  /**
   * 获取格式化的生日字符串
   */
  public getFormatted(locale: string = 'en-US'): string {
    if (this.isEmpty()) {
      return 'Not specified';
    }

    const date = new Date(this.value);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * 获取原始值
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * 获取Date对象
   */
  public getDateValue(): Date | null {
    if (this.isEmpty()) {
      return null;
    }
    return new Date(this.value);
  }

  /**
   * 检查是否为成年人
   */
  public isAdult(): boolean {
    const age = this.getAge();
    return age !== null && age >= 18;
  }
}
