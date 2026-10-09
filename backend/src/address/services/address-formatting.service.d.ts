export interface AddressComponents {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
}
export interface FormattingOptions {
    countryCode?: string;
    language?: string;
    abbreviate?: boolean;
    includeCountry?: boolean;
}
export declare class AddressFormattingService {
    private readonly logger;
    private readonly formatTemplates;
    private readonly streetAbbreviations;
    private readonly stateAbbreviations;
    formatAddress(components: AddressComponents, countryCode?: string, options?: FormattingOptions): Promise<string>;
    private preprocessComponents;
    private applyTemplate;
    private postprocessAddress;
    private abbreviateStreetType;
    private abbreviateState;
    private titleCase;
    private getCountryName;
    parseAddress(address: string): Promise<AddressComponents>;
    private looksLikePostalCode;
    private looksLikeStreetAddress;
    private looksLikeState;
    private looksLikeCountry;
    validateFormat(address: string, countryCode?: string): Promise<{
        isValid: boolean;
        issues: string[];
        suggestions: string[];
    }>;
    private validateCountrySpecificFormat;
    formatBatch(addresses: Array<{
        components: AddressComponents;
        countryCode?: string;
        options?: FormattingOptions;
    }>): Promise<Array<{
        formatted: string;
        error?: string;
    }>>;
}
