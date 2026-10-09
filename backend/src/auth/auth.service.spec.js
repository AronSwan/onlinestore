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
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcrypt"));
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/entities/user.entity");
const redis_health_service_1 = require("../redis/redis-health.service");
const captcha_service_1 = require("./captcha.service");
const unified_master_config_1 = require("../config/unified-master.config");
const masterConfig = (0, unified_master_config_1.createMasterConfiguration)();
jest.mock('bcrypt');
const mockedBcrypt = bcrypt;
const mockUser = {
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword',
    role: user_entity_1.UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
};
const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    isUsernameExists: jest.fn(),
};
const mockUserRepository = {
    update: jest.fn(),
};
const mockRedisHealthService = {
    getClient: jest.fn(),
};
const mockRedisClient = {
    status: 'ready',
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    multi: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn(),
};
const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
};
const mockCaptchaService = {
    verify: jest.fn(),
};
describe('AuthService', () => {
    let service;
    let usersService;
    let jwtService;
    let userRepository;
    let redisHealth;
    let captchaService;
    const originalEnv = process.env;
    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                {
                    provide: users_service_1.UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(user_entity_1.User),
                    useValue: mockUserRepository,
                },
                {
                    provide: redis_health_service_1.RedisHealthService,
                    useValue: mockRedisHealthService,
                },
                {
                    provide: captcha_service_1.CaptchaService,
                    useValue: mockCaptchaService,
                },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        usersService = module.get(users_service_1.UsersService);
        jwtService = module.get(jwt_1.JwtService);
        userRepository = module.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
        redisHealth = module.get(redis_health_service_1.RedisHealthService);
        captchaService = module.get(captcha_service_1.CaptchaService);
        Object.values(mockUsersService).forEach(mock => mock.mockReset());
        Object.values(mockUserRepository).forEach(mock => mock.mockReset());
        Object.values(mockRedisHealthService).forEach(mock => mock.mockReset());
        Object.values(mockJwtService).forEach(mock => mock.mockReset());
        Object.values(mockCaptchaService).forEach(mock => mock.mockReset());
        Object.values(mockRedisClient).forEach(mock => typeof mock?.mockReset === 'function' && mock.mockReset());
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });
        it('should have all dependencies injected', () => {
            expect(usersService).toBeDefined();
            expect(jwtService).toBeDefined();
            expect(userRepository).toBeDefined();
            expect(redisHealth).toBeDefined();
            expect(captchaService).toBeDefined();
        });
    });
    describe('Register', () => {
        const registerData = {
            email: 'test@example.com',
            password: 'password123',
            username: 'testuser',
        };
        it('should successfully register a new user', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('0');
            const result = await service.register(registerData);
            expect(result).toEqual({
                access_token: 'accessToken',
                refresh_token: 'accessToken',
                expires_in: 900,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    username: mockUser.username,
                    role: mockUser.role,
                },
            });
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerData.email);
            expect(mockedBcrypt.hash).not.toHaveBeenCalled();
            expect(mockUsersService.create).toHaveBeenCalledWith({
                ...registerData,
                role: user_entity_1.UserRole.USER,
            });
        });
        it('should throw ConflictException when user already exists', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('0');
            mockRedisClient.multi.mockReturnValue(mockRedisClient);
            mockRedisClient.incr.mockReturnValue(mockRedisClient);
            mockRedisClient.expire.mockReturnValue(mockRedisClient);
            mockRedisClient.exec.mockResolvedValue(['OK']);
            await expect(service.register(registerData)).rejects.toThrow(common_1.ConflictException);
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerData.email);
        });
        it('should throw ConflictException when username is already taken', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.isUsernameExists.mockResolvedValue(true);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('0');
            await expect(service.register(registerData)).rejects.toThrow('用户名已被使用');
            expect(mockUsersService.isUsernameExists).toHaveBeenCalledWith(registerData.username);
            expect(mockUsersService.create).not.toHaveBeenCalled();
        });
        it('should require captcha when registration fails exceed threshold', async () => {
            const registerDataWithCaptcha = {
                ...registerData,
                captcha_token: 'valid_captcha_token',
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('5');
            mockRedisClient.multi.mockReturnValue(mockRedisClient);
            mockRedisClient.incr.mockReturnValue(mockRedisClient);
            mockRedisClient.expire.mockReturnValue(mockRedisClient);
            mockRedisClient.exec.mockResolvedValue(['OK']);
            mockCaptchaService.verify.mockResolvedValue(true);
            await expect(service.register(registerDataWithCaptcha)).rejects.toThrow(common_1.ConflictException);
            expect(mockCaptchaService.verify).toHaveBeenCalledWith('valid_captcha_token');
        });
        it('should throw BadRequestException when captcha is required but not provided', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('5');
            await expect(service.register(registerData)).rejects.toThrow(common_1.BadRequestException);
            expect(mockCaptchaService.verify).not.toHaveBeenCalled();
        });
        it('should throw BadRequestException when captcha verification fails', async () => {
            const registerDataWithCaptcha = {
                ...registerData,
                captcha_token: 'invalid_captcha_token',
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('5');
            mockCaptchaService.verify.mockResolvedValue(false);
            await expect(service.register(registerDataWithCaptcha)).rejects.toThrow(common_1.BadRequestException);
        });
        it('should clear registration failure counter on successful registration', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('3');
            mockRedisClient.del.mockResolvedValue(1);
            await service.register(registerData);
            expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:reg:fail:${registerData.email}`);
        });
        it('should handle registration without Redis', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(undefined);
            const result = await service.register(registerData);
            expect(result).toBeDefined();
            expect(mockUsersService.create).toHaveBeenCalledWith({
                ...registerData,
                role: user_entity_1.UserRole.USER,
            });
        });
    });
    describe('Login', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'password123',
        };
        it('should successfully login with valid credentials', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('0');
            const result = await service.login(loginData);
            expect(result).toEqual({
                access_token: 'accessToken',
                refresh_token: 'accessToken',
                expires_in: 900,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    username: mockUser.username,
                    role: mockUser.role,
                },
            });
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginData.email);
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
        });
        it('should throw UnauthorizedException when user does not exist', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.multi.mockReturnValue(mockRedisClient);
            mockRedisClient.incr.mockReturnValue(mockRedisClient);
            mockRedisClient.expire.mockReturnValue(mockRedisClient);
            mockRedisClient.exec.mockResolvedValue(['OK']);
            await expect(service.login(loginData)).rejects.toThrow(common_1.UnauthorizedException);
            expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginData.email);
        });
        it('should throw UnauthorizedException when password is invalid', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(false);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.multi.mockReturnValue(mockRedisClient);
            mockRedisClient.incr.mockReturnValue(mockRedisClient);
            mockRedisClient.expire.mockReturnValue(mockRedisClient);
            mockRedisClient.exec.mockResolvedValue(['OK']);
            await expect(service.login(loginData)).rejects.toThrow(common_1.UnauthorizedException);
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
        });
        it('should require captcha when login failures exceed threshold', async () => {
            const loginDataWithCaptcha = {
                ...loginData,
                captcha_token: 'valid_captcha_token',
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('5');
            mockCaptchaService.verify.mockResolvedValue(true);
            mockJwtService.sign.mockReturnValue('accessToken');
            const result = await service.login(loginDataWithCaptcha);
            expect(result).toBeDefined();
            expect(mockCaptchaService.verify).toHaveBeenCalledWith('valid_captcha_token');
        });
        it('should throw BadRequestException when captcha is required but not provided', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('5');
            await expect(service.login(loginData)).rejects.toThrow(common_1.BadRequestException);
        });
        it('should clear login failure counter on successful login', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('3');
            mockRedisClient.del.mockResolvedValue(1);
            await service.login(loginData);
            expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:login:fail:${loginData.email}`);
        });
        it('should handle login without Redis', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(undefined);
            const result = await service.login(loginData);
            expect(result).toBeDefined();
        });
    });
    describe('RefreshToken', () => {
        const refreshToken = 'valid_refresh_token';
        const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };
        it('should successfully refresh token with valid refresh token', async () => {
            mockJwtService.verify.mockReturnValue(payload);
            mockUsersService.findById.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('newAccessToken');
            const result = await service.refreshToken(refreshToken);
            expect(result).toEqual({
                access_token: 'newAccessToken',
                refresh_token: 'newAccessToken',
                expires_in: 900,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    username: mockUser.username,
                    role: mockUser.role,
                },
            });
            expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
                secret: masterConfig.jwt.secret,
            });
            expect(mockUsersService.findById).toHaveBeenCalledWith(payload.sub);
        });
        it('should throw UnauthorizedException when refresh token is invalid', async () => {
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await expect(service.refreshToken(refreshToken)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException when user does not exist', async () => {
            mockJwtService.verify.mockReturnValue(payload);
            mockUsersService.findById.mockResolvedValue(null);
            await expect(service.refreshToken(refreshToken)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('ValidateToken', () => {
        const validToken = 'valid_token';
        it('should successfully validate a valid token', async () => {
            const payload = { sub: 1, email: 'test@example.com' };
            mockJwtService.verify.mockReturnValue(payload);
            const result = await service.validateToken(validToken);
            expect(result).toEqual(payload);
            expect(mockJwtService.verify).toHaveBeenCalledWith(validToken);
        });
        it('should throw UnauthorizedException when token is invalid', async () => {
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await expect(service.validateToken(validToken)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('ChangePassword', () => {
        const changePasswordData = {
            userId: 1,
            oldPassword: 'oldPassword123',
            newPassword: 'newPassword123',
        };
        it('should successfully change password', async () => {
            mockUsersService.findById.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockedBcrypt.hash.mockResolvedValue('newHashedPassword');
            mockUserRepository.update.mockResolvedValue({ affected: 1 });
            await service.changePassword(changePasswordData);
            expect(mockUsersService.findById).toHaveBeenCalledWith(changePasswordData.userId);
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(changePasswordData.oldPassword, mockUser.password);
            expect(mockedBcrypt.hash).toHaveBeenCalledWith(changePasswordData.newPassword, 12);
            expect(mockUserRepository.update).toHaveBeenCalledWith(changePasswordData.userId, {
                password: 'newHashedPassword',
            });
        });
        it('should throw UnauthorizedException when user does not exist', async () => {
            mockUsersService.findById.mockResolvedValue(null);
            await expect(service.changePassword(changePasswordData)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException when old password is invalid', async () => {
            mockUsersService.findById.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(false);
            await expect(service.changePassword(changePasswordData)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('GenerateTokens', () => {
        it('should generate correct token response', async () => {
            mockJwtService.sign.mockReturnValue('accessToken');
            const result = await service.generateTokens(mockUser);
            expect(result).toEqual({
                access_token: 'accessToken',
                refresh_token: 'accessToken',
                expires_in: 900,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    username: mockUser.username,
                    role: mockUser.role,
                },
            });
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                sub: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
            });
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                typ: 'refresh',
                sub: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
            }, {
                expiresIn: masterConfig.jwt.refreshExpiresIn,
            });
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete registration and login workflow', async () => {
            const registerData = {
                email: 'newuser@example.com',
                password: 'password123',
                username: 'newuser',
            };
            const loginData = {
                email: 'newuser@example.com',
                password: 'password123',
            };
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockedBcrypt.hash.mockResolvedValue('hashedPassword');
            mockUsersService.create.mockResolvedValue({
                ...mockUser,
                email: 'newuser@example.com',
                username: 'newuser',
            });
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('0');
            const registerResult = await service.register(registerData);
            expect(registerResult).toBeDefined();
            mockUsersService.findByEmail.mockResolvedValue({
                ...mockUser,
                email: 'newuser@example.com',
                username: 'newuser',
            });
            mockedBcrypt.compare.mockResolvedValue(true);
            mockRedisClient.get.mockResolvedValue('0');
            const loginResult = await service.login(loginData);
            expect(loginResult).toBeDefined();
            mockJwtService.verify.mockReturnValue({
                sub: mockUser.id,
                email: 'newuser@example.com',
                role: mockUser.role,
            });
            mockUsersService.findById.mockResolvedValue({
                ...mockUser,
                email: 'newuser@example.com',
                username: 'newuser',
            });
            const refreshResult = await service.refreshToken('valid_refresh_token');
            expect(refreshResult).toBeDefined();
        });
        it('should handle rate limiting scenarios', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(false);
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockResolvedValue('4');
            mockRedisClient.multi.mockReturnValue(mockRedisClient);
            mockRedisClient.incr.mockReturnValue(mockRedisClient);
            mockRedisClient.expire.mockReturnValue(mockRedisClient);
            mockRedisClient.exec.mockResolvedValue(['OK']);
            await expect(service.login(loginData)).rejects.toThrow(common_1.UnauthorizedException);
            mockRedisClient.get.mockResolvedValue('5');
            await expect(service.login(loginData)).rejects.toThrow(common_1.BadRequestException);
        });
    });
    describe('Error Handling', () => {
        it('should handle Redis connection errors gracefully', async () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            };
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('accessToken');
            mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
            mockRedisClient.get.mockImplementation(() => {
                throw new Error('Redis connection failed');
            });
            mockRedisClient.del.mockResolvedValue(1);
            const result = await service.register(registerData);
            expect(result).toBeDefined();
        });
        it('should handle bcrypt errors gracefully', async () => {
            const registerData = {
                email: 'test@example.com',
                password: 'password123',
                username: 'testuser',
            };
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.create.mockRejectedValue(new Error('Bcrypt error'));
            await expect(service.register(registerData)).rejects.toThrow();
        });
        it('should handle JWT errors gracefully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockJwtService.sign.mockImplementation(() => {
                throw new Error('JWT error');
            });
            await expect(service.login(loginData)).rejects.toThrow();
        });
    });
});
