import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';
export interface CacheOptions {
    ttl?: number;
    prefix?: string;
    tags?: string[];
}
export declare class CacheService {
    private cacheManager;
    private configService;
    private monitoring;
    private readonly keyPrefix;
    constructor(cacheManager: Cache, configService: ConfigService, monitoring: MonitoringService);
    private generateKey;
    get<T>(module: string, resource: string, id?: string | number): Promise<T | null>;
    set<T>(module: string, resource: string, value: T, id?: string | number, options?: CacheOptions): Promise<void>;
    delete(module: string, resource: string, id?: string | number): Promise<void>;
    deleteByPattern(pattern: string): Promise<void>;
    private getDefaultTtl;
    warmup(module: string, resource: string, data: any[]): Promise<void>;
    getStats(): {
        keyPrefix: string;
    };
}
