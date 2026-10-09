export declare class Money {
    readonly amount: number;
    readonly currency: string;
    private static readonly SUPPORTED_CURRENCIES;
    private static readonly DECIMAL_PLACES;
    constructor(amount: number, currency: string);
    static create(amount: number, currency: string): Money;
    static zero(currency: string): Money;
    private validate;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(factor: number): Money;
    divide(divisor: number): Money;
    isGreaterThan(other: Money): boolean;
    isGreaterThanOrEqual(other: Money): boolean;
    isLessThan(other: Money): boolean;
    isLessThanOrEqual(other: Money): boolean;
    equals(other: Money): boolean;
    isZero(): boolean;
    isPositive(): boolean;
    getFormattedAmount(): string;
    getDisplayString(): string;
    toMinorUnits(): number;
    static fromMinorUnits(minorUnits: number, currency: string): Money;
    isCryptoCurrency(): boolean;
    isFiatCurrency(): boolean;
    private ensureSameCurrency;
    toJSON(): {
        amount: number;
        currency: string;
    };
    static fromJSON(json: {
        amount: number;
        currency: string;
    }): Money;
    toString(): string;
}
