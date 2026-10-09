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
exports.SecurityMiddleware = void 0;
const common_1 = require("@nestjs/common");
const log_sanitizer_service_1 = require("./log-sanitizer.service");
const security_constants_1 = require("./security.constants");
let SecurityMiddleware = class SecurityMiddleware {
    constructor(logSanitizer) {
        this.logSanitizer = logSanitizer;
    }
    use(req, res, next) {
        this.setSecurityHeaders(req, res);
        this.validateRequestSize(req);
        this.sanitizeRequestLog(req);
        this.setCorsHeaders(req, res);
        next();
    }
    setSecurityHeaders(req, res) {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
        res.removeHeader('X-Powered-By');
        if (req.url && (req.url.includes('/payment') || req.url.includes('/auth'))) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
    validateRequestSize(req) {
        const contentLength = req.headers['content-length'];
        if (contentLength) {
            const size = parseInt(contentLength, 10);
            const maxSize = this.parseSize(security_constants_1.SECURITY_CONSTANTS.REQUEST_VALIDATION.MAX_PAYLOAD_SIZE);
            if (size > maxSize) {
                throw new Error('Request payload too large');
            }
        }
    }
    sanitizeRequestLog(req) {
        const logData = {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            body: this.logSanitizer.sanitizeLog(req.body),
            query: this.logSanitizer.sanitizeLog(req.query),
        };
        if (process.env.NODE_ENV === 'development') {
            console.log('[REQUEST]', JSON.stringify(logData, null, 2));
        }
    }
    setCorsHeaders(req, res) {
        const origin = req.headers.origin;
        const allowedOrigins = security_constants_1.SECURITY_CONSTANTS.REQUEST_VALIDATION.ALLOWED_ORIGINS;
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400');
    }
    parseSize(sizeStr) {
        const units = {
            b: 1,
            kb: 1024,
            mb: 1024 * 1024,
            gb: 1024 * 1024 * 1024,
        };
        const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
        if (!match) {
            throw new Error(`Invalid size format: ${sizeStr}`);
        }
        const value = parseFloat(match[1]);
        const unit = match[2] || 'b';
        return value * units[unit];
    }
};
exports.SecurityMiddleware = SecurityMiddleware;
exports.SecurityMiddleware = SecurityMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [log_sanitizer_service_1.LogSanitizerService])
], SecurityMiddleware);
