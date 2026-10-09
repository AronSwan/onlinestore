export declare const SECURITY_CONSTANTS: {
    JWT: {
        MIN_SECRET_LENGTH: number;
        ALGORITHM: string;
        ISSUER: string;
        AUDIENCE: string;
        KEY_SIZE: number;
        KEY_FORMAT: string;
        PUBLIC_KEY_FORMAT: string;
        TOKEN_EXPIRY: string;
        REFRESH_TOKEN_EXPIRY: string;
    };
    PAYMENT: {
        MAX_RETRY_COUNT: number;
        CALLBACK_TIMEOUT_MINUTES: number;
        NONCE_EXPIRY_MINUTES: number;
        MAX_AMOUNT_PER_TRANSACTION: number;
        RATE_LIMIT: {
            CREATE_PAYMENT: {
                ttl: number;
                limit: number;
            };
            CALLBACK: {
                ttl: number;
                limit: number;
            };
            QUERY: {
                ttl: number;
                limit: number;
            };
        };
    };
    ENCRYPTION: {
        ALGORITHM: string;
        KEY_LENGTH: number;
        IV_LENGTH: number;
        TAG_LENGTH: number;
    };
    LOG_MASK: {
        SENSITIVE_FIELDS: string[];
        MASK_CHAR: string;
        VISIBLE_CHARS: number;
    };
    REQUEST_VALIDATION: {
        MAX_PAYLOAD_SIZE: string;
        ALLOWED_ORIGINS: string[];
        CSRF_COOKIE_NAME: string;
    };
    SECURITY_CHECK: {
        ENABLED: boolean;
        FAIL_ON_HIGH: boolean;
        SCAN_TIMEOUT: number;
        CACHE_ENABLED: boolean;
        CACHE_DIR: string;
    };
    MONITORING: {
        ENABLED: boolean;
        ALERT_THRESHOLD: number;
        RETENTION_DAYS: number;
    };
};
export declare const SENSITIVE_FIELD_PATTERNS: RegExp[];
