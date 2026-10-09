export declare class PaymentOrderId {
    readonly value: string;
    private static readonly ID_PATTERN;
    private static readonly MIN_LENGTH;
    private static readonly MAX_LENGTH;
    constructor(value: string);
    static create(value: string): PaymentOrderId;
    static generate(): PaymentOrderId;
    static fromUUID(uuid: string): PaymentOrderId;
    private validate;
    equals(other: PaymentOrderId): boolean;
    toString(): string;
    getShortDisplay(): string;
    isSystemGenerated(): boolean;
    getTimestamp(): Date | null;
}
