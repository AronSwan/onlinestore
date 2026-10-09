import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { LogSanitizerService } from './log-sanitizer.service';
export declare function sortKeysDeep<T>(obj: T): T;
export declare class PaymentSecurityService {
    private encryptionService;
    private logSanitizer;
    private configService;
    private readonly nonceCache;
    constructor(encryptionService: EncryptionService, logSanitizer: LogSanitizerService, configService: ConfigService);
    validatePaymentRequest(request: Record<string, unknown>): void;
    validatePaymentCallback(callback: Record<string, unknown>, expectedSignature: string): void;
    generateSecurePaymentRequest(paymentData: Record<string, unknown>): Record<string, unknown>;
    private validateAmount;
    private validateIdempotencyKey;
    private validateTimestamp;
    private validateNonce;
    private markNonceAsUsed;
    private cleanExpiredNonces;
    private generateRequestSignature;
    private validateRequestSignature;
    private validateCallbackSignature;
    private sortObjectKeys;
    logSecurityEvent(event: string, data: unknown, level?: 'info' | 'warn' | 'error'): void;
}
