"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNumberOrNull = toNumberOrNull;
exports.mergePriceView = mergePriceView;
exports.mergeSpecifications = mergeSpecifications;
const STRICT_NUMERIC_SHAPE = /^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/;
function toNumberOrNull(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && STRICT_NUMERIC_SHAPE.test(value)) {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function mergePriceView(submitted, stored) {
    const priceSubmitted = submitted.price !== null && submitted.price !== undefined;
    const originalPriceKeyPresent = Object.prototype.hasOwnProperty.call(submitted, 'originalPrice');
    const originalPriceExplicitNull = originalPriceKeyPresent && submitted.originalPrice === null;
    const originalPriceSubmitted = originalPriceKeyPresent &&
        submitted.originalPrice !== null &&
        submitted.originalPrice !== undefined;
    const submittedPrice = toNumberOrNull(submitted.price);
    const storedPrice = toNumberOrNull(stored.price);
    const submittedOriginalPrice = toNumberOrNull(submitted.originalPrice);
    const storedOriginalPrice = toNumberOrNull(stored.originalPrice);
    return {
        price: priceSubmitted ? submittedPrice : storedPrice,
        originalPrice: originalPriceExplicitNull
            ? null
            : originalPriceSubmitted
                ? submittedOriginalPrice
                : storedOriginalPrice,
        priceSubmitted,
        originalPriceSubmitted,
        originalPriceExplicitNull,
        invalidPrice: priceSubmitted && submittedPrice === null,
        invalidOriginalPrice: originalPriceSubmitted && submittedOriginalPrice === null,
    };
}
function mergeSpecifications(submitted, stored) {
    if (submitted === null)
        return null;
    if (submitted !== undefined && (typeof submitted !== 'object' || Array.isArray(submitted))) {
        return submitted;
    }
    const base = typeof stored === 'object' && stored !== null && !Array.isArray(stored)
        ? stored
        : {};
    const overlay = (submitted ?? {});
    return { ...base, ...overlay };
}
