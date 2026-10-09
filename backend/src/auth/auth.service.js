"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/entities/user.entity");
const unified_master_config_1 = require("../config/unified-master.config");
const redis_health_service_1 = require("../redis/redis-health.service");
const configuration = (0, unified_master_config_1.createMasterConfiguration)();
const captcha_service_1 = require("./captcha.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, userRepository, redisHealth, captchaService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.redisHealth = redisHealth;
        this.captchaService = captchaService;
        this.config = (0, unified_master_config_1.createMasterConfiguration)();
    }
    async register(registerData) {
        const redis = this.redisHealth.getClient?.();
        const regFailKey = `auth:reg:fail:${registerData.email}`;
        const threshold = 5;
        const windowSec = 600;
        if (redis) {
            try {
                const fails = parseInt((await redis.get(regFailKey)) || '0', 10);
                if (fails >= threshold) {
                    if (!registerData.captcha_token) {
                        throw new common_1.BadRequestException('需要验证码');
                    }
                    const ok = await this.captchaService.verify(registerData.captcha_token);
                    if (!ok) {
                        throw new common_1.BadRequestException('验证码校验失败');
                    }
                }
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Redis connection error during registration:', error);
            }
        }
        const existingUser = await this.usersService.findByEmail(registerData.email);
        if (existingUser) {
            if (redis) {
                try {
                    await redis.multi().incr(regFailKey).expire(regFailKey, windowSec).exec();
                }
                catch (error) {
                    console.error('Redis connection error during registration:', error);
                }
            }
            throw new common_1.ConflictException('用户已存在');
        }
        const usernameTaken = await this.usersService.isUsernameExists(registerData.username);
        if (usernameTaken) {
            throw new common_1.ConflictException('用户名已被使用');
        }
        const user = await this.usersService.create({
            ...registerData,
            role: user_entity_1.UserRole.USER,
        });
        if (redis) {
            try {
                await redis.del(regFailKey);
            }
            catch (error) {
                console.error('Redis connection error during registration:', error);
            }
        }
        return this.generateTokens(user);
    }
    async login(loginData) {
        const client = this.redisHealth.getClient?.();
        const redis = client?.status === 'ready' ? client : undefined;
        const loginFailKey = `auth:login:fail:${loginData.email}`;
        const windowSec = 600;
        const threshold = 5;
        const user = await this.usersService.findByEmail(loginData.email);
        if (!user) {
            if (redis) {
                await redis.multi().incr(loginFailKey).expire(loginFailKey, windowSec).exec();
            }
            throw new common_1.UnauthorizedException('用户名或密码错误');
        }
        if (redis) {
            const fails = parseInt((await redis.get(loginFailKey)) || '0', 10);
            if (fails >= threshold) {
                if (!loginData.captcha_token) {
                    throw new common_1.BadRequestException('需要验证码');
                }
                const ok = await this.captchaService.verify(loginData.captcha_token);
                if (!ok) {
                    throw new common_1.BadRequestException('验证码校验失败');
                }
            }
        }
        const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
        if (!isPasswordValid) {
            if (redis) {
                await redis.multi().incr(loginFailKey).expire(loginFailKey, windowSec).exec();
            }
            throw new common_1.UnauthorizedException('用户名或密码错误');
        }
        if (redis) {
            await redis.del(loginFailKey);
        }
        return this.generateTokens(user);
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.config.jwt.secret,
            });
            const user = await this.usersService.findById(payload.sub);
            if (!user) {
                throw new common_1.UnauthorizedException('用户不存在');
            }
            return this.generateTokens(user);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('刷新令牌无效');
        }
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign({ ...payload, typ: 'refresh' }, {
            expiresIn: this.config.jwt.refreshExpiresIn,
        });
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 900,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
        };
    }
    async validateToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('令牌无效');
        }
    }
    async changePassword(changePasswordData) {
        const user = await this.usersService.findById(changePasswordData.userId);
        if (!user) {
            throw new common_1.UnauthorizedException('用户不存在');
        }
        const isOldPasswordValid = await bcrypt.compare(changePasswordData.oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new common_1.UnauthorizedException('原密码错误');
        }
        const hashedNewPassword = await bcrypt.hash(changePasswordData.newPassword, 12);
        await this.userRepository.update(changePasswordData.userId, { password: hashedNewPassword });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        typeorm_2.Repository,
        redis_health_service_1.RedisHealthService,
        captcha_service_1.CaptchaService])
], AuthService);
