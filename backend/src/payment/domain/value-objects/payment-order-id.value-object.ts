import { v4 as uuidv4 } from 'uuid';

/**
 * 支付订单ID值对象
 * 确保ID的唯一性和格式正确性
 */
export class PaymentOrderId {
  private static readonly ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 64;

  constructor(public readonly value: string) {
    this.validate();
  }

  /**
   * 创建支付订单ID
   */
  static create(value: string): PaymentOrderId {
    return new PaymentOrderId(value);
  }

  /**
   * 生成新的支付订单ID
   */
  static generate(): PaymentOrderId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8);

    const id = `PAY_${timestamp}_${random}_${uuid}`.toUpperCase();
    return new PaymentOrderId(id);
  }

  /**
   * 从UUID生成支付订单ID
   */
  static fromUUID(uuid: string): PaymentOrderId {
    const cleanUuid = uuid.replace(/-/g, '');
    const id = `PAY_${cleanUuid}`.toUpperCase();
    return new PaymentOrderId(id);
  }

  /**
   * 验证ID格式
   */
  private validate(): void {
    if (!this.value) {
      throw new Error('支付订单ID不能为空');
    }

    if (this.value.length < PaymentOrderId.MIN_LENGTH) {
      throw new Error(`支付订单ID长度不能少于${PaymentOrderId.MIN_LENGTH}位`);
    }

    if (this.value.length > PaymentOrderId.MAX_LENGTH) {
      throw new Error(`支付订单ID长度不能超过${PaymentOrderId.MAX_LENGTH}位`);
    }

    if (!PaymentOrderId.ID_PATTERN.test(this.value)) {
      throw new Error('支付订单ID只能包含字母、数字、下划线和连字符');
    }
  }

  /**
   * 相等性比较
   */
  equals(other: PaymentOrderId): boolean {
    return this.value === other.value;
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return this.value;
  }

  /**
   * 获取简短显示格式
   */
  getShortDisplay(): string {
    if (this.value.length <= 12) {
      return this.value;
    }
    return `${this.value.substring(0, 6)}...${this.value.substring(this.value.length - 6)}`;
  }

  /**
   * 检查是否为系统生成的ID
   */
  isSystemGenerated(): boolean {
    return this.value.startsWith('PAY_');
  }

  /**
   * 获取时间戳部分（如果是系统生成的ID）
   */
  getTimestamp(): Date | null {
    if (!this.isSystemGenerated()) {
      return null;
    }

    try {
      const parts = this.value.split('_');
      if (parts.length >= 2) {
        const timestampStr = parts[1];
        const timestamp = parseInt(timestampStr, 36);
        return new Date(timestamp);
      }
    } catch (error) {
      // 忽略解析错误
    }

    return null;
  }
}
