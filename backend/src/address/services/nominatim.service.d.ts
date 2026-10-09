export interface NominatimSearchResult {
    place_id: string;
    licence: string;
    osm_type: string;
    osm_id: string;
    boundingbox: [string, string, string, string];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
    icon?: string;
    address?: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        county?: string;
        state?: string;
        postcode?: string;
        country?: string;
        country_code?: string;
    };
}
export interface NominatimReverseResult {
    place_id: string;
    licence: string;
    osm_type: string;
    osm_id: string;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        county?: string;
        state?: string;
        postcode?: string;
        country?: string;
        country_code?: string;
    };
    boundingbox: [string, string, string, string];
}
export interface GeocodeOptions {
    countryCode?: string;
    language?: string;
    limit?: number;
    viewbox?: string;
    bounded?: boolean;
}
export interface ReverseGeocodeOptions {
    language?: string;
    zoom?: number;
    addressdetails?: boolean;
}
export interface StructuredSearchOptions {
    language?: string;
    limit?: number;
}
export declare class NominatimService {
    private readonly logger;
    private readonly httpClient;
    private readonly baseUrl;
    private readonly userAgent;
    private lastRequestTime;
    private readonly minRequestInterval;
    constructor();
    private enforceRateLimit;
    search(query: string, options?: GeocodeOptions): Promise<NominatimSearchResult[]>;
    geocode(query: string, options?: GeocodeOptions): Promise<NominatimSearchResult[]>;
    reverseGeocode(lat: number, lon: number, options?: ReverseGeocodeOptions): Promise<NominatimReverseResult>;
    structuredSearch(addressComponents: {
        street?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
        postalcode?: string;
    }, options?: StructuredSearchOptions): Promise<NominatimSearchResult[]>;
    getPlaceDetails(osmType: string, osmId: string, options?: {
        language?: string;
    }): Promise<NominatimSearchResult>;
    healthCheck(): Promise<boolean>;
    getServiceStatus(): Promise<{
        available: boolean;
        responseTime?: number;
        lastCheck: Date;
    }>;
    batchGeocode(queries: string[], options?: GeocodeOptions): Promise<Array<{
        query: string;
        results: NominatimSearchResult[];
        error?: string;
    }>>;
}
