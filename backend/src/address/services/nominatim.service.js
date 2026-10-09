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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NominatimService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NominatimService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let NominatimService = NominatimService_1 = class NominatimService {
    constructor() {
        this.logger = new common_1.Logger(NominatimService_1.name);
        this.baseUrl = 'https://nominatim.openstreetmap.org';
        this.userAgent = 'CaddyStyleShoppingSite/1.0 (contact@example.com)';
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000;
        this.httpClient = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                'User-Agent': this.userAgent,
                Accept: 'application/json',
            },
        });
        this.httpClient.interceptors.request.use(async (config) => {
            await this.enforceRateLimit();
            return config;
        });
        this.httpClient.interceptors.response.use(response => response, error => {
            this.logger.error(`Nominatim API error: ${error.message}`, error.stack);
            if (error.response?.status === 429) {
                throw new common_1.HttpException('Rate limit exceeded. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            if (error.response?.status === 403) {
                throw new common_1.HttpException('Access forbidden. Please check your usage policy compliance.', common_1.HttpStatus.FORBIDDEN);
            }
            throw new common_1.HttpException(`Nominatim service error: ${error.message}`, common_1.HttpStatus.BAD_GATEWAY);
        });
    }
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
    }
    async search(query, options = {}) {
        return this.geocode(query, options);
    }
    async geocode(query, options = {}) {
        try {
            this.logger.debug(`Geocoding query: ${query}`);
            const params = {
                q: query,
                format: 'json',
                addressdetails: 1,
                limit: options.limit || 5,
            };
            if (options.countryCode) {
                params.countrycodes = options.countryCode;
            }
            if (options.language) {
                params['accept-language'] = options.language;
            }
            if (options.viewbox) {
                params.viewbox = options.viewbox;
            }
            if (options.bounded) {
                params.bounded = 1;
            }
            const response = await this.httpClient.get('/search', {
                params,
            });
            this.logger.debug(`Geocoding completed: ${response.data.length} results`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Geocoding failed for query: ${query}`, error.stack);
            throw error;
        }
    }
    async reverseGeocode(lat, lon, options = {}) {
        try {
            this.logger.debug(`Reverse geocoding: ${lat}, ${lon}`);
            const params = {
                lat: lat.toString(),
                lon: lon.toString(),
                format: 'json',
                addressdetails: options.addressdetails !== false ? 1 : 0,
            };
            if (options.language) {
                params['accept-language'] = options.language;
            }
            if (options.zoom !== undefined) {
                params.zoom = options.zoom;
            }
            const response = await this.httpClient.get('/reverse', {
                params,
            });
            this.logger.debug(`Reverse geocoding completed`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Reverse geocoding failed for: ${lat}, ${lon}`, error.stack);
            throw error;
        }
    }
    async structuredSearch(addressComponents, options = {}) {
        try {
            this.logger.debug(`Structured search with components:`, addressComponents);
            const params = {
                format: 'json',
                addressdetails: 1,
                limit: options.limit || 5,
            };
            if (addressComponents.street)
                params.street = addressComponents.street;
            if (addressComponents.city)
                params.city = addressComponents.city;
            if (addressComponents.county)
                params.county = addressComponents.county;
            if (addressComponents.state)
                params.state = addressComponents.state;
            if (addressComponents.country)
                params.country = addressComponents.country;
            if (addressComponents.postalcode)
                params.postalcode = addressComponents.postalcode;
            if (options.language) {
                params['accept-language'] = options.language;
            }
            const response = await this.httpClient.get('/search', {
                params,
            });
            this.logger.debug(`Structured search completed: ${response.data.length} results`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Structured search failed`, error.stack);
            throw error;
        }
    }
    async getPlaceDetails(osmType, osmId, options = {}) {
        try {
            this.logger.debug(`Getting place details: ${osmType}/${osmId}`);
            const params = {
                osm_type: osmType,
                osm_id: osmId,
                format: 'json',
                addressdetails: 1,
            };
            if (options.language) {
                params['accept-language'] = options.language;
            }
            const response = await this.httpClient.get('/lookup', {
                params,
            });
            this.logger.debug(`Place details retrieved`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get place details: ${osmType}/${osmId}`, error.stack);
            throw error;
        }
    }
    async healthCheck() {
        try {
            this.logger.debug(`Performing health check`);
            const response = await this.httpClient.get('/status', {
                timeout: 5000,
            });
            const isHealthy = response.status === 200;
            this.logger.debug(`Health check result: ${isHealthy ? 'healthy' : 'unhealthy'}`);
            return isHealthy;
        }
        catch (error) {
            this.logger.warn(`Health check failed: ${error.message}`);
            return false;
        }
    }
    async getServiceStatus() {
        const startTime = Date.now();
        const lastCheck = new Date();
        try {
            const available = await this.healthCheck();
            const responseTime = Date.now() - startTime;
            return {
                available,
                responseTime,
                lastCheck,
            };
        }
        catch (error) {
            return {
                available: false,
                lastCheck,
            };
        }
    }
    async batchGeocode(queries, options = {}) {
        const results = [];
        for (const query of queries) {
            try {
                const geocodeResults = await this.geocode(query, options);
                results.push({
                    query,
                    results: geocodeResults,
                });
            }
            catch (error) {
                results.push({
                    query,
                    results: [],
                    error: error.message,
                });
            }
        }
        return results;
    }
};
exports.NominatimService = NominatimService;
exports.NominatimService = NominatimService = NominatimService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], NominatimService);
