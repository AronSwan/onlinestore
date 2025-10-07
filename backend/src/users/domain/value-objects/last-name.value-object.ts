/**
 * 基于PrestaShop设计模式的LastName值对象
 * 提供强类型验证和业务规则封装
 */

import { ValueObjectBase } from './value-object.base';
import { UserConstraintException } from '../errors/user.errors';

export class LastName extends ValueObjectBase<string> {
  /**
   * 最大允许长度
   */
  public static readonly MAX_LENGTH = 255;

  /**
   * 姓氏验证正则表达式（不允许数字和特殊字符）
   */
  private static readonly NAME_PATTERN = /^[^0-9!<>,;?=+()@#"°{}_$%:¤|]*$/;

  constructor(value: string) {
    super(value);
    this.validate();
  }

  protected validate(): void {
    this.assertLastNameIsValid(this.value);
    this.assertLastNameDoesNotExceedAllowedLength(this.value);
  }

  /**
   * 验证姓氏格式是否有效
   */
  private assertLastNameIsValid(lastName: string): void {
    if (!lastName || lastName.trim().length === 0) {
      throw new UserConstraintException('Last name cannot be empty', 'INVALID_LAST_NAME');
    }

    const matchesPattern = LastName.NAME_PATTERN.test(lastName.trim());
    if (!matchesPattern) {
      throw new UserConstraintException(
        `Last name "${lastName}" contains invalid characters`,
        'INVALID_LAST_NAME',
      );
    }
  }

  /**
   * 验证姓氏长度不超过限制
   */
  private assertLastNameDoesNotExceedAllowedLength(lastName: string): void {
    // 解码HTML实体后计算长度
    const decodedName = this.decodeHtmlEntities(lastName);

    if (decodedName.length > LastName.MAX_LENGTH) {
      throw new UserConstraintException(
        `Last name is too long. Maximum allowed length is ${LastName.MAX_LENGTH}`,
        'INVALID_LAST_NAME',
      );
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
   * 获取格式化的姓氏（首字母大写）
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
