export declare function toNumberOrNull(value: unknown): number | null;
export interface MergedPriceView {
    price: number | null;
    originalPrice: number | null;
    priceSubmitted: boolean;
    originalPriceSubmitted: boolean;
    originalPriceExplicitNull: boolean;
    invalidPrice: boolean;
    invalidOriginalPrice: boolean;
}
export declare function mergePriceView(submitted: {
    price?: unknown;
    originalPrice?: unknown;
}, stored: {
    price?: unknown;
    originalPrice?: unknown;
}): MergedPriceView;
export declare function mergeSpecifications(submitted: unknown, stored: unknown): Record<string, unknown> | null;
