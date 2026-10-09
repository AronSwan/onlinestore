"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let LoggingInterceptor = LoggingInterceptor_1 = class LoggingInterceptor {
    constructor() {
        this.logger = new common_1.Logger(LoggingInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        request.requestId = requestId;
        this.logger.log({
            message: 'Incoming request',
            method,
            url,
            ip,
            userAgent,
            requestId,
            timestamp: new Date().toISOString(),
        });
        return next.handle().pipe((0, operators_1.tap)({
            next: data => {
                const duration = Date.now() - startTime;
                this.logger.log({
                    message: 'Request completed',
                    method,
                    url,
                    statusCode: response.statusCode,
                    duration: `${duration}ms`,
                    requestId,
                    timestamp: new Date().toISOString(),
                });
            },
            error: error => {
                const duration = Date.now() - startTime;
                this.logger.error({
                    message: 'Request failed',
                    method,
                    url,
                    statusCode: response.statusCode,
                    duration: `${duration}ms`,
                    error: error.message,
                    requestId,
                    timestamp: new Date().toISOString(),
                });
            },
        }));
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = LoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
