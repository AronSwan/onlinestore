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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressController = void 0;
const common_1 = require("@nestjs/common");
const address_service_1 = require("./address.service");
const address_queue_service_1 = require("./services/address-queue.service");
const address_cache_service_1 = require("./services/address-cache.service");
const geocode_dto_1 = require("./dto/geocode.dto");
let AddressController = class AddressController {
    constructor(addressService, queueService, cacheService) {
        this.addressService = addressService;
        this.queueService = queueService;
        this.cacheService = cacheService;
    }
    async geocode(request) {
        try {
            const results = await this.addressService.geocode(request.address, {
                countryCode: request.countryCode,
                language: request.language,
            });
            return results;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async reverseGeocode(request) {
        try {
            const result = await this.addressService.reverseGeocode(request.latitude, request.longitude, {
                language: request.language,
            });
            return result;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async batchGeocode(request) {
        try {
            const jobIds = await this.addressService.batchGeocode(request.addresses, {
                priority: request.priority,
            });
            return { jobIds, message: `Submitted ${request.addresses.length} addresses for geocoding` };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getJobStatus(jobId) {
        try {
            const job = await this.queueService.getJob(jobId);
            if (!job) {
                throw new common_1.NotFoundException('Job not found');
            }
            return {
                id: job.id,
                status: await job.getState(),
                progress: job.progress(),
                result: job.returnvalue,
                error: job.failedReason || null,
                createdAt: new Date(job.timestamp),
                processedAt: job.processedOn ? new Date(job.processedOn) : null,
                finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getQueueStatus() {
        try {
            const status = (await Promise.race([
                this.queueService.getQueueStatus(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('队列服务不可用（Redis 未连接或响应超时）')), 3000)),
            ]));
            return status;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async getCacheStats() {
        try {
            const stats = await this.cacheService.getStats();
            return stats;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async cleanupCache() {
        try {
            await this.cacheService.clear();
            return { message: 'Cache cleaned successfully' };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async validateAddress(request) {
        try {
            const result = await this.addressService.validateAddress(request.address, request.countryCode);
            return result;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async formatAddress(request) {
        try {
            const result = await this.addressService.formatAddress(request.address, request.countryCode);
            return { formatted: result };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async healthCheck() {
        try {
            const isHealthy = await this.addressService.healthCheck();
            return { status: isHealthy ? 'healthy' : 'unhealthy', timestamp: new Date().toISOString() };
        }
        catch (error) {
            throw new common_1.ServiceUnavailableException(error.message);
        }
    }
};
exports.AddressController = AddressController;
__decorate([
    (0, common_1.Post)('geocode'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [geocode_dto_1.GeocodeDto]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "geocode", null);
__decorate([
    (0, common_1.Post)('reverse-geocode'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [geocode_dto_1.ReverseGeocodeDto]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "reverseGeocode", null);
__decorate([
    (0, common_1.Post)('geocode/batch'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [geocode_dto_1.BatchGeocodeDto]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "batchGeocode", null);
__decorate([
    (0, common_1.Get)('job/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Get)('queue/status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "getQueueStatus", null);
__decorate([
    (0, common_1.Get)('cache/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "getCacheStats", null);
__decorate([
    (0, common_1.Post)('cache/cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "cleanupCache", null);
__decorate([
    (0, common_1.Post)('validate'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [geocode_dto_1.ValidateAddressDto]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "validateAddress", null);
__decorate([
    (0, common_1.Post)('format'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [geocode_dto_1.FormatAddressDto]),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "formatAddress", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AddressController.prototype, "healthCheck", null);
exports.AddressController = AddressController = __decorate([
    (0, common_1.Controller)('address'),
    __metadata("design:paramtypes", [address_service_1.AddressService,
        address_queue_service_1.AddressQueueService,
        address_cache_service_1.AddressCacheService])
], AddressController);
