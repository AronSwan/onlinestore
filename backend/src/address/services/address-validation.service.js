"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AddressValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressValidationService = void 0;
const common_1 = require("@nestjs/common");
let AddressValidationService = AddressValidationService_1 = class AddressValidationService {
    constructor() {
        this.logger = new common_1.Logger(AddressValidationService_1.name);
        this.patterns = {
            postalCodes: {
                US: /^\d{5}(-\d{4})?$/,
                CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
                UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
                DE: /^\d{5}$/,
                FR: /^\d{5}$/,
                CN: /^\d{6}$/,
                JP: /^\d{3}-\d{4}$/,
                AU: /^\d{4}$/,
            },
            streetNumber: /^\d+[A-Za-z]?/,
            streetTypes: [
                'street',
                'st',
                'avenue',
                'ave',
                'road',
                'rd',
                'boulevard',
                'blvd',
                'lane',
                'ln',
                'drive',
                'dr',
                'court',
                'ct',
                'place',
                'pl',
                'way',
                'circle',
                'cir',
                'square',
                'sq',
                'trail',
                'tr',
            ],
        };
    }
    async validateAddress(address, countryCode) {
        try {
            this.logger.debug(`Validating address: ${address}`);
            const issues = [];
            const suggestions = [];
            let confidence = 1.0;
            if (!address || address.trim().length === 0) {
                return {
                    isValid: false,
                    confidence: 0,
                    issues: ['Address is empty'],
                };
            }
            if (address.length < 5) {
                issues.push('Address is too short');
                confidence -= 0.3;
            }
            if (address.length > 200) {
                issues.push('Address is too long');
                confidence -= 0.2;
            }
            const components = this.parseAddressComponents(address);
            const componentValidation = this.validateComponents(components, countryCode);
            issues.push(...componentValidation.issues);
            suggestions.push(...componentValidation.suggestions);
            confidence *= componentValidation.confidence;
            const specialCharValidation = this.validateSpecialCharacters(address);
            issues.push(...specialCharValidation.issues);
            confidence *= specialCharValidation.confidence;
            const formatValidation = this.validateFormat(address, countryCode);
            issues.push(...formatValidation.issues);
            suggestions.push(...formatValidation.suggestions);
            confidence *= formatValidation.confidence;
            const isValid = issues.length === 0 && confidence >= 0.7;
            this.logger.debug(`Address validation completed: ${isValid ? 'valid' : 'invalid'}`);
            return {
                isValid,
                confidence: Math.max(0, Math.min(1, confidence)),
                issues,
                suggestions: suggestions.length > 0 ? suggestions : undefined,
                components: {
                    hasStreet: !!components.street,
                    hasCity: !!components.city,
                    hasPostalCode: !!components.postalCode,
                    hasCountry: !!components.country,
                },
            };
        }
        catch (error) {
            this.logger.error(`Address validation failed for: ${address}`, error.stack);
            throw error;
        }
    }
    parseAddressComponents(address) {
        const components = {};
        const parts = address.split(',').map(part => part.trim());
        for (const part of parts) {
            if (this.looksLikePostalCode(part)) {
                components.postalCode = part;
            }
            else if (this.looksLikeStreet(part)) {
                components.street = part;
            }
            else if (this.looksLikeCity(part)) {
                components.city = part;
            }
            else if (this.looksLikeCountry(part)) {
                components.country = part;
            }
        }
        return components;
    }
    validateComponents(components, countryCode) {
        const issues = [];
        const suggestions = [];
        let confidence = 1.0;
        if (!components.street) {
            issues.push('Missing street information');
            confidence -= 0.3;
            suggestions.push('Include street name and number');
        }
        if (!components.city) {
            issues.push('Missing city information');
            confidence -= 0.2;
            suggestions.push('Include city name');
        }
        if (components.postalCode && countryCode) {
            const pattern = this.patterns.postalCodes[countryCode.toUpperCase()];
            if (pattern && !pattern.test(components.postalCode)) {
                issues.push(`Invalid postal code format for ${countryCode}`);
                confidence -= 0.2;
                suggestions.push(`Use correct postal code format for ${countryCode}`);
            }
        }
        return { issues, suggestions, confidence };
    }
    validateSpecialCharacters(address) {
        const issues = [];
        let confidence = 1.0;
        const suspiciousChars = /[<>{}[\]\\|`~!@#$%^&*()+=]/;
        if (suspiciousChars.test(address)) {
            issues.push('Contains suspicious characters');
            confidence -= 0.3;
        }
        if (/\s{3,}/.test(address)) {
            issues.push('Contains excessive whitespace');
            confidence -= 0.1;
        }
        if (/[.,;:]{2,}/.test(address)) {
            issues.push('Contains consecutive punctuation');
            confidence -= 0.1;
        }
        return { issues, confidence };
    }
    validateFormat(address, countryCode) {
        const issues = [];
        const suggestions = [];
        let confidence = 1.0;
        if (!/\d/.test(address)) {
            issues.push('Missing street number');
            confidence -= 0.2;
            suggestions.push('Include street number');
        }
        if (address === address.toUpperCase()) {
            suggestions.push('Consider using proper case instead of all uppercase');
            confidence -= 0.1;
        }
        if (address === address.toLowerCase()) {
            suggestions.push('Consider using proper case instead of all lowercase');
            confidence -= 0.1;
        }
        const hasStreetType = this.patterns.streetTypes.some(type => address.toLowerCase().includes(type));
        if (!hasStreetType) {
            suggestions.push('Consider including street type (St, Ave, Rd, etc.)');
            confidence -= 0.1;
        }
        return { issues, suggestions, confidence };
    }
    looksLikePostalCode(text) {
        return /^\d{3,6}(-\d{4})?$|^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(text.trim());
    }
    looksLikeStreet(text) {
        const hasNumber = /^\d+/.test(text.trim());
        const hasStreetType = this.patterns.streetTypes.some(type => text.toLowerCase().includes(type));
        return hasNumber || hasStreetType;
    }
    looksLikeCity(text) {
        const trimmed = text.trim();
        return (!/^\d/.test(trimmed) && trimmed.length >= 2 && trimmed.length <= 50 && !/\d{3,}/.test(trimmed));
    }
    looksLikeCountry(text) {
        const trimmed = text.trim();
        const commonCountries = [
            'usa',
            'united states',
            'canada',
            'uk',
            'united kingdom',
            'germany',
            'france',
            'china',
            'japan',
            'australia',
        ];
        return commonCountries.includes(trimmed.toLowerCase()) || /^[A-Z]{2}$/.test(trimmed);
    }
    async normalizeAddress(address) {
        try {
            let normalized = address.trim();
            normalized = normalized.replace(/\s+/g, ' ');
            const abbreviations = {
                street: 'St',
                avenue: 'Ave',
                road: 'Rd',
                boulevard: 'Blvd',
                lane: 'Ln',
                drive: 'Dr',
                court: 'Ct',
                place: 'Pl',
            };
            for (const [full, abbr] of Object.entries(abbreviations)) {
                const regex = new RegExp(`\\b${full}\\b`, 'gi');
                normalized = normalized.replace(regex, abbr);
            }
            normalized = normalized.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
            return normalized;
        }
        catch (error) {
            this.logger.error(`Address normalization failed for: ${address}`, error.stack);
            return address;
        }
    }
    async validateBatch(addresses) {
        const results = [];
        for (const { address, countryCode } of addresses) {
            try {
                const validation = await this.validateAddress(address, countryCode);
                results.push({ address, validation });
            }
            catch (error) {
                results.push({
                    address,
                    validation: {
                        isValid: false,
                        confidence: 0,
                        issues: [`Validation error: ${error.message}`],
                    },
                });
            }
        }
        return results;
    }
};
exports.AddressValidationService = AddressValidationService;
exports.AddressValidationService = AddressValidationService = AddressValidationService_1 = __decorate([
    (0, common_1.Injectable)()
], AddressValidationService);
