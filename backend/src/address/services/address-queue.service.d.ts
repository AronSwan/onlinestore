import { Queue, Job } from 'bull';
import { NominatimService, NominatimSearchResult } from './nominatim.service';
import { AddressCacheService } from './address-cache.service';
export interface GeocodeJobData {
    address: string;
    countryCode?: string;
    priority?: number;
    requestId?: string;
    userId?: string;
}
export interface GeocodeJobResult {
    success: boolean;
    results?: NominatimSearchResult[];
    error?: string;
    cached?: boolean;
}
export declare class AddressQueueService {
    private geocodingQueue;
    private readonly nominatimService;
    private readonly cacheService;
    private readonly logger;
    constructor(geocodingQueue: Queue<GeocodeJobData>, nominatimService: NominatimService, cacheService: AddressCacheService);
    addGeocodeJob(address: string, options?: {
        countryCode?: string;
        priority?: number;
        delay?: number;
        requestId?: string;
        userId?: string;
    }): Promise<Job<GeocodeJobData>>;
    addBatchGeocodeJobs(addresses: Array<{
        address: string;
        countryCode?: string;
        requestId?: string;
        userId?: string;
    }>, options?: {
        priority?: number;
        batchSize?: number;
        delayBetweenBatches?: number;
    }): Promise<Job<GeocodeJobData>[]>;
    processGeocodeJob(job: Job<GeocodeJobData>): Promise<GeocodeJobResult>;
    getQueueStatus(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    cleanQueue(): Promise<void>;
    pauseQueue(): Promise<void>;
    resumeQueue(): Promise<void>;
    getJob(jobId: string): Promise<Job<GeocodeJobData> | null>;
    retryFailedJobs(): Promise<void>;
    getQueueStats(): Promise<any>;
}
