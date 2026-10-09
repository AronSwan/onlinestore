"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVE_FIELD_PATTERNS = exports.SECURITY_CONSTANTS = void 0;
exports.SECURITY_CONSTANTS = {
    JWT: {
        MIN_SECRET_LENGTH: parseInt(process.env.JWT_MIN_SECRET_LENGTH || '32', 10),
        ALGORITHM: process.env.JWT_ALGORITHM || 'RS256',
        ISSUER: process.env.JWT_ISSUER || 'caddy-shopping-api',
        AUDIENCE: process.env.JWT_AUDIENCE || 'caddy-shopping-client',
        KEY_SIZE: parseInt(process.env.JWT_KEY_SIZE || '2048', 10),
        KEY_FORMAT: process.env.JWT_KEY_FORMAT || 'pkcs8',
        PUBLIC_KEY_FORMAT: process.env.JWT_PUBLIC_KEY_FORMAT || 'spki',
        TOKEN_EXPIRY: process.env.JWT_TOKEN_EXPIRY || '1h',
        REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    },
    PAYMENT: {
        MAX_RETRY_COUNT: parseInt(process.env.PAYMENT_MAX_RETRY_COUNT || '3', 10),
        CALLBACK_TIMEOUT_MINUTES: parseInt(process.env.PAYMENT_CALLBACK_TIMEOUT_MINUTES || '15', 10),
        NONCE_EXPIRY_MINUTES: parseInt(process.env.PAYMENT_NONCE_EXPIRY_MINUTES || '15', 10),
        MAX_AMOUNT_PER_TRANSACTION: (() => {
            const v = process.env.PAYMENT_MAX_AMOUNT;
            if (!v)
                return 0;
            const n = Number(v);
            return Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
        })(),
        RATE_LIMIT: {
            CREATE_PAYMENT: {
                ttl: parseInt(process.env.PAYMENT_RATE_LIMIT_CREATE_TTL || '60', 10),
                limit: parseInt(process.env.PAYMENT_RATE_LIMIT_CREATE_LIMIT || '10', 10),
            },
            CALLBACK: {
                ttl: parseInt(process.env.PAYMENT_RATE_LIMIT_CALLBACK_TTL || '60', 10),
                limit: parseInt(process.env.PAYMENT_RATE_LIMIT_CALLBACK_LIMIT || '100', 10),
            },
            QUERY: {
                ttl: parseInt(process.env.PAYMENT_RATE_LIMIT_QUERY_TTL || '60', 10),
                limit: parseInt(process.env.PAYMENT_RATE_LIMIT_QUERY_LIMIT || '60', 10),
            },
        },
    },
    ENCRYPTION: {
        ALGORITHM: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
        KEY_LENGTH: 32,
        IV_LENGTH: parseInt(process.env.ENCRYPTION_IV_LENGTH || '12', 10),
        TAG_LENGTH: parseInt(process.env.ENCRYPTION_TAG_LENGTH || '16', 10),
    },
    LOG_MASK: {
        SENSITIVE_FIELDS: process.env.LOG_MASK_SENSITIVE_FIELDS?.split(',') || [
            'password',
            'secret',
            'token',
            'key',
            'signature',
            'cardNumber',
            'cvv',
            'pin',
            'privateKey',
            'apiKey',
            'accessToken',
            'refreshToken',
        ],
        MASK_CHAR: process.env.LOG_MASK_CHAR || '*',
        VISIBLE_CHARS: parseInt(process.env.LOG_MASK_VISIBLE_CHARS || '4', 10),
    },
    REQUEST_VALIDATION: {
        MAX_PAYLOAD_SIZE: process.env.REQUEST_MAX_PAYLOAD_SIZE || '10mb',
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'csrf-token',
    },
    SECURITY_CHECK: {
        ENABLED: process.env.SECURITY_CHECK_ENABLED === 'true',
        FAIL_ON_HIGH: process.env.SECURITY_CHECK_FAIL_ON_HIGH === 'true',
        SCAN_TIMEOUT: parseInt(process.env.SECURITY_CHECK_SCAN_TIMEOUT || '300000', 10),
        CACHE_ENABLED: process.env.SECURITY_CHECK_CACHE_ENABLED !== 'false',
        CACHE_DIR: process.env.SECURITY_CHECK_CACHE_DIR || '.security-cache',
    },
    MONITORING: {
        ENABLED: process.env.SECURITY_MONITORING_ENABLED !== 'false',
        ALERT_THRESHOLD: parseInt(process.env.SECURITY_ALERT_THRESHOLD || '5', 10),
        RETENTION_DAYS: parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || '30', 10),
    },
};
exports.SENSITIVE_FIELD_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /signature/i,
    /card.*number/i,
    /cvv/i,
    /pin/i,
    /private.*key/i,
    /api.*key/i,
    /access.*token/i,
    /refresh.*token/i,
];
