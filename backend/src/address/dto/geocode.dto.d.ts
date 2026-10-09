export declare class GeocodeDto {
    address: string;
    countryCode?: string;
    language?: string;
}
export declare class ReverseGeocodeDto {
    latitude: number;
    longitude: number;
    language?: string;
}
export declare class BatchAddressDto {
    address: string;
    countryCode?: string;
    requestId?: string;
}
export declare class BatchGeocodeDto {
    addresses: BatchAddressDto[];
    priority?: number;
}
export declare class ValidateAddressDto {
    address: string;
    countryCode?: string;
}
export declare class FormatAddressDto {
    address: any;
    countryCode?: string;
}
