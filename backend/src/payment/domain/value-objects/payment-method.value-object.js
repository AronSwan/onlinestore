"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = void 0;
class PaymentMethod {
    static { this.ALIPAY = new PaymentMethod('ALIPAY', '支付宝'); }
    static { this.WECHAT = new PaymentMethod('WECHAT', '微信支付'); }
    static { this.UNIONPAY = new PaymentMethod('UNIONPAY', '银联支付'); }
    static { this.CREDIT_CARD = new PaymentMethod('CREDIT_CARD', '信用卡'); }
    static { this.BANK_TRANSFER = new PaymentMethod('BANK_TRANSFER', '银行转账'); }
    static { this.USDT_TRC20 = new PaymentMethod('USDT_TRC20', 'USDT (TRC20)'); }
    static { this.USDT_ERC20 = new PaymentMethod('USDT_ERC20', 'USDT (ERC20)'); }
    static { this.USDT_BEP20 = new PaymentMethod('USDT_BEP20', 'USDT (BEP20)'); }
    static { this.BTC = new PaymentMethod('BTC', 'Bitcoin'); }
    static { this.ETH = new PaymentMethod('ETH', 'Ethereum'); }
    static { this.ALL_METHODS = [
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
    ]; }
    constructor(value, displayName) {
        this.value = value;
        this.displayName = displayName;
    }
    static fromString(value) {
        const normalized = String(value).toUpperCase();
        const method = this.ALL_METHODS.find(m => m.value === normalized);
        if (!method) {
            throw new Error(`不支持的支付方式: ${value}`);
        }
        return method;
    }
    static getAllMethods() {
        return [...this.ALL_METHODS];
    }
    static getTraditionalMethods() {
        return [
            PaymentMethod.ALIPAY,
            PaymentMethod.WECHAT,
            PaymentMethod.UNIONPAY,
            PaymentMethod.CREDIT_CARD,
            PaymentMethod.BANK_TRANSFER,
        ];
    }
    static getCryptoMethods() {
        return [
            PaymentMethod.USDT_TRC20,
            PaymentMethod.USDT_ERC20,
            PaymentMethod.USDT_BEP20,
            PaymentMethod.BTC,
            PaymentMethod.ETH,
        ];
    }
    isTraditional() {
        return PaymentMethod.getTraditionalMethods().includes(this);
    }
    isCrypto() {
        return PaymentMethod.getCryptoMethods().includes(this);
    }
    isUSDT() {
        return [PaymentMethod.USDT_TRC20, PaymentMethod.USDT_ERC20, PaymentMethod.USDT_BEP20].includes(this);
    }
    getNetwork() {
        if (this === PaymentMethod.USDT_TRC20)
            return 'TRC20';
        if (this === PaymentMethod.USDT_ERC20)
            return 'ERC20';
        if (this === PaymentMethod.USDT_BEP20)
            return 'BEP20';
        if (this === PaymentMethod.BTC)
            return 'BTC';
        if (this === PaymentMethod.ETH)
            return 'ETH';
        return null;
    }
    getIcon() {
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
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return this.value;
    }
}
exports.PaymentMethod = PaymentMethod;
