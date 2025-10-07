/**
 * 值对象基类，基于PrestaShop设计模式
 * 提供通用的值对象功能和验证框架
 */

export abstract class ValueObjectBase<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = value;
  }

  /**
   * 获取值
   */
  public get value(): T {
    return this._value;
  }

  /**
   * 抽象验证方法，子类必须实现
   */
  protected abstract validate(): void;

  /**
   * 比较两个值对象是否相等
   */
  public equals(other: ValueObjectBase<T>): boolean {
    if (!(other instanceof this.constructor)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * 转换为字符串
   */
  public toString(): string {
    return String(this._value);
  }

  /**
   * 转换为JSON
   */
  public toJSON(): T {
    return this._value;
  }

  /**
   * 检查值是否为空
   */
  public isEmpty(): boolean {
    if (this._value === null || this._value === undefined) {
      return true;
    }

    if (typeof this._value === 'string') {
      return this._value.trim().length === 0;
    }

    if (Array.isArray(this._value)) {
      return this._value.length === 0;
    }

    return false;
  }

  /**
   * 获取值的哈希码
   */
  public hashCode(): number {
    const str = String(this._value);
    let hash = 0;

    if (str.length === 0) {
      return hash;
    }

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return hash;
  }
}
