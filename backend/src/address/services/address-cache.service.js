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
var AddressCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressCacheService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const redis_utils_1 = require("../../common/redis/redis-utils");
const address_entity_1 = require("../entities/address.entity");
let AddressCacheService = AddressCacheService_1 = class AddressCacheService {
    constructor(addressRepository, configService) {
        this.addressRepository = addressRepository;
        this.configService = configService;
        this.logger = new common_1.Logger(AddressCacheService_1.name);
        this.config = {
            geocodeTTL: this.configService.get('address.cache.geocodeTTL', 30 * 24 * 60 * 60),
            reverseTTL: this.configService.get('address.cache.reverseTTL', 7 * 24 * 60 * 60),
            failedTTL: this.configService.get('address.cache.failedTTL', 4 * 60 * 60),
        };
        this.redis = (0, redis_utils_1.createRedisClient)(this.configService, {
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            db: this.configService.get('REDIS_DB', 0),
        });
    }
    getGeocodeKey(address, countryCode) {
        const normalizedAddress = this.normalizeAddress(address);
        const suffix = countryCode ? `:${countryCode}` : '';
        const lengthSuffix = `:len${address.length}`;
        return `geocode:${normalizedAddress}${suffix}${lengthSuffix}`;
    }
    getReverseKey(lat, lon, precision = 6) {
        const roundedLat = Number(lat.toFixed(precision));
        const roundedLon = Number(lon.toFixed(precision));
        return `reverse:${roundedLat}:${roundedLon}`;
    }
    getFailedKey(type, key) {
        return `failed:${type}:${key}`;
    }
    normalizeAddress(address) {
        const cleaned = address
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\u4e00-\u9fff]/g, '');
        const components = cleaned.split(' ').filter(c => c.length > 0);
        return components.sort().join('|');
    }
    async get(address) {
        const results = await this.getGeocodeCache(address);
        if (results && results.length > 0) {
            const result = results[0];
            const address_entity = new address_entity_1.Address();
            address_entity.originalAddress = address;
            address_entity.formattedAddress = result.display_name;
            address_entity.latitude = parseFloat(result.lat);
            address_entity.longitude = parseFloat(result.lon);
            address_entity.countryCode = result.address?.country_code?.toUpperCase();
            address_entity.osmType = result.osm_type;
            address_entity.osmId = result.osm_id;
            address_entity.importance = result.importance;
            return address_entity;
        }
        return null;
    }
    async set(address, addressData) {
        const result = {
            place_id: addressData.placeId || '',
            licence: 'Data © OpenStreetMap contributors',
            osm_type: addressData.osmType || '',
            osm_id: addressData.osmId || '',
            lat: (addressData.latitude || 0).toString(),
            lon: (addressData.longitude || 0).toString(),
            class: 'place',
            type: 'house',
            display_name: addressData.formattedAddress || '',
            address: {
                house_number: addressData.houseNumber,
                road: addressData.street,
                city: addressData.city,
                state: addressData.state,
                postcode: addressData.postalCode,
                country: addressData.country,
                country_code: addressData.countryCode?.toLowerCase(),
            },
            boundingbox: ['0', '0', '0', '0'],
            importance: addressData.importance || 0,
        };
        await this.cacheGeocodeResult(address, [result], addressData.countryCode);
    }
    async cacheGeocodeResult(address, results, countryCode, source = 'nominatim') {
        try {
            const key = this.getGeocodeKey(address, countryCode);
            const cacheData = {
                results,
                timestamp: Date.now(),
                source,
            };
            await this.redis.setex(key, this.config.geocodeTTL, JSON.stringify(cacheData));
            if (results.length > 0) {
                await this.saveToDatabase(address, results[0], countryCode);
            }
            this.logger.debug(`Cached geocode result for: ${address}`);
        }
        catch (error) {
            this.logger.error(`Failed to cache geocode result: ${error.message}`);
        }
    }
    async getGeocodeCache(address, countryCode) {
        try {
            const key = this.getGeocodeKey(address, countryCode);
            const failedKey = this.getFailedKey('geocode', key);
            const isFailed = await this.redis.exists(failedKey);
            if (isFailed) {
                this.logger.debug(`Address in failed cache: ${address}`);
                return null;
            }
            const cached = await this.redis.get(key);
            if (cached) {
                const cacheData = JSON.parse(cached);
                this.logger.debug(`Cache hit for geocode: ${address}`);
                return cacheData.results;
            }
            const dbResult = await this.getFromDatabase(address, countryCode);
            if (dbResult) {
                this.logger.debug(`Database cache hit for geocode: ${address}`);
                await this.cacheGeocodeResult(address, [dbResult], countryCode, 'manual');
                return [dbResult];
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get geocode cache: ${error.message}`);
            return null;
        }
    }
    async cacheReverseResult(lat, lon, result, source = 'nominatim') {
        try {
            const key = this.getReverseKey(lat, lon);
            const cacheData = {
                result,
                timestamp: Date.now(),
                source,
            };
            await this.redis.setex(key, this.config.reverseTTL, JSON.stringify(cacheData));
            this.logger.debug(`Cached reverse geocode result for: ${lat}, ${lon}`);
        }
        catch (error) {
            this.logger.error(`Failed to cache reverse geocode result: ${error.message}`);
        }
    }
    async getReverseCache(lat, lon) {
        try {
            const key = this.getReverseKey(lat, lon);
            const failedKey = this.getFailedKey('reverse', key);
            const isFailed = await this.redis.exists(failedKey);
            if (isFailed) {
                this.logger.debug(`Coordinates in failed cache: ${lat}, ${lon}`);
                return null;
            }
            const cached = await this.redis.get(key);
            if (cached) {
                const cacheData = JSON.parse(cached);
                this.logger.debug(`Cache hit for reverse geocode: ${lat}, ${lon}`);
                return cacheData.result;
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get reverse geocode cache: ${error.message}`);
            return null;
        }
    }
    async cacheFailedResult(type, key, error) {
        try {
            const failedKey = this.getFailedKey(type, key);
            await this.redis.setex(failedKey, this.config.failedTTL, error);
            this.logger.debug(`Cached failed result: ${failedKey}`);
        }
        catch (error) {
            this.logger.error(`Failed to cache failed result: ${error.message}`);
        }
    }
    async saveToDatabase(originalAddress, result, countryCode) {
        try {
            const existingAddress = await this.addressRepository.findOne({
                where: {
                    originalAddress: this.normalizeAddress(originalAddress),
                    countryCode,
                },
            });
            if (!existingAddress) {
                const address = this.addressRepository.create({
                    originalAddress: this.normalizeAddress(originalAddress),
                    formattedAddress: result.display_name,
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon),
                    countryCode: result.address?.country_code?.toUpperCase(),
                    country: result.address?.country,
                    state: result.address?.state,
                    city: result.address?.city,
                    street: result.address?.road,
                    houseNumber: result.address?.house_number,
                    postalCode: result.address?.postcode,
                    placeId: result.place_id,
                    osmType: result.osm_type,
                    osmId: result.osm_id,
                    importance: result.importance,
                    source: 'nominatim',
                    lastVerified: new Date(),
                });
                await this.addressRepository.save(address);
            }
        }
        catch (error) {
            this.logger.error(`Failed to save to database: ${error.message}`);
        }
    }
    async getFromDatabase(address, countryCode) {
        try {
            const normalizedAddress = this.normalizeAddress(address);
            let dbAddress = await this.addressRepository.findOne({
                where: {
                    originalAddress: normalizedAddress,
                    countryCode,
                },
            });
            if (!dbAddress) {
                const addresses = await this.addressRepository
                    .createQueryBuilder('address')
                    .where('LOWER(address.originalAddress) LIKE :address', {
                    address: `%${normalizedAddress}%`,
                })
                    .andWhere(countryCode ? 'address.countryCode = :countryCode' : '1=1', {
                    countryCode,
                })
                    .orderBy('address.importance', 'DESC')
                    .limit(1)
                    .getOne();
                dbAddress = addresses;
            }
            if (dbAddress) {
                return {
                    place_id: dbAddress.placeId || '',
                    licence: 'Data © OpenStreetMap contributors',
                    osm_type: dbAddress.osmType || '',
                    osm_id: dbAddress.osmId || '',
                    lat: dbAddress.latitude.toString(),
                    lon: dbAddress.longitude.toString(),
                    class: 'place',
                    type: 'house',
                    display_name: dbAddress.formattedAddress,
                    address: {
                        house_number: dbAddress.houseNumber,
                        road: dbAddress.street,
                        city: dbAddress.city,
                        state: dbAddress.state,
                        postcode: dbAddress.postalCode,
                        country: dbAddress.country,
                        country_code: dbAddress.countryCode?.toLowerCase(),
                    },
                    boundingbox: ['', '', '', ''],
                    importance: dbAddress.importance || 0,
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to get from database: ${error.message}`);
            return null;
        }
    }
    async cleanupExpiredCache() {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            await this.addressRepository
                .createQueryBuilder()
                .delete()
                .where('lastVerified < :date', { date: ninetyDaysAgo })
                .andWhere('source = :source', { source: 'nominatim' })
                .execute();
            this.logger.debug('Cleaned up expired cache entries');
        }
        catch (error) {
            this.logger.error(`Failed to cleanup expired cache: ${error.message}`);
        }
    }
    async getStats() {
        return this.getCacheStats();
    }
    async clear() {
        try {
            const keys = await this.redis.keys('geocode:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            const reverseKeys = await this.redis.keys('reverse:*');
            if (reverseKeys.length > 0) {
                await this.redis.del(...reverseKeys);
            }
            const failedKeys = await this.redis.keys('failed:*');
            if (failedKeys.length > 0) {
                await this.redis.del(...failedKeys);
            }
            this.logger.debug('All cache cleared successfully');
        }
        catch (error) {
            this.logger.error(`Failed to clear cache: ${error.message}`);
            throw error;
        }
    }
    async getCacheStats() {
        try {
            const redisKeys = (await this.redis.eval(`return #redis.call('keys', ARGV[1])`, 0, 'geocode:*'));
            const dbEntries = await this.addressRepository.count();
            const failedEntries = (await this.redis.eval(`return #redis.call('keys', ARGV[1])`, 0, 'failed:*'));
            return { redisKeys, dbEntries, failedEntries };
        }
        catch (error) {
            this.logger.error(`Failed to get cache stats: ${error.message}`);
            return { redisKeys: 0, dbEntries: 0, failedEntries: 0 };
        }
    }
};
exports.AddressCacheService = AddressCacheService;
exports.AddressCacheService = AddressCacheService = AddressCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(address_entity_1.Address)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], AddressCacheService);
