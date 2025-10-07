/**
 * 基于PrestaShop设计模式的FirstName值对象
 * 提供强类型验证和业务规则封装
 */

import { ValueObjectBase } from './value-object.base';
import { UserConstraintException } from '../errors/user.errors';

export class FirstName extends ValueObjectBase<string> {
  /**
   * 最大允许长度
   */
  public static readonly MAX_LENGTH = 255;

  /**
   * 名字验证正则表达式（不允许数字和特殊字符）
   */
  private static readonly NAME_PATTERN = /^[^0-9!<>,;?=+()@#"°{}_$%:¤|]*$/;

  constructor(value: string) {
    super(value);
    this.validate();
  }

  protected validate(): void {
    this.assertFirstNameIsValid(this.value);
    this.assertFirstNameDoesNotExceedAllowedLength(this.value);
  }

  /**
   * 验证名字格式是否有效
   */
  private assertFirstNameIsValid(firstName: string): void {
    if (!firstName || firstName.trim().length === 0) {
      throw new UserConstraintException('First name cannot be empty', 'INVALID_FIRST_NAME');
    }

    const matchesPattern = FirstName.NAME_PATTERN.test(firstName.trim());
    if (!matchesPattern) {
      throw new UserConstraintException(
        `First name "${firstName}" contains invalid characters`,
        'INVALID_FIRST_NAME',
      );
    }
  }

  /**
   * 验证名字长度不超过限制
   */
  private assertFirstNameDoesNotExceedAllowedLength(firstName: string): void {
    // 解码HTML实体后计算长度
    const decodedName = this.decodeHtmlEntities(firstName);

    if (decodedName.length > FirstName.MAX_LENGTH) {
      throw new UserConstraintException(
        `First name is too long. Maximum allowed length is ${FirstName.MAX_LENGTH}`,
        'INVALID_FIRST_NAME',
      );
    }
  }

  /**
   * 解码HTML实体
   */
  private decodeHtmlEntities(text: string): string {
    // 简单的HTML实体解码
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * 获取格式化的名字（首字母大写）
   */
  public getFormatted(): string {
    return this.value
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * 获取原始值
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * 检查是否为空
   */
  public isEmpty(): boolean {
    return !this.value || this.value.trim().length === 0;
  }
}
