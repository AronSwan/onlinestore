export declare class AddressLogger {
    private static readonly logger;
    static sanitizeAddress(address: string): string;
    static sanitizeCoordinates(lat: number, lon: number): string;
    static logGeocode(address: string, success: boolean, resultCount?: number): void;
    static logReverseGeocode(lat: number, lon: number, success: boolean): void;
    static logCacheOperation(operation: 'hit' | 'miss' | 'set', key: string): void;
    static logError(message: string, error: Error, context?: any): void;
}
