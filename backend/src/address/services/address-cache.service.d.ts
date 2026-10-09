import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Address } from '../entities/address.entity';
import { NominatimSearchResult, NominatimReverseResult } from './nominatim.service';
export interface CacheConfig {
    geocodeTTL: number;
    reverseTTL: number;
    failedTTL: number;
}
export interface GeocodeCache {
    results: NominatimSearchResult[];
    timestamp: number;
    source: 'nominatim' | 'manual';
}
export interface ReverseGeocodeCache {
    result: NominatimReverseResult;
    timestamp: number;
    source: 'nominatim' | 'manual';
}
export declare class AddressCacheService {
    private readonly addressRepository;
    private readonly configService;
    private readonly logger;
    private readonly redis;
    private readonly config;
    constructor(addressRepository: Repository<Address>, configService: ConfigService);
    private getGeocodeKey;
    private getReverseKey;
    private getFailedKey;
    private normalizeAddress;
    get(address: string): Promise<Address | null>;
    set(address: string, addressData: Partial<Address>): Promise<void>;
    cacheGeocodeResult(address: string, results: NominatimSearchResult[], countryCode?: string, source?: 'nominatim' | 'manual'): Promise<void>;
    getGeocodeCache(address: string, countryCode?: string): Promise<NominatimSearchResult[] | null>;
    cacheReverseResult(lat: number, lon: number, result: NominatimReverseResult, source?: 'nominatim' | 'manual'): Promise<void>;
    getReverseCache(lat: number, lon: number): Promise<NominatimReverseResult | null>;
    cacheFailedResult(type: 'geocode' | 'reverse', key: string, error: string): Promise<void>;
    private saveToDatabase;
    private getFromDatabase;
    cleanupExpiredCache(): Promise<void>;
    getStats(): Promise<{
        redisKeys: number;
        dbEntries: number;
        failedEntries: number;
    }>;
    clear(): Promise<void>;
    getCacheStats(): Promise<{
        redisKeys: number;
        dbEntries: number;
        failedEntries: number;
    }>;
}
