export declare const createTestUser: (overrides?: any) => any;
export declare const createTestProduct: (overrides?: any) => any;
export declare const createTestOrder: (overrides?: any) => any;
export declare const createMockConfigService: (overrides?: Record<string, any>) => any;
export declare const createMockRepository: <T = any>() => any;
export declare const createMockDataSource: () => any;
export declare const createMockQueryRunner: () => any;
export declare const setupTestEnvironment: () => void;
export declare const cleanupTestEnvironment: () => Promise<void>;
export declare const waitForAsync: (ms?: number) => Promise<unknown>;
export declare const createMockRedisClient: () => {
    get: any;
    set: any;
    del: any;
    exists: any;
    expire: any;
    flushall: any;
    ping: any;
    quit: any;
};
export declare const createMockMailService: () => {
    sendMail: any;
};
export declare const createMockHttpClient: () => {
    get: any;
    post: any;
    put: any;
    delete: any;
    patch: any;
};
export declare const createMockLogger: () => {
    log: any;
    error: any;
    warn: any;
    debug: any;
    verbose: any;
};
