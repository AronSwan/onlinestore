export interface MasterConfig {
    app: AppConfig;
    database: DatabaseConfig;
    redis: RedisConfig;
    jwt: JwtConfig;
    security: SecurityConfig;
    throttler: ThrottlerConfig;
    logging: LoggingConfig;
    monitoring: MonitoringConfig;
    upload: UploadConfig;
    mail: MailConfig;
    messaging: MessagingConfig;
    search: SearchConfig;
    i18n: I18nConfig;
    testing: TestingConfig;
}
export interface AppConfig {
    env: string;
    port: number;
    name: string;
    version: string;
    apiPrefix: string;
}
export interface DatabaseConfig {
    type: 'postgres' | 'mysql' | 'tidb' | 'better-sqlite3';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database: string;
    charset: string;
    timezone: string;
    ssl: boolean;
    synchronize: boolean;
    logging: boolean;
    poolSize: number;
    maxConnections: number;
    minConnections: number;
    connectionTimeout: number;
    acquireTimeout: number;
    idleTimeout: number;
    tidb?: {
        clusterName: string;
        pdEndpoints: string;
        tikvEndpoints: string;
        tidbEndpoints: string;
        nodes: string;
        dashboardUrl: string;
    };
}
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    ttl: number;
    poolSize: number;
    connectTimeout: number;
    commandTimeout: number;
    tls: boolean;
    cart: {
        db: number;
        cacheDb: number;
        cacheTtl: number;
        lockTimeout: number;
        lockRetryDelay: number;
        lockRetryCount: number;
    };
}
export interface JwtConfig {
    secret: string;
    algorithm: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
    privateKey?: string;
    publicKey?: string;
    keySize: number;
    keyFormat: string;
    publicKeyFormat: string;
}
export interface SecurityConfig {
    encryption: {
        key: string;
        algorithm: string;
        keyLength: number;
        ivLength: number;
        tagLength: number;
    };
    payment: {
        signatureSecret: string;
        maxAmount: number;
        maxRetryCount: number;
        callbackTimeoutMinutes: number;
        nonceExpiryMinutes: number;
    };
    cors: {
        origins: string[];
        credentials: boolean;
    };
    ssrf: {
        allowedDomains: string[];
        blockPrivateIps: boolean;
    };
    fields: {
        passwordExclude: string[];
        responseExclude: string[];
    };
    csrf: {
        cookieName: string;
    };
    check: {
        enabled: boolean;
        failOnHigh: boolean;
        scanTimeout: number;
        cacheEnabled: boolean;
        cacheDir: string;
    };
}
export interface ThrottlerConfig {
    ttl: number;
    limit: number;
    payment: {
        createTtl: number;
        createLimit: number;
        callbackTtl: number;
        callbackLimit: number;
        queryTtl: number;
        queryLimit: number;
    };
}
export interface LoggingConfig {
    level: string;
    file: string;
    filePath: string;
    format: string;
    mask: {
        sensitiveFields: string[];
        char: string;
        visibleChars: number;
    };
    audit: {
        enabled: boolean;
        file: string;
        level: string;
    };
}
export interface MonitoringConfig {
    metrics: boolean;
    healthCheck: boolean;
    tracing: boolean;
    openobserveUrl: string;
    security: {
        enabled: boolean;
        alertThreshold: number;
        logRetentionDays: number;
    };
}
export interface UploadConfig {
    dest: string;
    maxFileSize: number;
    maxPayloadSize: string;
    provider: string;
    aws?: {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
    };
}
export interface MailConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    provider: string;
    sendgrid?: {
        apiKey: string;
    };
}
export interface MessagingConfig {
    redpanda: {
        brokers: string;
        clientId: string;
        groupId: string;
    };
}
export interface SearchConfig {
    provider: string;
    meilisearch?: {
        host: string;
        apiKey: string;
    };
}
export interface I18nConfig {
    defaultTimezone: string;
    supportedLocales: string[];
    defaultLocale: string;
}
export interface TestingConfig {
    database: string;
    redisDb: number;
    jwtSecret: string;
    logLevel: string;
    metricsEnabled: boolean;
    uploadDest: string;
    maxFileSize: number;
}
export declare const createMasterConfiguration: () => MasterConfig;
declare const _default: (() => MasterConfig) & import("@nestjs/config").ConfigFactoryKeyHost<MasterConfig>;
export default _default;
export { createMasterConfiguration as masterConfiguration };
export declare const validateMasterConfiguration: (config: Record<string, unknown>) => any;
