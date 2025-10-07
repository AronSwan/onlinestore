// 用途：值对象基类
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export abstract class ValueObject {
  /**
   * 检查两个值对象是否相等
   */
  public equals(other: this): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (other.constructor !== this.constructor) {
      return false;
    }

    return this.valueEquals(other);
  }

  /**
   * 子类需要实现的具体相等性比较逻辑
   */
  protected abstract valueEquals(other: this): boolean;

  /**
   * 转换为字符串表示
   */
  public abstract toString(): string;

  /**
   * 获取原始值
   */
  public abstract get value(): any;
}
