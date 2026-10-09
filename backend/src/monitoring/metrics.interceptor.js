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
var MetricsInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const monitoring_service_1 = require("./monitoring.service");
let MetricsInterceptor = MetricsInterceptor_1 = class MetricsInterceptor {
    constructor(monitoringService) {
        this.monitoringService = monitoringService;
        this.logger = new common_1.Logger(MetricsInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url } = request;
        const startTime = Date.now();
        this.monitoringService.incrementActiveConnections();
        const loggingState = { hasLogged: false };
        const stream = next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const duration = Date.now() - startTime;
                const statusCode = response.statusCode;
                this.monitoringService.recordApiCall(method, url, statusCode, duration);
                if (!loggingState.hasLogged) {
                    if (duration > 1000) {
                        this.logger.warn(`Slow request detected: ${method} ${url} - ${duration}ms`);
                    }
                    this.logger.debug(`Request completed: ${method} ${url} - ${statusCode} (${duration}ms)`);
                    loggingState.hasLogged = true;
                }
            },
            error: error => {
                const duration = Date.now() - startTime;
                const statusCode = response.statusCode || 500;
                this.monitoringService.recordApiCall(method, url, statusCode, duration);
                if (!loggingState.hasLogged) {
                    this.logger.error(`Request failed: ${method} ${url} - ${statusCode} (${duration}ms)`, error?.stack);
                    loggingState.hasLogged = true;
                }
            },
        }), (0, operators_1.finalize)(() => {
            this.monitoringService.decrementActiveConnections();
        }), (0, operators_1.share)());
        const shouldEnsureMonitoring = this.shouldEnsureMonitoring();
        if (shouldEnsureMonitoring) {
            stream.subscribe({
                next: () => { },
                error: (error) => {
                    this.logger.debug(`Internal subscription caught error: ${error.message}`);
                }
            });
        }
        return stream;
    }
    shouldEnsureMonitoring() {
        if (process.env.NODE_ENV === 'test') {
            return false;
        }
        return process.env.ENSURE_MONITORING === 'true' ||
            process.env.NODE_ENV === 'production';
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = MetricsInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [monitoring_service_1.MonitoringService])
], MetricsInterceptor);
