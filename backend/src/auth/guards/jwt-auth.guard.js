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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const core_1 = require("@nestjs/core");
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector) {
        super();
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('JWT令牌缺失');
        }
        return super.canActivate(context);
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization?.trim();
        if (!authHeader) {
            return undefined;
        }
        const parts = authHeader.split(/\s+/);
        if (parts.length !== 2) {
            return undefined;
        }
        const [type, token] = parts;
        return type.toLowerCase() === 'bearer' ? token : undefined;
    }
    handleRequest(err, user, info) {
        if (err || !user) {
            if (info?.name === 'TokenExpiredError') {
                throw new common_1.UnauthorizedException('JWT令牌已过期');
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new common_1.UnauthorizedException('无效的JWT令牌');
            }
            if (info?.name === 'NotBeforeError') {
                throw new common_1.UnauthorizedException('JWT令牌尚未生效');
            }
            throw new common_1.UnauthorizedException('认证失败');
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], JwtAuthGuard);
