"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('crypto', () => ({
    randomBytes: jest.fn(),
    createCipheriv: jest.fn(),
    createDecipheriv: jest.fn(),
    createHmac: jest.fn(),
    timingSafeEqual: jest.fn(),
}));
const testing_1 = require("@nestjs/testing");
const encryption_service_1 = require("./encryption.service");
const config_1 = require("@nestjs/config");
const security_constants_1 = require("./security.constants");
const crypto = __importStar(require("crypto"));
const mockConfigService = {
    get: jest.fn(),
};
const mockRandomBytes = crypto.randomBytes;
const mockCreateCipheriv = crypto.createCipheriv;
const mockCreateDecipheriv = crypto.createDecipheriv;
const mockCreateHmac = crypto.createHmac;
const mockTimingSafeEqual = crypto.timingSafeEqual;
describe('EncryptionService', () => {
    let service;
    let configService;
    beforeEach(async () => {
        jest.clearAllMocks();
        mockConfigService.get.mockImplementation((key) => {
            if (key === 'ENCRYPTION_KEY') {
                return 'a'.repeat(64);
            }
            if (key === 'ENCRYPTION_ALGORITHM') {
                return 'aes-256-gcm';
            }
            return null;
        });
        const module = await testing_1.Test.createTestingModule({
            providers: [encryption_service_1.EncryptionService, { provide: config_1.ConfigService, useValue: mockConfigService }],
        }).compile();
        service = module.get(encryption_service_1.EncryptionService);
        configService = module.get(config_1.ConfigService);
        mockRandomBytes.mockImplementation((size, callback) => {
            const buf = Buffer.from('a'.repeat(size));
            if (callback) {
                callback(null, buf);
                return undefined;
            }
            return buf;
        });
        const mockCipher = {
            update: jest.fn().mockReturnValue('encrypted-part1'),
            final: jest.fn().mockReturnValue('encrypted-part2'),
            getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag-data')),
        };
        mockCreateCipheriv.mockReturnValue(mockCipher);
        const mockDecipher = {
            setAuthTag: jest.fn(),
            update: jest.fn().mockReturnValue('decrypted-part1'),
            final: jest.fn().mockReturnValue('decrypted-part2'),
        };
        mockCreateDecipheriv.mockReturnValue(mockDecipher);
        const mockHmac = {
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('hmac-signature'),
        };
        mockCreateHmac.mockReturnValue(mockHmac);
        mockTimingSafeEqual.mockReturnValue(true);
    });
    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });
        it('should have all dependencies injected', () => {
            expect(configService).toBeDefined();
        });
        it('should throw error when ENCRYPTION_KEY is missing', () => {
            mockConfigService.get.mockReturnValue(null);
            expect(() => new encryption_service_1.EncryptionService(configService)).toThrow('ENCRYPTION_KEY environment variable is required');
        });
        it('should throw error when ENCRYPTION_KEY has invalid length', () => {
            mockConfigService.get.mockReturnValue('invalid-key');
            expect(() => new encryption_service_1.EncryptionService(configService)).toThrow('ENCRYPTION_KEY must be 64 hex characters (32 bytes) for security');
        });
        it('should throw error when ENCRYPTION_KEY is too short', () => {
            mockConfigService.get.mockReturnValue('a'.repeat(32));
            expect(() => new encryption_service_1.EncryptionService(configService)).toThrow('ENCRYPTION_KEY must be 64 hex characters (32 bytes) for security');
        });
    });
    describe('Encrypt', () => {
        it('should encrypt text successfully', () => {
            const text = 'sensitive-data';
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH));
            const authTag = Buffer.from('auth-tag-data');
            mockRandomBytes.mockImplementation(() => iv);
            const mockCipher = {
                update: jest.fn().mockReturnValue('encrypted-part1'),
                final: jest.fn().mockReturnValue('encrypted-part2'),
                getAuthTag: jest.fn().mockReturnValue(authTag),
            };
            mockCreateCipheriv.mockReturnValue(mockCipher);
            const result = service.encrypt(text);
            expect(result).toMatch(/^[a-f0-9]+:.*:[a-f0-9]+$/);
            expect(mockCreateCipheriv).toHaveBeenCalledWith(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM, expect.any(Buffer), iv);
            expect(mockRandomBytes).toHaveBeenCalledWith(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH);
        });
        it('should handle encryption errors gracefully', () => {
            const text = 'sensitive-data';
            mockCreateCipheriv.mockImplementation(() => {
                throw new Error('Encryption failed');
            });
            expect(() => service.encrypt(text)).toThrow('Encryption failed: Encryption failed');
        });
    });
    describe('Decrypt', () => {
        it('should decrypt text successfully', () => {
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH));
            const authTag = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH));
            const encryptedData = Buffer.from('encrypted-data').toString('hex');
            const encryptedText = `${iv.toString('hex')}:${encryptedData}:${authTag.toString('hex')}`;
            const result = service.decrypt(encryptedText);
            expect(result).toBe('decrypted-part1decrypted-part2');
            expect(mockCreateDecipheriv).toHaveBeenCalledWith(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM, expect.any(Buffer), iv);
            expect(mockCreateDecipheriv).toHaveBeenCalled();
        });
        it('should handle invalid encrypted text format', () => {
            const invalidText = 'invalid-format';
            expect(() => service.decrypt(invalidText)).toThrow('Invalid encrypted data format. Expected: iv:encrypted:authTag');
        });
        it('should handle missing encryption components', () => {
            const invalidText = 'part1:part2:';
            expect(() => service.decrypt(invalidText)).toThrow('Missing required encryption components');
        });
        it('should handle invalid IV length', () => {
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH - 1));
            const authTag = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH));
            const encryptedText = `${iv.toString('hex')}:encrypted-data:${authTag.toString('hex')}`;
            expect(() => service.decrypt(encryptedText)).toThrow(`Invalid IV length. Expected: ${security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH}`);
        });
        it('should handle invalid auth tag length', () => {
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH));
            const authTag = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH - 1));
            const encryptedText = `${iv.toString('hex')}:encrypted-data:${authTag.toString('hex')}`;
            expect(() => service.decrypt(encryptedText)).toThrow(`Invalid auth tag length. Expected: ${security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH}`);
        });
        it('should handle decryption errors gracefully', () => {
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH));
            const authTag = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH));
            const encryptedText = `${iv.toString('hex')}:encrypted-data:${authTag.toString('hex')}`;
            mockCreateDecipheriv.mockImplementation(() => {
                throw new Error('Decryption failed');
            });
            expect(() => service.decrypt(encryptedText)).toThrow('Decryption failed: Decryption failed');
        });
    });
    describe('Generate Secure Random', () => {
        it('should generate secure random string with default length', () => {
            const randomBytes = Buffer.alloc(32, 'a');
            mockRandomBytes.mockImplementation(() => randomBytes);
            const result = service.generateSecureRandom();
            expect(result).toMatch(/^[a-f0-9]+$/);
            expect(result.length).toBe(64);
            expect(mockRandomBytes).toHaveBeenCalledWith(32);
        });
        it('should generate secure random string with custom length', () => {
            const randomBytes = Buffer.alloc(16, 'a');
            mockRandomBytes.mockImplementation(() => randomBytes);
            const result = service.generateSecureRandom(16);
            expect(result).toMatch(/^[a-f0-9]+$/);
            expect(result.length).toBe(32);
            expect(mockRandomBytes).toHaveBeenCalledWith(16);
        });
        it('should handle random generation errors gracefully', () => {
            mockRandomBytes.mockImplementation(() => {
                throw new Error('Random generation failed');
            });
            expect(() => service.generateSecureRandom()).toThrow('Random generation failed');
        });
    });
    describe('Generate HMAC', () => {
        it('should generate HMAC signature', () => {
            const data = 'test-data';
            const secret = 'test-secret';
            const mockHmac = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('a1b2c3d4e5f6'),
            };
            mockCreateHmac.mockReturnValue(mockHmac);
            const result = service.generateHMAC(data, secret);
            expect(result).toMatch(/^[a-f0-9]+$/);
            expect(mockCreateHmac).toHaveBeenCalledWith('sha256', secret);
            expect(mockCreateHmac).toHaveBeenCalled();
        });
    });
    describe('Verify HMAC', () => {
        it('should verify HMAC signature successfully', () => {
            const data = 'test-data';
            const signature = 'hmac-signature';
            const secret = 'test-secret';
            const validSignature = service.generateHMAC(data, secret);
            const result = service.verifyHMAC(data, validSignature, secret);
            expect(result).toBe(true);
            expect(mockCreateHmac).toHaveBeenCalledWith('sha256', secret);
            expect(mockCreateHmac).toHaveBeenCalled();
        });
        it('should return false for invalid signature', () => {
            const data = 'test-data';
            const signature = 'invalid-signature';
            const secret = 'test-secret';
            mockTimingSafeEqual.mockReturnValue(false);
            const result = service.verifyHMAC(data, signature, secret);
            expect(result).toBe(false);
        });
    });
    describe('Generate Payment Nonce', () => {
        it('should generate payment nonce with timestamp and random string', () => {
            const fixedTimestamp = 1234567890;
            const randomString = 'random-hex-string';
            const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);
            mockRandomBytes.mockImplementation(() => Buffer.from(randomString, 'hex'));
            const result = service.generatePaymentNonce();
            expect(result).toContain(`${fixedTimestamp}_`);
            expect(mockRandomBytes).toHaveBeenCalledWith(16);
            dateNowSpy.mockRestore();
        });
    });
    describe('Validate Payment Nonce', () => {
        it('should validate valid payment nonce', () => {
            const now = Date.now();
            const validTimestamp = now - security_constants_1.SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES * 60 * 1000 + 60000;
            const validNonce = `${validTimestamp}_random-string`;
            const result = service.validatePaymentNonce(validNonce);
            expect(result).toBe(true);
        });
        it('should reject expired payment nonce', () => {
            const now = Date.now();
            const expiredTimestamp = now - security_constants_1.SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES * 60 * 1000 - 60000;
            const expiredNonce = `${expiredTimestamp}_random-string`;
            const result = service.validatePaymentNonce(expiredNonce);
            expect(result).toBe(false);
        });
        it('should handle invalid nonce format', () => {
            const invalidNonce = 'invalid-format';
            const result = service.validatePaymentNonce(invalidNonce);
            expect(result).toBe(false);
        });
        it('should handle non-numeric timestamp', () => {
            const invalidNonce = 'not-a-number_random-string';
            const result = service.validatePaymentNonce(invalidNonce);
            expect(result).toBe(false);
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete encryption/decryption workflow', () => {
            const originalText = 'sensitive-user-data';
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH));
            const authTag = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH));
            mockRandomBytes.mockImplementation(() => iv);
            const mockCipher = {
                update: jest.fn().mockReturnValue('encrypted-part1'),
                final: jest.fn().mockReturnValue('encrypted-part2'),
                getAuthTag: jest.fn().mockReturnValue(authTag),
            };
            mockCreateCipheriv.mockReturnValue(mockCipher);
            const encrypted = service.encrypt(originalText);
            expect(encrypted).toMatch(/^[a-f0-9]+:.*:[a-f0-9]+$/);
            const mockDecipher = {
                setAuthTag: jest.fn(),
                update: jest.fn().mockReturnValue('decrypted-part1'),
                final: jest.fn().mockReturnValue('decrypted-part2'),
            };
            mockCreateDecipheriv.mockReturnValue(mockDecipher);
            const decrypted = service.decrypt(encrypted);
            expect(decrypted).toBe('decrypted-part1decrypted-part2');
        });
        it('should handle complete HMAC generation and verification workflow', () => {
            const data = 'important-data';
            const secret = 'secret-key';
            const mockHmac = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('a1b2c3d4e5f6'),
            };
            mockCreateHmac.mockReturnValue(mockHmac);
            const signature = service.generateHMAC(data, secret);
            expect(signature).toMatch(/^[a-f0-9]+$/);
            const isValid = service.verifyHMAC(data, signature, secret);
            expect(isValid).toBe(true);
        });
        it('should handle complete payment nonce generation and validation workflow', () => {
            const fixedTimestamp = Date.now();
            const randomString = 'random-hex-string';
            const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);
            mockRandomBytes.mockImplementation(() => Buffer.from(randomString, 'hex'));
            const nonce = service.generatePaymentNonce();
            expect(nonce).toContain(`${fixedTimestamp}_`);
            const isValid = service.validatePaymentNonce(nonce);
            expect(isValid).toBe(true);
            dateNowSpy.mockRestore();
        });
    });
    describe('Error Handling', () => {
        it('should handle missing configuration gracefully', () => {
            mockConfigService.get.mockReturnValue(null);
            expect(() => new encryption_service_1.EncryptionService(configService)).toThrow('ENCRYPTION_KEY environment variable is required');
        });
        it('should handle crypto module errors gracefully', () => {
            const text = 'test-data';
            mockCreateCipheriv.mockImplementation(() => {
                throw new Error('Cipher error');
            });
            expect(() => service.encrypt(text)).toThrow('Encryption failed: Cipher error');
            jest.clearAllMocks();
            mockConfigService.get.mockImplementation((key) => {
                if (key === 'ENCRYPTION_KEY') {
                    return 'a'.repeat(64);
                }
                return null;
            });
            mockRandomBytes.mockImplementation((size, callback) => {
                const buf = Buffer.from('a'.repeat(size));
                if (callback) {
                    callback(null, buf);
                }
                return buf;
            });
            const mockCipher = {
                update: jest.fn().mockReturnValue(Buffer.from('encrypted-part1')),
                final: jest.fn().mockReturnValue(Buffer.from('encrypted-part2')),
                getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag-data')),
            };
            mockCreateCipheriv.mockReturnValue(mockCipher);
            const iv = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH));
            const authTag = Buffer.from('a'.repeat(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH));
            const encryptedText = `${iv.toString('hex')}:encrypted-data:${authTag.toString('hex')}`;
            mockCreateDecipheriv.mockImplementation(() => {
                throw new Error('Decipher error');
            });
            expect(() => service.decrypt(encryptedText)).toThrow('Decryption failed: Decipher error');
        });
    });
});
