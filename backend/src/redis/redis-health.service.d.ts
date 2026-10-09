import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
export declare class RedisHealthService {
    private readonly configService?;
    private readonly logger;
    private redisClient;
    private stubMode;
    constructor(redisClient?: Redis, configService?: ConfigService | undefined);
    private initializeRedisClient;
    private createStubClient;
    private setupEventListeners;
    checkHealth(): Promise<{
        status: string;
        latency?: number;
        error?: string;
    }>;
    getRedisInfo(): Promise<Record<string, unknown> | null | undefined>;
    testCacheOperation(): Promise<boolean>;
    disconnect(): Promise<void>;
    getClient(): Redis | undefined;
}
