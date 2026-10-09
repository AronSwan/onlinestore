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
var EmailVerificationExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationModule = exports.EmailVerificationController = exports.EmailValidationPipe = exports.EmailVerificationExceptionFilter = exports.EmailVerificationInterceptor = exports.EmailVerificationService = exports.OPEN_OBSERVE_SERVICE_TOKEN = exports.ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN = exports.VerifyBatchEmailDto = exports.VerifyEmailDto = void 0;
exports.EmailVerificationControllerDecorator = EmailVerificationControllerDecorator;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const EnhancedEmailVerifierService = require('../enhanced-email-verifier-service');
const OpenObserveService = require('../openobserve-service');
class VerifyEmailDto {
}
exports.VerifyEmailDto = VerifyEmailDto;
class VerifyBatchEmailDto {
}
exports.VerifyBatchEmailDto = VerifyBatchEmailDto;
exports.ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN = 'EnhancedEmailVerifierService';
exports.OPEN_OBSERVE_SERVICE_TOKEN = 'OpenObserveService';
const EMAIL_VERIFICATION_FILTER = 'emailVerificationFilter';
const EMAIL_VERIFICATION_INTERCEPTOR = 'emailVerificationInterceptor';
const EMAIL_VERIFICATION_PIPE = 'emailVerificationPipe';
let EmailVerificationService = class EmailVerificationService {
    constructor(enhancedService, openObserveService) {
        this.enhancedService = enhancedService;
        this.openObserveService = openObserveService;
    }
    async verifyEmail(email, options = {}) {
        const startTime = Date.now();
        try {
            const result = await this.enhancedService.verifyEmail(email, options);
            await this.openObserveService.recordVerificationResult(email, result, Date.now() - startTime, { framework: 'nestjs' });
            return result;
        }
        catch (error) {
            await this.openObserveService.recordVerificationError(email, error, Date.now() - startTime, {
                framework: 'nestjs',
            });
            throw error;
        }
    }
    async verifyEmailBatch(emails, options = {}) {
        const startTime = Date.now();
        try {
            const result = await this.enhancedService.verifyEmailBatch(emails, options);
            await this.openObserveService.recordBatchResult(`nestjs_${Date.now()}`, emails, result.results, Date.now() - startTime, { framework: 'nestjs' });
            return result;
        }
        catch (error) {
            await this.openObserveService.recordVerificationError('batch', error, Date.now() - startTime, { framework: 'nestjs' });
            throw error;
        }
    }
    async getHealthStatus() {
        const health = await this.enhancedService.getHealthStatus();
        await this.openObserveService.recordHealthCheck(health, { framework: 'nestjs' });
        return health;
    }
    async clearCache() {
        await this.enhancedService.clearCache();
        await this.openObserveService.recordCacheEvent('cleared', { type: 'nestjs', size: 0 });
        return { message: 'Cache cleared successfully' };
    }
    getConfig() {
        return {
            rules: this.enhancedService.rules,
            cache: {
                enabled: this.enhancedService.enableCache,
                expiry: this.enhancedService.cacheExpiry,
            },
            timeout: this.enhancedService.timeout,
        };
    }
    getMetrics() {
        const metrics = this.enhancedService.getMetrics();
        this.openObserveService.recordPerformanceMetrics(metrics, { framework: 'nestjs' });
        return metrics;
    }
};
exports.EmailVerificationService = EmailVerificationService;
exports.EmailVerificationService = EmailVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN)),
    __param(1, (0, common_1.Inject)(exports.OPEN_OBSERVE_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Object, Object])
], EmailVerificationService);
let EmailVerificationInterceptor = class EmailVerificationInterceptor {
    constructor(openObserveService) {
        this.openObserveService = openObserveService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const startTime = Date.now();
        this.openObserveService.recordPerformanceMetrics({
            endpoint: `${request.method} ${request.path}`,
            statusCode: 0,
            duration: 0,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
        }, { framework: 'nestjs', interceptor: 'pre' });
        return next.handle().pipe((0, operators_1.tap)(() => {
            const duration = Date.now() - startTime;
            this.openObserveService.recordPerformanceMetrics({
                endpoint: `${request.method} ${request.path}`,
                statusCode: context.switchToHttp().getResponse().statusCode,
                duration,
                ip: request.ip,
                userAgent: request.headers['user-agent'],
            }, { framework: 'nestjs', interceptor: 'post' });
        }));
    }
};
exports.EmailVerificationInterceptor = EmailVerificationInterceptor;
exports.EmailVerificationInterceptor = EmailVerificationInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.OPEN_OBSERVE_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Object])
], EmailVerificationInterceptor);
let EmailVerificationExceptionFilter = EmailVerificationExceptionFilter_1 = class EmailVerificationExceptionFilter {
    constructor(openObserveService) {
        this.logger = new common_1.Logger(EmailVerificationExceptionFilter_1.name);
        this.openObserveService = openObserveService;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        this.logger.error(`${request.method} ${request.path} - ${status} - ${JSON.stringify(exceptionResponse)}`);
        this.openObserveService.recordVerificationError(request.body?.email || 'unknown', exception, 0, {
            framework: 'nestjs',
            endpoint: `${request.method} ${request.path}`,
            statusCode: status,
        });
        const errorResponse = {
            success: false,
            error: typeof exceptionResponse === 'string'
                ? exceptionResponse
                : exceptionResponse.message || 'Internal server error',
            code: exceptionResponse.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(status).json(errorResponse);
    }
};
exports.EmailVerificationExceptionFilter = EmailVerificationExceptionFilter;
exports.EmailVerificationExceptionFilter = EmailVerificationExceptionFilter = EmailVerificationExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.HttpException),
    __param(0, (0, common_1.Inject)(exports.OPEN_OBSERVE_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Object])
], EmailVerificationExceptionFilter);
let EmailValidationPipe = class EmailValidationPipe {
    transform(value, metadata) {
        if (metadata.type === 'body') {
            if (metadata.metatype?.name === 'VerifyEmailDto') {
                return this.validateVerifyEmailDto(value);
            }
            if (metadata.metatype?.name === 'VerifyBatchEmailDto') {
                return this.validateVerifyBatchEmailDto(value);
            }
        }
        return value;
    }
    validateVerifyEmailDto(value) {
        if (!value.email || typeof value.email !== 'string') {
            throw new common_1.BadRequestException('Email address is required and must be a string');
        }
        if (value.email.length > 254) {
            throw new common_1.BadRequestException('Email address too long');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.email)) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        return value;
    }
    validateVerifyBatchEmailDto(value) {
        if (!Array.isArray(value.emails)) {
            throw new common_1.BadRequestException('Emails must be an array');
        }
        if (value.emails.length === 0) {
            throw new common_1.BadRequestException('Emails array cannot be empty');
        }
        if (value.emails.length > 1000) {
            throw new common_1.BadRequestException('Maximum 1000 emails per batch');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (let i = 0; i < value.emails.length; i++) {
            const email = value.emails[i];
            if (typeof email !== 'string') {
                throw new common_1.BadRequestException(`Email at index ${i} must be a string`);
            }
            if (email.length > 254) {
                throw new common_1.BadRequestException(`Email at index ${i} too long`);
            }
            if (!emailRegex.test(email)) {
                throw new common_1.BadRequestException(`Email at index ${i} has invalid format`);
            }
        }
        return value;
    }
};
exports.EmailValidationPipe = EmailValidationPipe;
exports.EmailValidationPipe = EmailValidationPipe = __decorate([
    (0, common_1.Injectable)()
], EmailValidationPipe);
function EmailVerificationControllerDecorator() {
    return function (target) {
        (0, common_1.SetMetadata)(EMAIL_VERIFICATION_FILTER, EmailVerificationExceptionFilter)(target);
        (0, common_1.SetMetadata)(EMAIL_VERIFICATION_INTERCEPTOR, EmailVerificationInterceptor)(target);
        (0, common_1.SetMetadata)(EMAIL_VERIFICATION_PIPE, EmailValidationPipe)(target);
    };
}
let EmailVerificationController = class EmailVerificationController {
    constructor(emailVerificationService) {
        this.emailVerificationService = emailVerificationService;
    }
    async verifyEmail(verifyEmailDto) {
        const result = await this.emailVerificationService.verifyEmail(verifyEmailDto.email, verifyEmailDto.options);
        return {
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        };
    }
    async verifyEmailBatch(verifyBatchEmailDto) {
        const result = await this.emailVerificationService.verifyEmailBatch(verifyBatchEmailDto.emails, verifyBatchEmailDto.options);
        return {
            success: true,
            data: {
                batchId: `nestjs_${Date.now()}`,
                ...result,
            },
            timestamp: new Date().toISOString(),
        };
    }
    async getHealth() {
        const health = await this.emailVerificationService.getHealthStatus();
        return {
            success: true,
            data: health,
            timestamp: new Date().toISOString(),
        };
    }
    async getMetrics() {
        const metrics = this.emailVerificationService.getMetrics();
        return {
            success: true,
            data: metrics,
            timestamp: new Date().toISOString(),
        };
    }
    async getConfig() {
        const config = this.emailVerificationService.getConfig();
        return {
            success: true,
            data: config,
            timestamp: new Date().toISOString(),
        };
    }
    async clearCache() {
        const result = await this.emailVerificationService.clearCache();
        return {
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.EmailVerificationController = EmailVerificationController;
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], EmailVerificationController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('verify-batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyBatchEmailDto]),
    __metadata("design:returntype", Promise)
], EmailVerificationController.prototype, "verifyEmailBatch", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailVerificationController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailVerificationController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailVerificationController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('cache/clear'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailVerificationController.prototype, "clearCache", null);
exports.EmailVerificationController = EmailVerificationController = __decorate([
    (0, common_1.Controller)('api/v1/email'),
    EmailVerificationControllerDecorator(),
    __metadata("design:paramtypes", [EmailVerificationService])
], EmailVerificationController);
let EmailVerificationModule = class EmailVerificationModule {
};
exports.EmailVerificationModule = EmailVerificationModule;
exports.EmailVerificationModule = EmailVerificationModule = __decorate([
    (0, common_1.Module)({
        controllers: [EmailVerificationController],
        providers: [
            EmailVerificationService,
            {
                provide: exports.ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN,
                useFactory: () => new EnhancedEmailVerifierService(),
            },
            {
                provide: exports.OPEN_OBSERVE_SERVICE_TOKEN,
                useFactory: () => new OpenObserveService(),
            },
            EmailVerificationInterceptor,
            EmailVerificationExceptionFilter,
            EmailValidationPipe,
        ],
        exports: [EmailVerificationService],
    })
], EmailVerificationModule);
