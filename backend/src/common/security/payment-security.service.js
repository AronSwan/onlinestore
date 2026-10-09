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
exports.PaymentSecurityService = void 0;
exports.sortKeysDeep = sortKeysDeep;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const encryption_service_1 = require("./encryption.service");
const log_sanitizer_service_1 = require("./log-sanitizer.service");
const security_constants_1 = require("./security.constants");
const crypto = __importStar(require("crypto"));
function sortKeysDeep(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sortKeysDeep(item));
    }
    const sortedObj = {};
    Object.keys(obj)
        .sort()
        .forEach(key => {
        sortedObj[key] = sortKeysDeep(obj[key]);
    });
    return sortedObj;
}
let PaymentSecurityService = class PaymentSecurityService {
    constructor(encryptionService, logSanitizer, configService) {
        this.encryptionService = encryptionService;
        this.logSanitizer = logSanitizer;
        this.configService = configService;
        this.nonceCache = new Map();
        setInterval(() => this.cleanExpiredNonces(), 5 * 60 * 1000);
    }
    validatePaymentRequest(request) {
        this.validateAmount(Number(request.amount));
        this.validateIdempotencyKey(String(request.idempotencyKey ?? ''));
        if (request.signature) {
            this.validateRequestSignature(request);
        }
        if (request.timestamp) {
            this.validateTimestamp(Number(request.timestamp));
        }
    }
    validatePaymentCallback(callback, expectedSignature) {
        if (callback.nonce) {
            this.validateNonce(String(callback.nonce));
        }
        this.validateCallbackSignature(callback, expectedSignature);
        if (callback.timestamp) {
            this.validateTimestamp(Number(callback.timestamp));
        }
        if (callback.nonce) {
            this.markNonceAsUsed(String(callback.nonce));
        }
    }
    generateSecurePaymentRequest(paymentData) {
        const secureRequest = {
            ...paymentData,
            nonce: this.encryptionService.generatePaymentNonce(),
            timestamp: Date.now(),
        };
        const signature = this.generateRequestSignature(secureRequest);
        secureRequest.signature = signature;
        return secureRequest;
    }
    validateAmount(amount) {
        if (!amount || amount <= 0) {
            throw new common_1.BadRequestException('支付金额必须大于0');
        }
        if (amount > security_constants_1.SECURITY_CONSTANTS.PAYMENT.MAX_AMOUNT_PER_TRANSACTION) {
            throw new common_1.BadRequestException('支付金额超过单笔交易限额');
        }
        if (!/^\d+(\.\d{1,8})?$/.test(amount.toString())) {
            throw new common_1.BadRequestException('支付金额格式不正确');
        }
    }
    validateIdempotencyKey(key) {
        if (!key) {
            throw new common_1.BadRequestException('幂等性键不能为空');
        }
        if (key.length < 16 || key.length > 64) {
            throw new common_1.BadRequestException('幂等性键长度必须在16-64字符之间');
        }
        if (!/^[A-Za-z0-9_-]+$/.test(key)) {
            throw new common_1.BadRequestException('幂等性键只能包含字母、数字、下划线和连字符');
        }
    }
    validateTimestamp(timestamp) {
        const now = Date.now();
        const maxAge = security_constants_1.SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES * 60 * 1000;
        if (Math.abs(now - timestamp) > maxAge) {
            throw new common_1.UnauthorizedException('请求时间戳已过期');
        }
    }
    validateNonce(nonce) {
        if (!this.encryptionService.validatePaymentNonce(nonce)) {
            throw new common_1.UnauthorizedException('无效的nonce格式');
        }
        if (this.nonceCache.has(nonce)) {
            throw new common_1.UnauthorizedException('nonce已被使用');
        }
    }
    markNonceAsUsed(nonce) {
        this.nonceCache.set(nonce, Date.now());
    }
    cleanExpiredNonces() {
        const now = Date.now();
        const maxAge = security_constants_1.SECURITY_CONSTANTS.PAYMENT.NONCE_EXPIRY_MINUTES * 60 * 1000;
        for (const [nonce, timestamp] of this.nonceCache.entries()) {
            if (now - timestamp > maxAge) {
                this.nonceCache.delete(nonce);
            }
        }
    }
    generateRequestSignature(request) {
        const secret = this.configService.get('PAYMENT_SIGNATURE_SECRET');
        if (!secret) {
            throw new Error('PAYMENT_SIGNATURE_SECRET not configured');
        }
        const { signature, ...dataToSign } = request;
        const sortedData = this.sortObjectKeys(dataToSign);
        const dataString = JSON.stringify(sortedData);
        return this.encryptionService.generateHMAC(dataString, secret);
    }
    validateRequestSignature(request) {
        const providedSignature = String(request.signature ?? '');
        const expectedSignature = this.generateRequestSignature(request);
        const secret = this.configService.get('PAYMENT_SIGNATURE_SECRET');
        if (!secret) {
            throw new Error('PAYMENT_SIGNATURE_SECRET not configured');
        }
        if (!this.encryptionService.verifyHMAC(JSON.stringify(this.sortObjectKeys(request)), providedSignature, secret)) {
            throw new common_1.UnauthorizedException('请求签名验证失败');
        }
    }
    validateCallbackSignature(callback, expectedSignature) {
        const secret = this.configService.get('PAYMENT_CALLBACK_SECRET');
        if (!secret) {
            throw new Error('PAYMENT_CALLBACK_SECRET not configured');
        }
        const sortedData = this.sortObjectKeys(callback);
        const dataString = JSON.stringify(sortedData);
        const computedSignature = this.encryptionService.generateHMAC(dataString, secret);
        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(computedSignature, 'hex'))) {
            throw new common_1.UnauthorizedException('回调签名验证失败');
        }
    }
    sortObjectKeys(obj) {
        return sortKeysDeep(obj);
    }
    logSecurityEvent(event, data, level = 'info') {
        const sanitizedData = this.logSanitizer.sanitizePaymentLog(data);
        const logEntry = {
            event,
            timestamp: new Date().toISOString(),
            data: sanitizedData,
            level,
        };
        console.log(`[PAYMENT_SECURITY] ${JSON.stringify(logEntry)}`);
    }
};
exports.PaymentSecurityService = PaymentSecurityService;
exports.PaymentSecurityService = PaymentSecurityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [encryption_service_1.EncryptionService,
        log_sanitizer_service_1.LogSanitizerService,
        config_1.ConfigService])
], PaymentSecurityService);
