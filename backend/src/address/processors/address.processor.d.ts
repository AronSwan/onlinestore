import { Job } from 'bull';
import { NominatimService } from '../services/nominatim.service';
import { AddressCacheService } from '../services/address-cache.service';
import { AddressService } from '../address.service';
export interface GeocodeJobData {
    address: string;
    userId?: string;
    requestId?: string;
}
export declare class AddressProcessor {
    private readonly nominatimService;
    private readonly addressCacheService;
    private readonly addressService;
    private readonly logger;
    constructor(nominatimService: NominatimService, addressCacheService: AddressCacheService, addressService: AddressService);
    handleGeocoding(job: Job<GeocodeJobData>): Promise<import("../entities/address.entity").Address | null>;
    handleBatchGeocoding(job: Job<{
        addresses: string[];
    }>): Promise<{
        address: string;
        result: any;
        success: boolean;
        error?: string;
    }[]>;
    handleValidation(job: Job<{
        address: string;
    }>): Promise<import("../address.service").ValidationResult>;
}
