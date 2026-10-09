"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogSanitizerService = void 0;
const common_1 = require("@nestjs/common");
const security_constants_1 = require("./security.constants");
let LogSanitizerService = class LogSanitizerService {
    sanitizeLog(data) {
        if (typeof data === 'string') {
            return this.maskSensitiveString(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeLog(item));
        }
        if (data && typeof data === 'object') {
            return this.sanitizeObject(data);
        }
        return data;
    }
    sanitizeObject(obj) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (this.isSensitiveField(key)) {
                sanitized[key] = this.maskValue(value);
            }
            else if (value && typeof value === 'object') {
                sanitized[key] = this.sanitizeLog(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    isSensitiveField(fieldName) {
        const lowerField = fieldName.toLowerCase();
        if (security_constants_1.SECURITY_CONSTANTS.LOG_MASK.SENSITIVE_FIELDS.some(field => lowerField.includes(field.toLowerCase()))) {
            return true;
        }
        return security_constants_1.SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
    }
    maskValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        const { MASK_CHAR, VISIBLE_CHARS } = security_constants_1.SECURITY_CONSTANTS.LOG_MASK;
        if (str.length <= VISIBLE_CHARS * 2) {
            return MASK_CHAR.repeat(str.length);
        }
        const start = str.substring(0, VISIBLE_CHARS);
        const end = str.substring(str.length - VISIBLE_CHARS);
        const middle = MASK_CHAR.repeat(Math.max(4, str.length - VISIBLE_CHARS * 2));
        return `${start}${middle}${end}`;
    }
    maskSensitiveString(str) {
        str = str.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, match => this.maskValue(match.replace(/[\s-]/g, '')));
        str = str.replace(/\b1[3-9]\d{9}\b/g, match => this.maskValue(match));
        str = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, match => {
            const [local, domain] = match.split('@');
            return `${this.maskValue(local)}@${domain}`;
        });
        return str;
    }
    sanitizePaymentLog(paymentData) {
        const sanitized = this.sanitizeLog(paymentData);
        if (sanitized.thirdPartyTransactionId) {
            sanitized.thirdPartyTransactionId = this.maskValue(sanitized.thirdPartyTransactionId);
        }
        if (sanitized.blockchainTxHash) {
            sanitized.blockchainTxHash = this.maskValue(sanitized.blockchainTxHash);
        }
        if (sanitized.cryptoAddress) {
            sanitized.cryptoAddress = this.maskValue(sanitized.cryptoAddress);
        }
        if (sanitized.metadata) {
            sanitized.metadata = this.sanitizeLog(sanitized.metadata);
        }
        return sanitized;
    }
};
exports.LogSanitizerService = LogSanitizerService;
exports.LogSanitizerService = LogSanitizerService = __decorate([
    (0, common_1.Injectable)()
], LogSanitizerService);
