export declare class LogSanitizerService {
    sanitizeLog(data: unknown): unknown;
    private sanitizeObject;
    private isSensitiveField;
    private maskValue;
    private maskSensitiveString;
    sanitizePaymentLog(paymentData: Record<string, unknown>): Record<string, unknown>;
}
