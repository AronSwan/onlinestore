"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    static { this.SUPPORTED_CURRENCIES = [
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
    ]; }
    static { this.DECIMAL_PLACES = {
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
    }; }
    constructor(amount, currency) {
        this.amount = amount;
        this.currency = currency;
        this.validate();
    }
    static create(amount, currency) {
        return new Money(amount, currency);
    }
    static zero(currency) {
        return new Money(0, currency);
    }
    validate() {
        if (this.amount < 0) {
            throw new Error('金额不能为负数');
        }
        if (!Money.SUPPORTED_CURRENCIES.includes(this.currency)) {
            throw new Error(`不支持的货币类型: ${this.currency}`);
        }
        const decimalPlaces = Money.DECIMAL_PLACES[this.currency] || 2;
        const factor = Math.pow(10, decimalPlaces);
        const rounded = Math.round(this.amount * factor) / factor;
        if (Math.abs(this.amount - rounded) > Number.EPSILON) {
            throw new Error(`${this.currency}的精度不能超过${decimalPlaces}位小数`);
        }
    }
    add(other) {
        this.ensureSameCurrency(other);
        return new Money(this.amount + other.amount, this.currency);
    }
    subtract(other) {
        this.ensureSameCurrency(other);
        const result = this.amount - other.amount;
        if (result < 0) {
            throw new Error('减法运算结果不能为负数');
        }
        return new Money(result, this.currency);
    }
    multiply(factor) {
        if (factor < 0) {
            throw new Error('乘数不能为负数');
        }
        return new Money(this.amount * factor, this.currency);
    }
    divide(divisor) {
        if (divisor <= 0) {
            throw new Error('除数必须大于0');
        }
        return new Money(this.amount / divisor, this.currency);
    }
    isGreaterThan(other) {
        this.ensureSameCurrency(other);
        return this.amount > other.amount;
    }
    isGreaterThanOrEqual(other) {
        this.ensureSameCurrency(other);
        return this.amount >= other.amount;
    }
    isLessThan(other) {
        this.ensureSameCurrency(other);
        return this.amount < other.amount;
    }
    isLessThanOrEqual(other) {
        this.ensureSameCurrency(other);
        return this.amount <= other.amount;
    }
    equals(other) {
        return (this.currency === other.currency && Math.abs(this.amount - other.amount) < Number.EPSILON);
    }
    isZero() {
        return Math.abs(this.amount) < Number.EPSILON;
    }
    isPositive() {
        return this.amount > Number.EPSILON;
    }
    getFormattedAmount() {
        const decimalPlaces = Money.DECIMAL_PLACES[this.currency];
        return this.amount.toFixed(decimalPlaces);
    }
    getDisplayString() {
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
    toMinorUnits() {
        const decimalPlaces = Money.DECIMAL_PLACES[this.currency];
        const factor = Math.pow(10, decimalPlaces);
        return Math.round(this.amount * factor);
    }
    static fromMinorUnits(minorUnits, currency) {
        const decimalPlaces = Money.DECIMAL_PLACES[currency];
        const factor = Math.pow(10, decimalPlaces);
        return new Money(minorUnits / factor, currency);
    }
    isCryptoCurrency() {
        return ['USDT', 'BTC', 'ETH'].includes(this.currency);
    }
    isFiatCurrency() {
        return !this.isCryptoCurrency();
    }
    ensureSameCurrency(other) {
        if (this.currency !== other.currency) {
            throw new Error(`货币类型不匹配: ${this.currency} vs ${other.currency}`);
        }
    }
    toJSON() {
        return {
            amount: this.amount,
            currency: this.currency,
        };
    }
    static fromJSON(json) {
        return new Money(json.amount, json.currency);
    }
    toString() {
        return `${this.amount} ${this.currency}`;
    }
}
exports.Money = Money;
