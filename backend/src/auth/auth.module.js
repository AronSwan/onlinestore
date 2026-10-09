"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_service_1 = require("./auth.service");
const auth_proxy_service_1 = require("./auth-proxy.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const local_strategy_1 = require("./strategies/local.strategy");
const users_module_1 = require("../users/users.module");
const user_entity_1 = require("../users/entities/user.entity");
const captcha_service_1 = require("./captcha.service");
const verify_code_module_1 = require("./verify-code/verify-code.module");
const redis_module_1 = require("../redis/redis.module");
const security_constants_1 = require("../common/security/security.constants");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            passport_1.PassportModule,
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User]),
            redis_module_1.RedisModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const algorithm = configService.get('master.jwt.algorithm', 'HS256');
                    if (algorithm === 'RS256') {
                        return {
                            privateKey: configService.get('master.jwt.privateKey'),
                            publicKey: configService.get('master.jwt.publicKey'),
                            signOptions: {
                                expiresIn: configService.get('master.jwt.expiresIn', '15m'),
                                algorithm: 'RS256',
                                issuer: security_constants_1.SECURITY_CONSTANTS.JWT.ISSUER,
                                audience: security_constants_1.SECURITY_CONSTANTS.JWT.AUDIENCE,
                            },
                            verifyOptions: {
                                algorithms: ['RS256'],
                                issuer: security_constants_1.SECURITY_CONSTANTS.JWT.ISSUER,
                                audience: security_constants_1.SECURITY_CONSTANTS.JWT.AUDIENCE,
                            },
                        };
                    }
                    else {
                        return {
                            secret: configService.get('master.jwt.secret'),
                            signOptions: {
                                expiresIn: configService.get('master.jwt.expiresIn', '15m'),
                                algorithm: 'HS256',
                                issuer: security_constants_1.SECURITY_CONSTANTS.JWT.ISSUER,
                                audience: security_constants_1.SECURITY_CONSTANTS.JWT.AUDIENCE,
                            },
                        };
                    }
                },
                inject: [config_1.ConfigService],
            }),
            axios_1.HttpModule,
            verify_code_module_1.VerifyCodeModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, local_strategy_1.LocalStrategy, jwt_strategy_1.JwtStrategy, auth_proxy_service_1.AuthProxyService, captcha_service_1.CaptchaService],
        exports: [auth_service_1.AuthService, auth_proxy_service_1.AuthProxyService],
    })
], AuthModule);
