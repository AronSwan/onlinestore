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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const security_constants_1 = require("./security.constants");
let EncryptionService = class EncryptionService {
    constructor(configService) {
        this.configService = configService;
        const key = this.configService.get('ENCRYPTION_KEY');
        if (!key) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        const requiredKeyLength = 32;
        if (key.length !== requiredKeyLength * 2) {
            throw new Error(`ENCRYPTION_KEY must be ${requiredKeyLength * 2} hex characters (32 bytes) for security`);
        }
        this.encryptionKey = Buffer.from(key, 'hex');
    }
    encrypt(plaintext) {
        try {
            const iv = crypto.randomBytes(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH);
            const cipher = crypto.createCipheriv(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM, this.encryptionKey, iv);
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    decrypt(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format. Expected: iv:encrypted:authTag');
            }
            const [ivHex, encrypted, authTagHex] = parts;
            if (!ivHex || !encrypted || !authTagHex) {
                throw new Error('Missing required encryption components');
            }
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            if (iv.length !== security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH) {
                throw new Error(`Invalid IV length. Expected: ${security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH}`);
            }
            if (authTag.length !== security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH) {
                throw new Error(`Invalid auth tag length. Expected: ${security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH}`);
            }
            const decipher = crypto.createDecipheriv(security_constants_1.SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    generateHMAC(data, secret) {
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }
    verifyHMAC(data, signature, secret) {
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    generatePaymentNonce() {
        const timestamp = Date.now();
        const random = this.generateSecureRandom(16);
        return `${timestamp}_${random}`;
    }
    validatePaymentNonce(nonce) {
        try {
            const [timestampStr] = nonce.split('_');
            const timestamp = parseInt(timestampStr, 10);
            const now = Date.now();
            const maxAge = security_constants_1.SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES * 60 * 1000;
            return now - timestamp <= maxAge;
        }
        catch {
            return false;
        }
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EncryptionService);
