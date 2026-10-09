"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AddressFormattingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressFormattingService = void 0;
const common_1 = require("@nestjs/common");
let AddressFormattingService = AddressFormattingService_1 = class AddressFormattingService {
    constructor() {
        this.logger = new common_1.Logger(AddressFormattingService_1.name);
        this.formatTemplates = {
            US: '{house_number} {road}, {city}, {state} {postcode}',
            CA: '{house_number} {road}, {city}, {state} {postcode}',
            UK: '{house_number} {road}, {city}, {postcode}',
            DE: '{road} {house_number}, {postcode} {city}',
            FR: '{house_number} {road}, {postcode} {city}',
            CN: '{country} {state} {city} {road} {house_number}',
            JP: '{postcode} {state} {city} {road} {house_number}',
            AU: '{house_number} {road}, {city} {state} {postcode}',
            default: '{house_number} {road}, {city}, {state} {postcode}',
        };
        this.streetAbbreviations = {
            Street: 'St',
            Avenue: 'Ave',
            Road: 'Rd',
            Boulevard: 'Blvd',
            Lane: 'Ln',
            Drive: 'Dr',
            Court: 'Ct',
            Place: 'Pl',
            Way: 'Way',
            Circle: 'Cir',
            Square: 'Sq',
            Trail: 'Tr',
        };
        this.stateAbbreviations = {
            Alabama: 'AL',
            Alaska: 'AK',
            Arizona: 'AZ',
            Arkansas: 'AR',
            California: 'CA',
            Colorado: 'CO',
            Connecticut: 'CT',
            Delaware: 'DE',
            Florida: 'FL',
            Georgia: 'GA',
            Hawaii: 'HI',
            Idaho: 'ID',
            Illinois: 'IL',
            Indiana: 'IN',
            Iowa: 'IA',
            Kansas: 'KS',
            Kentucky: 'KY',
            Louisiana: 'LA',
            Maine: 'ME',
            Maryland: 'MD',
            Massachusetts: 'MA',
            Michigan: 'MI',
            Minnesota: 'MN',
            Mississippi: 'MS',
            Missouri: 'MO',
            Montana: 'MT',
            Nebraska: 'NE',
            Nevada: 'NV',
            'New Hampshire': 'NH',
            'New Jersey': 'NJ',
            'New Mexico': 'NM',
            'New York': 'NY',
            'North Carolina': 'NC',
            'North Dakota': 'ND',
            Ohio: 'OH',
            Oklahoma: 'OK',
            Oregon: 'OR',
            Pennsylvania: 'PA',
            'Rhode Island': 'RI',
            'South Carolina': 'SC',
            'South Dakota': 'SD',
            Tennessee: 'TN',
            Texas: 'TX',
            Utah: 'UT',
            Vermont: 'VT',
            Virginia: 'VA',
            Washington: 'WA',
            'West Virginia': 'WV',
            Wisconsin: 'WI',
            Wyoming: 'WY',
        };
    }
    async formatAddress(components, countryCode, options = {}) {
        try {
            this.logger.debug(`Formatting address for country: ${countryCode}`);
            const country = countryCode || components.country_code || options.countryCode || 'default';
            const normalizedCountry = country.toUpperCase();
            const template = this.formatTemplates[normalizedCountry] || this.formatTemplates.default;
            const processedComponents = this.preprocessComponents(components, options);
            let formattedAddress = this.applyTemplate(template, processedComponents);
            formattedAddress = this.postprocessAddress(formattedAddress, options);
            this.logger.debug(`Address formatting completed`);
            return formattedAddress;
        }
        catch (error) {
            this.logger.error(`Address formatting failed`, error.stack);
            throw error;
        }
    }
    preprocessComponents(components, options) {
        const processed = { ...components };
        if (options.abbreviate) {
            if (processed.road) {
                processed.road = this.abbreviateStreetType(processed.road);
            }
            if (processed.state) {
                processed.state = this.abbreviateState(processed.state);
            }
        }
        Object.keys(processed).forEach(key => {
            if (processed[key] && typeof processed[key] === 'string') {
                processed[key] = this.titleCase(processed[key]);
            }
        });
        return processed;
    }
    applyTemplate(template, components) {
        let result = template;
        Object.keys(components).forEach(key => {
            const placeholder = `{${key}}`;
            const value = components[key] || '';
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });
        result = result.replace(/\{[^}]+\}/g, '');
        return result;
    }
    postprocessAddress(address, options) {
        let result = address;
        result = result.replace(/\s+/g, ' ');
        result = result.replace(/,\s*,/g, ',');
        result = result.replace(/,\s*$/g, '');
        result = result.replace(/^\s*,/g, '');
        result = result.trim();
        if (options.includeCountry && options.countryCode) {
            const countryName = this.getCountryName(options.countryCode);
            if (countryName && !result.includes(countryName)) {
                result += `, ${countryName}`;
            }
        }
        return result;
    }
    abbreviateStreetType(street) {
        let result = street;
        Object.entries(this.streetAbbreviations).forEach(([full, abbr]) => {
            const regex = new RegExp(`\\b${full}\\b`, 'gi');
            result = result.replace(regex, abbr);
        });
        return result;
    }
    abbreviateState(state) {
        return this.stateAbbreviations[state] || state;
    }
    titleCase(str) {
        return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    getCountryName(countryCode) {
        const countryNames = {
            US: 'United States',
            CA: 'Canada',
            UK: 'United Kingdom',
            DE: 'Germany',
            FR: 'France',
            CN: 'China',
            JP: 'Japan',
            AU: 'Australia',
        };
        return countryNames[countryCode.toUpperCase()] || countryCode;
    }
    async parseAddress(address) {
        try {
            this.logger.debug(`Parsing address: ${address}`);
            const components = {};
            const parts = address.split(',').map(part => part.trim());
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (this.looksLikePostalCode(part)) {
                    components.postcode = part;
                }
                else if (this.looksLikeStreetAddress(part)) {
                    const streetParts = part.split(' ');
                    if (streetParts.length > 0 && /^\d+/.test(streetParts[0])) {
                        components.house_number = streetParts[0];
                        components.road = streetParts.slice(1).join(' ');
                    }
                    else {
                        components.road = part;
                    }
                }
                else if (this.looksLikeState(part)) {
                    components.state = part;
                }
                else if (i === parts.length - 1 && this.looksLikeCountry(part)) {
                    components.country = part;
                }
                else {
                    components.city = part;
                }
            }
            this.logger.debug(`Address parsing completed`);
            return components;
        }
        catch (error) {
            this.logger.error(`Address parsing failed for: ${address}`, error.stack);
            throw error;
        }
    }
    looksLikePostalCode(text) {
        return /^\d{3,6}(-\d{4})?$|^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(text.trim());
    }
    looksLikeStreetAddress(text) {
        const hasNumber = /^\d+/.test(text.trim());
        const hasStreetType = Object.keys(this.streetAbbreviations).some(type => text.toLowerCase().includes(type.toLowerCase()));
        return hasNumber || hasStreetType;
    }
    looksLikeState(text) {
        const trimmed = text.trim();
        return (Object.keys(this.stateAbbreviations).includes(trimmed) ||
            Object.values(this.stateAbbreviations).includes(trimmed.toUpperCase()));
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
    async validateFormat(address, countryCode) {
        try {
            const issues = [];
            const suggestions = [];
            if (!address || address.trim().length === 0) {
                issues.push('Address is empty');
                return { isValid: false, issues, suggestions };
            }
            const components = await this.parseAddress(address);
            if (!components.road && !components.house_number) {
                issues.push('Missing street information');
                suggestions.push('Include street name and number');
            }
            if (!components.city) {
                issues.push('Missing city information');
                suggestions.push('Include city name');
            }
            if (countryCode) {
                const countryIssues = this.validateCountrySpecificFormat(components, countryCode);
                issues.push(...countryIssues);
            }
            const isValid = issues.length === 0;
            return { isValid, issues, suggestions };
        }
        catch (error) {
            this.logger.error(`Format validation failed for: ${address}`, error.stack);
            return {
                isValid: false,
                issues: [`Validation error: ${error.message}`],
                suggestions: [],
            };
        }
    }
    validateCountrySpecificFormat(components, countryCode) {
        const issues = [];
        switch (countryCode.toUpperCase()) {
            case 'US':
                if (components.postcode && !/^\d{5}(-\d{4})?$/.test(components.postcode)) {
                    issues.push('Invalid US postal code format');
                }
                if (!components.state) {
                    issues.push('Missing state for US address');
                }
                break;
            case 'CA':
                if (components.postcode && !/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(components.postcode)) {
                    issues.push('Invalid Canadian postal code format');
                }
                break;
            case 'UK':
                if (components.postcode && !/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(components.postcode)) {
                    issues.push('Invalid UK postal code format');
                }
                break;
            case 'DE':
                if (components.postcode && !/^\d{5}$/.test(components.postcode)) {
                    issues.push('Invalid German postal code format');
                }
                break;
        }
        return issues;
    }
    async formatBatch(addresses) {
        const results = [];
        for (const { components, countryCode, options } of addresses) {
            try {
                const formatted = await this.formatAddress(components, countryCode, options);
                results.push({ formatted });
            }
            catch (error) {
                results.push({
                    formatted: '',
                    error: error.message,
                });
            }
        }
        return results;
    }
};
exports.AddressFormattingService = AddressFormattingService;
exports.AddressFormattingService = AddressFormattingService = AddressFormattingService_1 = __decorate([
    (0, common_1.Injectable)()
], AddressFormattingService);
