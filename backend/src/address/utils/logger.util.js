"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressLogger = void 0;
const common_1 = require("@nestjs/common");
class AddressLogger {
    static { this.logger = new common_1.Logger('AddressService'); }
    static sanitizeAddress(address) {
        if (!address || address.length <= 10) {
            return address;
        }
        const start = address.substring(0, 3);
        const end = address.substring(address.length - 3);
        return `${start}***${end}`;
    }
    static sanitizeCoordinates(lat, lon) {
        return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
    static logGeocode(address, success, resultCount) {
        const sanitizedAddress = this.sanitizeAddress(address);
        if (success) {
            this.logger.log(`Geocoding successful for ${sanitizedAddress}, found ${resultCount} results`);
        }
        else {
            this.logger.warn(`Geocoding failed for ${sanitizedAddress}`);
        }
    }
    static logReverseGeocode(lat, lon, success) {
        const sanitizedCoords = this.sanitizeCoordinates(lat, lon);
        if (success) {
            this.logger.log(`Reverse geocoding successful for ${sanitizedCoords}`);
        }
        else {
            this.logger.warn(`Reverse geocoding failed for ${sanitizedCoords}`);
        }
    }
    static logCacheOperation(operation, key) {
        const sanitizedKey = this.sanitizeAddress(key);
        this.logger.debug(`Cache ${operation} for key: ${sanitizedKey}`);
    }
    static logError(message, error, context) {
        const sanitizedContext = context ? this.sanitizeAddress(JSON.stringify(context)) : '';
        this.logger.error(`${message} ${sanitizedContext}`, error.stack);
    }
}
exports.AddressLogger = AddressLogger;
