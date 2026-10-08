/**
 * 支付方式值对象
 * 参考gopay库的支付方式定义
 */
export class PaymentMethod {
  // 传统支付方式
  static readonly ALIPAY = new PaymentMethod('ALIPAY', '支付宝');
  static readonly WECHAT = new PaymentMethod('WECHAT', '微信支付');
  static readonly UNIONPAY = new PaymentMethod('UNIONPAY', '银联支付');
  static readonly CREDIT_CARD = new PaymentMethod('CREDIT_CARD', '信用卡');
  static readonly BANK_TRANSFER = new PaymentMethod('BANK_TRANSFER', '银行转账');

  // 加密货币支付方式
  static readonly USDT_TRC20 = new PaymentMethod('USDT_TRC20', 'USDT (TRC20)');
  static readonly USDT_ERC20 = new PaymentMethod('USDT_ERC20', 'USDT (ERC20)');
  static readonly USDT_BEP20 = new PaymentMethod('USDT_BEP20', 'USDT (BEP20)');
  static readonly BTC = new PaymentMethod('BTC', 'Bitcoin');
  static readonly ETH = new PaymentMethod('ETH', 'Ethereum');

  // 所有支持的支付方式
  private static readonly ALL_METHODS = [
    PaymentMethod.ALIPAY,
    PaymentMethod.WECHAT,
    PaymentMethod.UNIONPAY,
    PaymentMethod.CREDIT_CARD,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.USDT_TRC20,
    PaymentMethod.USDT_ERC20,
    PaymentMethod.USDT_BEP20,
    PaymentMethod.BTC,
    PaymentMethod.ETH,
  ];

  private constructor(
    public readonly value: string,
    public readonly displayName: string,
  ) {}

  /**
   * 从字符串创建支付方式
   */
  static fromString(value: string): PaymentMethod {
    const method = this.ALL_METHODS.find(m => m.value === value);
    if (!method) {
      throw new Error(`不支持的支付方式: ${value}`);
    }
    return method;
  }

  /**
   * 获取所有支持的支付方式
   */
  static getAllMethods(): PaymentMethod[] {
    return [...this.ALL_METHODS];
  }

  /**
   * 获取传统支付方式
   */
  static getTraditionalMethods(): PaymentMethod[] {
    return [
      PaymentMethod.ALIPAY,
      PaymentMethod.WECHAT,
      PaymentMethod.UNIONPAY,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.BANK_TRANSFER,
    ];
  }

  /**
   * 获取加密货币支付方式
   */
  static getCryptoMethods(): PaymentMethod[] {
    return [
      PaymentMethod.USDT_TRC20,
      PaymentMethod.USDT_ERC20,
      PaymentMethod.USDT_BEP20,
      PaymentMethod.BTC,
      PaymentMethod.ETH,
    ];
  }

  /**
   * 是否为传统支付方式
   */
  isTraditional(): boolean {
    return PaymentMethod.getTraditionalMethods().includes(this);
  }

  /**
   * 是否为加密货币支付方式
   */
  isCrypto(): boolean {
    return PaymentMethod.getCryptoMethods().includes(this);
  }

  /**
   * 是否为USDT支付方式
   */
  isUSDT(): boolean {
    return [PaymentMethod.USDT_TRC20, PaymentMethod.USDT_ERC20, PaymentMethod.USDT_BEP20].includes(
      this,
    );
  }

  /**
   * 获取网络类型（仅适用于加密货币）
   */
  getNetwork(): string | null {
    if (this === PaymentMethod.USDT_TRC20) return 'TRC20';
    if (this === PaymentMethod.USDT_ERC20) return 'ERC20';
    if (this === PaymentMethod.USDT_BEP20) return 'BEP20';
    if (this === PaymentMethod.BTC) return 'BTC';
    if (this === PaymentMethod.ETH) return 'ETH';
    return null;
  }

  /**
   * 获取支付方式的图标
   */
  getIcon(): string {
    switch (this) {
      case PaymentMethod.ALIPAY:
        return 'alipay';
      case PaymentMethod.WECHAT:
        return 'wechat';
      case PaymentMethod.UNIONPAY:
        return 'unionpay';
      case PaymentMethod.CREDIT_CARD:
        return 'credit-card';
      case PaymentMethod.BANK_TRANSFER:
        return 'bank';
      case PaymentMethod.USDT_TRC20:
      case PaymentMethod.USDT_ERC20:
      case PaymentMethod.USDT_BEP20:
        return 'usdt';
      case PaymentMethod.BTC:
        return 'btc';
      case PaymentMethod.ETH:
        return 'eth';
      default:
        return 'payment';
    }
  }

  /**
   * 值对象相等性比较
   */
  equals(other: PaymentMethod): boolean {
    return this.value === other.value;
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return this.value;
  }
}
