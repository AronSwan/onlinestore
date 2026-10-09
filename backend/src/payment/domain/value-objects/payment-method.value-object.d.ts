export declare class PaymentMethod {
    readonly value: string;
    readonly displayName: string;
    static readonly ALIPAY: PaymentMethod;
    static readonly WECHAT: PaymentMethod;
    static readonly UNIONPAY: PaymentMethod;
    static readonly CREDIT_CARD: PaymentMethod;
    static readonly BANK_TRANSFER: PaymentMethod;
    static readonly USDT_TRC20: PaymentMethod;
    static readonly USDT_ERC20: PaymentMethod;
    static readonly USDT_BEP20: PaymentMethod;
    static readonly BTC: PaymentMethod;
    static readonly ETH: PaymentMethod;
    private static readonly ALL_METHODS;
    private constructor();
    static fromString(value: string): PaymentMethod;
    static getAllMethods(): PaymentMethod[];
    static getTraditionalMethods(): PaymentMethod[];
    static getCryptoMethods(): PaymentMethod[];
    isTraditional(): boolean;
    isCrypto(): boolean;
    isUSDT(): boolean;
    getNetwork(): string | null;
    getIcon(): string;
    equals(other: PaymentMethod): boolean;
    toString(): string;
}
