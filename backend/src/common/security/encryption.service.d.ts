import { ConfigService } from '@nestjs/config';
export declare class EncryptionService {
    private configService;
    private readonly encryptionKey;
    constructor(configService: ConfigService);
    encrypt(plaintext: string): string;
    decrypt(encryptedData: string): string;
    generateSecureRandom(length?: number): string;
    generateHMAC(data: string, secret: string): string;
    verifyHMAC(data: string, signature: string, secret: string): boolean;
    generatePaymentNonce(): string;
    validatePaymentNonce(nonce: string): boolean;
}
