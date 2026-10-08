/**
 * 金额值对象
 * 确保金额的精度和货币类型安全
 */
export class Money {
  private static readonly SUPPORTED_CURRENCIES = [
    'CNY',
    'USD',
    'EUR',
    'JPY',
    'GBP',
    'HKD',
    'SGD',
    'USDT',
    'BTC',
    'ETH',
  ];

  private static readonly DECIMAL_PLACES: Record<string, number> = {
    CNY: 2,
    USD: 2,
    EUR: 2,
    JPY: 0,
    GBP: 2,
    HKD: 2,
    SGD: 2,
    USDT: 6,
    BTC: 8,
    ETH: 18,
  };

  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    this.validate();
  }

  /**
   * 创建金额对象
   */
  static create(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  /**
   * 创建零金额
   */
  static zero(currency: string): Money {
    return new Money(0, currency);
  }

  /**
   * 验证金额和货币
   */
  private validate(): void {
    if (this.amount < 0) {
      throw new Error('金额不能为负数');
    }

    if (!Money.SUPPORTED_CURRENCIES.includes(this.currency)) {
      throw new Error(`不支持的货币类型: ${this.currency}`);
    }

    const decimalPlaces =
      Money.DECIMAL_PLACES[this.currency as keyof typeof Money.DECIMAL_PLACES] || 2;
    const factor = Math.pow(10, decimalPlaces);
    const rounded = Math.round(this.amount * factor) / factor;

    if (Math.abs(this.amount - rounded) > Number.EPSILON) {
      throw new Error(`${this.currency}的精度不能超过${decimalPlaces}位小数`);
    }
  }

  /**
   * 加法运算
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  /**
   * 减法运算
   */
  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('减法运算结果不能为负数');
    }
    return new Money(result, this.currency);
  }

  /**
   * 乘法运算
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('乘数不能为负数');
    }
    return new Money(this.amount * factor, this.currency);
  }

  /**
   * 除法运算
   */
  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('除数必须大于0');
    }
    return new Money(this.amount / divisor, this.currency);
  }

  /**
   * 比较大小
   */
  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount >= other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  isLessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount <= other.amount;
  }

  /**
   * 相等性比较
   */
  equals(other: Money): boolean {
    return (
      this.currency === other.currency && Math.abs(this.amount - other.amount) < Number.EPSILON
    );
  }

  /**
   * 是否为零
   */
  isZero(): boolean {
    return Math.abs(this.amount) < Number.EPSILON;
  }

  /**
   * 是否为正数
   */
  isPositive(): boolean {
    return this.amount > Number.EPSILON;
  }

  /**
   * 获取格式化的金额字符串
   */
  getFormattedAmount(): string {
    const decimalPlaces = Money.DECIMAL_PLACES[this.currency];
    return this.amount.toFixed(decimalPlaces);
  }

  /**
   * 获取显示字符串
   */
  getDisplayString(): string {
    const formatted = this.getFormattedAmount();

    switch (this.currency) {
      case 'CNY':
        return `¥${formatted}`;
      case 'USD':
        return `$${formatted}`;
      case 'EUR':
        return `€${formatted}`;
      case 'JPY':
        return `¥${formatted}`;
      case 'GBP':
        return `£${formatted}`;
      case 'HKD':
        return `HK$${formatted}`;
      case 'SGD':
        return `S$${formatted}`;
      default:
        return `${formatted} ${this.currency}`;
    }
  }

  /**
   * 转换为最小单位（如分、聪等）
   */
  toMinorUnits(): number {
    const decimalPlaces = Money.DECIMAL_PLACES[this.currency];
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(this.amount * factor);
  }

  /**
   * 从最小单位创建金额对象
   */
  static fromMinorUnits(minorUnits: number, currency: string): Money {
    const decimalPlaces = Money.DECIMAL_PLACES[currency];
    const factor = Math.pow(10, decimalPlaces);
    return new Money(minorUnits / factor, currency);
  }

  /**
   * 是否为加密货币
   */
  isCryptoCurrency(): boolean {
    return ['USDT', 'BTC', 'ETH'].includes(this.currency);
  }

  /**
   * 是否为法定货币
   */
  isFiatCurrency(): boolean {
    return !this.isCryptoCurrency();
  }

  /**
   * 确保货币类型相同
   */
  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`货币类型不匹配: ${this.currency} vs ${other.currency}`);
    }
  }

  /**
   * 转换为JSON
   */
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  /**
   * 从JSON创建
   */
  static fromJSON(json: { amount: number; currency: string }): Money {
    return new Money(json.amount, json.currency);
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}
