export declare class RedisHealthService {
    check(): Promise<{
        status: string;
        details?: any;
    }>;
}
