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
var AddressQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressQueueService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const nominatim_service_1 = require("./nominatim.service");
const address_cache_service_1 = require("./address-cache.service");
let AddressQueueService = AddressQueueService_1 = class AddressQueueService {
    constructor(geocodingQueue, nominatimService, cacheService) {
        this.geocodingQueue = geocodingQueue;
        this.nominatimService = nominatimService;
        this.cacheService = cacheService;
        this.logger = new common_1.Logger(AddressQueueService_1.name);
    }
    async addGeocodeJob(address, options = {}) {
        const jobData = {
            address,
            countryCode: options.countryCode,
            priority: options.priority || 0,
            requestId: options.requestId,
            userId: options.userId,
        };
        const jobOptions = {
            priority: options.priority || 0,
            delay: options.delay || 0,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
        };
        try {
            const job = await this.geocodingQueue.add('geocode', jobData, jobOptions);
            this.logger.log(`Added geocode job ${job.id} for address: ${address}`);
            return job;
        }
        catch (error) {
            this.logger.error(`Failed to add geocode job: ${error.message}`);
            throw error;
        }
    }
    async addBatchGeocodeJobs(addresses, options = {}) {
        const batchSize = options.batchSize || 10;
        const jobs = [];
        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            for (const addressData of batch) {
                const job = await this.addGeocodeJob(addressData.address, {
                    countryCode: addressData.countryCode,
                    priority: options.priority,
                    requestId: addressData.requestId,
                    userId: addressData.userId,
                });
                jobs.push(job);
            }
            if (i + batchSize < addresses.length && options.delayBetweenBatches) {
                await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
            }
        }
        return jobs;
    }
    async processGeocodeJob(job) {
        const { address } = job.data;
        try {
            const cached = await this.cacheService.get(address);
            if (cached) {
                const result = {
                    place_id: cached.placeId || '',
                    licence: 'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
                    osm_type: cached.osmType || 'unknown',
                    osm_id: cached.osmId || '',
                    boundingbox: ['0', '0', '0', '0'],
                    lat: cached.latitude?.toString() || '0',
                    lon: cached.longitude?.toString() || '0',
                    display_name: cached.formattedAddress || cached.rawAddress || '',
                    class: 'unknown',
                    type: 'unknown',
                    importance: cached.importance || 0,
                };
                return { success: true, results: [result] };
            }
            const results = await this.nominatimService.geocode(address);
            if (results && results.length > 0) {
                const firstResult = results[0];
                const addressEntity = {
                    originalAddress: address,
                    formattedAddress: firstResult.display_name,
                    latitude: parseFloat(firstResult.lat),
                    longitude: parseFloat(firstResult.lon),
                    countryCode: firstResult.address?.country_code?.toUpperCase(),
                    country: firstResult.address?.country,
                    state: firstResult.address?.state,
                    city: firstResult.address?.city,
                    street: firstResult.address?.road,
                    houseNumber: firstResult.address?.house_number,
                    postalCode: firstResult.address?.postcode,
                    placeId: firstResult.place_id,
                    osmType: firstResult.osm_type,
                    osmId: firstResult.osm_id,
                    importance: firstResult.importance,
                    source: 'nominatim',
                    lastVerified: new Date(),
                };
                await this.cacheService.set(address, addressEntity);
            }
            return { success: true, results };
        }
        catch (error) {
            throw new Error(`Geocoding failed: ${error.message}`);
        }
    }
    async getQueueStatus() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.geocodingQueue.getWaiting(),
            this.geocodingQueue.getActive(),
            this.geocodingQueue.getCompleted(),
            this.geocodingQueue.getFailed(),
            this.geocodingQueue.getDelayed(),
        ]);
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
        };
    }
    async cleanQueue() {
        await this.geocodingQueue.clean(0, 'completed');
        await this.geocodingQueue.clean(0, 'failed');
    }
    async pauseQueue() {
        await this.geocodingQueue.pause();
    }
    async resumeQueue() {
        await this.geocodingQueue.resume();
    }
    async getJob(jobId) {
        try {
            return await this.geocodingQueue.getJob(jobId);
        }
        catch (error) {
            this.logger.error(`Failed to get job ${jobId}: ${error.message}`);
            return null;
        }
    }
    async retryFailedJobs() {
        const failedJobs = await this.geocodingQueue.getFailed();
        for (const job of failedJobs) {
            await job.retry();
        }
    }
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.geocodingQueue.getWaiting(),
            this.geocodingQueue.getActive(),
            this.geocodingQueue.getCompleted(),
            this.geocodingQueue.getFailed(),
            this.geocodingQueue.getDelayed(),
        ]);
        const cacheStats = await this.cacheService.getCacheStats();
        return {
            queue: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
            },
            cache: cacheStats,
        };
    }
};
exports.AddressQueueService = AddressQueueService;
exports.AddressQueueService = AddressQueueService = AddressQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('address-geocoding')),
    __metadata("design:paramtypes", [Object, nominatim_service_1.NominatimService,
        address_cache_service_1.AddressCacheService])
], AddressQueueService);
