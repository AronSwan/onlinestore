export declare class Address {
    id: string;
    rawAddress: string;
    formattedAddress: string;
    street: string;
    houseNumber: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode?: string;
    latitude: number;
    longitude: number;
    placeId: string;
    originalAddress?: string;
    osmType?: string;
    osmId?: string;
    importance?: number;
    source?: string;
    lastVerified?: Date;
    metadata: Record<string, any>;
    isValid: boolean;
    confidence: number;
    createdAt: Date;
    updatedAt: Date;
}
