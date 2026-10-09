import { AddressService } from './address.service';
import { AddressQueueService } from './services/address-queue.service';
import { AddressCacheService } from './services/address-cache.service';
import { GeocodeDto, ReverseGeocodeDto, BatchGeocodeDto, ValidateAddressDto, FormatAddressDto } from './dto/geocode.dto';
export interface JobStatusResponse {
    id: string | number;
    status: string;
    progress: unknown;
    result: Record<string, unknown> | null;
    error: string | null;
    createdAt: Date;
    processedAt: Date | null;
    finishedAt: Date | null;
}
export interface QueueStatusResponse {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}
export declare class AddressController {
    private readonly addressService;
    private readonly queueService;
    private readonly cacheService;
    constructor(addressService: AddressService, queueService: AddressQueueService, cacheService: AddressCacheService);
    geocode(request: GeocodeDto): Promise<unknown>;
    reverseGeocode(request: ReverseGeocodeDto): Promise<unknown>;
    batchGeocode(request: BatchGeocodeDto): Promise<unknown>;
    getJobStatus(jobId: string): Promise<JobStatusResponse>;
    getQueueStatus(): Promise<QueueStatusResponse>;
    getCacheStats(): Promise<unknown>;
    cleanupCache(): Promise<unknown>;
    validateAddress(request: ValidateAddressDto): Promise<unknown>;
    formatAddress(request: FormatAddressDto): Promise<unknown>;
    healthCheck(): Promise<unknown>;
}
