"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AddressService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nominatim_service_1 = require("./services/nominatim.service");
const address_formatting_service_1 = require("./services/address-formatting.service");
const address_validation_service_1 = require("./services/address-validation.service");
const address_cache_service_1 = require("./services/address-cache.service");
const address_entity_1 = require("./entities/address.entity");
const logger_util_1 = require("./utils/logger.util");
let AddressService = AddressService_1 = class AddressService {
    constructor(addressRepository, nominatimService, formattingService, validationService, cacheService) {
        this.addressRepository = addressRepository;
        this.nominatimService = nominatimService;
        this.formattingService = formattingService;
        this.validationService = validationService;
        this.cacheService = cacheService;
        this.logger = new common_1.Logger(AddressService_1.name);
    }
    async createAddress(addressData) {
        const address = this.addressRepository.create({
            originalAddress: addressData.address,
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            countryCode: addressData.countryCode,
            source: 'manual',
            lastVerified: new Date(),
        });
        return this.addressRepository.save(address);
    }
    async geocode(address, options = {}) {
        try {
            logger_util_1.AddressLogger.logGeocode(address, false);
            const cachedResults = await this.cacheService.getGeocodeCache(address, options.countryCode);
            if (cachedResults) {
                this.logger.debug(`Cache hit for address: ${address}`);
                return cachedResults;
            }
            const results = await this.nominatimService.geocode(address, {
                countryCode: options.countryCode,
                language: options.language,
                limit: options.limit,
            });
            await this.cacheService.cacheGeocodeResult(address, results, options.countryCode);
            logger_util_1.AddressLogger.logGeocode(address, true, results.length);
            return results;
        }
        catch (error) {
            logger_util_1.AddressLogger.logError(`Geocoding failed`, error, { address });
            await this.cacheService.cacheFailedResult('geocode', `${address}:${options.countryCode || ''}`, error.message);
            throw error;
        }
    }
    async reverseGeocode(lat, lon, options = {}) {
        try {
            this.logger.debug(`Reverse geocoding coordinates: ${lat}, ${lon}`);
            const cachedResult = await this.cacheService.getReverseCache(lat, lon);
            if (cachedResult) {
                this.logger.debug(`Cache hit for coordinates: ${lat}, ${lon}`);
                return cachedResult;
            }
            const result = await this.nominatimService.reverseGeocode(lat, lon, {
                language: options.language,
                zoom: options.zoom,
            });
            await this.cacheService.cacheReverseResult(lat, lon, result);
            this.logger.debug(`Reverse geocoding completed`);
            return result;
        }
        catch (error) {
            this.logger.error(`Reverse geocoding failed for coordinates: ${lat}, ${lon}`, error.stack);
            await this.cacheService.cacheFailedResult('reverse', `${lat}:${lon}`, error.message);
            throw error;
        }
    }
    async structuredSearch(addressComponents, options = {}) {
        try {
            this.logger.debug(`Structured search with components:`, addressComponents);
            const results = await this.nominatimService.structuredSearch(addressComponents, {
                language: options.language,
                limit: options.limit,
            });
            this.logger.debug(`Structured search completed: ${results.length} results found`);
            return results;
        }
        catch (error) {
            this.logger.error(`Structured search failed`, error.stack);
            throw error;
        }
    }
    async validateAddress(address, countryCode) {
        try {
            this.logger.debug(`Validating address: ${address}`);
            const result = await this.validationService.validateAddress(address, countryCode);
            this.logger.debug(`Address validation completed`);
            return result;
        }
        catch (error) {
            this.logger.error(`Address validation failed for: ${address}`, error.stack);
            throw error;
        }
    }
    async formatAddress(addressComponents, countryCode) {
        try {
            this.logger.debug(`Formatting address components:`, addressComponents);
            const formattedAddress = await this.formattingService.formatAddress(addressComponents, countryCode);
            this.logger.debug(`Address formatting completed`);
            return formattedAddress;
        }
        catch (error) {
            this.logger.error(`Address formatting failed`, error.stack);
            throw error;
        }
    }
    async batchGeocode(addresses, options = {}) {
        try {
            this.logger.debug(`Starting batch geocoding for ${addresses.length} addresses`);
            const { AddressQueueService } = await Promise.resolve().then(() => __importStar(require('./services/address-queue.service')));
            const batchSize = options.batchSize || 10;
            const jobIds = [];
            for (let i = 0; i < addresses.length; i += batchSize) {
                const batch = addresses.slice(i, i + batchSize);
                for (const addressData of batch) {
                    const cacheKey = `${addressData.address}:${addressData.countryCode || ''}`;
                    const cached = await this.cacheService.getGeocodeCache(addressData.address, addressData.countryCode);
                    if (cached) {
                        jobIds.push(`cached:${cacheKey}`);
                    }
                    else {
                        jobIds.push(`queued:${cacheKey}`);
                    }
                }
                if (i + batchSize < addresses.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            this.logger.debug(`Batch geocoding completed: ${jobIds.length} jobs processed`);
            return jobIds;
        }
        catch (error) {
            this.logger.error(`Batch geocoding failed`, error.stack);
            throw error;
        }
    }
    async healthCheck() {
        try {
            return await this.nominatimService.healthCheck();
        }
        catch (error) {
            this.logger.error(`Health check failed`, error.stack);
            return false;
        }
    }
    async getStats() {
        try {
            const [cacheStats, serviceHealth] = await Promise.all([
                this.cacheService.getCacheStats(),
                this.healthCheck(),
            ]);
            return {
                cacheStats,
                serviceHealth,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get stats`, error.stack);
            throw error;
        }
    }
};
exports.AddressService = AddressService;
exports.AddressService = AddressService = AddressService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(address_entity_1.Address)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        nominatim_service_1.NominatimService,
        address_formatting_service_1.AddressFormattingService,
        address_validation_service_1.AddressValidationService,
        address_cache_service_1.AddressCacheService])
], AddressService);
