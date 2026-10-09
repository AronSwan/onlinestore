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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryRateLimit = exports.CallbackRateLimit = exports.PaymentRateLimit = exports.RateLimitGuard = exports.RateLimit = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const security_constants_1 = require("./security.constants");
const RateLimit = (options) => {
    return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata('rate-limit', options, descriptor.value);
    };
};
exports.RateLimit = RateLimit;
let RateLimitGuard = class RateLimitGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.requestCounts = new Map();
        setInterval(() => this.cleanExpiredCounters(), 60 * 1000);
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();
        const rateLimitConfig = this.reflector.get('rate-limit', handler);
        if (!rateLimitConfig) {
            return true;
        }
        const key = this.generateKey(request, context);
        const now = Date.now();
        let counter = this.requestCounts.get(key);
        if (!counter || now > counter.resetTime) {
            counter = {
                count: 0,
                resetTime: now + rateLimitConfig.ttl * 1000,
            };
            this.requestCounts.set(key, counter);
        }
        if (counter.count >= rateLimitConfig.limit) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: '请求过于频繁，请稍后再试',
                retryAfter: Math.ceil((counter.resetTime - now) / 1000),
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        counter.count++;
        return true;
    }
    generateKey(request, context) {
        const ip = this.getClientIP(request);
        const route = context.getClass().name + '.' + context.getHandler().name;
        const userId = request.user?.id || 'anonymous';
        return `${ip}:${userId}:${route}`;
    }
    getClientIP(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown');
    }
    cleanExpiredCounters() {
        const now = Date.now();
        for (const [key, counter] of this.requestCounts.entries()) {
            if (now > counter.resetTime) {
                this.requestCounts.delete(key);
            }
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RateLimitGuard);
const PaymentRateLimit = () => (0, exports.RateLimit)(security_constants_1.SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.CREATE_PAYMENT);
exports.PaymentRateLimit = PaymentRateLimit;
const CallbackRateLimit = () => (0, exports.RateLimit)(security_constants_1.SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.CALLBACK);
exports.CallbackRateLimit = CallbackRateLimit;
const QueryRateLimit = () => (0, exports.RateLimit)(security_constants_1.SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.QUERY);
exports.QueryRateLimit = QueryRateLimit;
