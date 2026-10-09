export interface ValidationResult {
    isValid: boolean;
    confidence: number;
    issues: string[];
    suggestions?: string[];
    components?: {
        hasStreet: boolean;
        hasCity: boolean;
        hasPostalCode: boolean;
        hasCountry: boolean;
    };
}
export interface AddressComponents {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}
export declare class AddressValidationService {
    private readonly logger;
    private readonly patterns;
    validateAddress(address: string, countryCode?: string): Promise<ValidationResult>;
    private parseAddressComponents;
    private validateComponents;
    private validateSpecialCharacters;
    private validateFormat;
    private looksLikePostalCode;
    private looksLikeStreet;
    private looksLikeCity;
    private looksLikeCountry;
    normalizeAddress(address: string): Promise<string>;
    validateBatch(addresses: Array<{
        address: string;
        countryCode?: string;
    }>): Promise<Array<{
        address: string;
        validation: ValidationResult;
    }>>;
}
