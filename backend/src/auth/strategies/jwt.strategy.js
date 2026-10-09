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
exports.JwtStrategy = void 0;
const passport_jwt_1 = require("passport-jwt");
const passport_1 = require("@nestjs/passport");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../../users/users.service");
const security_constants_1 = require("../../common/security/security.constants");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(usersService, configService) {
        const algorithm = configService.get('master.jwt.algorithm', 'HS256');
        const secretOrKey = algorithm === 'RS256'
            ? configService.get('master.jwt.publicKey')
            : configService.get('master.jwt.secret');
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey,
            algorithms: [algorithm],
            issuer: security_constants_1.SECURITY_CONSTANTS.JWT.ISSUER,
            audience: security_constants_1.SECURITY_CONSTANTS.JWT.AUDIENCE,
        });
        this.usersService = usersService;
        this.configService = configService;
        this.validateJwtSecretStrength(secretOrKey, algorithm);
    }
    async validate(payload) {
        if (payload?.typ === 'refresh') {
            throw new common_1.UnauthorizedException('刷新令牌不能用于接口访问');
        }
        if (!this.isValidPayload(payload)) {
            throw new common_1.UnauthorizedException('无效的JWT载荷');
        }
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('用户不存在');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('用户已被禁用');
        }
        return {
            sub: payload.sub,
            email: payload.email,
            role: user.role,
        };
    }
    isValidPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        if (!payload.sub || typeof payload.sub !== 'number' || payload.sub <= 0) {
            return false;
        }
        if (!payload.email || typeof payload.email !== 'string' || !this.isValidEmail(payload.email)) {
            return false;
        }
        if (!payload.role || typeof payload.role !== 'string' || !this.isValidRole(payload.role)) {
            return false;
        }
        if (!payload.exp || typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000) {
            return false;
        }
        if (payload.iat && typeof payload.iat !== 'number') {
            return false;
        }
        return true;
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidRole(role) {
        const validRoles = ['user', 'admin', 'moderator'];
        return validRoles.includes(role.toLowerCase());
    }
    validateJwtSecretStrength(secretOrKey, algorithm) {
        if (!secretOrKey) {
            throw new Error('JWT密钥不能为空');
        }
        if (algorithm === 'HS256') {
            if (secretOrKey.length < 32) {
                throw new Error(`JWT密钥长度不足32字符，当前长度：${secretOrKey.length}`);
            }
        }
        else if (algorithm === 'RS256') {
            const privateKey = this.configService.get('master.jwt.privateKey');
            const publicKey = this.configService.get('master.jwt.publicKey');
            if (!privateKey || !publicKey) {
                throw new Error('RS256算法需要同时配置JWT_PRIVATE_KEY和JWT_PUBLIC_KEY');
            }
            if (!this.isValidRsaKey(privateKey, 'private')) {
                throw new Error('JWT_PRIVATE_KEY格式无效');
            }
            if (!this.isValidRsaKey(publicKey, 'public')) {
                throw new Error('JWT_PUBLIC_KEY格式无效');
            }
        }
    }
    isValidRsaKey(key, keyType) {
        try {
            const cleanKey = key.replace(/\s+/g, '');
            if (keyType === 'private') {
                return (cleanKey.startsWith('-----BEGINRSAPRIVATEKEY-----') &&
                    cleanKey.endsWith('-----ENDRSAPRIVATEKEY-----'));
            }
            else {
                return (cleanKey.startsWith('-----BEGINPUBLICKEY-----') &&
                    cleanKey.endsWith('-----ENDPUBLICKEY-----'));
            }
        }
        catch (error) {
            return false;
        }
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        config_1.ConfigService])
], JwtStrategy);
