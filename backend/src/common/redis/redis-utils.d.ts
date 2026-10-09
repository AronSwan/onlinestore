import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
export interface RedisLike {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: unknown[]): Promise<'OK' | null>;
    setex(key: string, ttlSeconds: number, value: string): Promise<'OK'>;
    del(...keys: string[]): Promise<number>;
    eval(script: string, numKeys: number, ...args: unknown[]): Promise<unknown>;
    ping(): Promise<string>;
    info(section?: string): Promise<string>;
    keys(pattern: string): Promise<string[]>;
    on?(event: string, listener: (...args: unknown[]) => void): void;
    quit?(): Promise<void>;
    disconnect(): Promise<void>;
    exists(key: string): Promise<number>;
}
export declare function isRedisEnabled(configService?: ConfigService): boolean;
export declare function createRedisClient(configService: ConfigService, options?: RedisOptions): RedisLike;
