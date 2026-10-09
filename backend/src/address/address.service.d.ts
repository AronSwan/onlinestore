import { Repository } from 'typeorm';
import { NominatimService, NominatimSearchResult, NominatimReverseResult } from './services/nominatim.service';
import { AddressFormattingService } from './services/address-formatting.service';
import { AddressValidationService } from './services/address-validation.service';
import { AddressCacheService } from './services/address-cache.service';
import { Address } from './entities/address.entity';
export interface GeocodeOptions {
    countryCode?: string;
    language?: string;
    limit?: number;
}
export interface ReverseGeocodeOptions {
    language?: string;
    zoom?: number;
}
export interface ValidationResult {
    isValid: boolean;
    confidence: number;
    issues: string[];
    suggestions?: string[];
}
export declare class AddressService {
    private readonly addressRepository;
    private readonly nominatimService;
    private readonly formattingService;
    private readonly validationService;
    private readonly cacheService;
    private readonly logger;
    constructor(addressRepository: Repository<Address>, nominatimService: NominatimService, formattingService: AddressFormattingService, validationService: AddressValidationService, cacheService: AddressCacheService);
    createAddress(addressData: {
        address: string;
        latitude?: number;
        longitude?: number;
        countryCode?: string;
    }): Promise<Address>;
    geocode(address: string, options?: GeocodeOptions): Promise<NominatimSearchResult[]>;
    reverseGeocode(lat: number, lon: number, options?: ReverseGeocodeOptions): Promise<NominatimReverseResult>;
    structuredSearch(addressComponents: {
        street?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
        postalcode?: string;
    }, options?: GeocodeOptions): Promise<NominatimSearchResult[]>;
    validateAddress(address: string, countryCode?: string): Promise<ValidationResult>;
    formatAddress(addressComponents: any, countryCode?: string): Promise<string>;
    batchGeocode(addresses: Array<{
        address: string;
        countryCode?: string;
        requestId?: string;
    }>, options?: {
        priority?: number;
        batchSize?: number;
    }): Promise<string[]>;
    healthCheck(): Promise<boolean>;
    getStats(): Promise<{
        cacheStats: any;
        serviceHealth: boolean;
    }>;
}
