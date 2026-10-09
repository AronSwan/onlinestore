"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AddressProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const nominatim_service_1 = require("../services/nominatim.service");
const address_cache_service_1 = require("../services/address-cache.service");
const address_service_1 = require("../address.service");
let AddressProcessor = AddressProcessor_1 = class AddressProcessor {
    constructor(nominatimService, addressCacheService, addressService) {
        this.nominatimService = nominatimService;
        this.addressCacheService = addressCacheService;
        this.addressService = addressService;
        this.logger = new common_1.Logger(AddressProcessor_1.name);
    }
    async handleGeocoding(job) {
        const { address, userId, requestId } = job.data;
        this.logger.log(`Processing geocoding job for address: ${address}`);
        try {
            const cached = await this.addressCacheService.get(address);
            if (cached) {
                this.logger.log(`Cache hit for address: ${address}`);
                return cached;
            }
            const results = await this.nominatimService.search(address);
            if (results.length > 0) {
                const result = results[0];
                const savedAddress = await this.addressService.createAddress({
                    address: address,
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon),
                    countryCode: result.address?.country_code?.toUpperCase(),
                });
                await this.addressCacheService.set(address, savedAddress);
                this.logger.log(`Successfully geocoded address: ${address}`);
                return savedAddress;
            }
            else {
                this.logger.warn(`No results found for address: ${address}`);
                return null;
            }
        }
        catch (error) {
            this.logger.error(`Error processing geocoding job: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleBatchGeocoding(job) {
        const { addresses } = job.data;
        this.logger.log(`Processing batch geocoding job for ${addresses.length} addresses`);
        const results = [];
        for (const address of addresses) {
            try {
                const result = await this.handleGeocoding({
                    data: { address },
                });
                results.push({
                    address,
                    result,
                    success: true,
                });
            }
            catch (error) {
                this.logger.error(`Error geocoding address ${address}: ${error.message}`);
                results.push({
                    address,
                    result: null,
                    error: error.message,
                    success: false,
                });
            }
        }
        this.logger.log(`Completed batch geocoding: ${results.filter(r => r.success).length}/${addresses.length} successful`);
        return results;
    }
    async handleValidation(job) {
        const { address } = job.data;
        this.logger.log(`Processing validation job for address: ${address}`);
        try {
            const result = await this.addressService.validateAddress(address);
            this.logger.log(`Successfully validated address: ${address}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error validating address: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.AddressProcessor = AddressProcessor;
__decorate([
    (0, bull_1.Process)('geocode'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AddressProcessor.prototype, "handleGeocoding", null);
__decorate([
    (0, bull_1.Process)('batch-geocode'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AddressProcessor.prototype, "handleBatchGeocoding", null);
__decorate([
    (0, bull_1.Process)('validate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AddressProcessor.prototype, "handleValidation", null);
exports.AddressProcessor = AddressProcessor = AddressProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)('address-geocoding'),
    __metadata("design:paramtypes", [nominatim_service_1.NominatimService,
        address_cache_service_1.AddressCacheService,
        address_service_1.AddressService])
], AddressProcessor);
