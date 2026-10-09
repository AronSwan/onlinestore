"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsProblemDetailsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsProblemDetailsFilter = class AllExceptionsProblemDetailsFilter {
    constructor() {
        this.logger = new common_1.Logger('ProblemDetails');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const problem = this.buildProblem(exception, request);
        if (problem.status >= 500) {
            this.logger.error(`${request.method} ${request.url} -> ${problem.status}`, exception instanceof Error ? exception.stack : String(exception));
        }
        const headers = {
            'Content-Type': 'application/problem+json; charset=utf-8',
        };
        if (problem.retryAfter !== undefined) {
            headers['Retry-After'] = String(problem.retryAfter);
        }
        response.status(problem.status).set(headers).json({
            type: 'about:blank',
            title: problem.title,
            status: problem.status,
            detail: problem.detail,
            instance: request.originalUrl ?? request.url,
            ...(problem.errors !== undefined ? { errors: problem.errors } : {}),
            message: problem.detail,
        });
    }
    buildProblem(exception, request) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const title = exception.name.replace(/Exception$/, '') ||
                common_1.HttpStatus[status] ||
                'Error';
            if (status >= 500) {
                return { status, title, detail: '服务器内部错误', retryAfter: undefined };
            }
            let retryAfter;
            let raw = body;
            if (raw && typeof raw === 'object' && raw.retryAfter !== undefined) {
                retryAfter = Number(raw.retryAfter);
            }
            let message = raw;
            if (raw && typeof raw === 'object') {
                message = raw.message ?? raw.detail ?? '';
                if (typeof message === 'object' && !Array.isArray(message)) {
                    message = String(message);
                }
            }
            if (Array.isArray(message)) {
                return {
                    status,
                    title,
                    detail: message.join('；'),
                    errors: message,
                    retryAfter,
                };
            }
            return {
                status,
                title,
                detail: String(message || exception.message || title),
                retryAfter,
            };
        }
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            title: 'Internal Server Error',
            detail: '服务器内部错误',
        };
    }
};
exports.AllExceptionsProblemDetailsFilter = AllExceptionsProblemDetailsFilter;
exports.AllExceptionsProblemDetailsFilter = AllExceptionsProblemDetailsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsProblemDetailsFilter);
