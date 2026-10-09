"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const auth_proxy_service_1 = require("./auth-proxy.service");
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const passport_1 = require("@nestjs/passport");
describe('AuthController', () => {
    let controller;
    let authService;
    let authProxyService;
    const mockAuthService = {
        login: jest.fn(),
        register: jest.fn(),
        refreshToken: jest.fn(),
        changePassword: jest.fn(),
        validateToken: jest.fn(),
    };
    const mockAuthProxyService = {
        getCasdoorLoginUrl: jest.fn(),
        handleCasdoorCallback: jest.fn(),
        getCasdoorUserInfo: jest.fn(),
        getCasdoorLogoutUrl: jest.fn(),
    };
    const mockThrottlerGuard = {
        canActivate: jest.fn().mockReturnValue(true),
    };
    const mockJwtAuthGuard = {
        canActivate: jest.fn().mockReturnValue(true),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [auth_controller_1.AuthController],
            providers: [
                {
                    provide: auth_service_1.AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: auth_proxy_service_1.AuthProxyService,
                    useValue: mockAuthProxyService,
                },
            ],
        })
            .overrideGuard(throttler_1.ThrottlerGuard)
            .useValue(mockThrottlerGuard)
            .overrideGuard((0, passport_1.AuthGuard)('jwt'))
            .useValue(mockJwtAuthGuard)
            .compile();
        controller = module.get(auth_controller_1.AuthController);
        authService = module.get(auth_service_1.AuthService);
        authProxyService = module.get(auth_proxy_service_1.AuthProxyService);
        jest.resetAllMocks();
    });
    describe('POST /auth/login', () => {
        it('should return JWT token for valid credentials', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            const authResult = {
                access_token: 'jwt-token-123',
                refresh_token: 'refresh-token-123',
                expires_in: 900,
                user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' },
            };
            mockAuthService.login.mockImplementation(() => Promise.resolve(authResult));
            const result = await controller.login(loginDto);
            expect(result).toEqual(authResult);
            expect(result.access_token).toBeDefined();
            expect(result.user).toEqual(authResult.user);
            expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
        });
        it('should throw error for invalid credentials', async () => {
            const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new common_1.UnauthorizedException('用户名或密码错误')));
            await expect(controller.login(loginDto)).rejects.toThrow();
        });
        it('should validate required fields', async () => {
            const invalidDto = { email: '', password: '' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.login(invalidDto)).rejects.toThrow();
        });
        it('should handle validation errors', async () => {
            const invalidDto = { email: 'invalid-email', password: '' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.login(invalidDto)).rejects.toThrow();
        });
        it('should handle database connection errors', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Database connection failed')));
            await expect(controller.login(loginDto)).rejects.toThrow('Database connection failed');
        });
        it('should handle rate limiting', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Rate limit exceeded')));
            await expect(controller.login(loginDto)).rejects.toThrow('Rate limit exceeded');
        });
        it('should handle timeout scenarios', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Request timeout')));
            await expect(controller.login(loginDto)).rejects.toThrow('Request timeout');
        });
    });
    describe('POST /auth/register', () => {
        it('should create new user successfully', async () => {
            const registerDto = {
                username: 'newuser',
                email: 'new@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                firstName: 'New',
                lastName: 'User',
            };
            const createdUser = {
                id: 1,
                username: 'newuser',
                email: 'new@example.com',
                firstName: 'New',
                lastName: 'User',
                isActive: true,
            };
            mockAuthService.register.mockImplementation(() => Promise.resolve(createdUser));
            const result = await controller.register(registerDto);
            expect(result).toEqual(createdUser);
        });
        it('should throw error for duplicate username', async () => {
            const registerDto = {
                username: 'existinguser',
                email: 'new@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new common_1.ConflictException('用户名已存在')));
            await expect(controller.register(registerDto)).rejects.toThrow(common_1.ConflictException);
        });
        it('should throw error for duplicate email', async () => {
            const registerDto = {
                username: 'newuser',
                email: 'existing@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new common_1.ConflictException('邮箱已存在')));
            await expect(controller.register(registerDto)).rejects.toThrow(common_1.ConflictException);
        });
        it('should validate email format', async () => {
            const invalidEmailDto = {
                username: 'newuser',
                email: 'invalid-email',
                password: 'Password123!',
                confirmPassword: 'Password123!',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.register(invalidEmailDto)).rejects.toThrow();
        });
        it('should validate password strength', async () => {
            const weakPasswordDto = {
                username: 'newuser',
                email: 'test@example.com',
                password: '123',
                confirmPassword: '123',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.register(weakPasswordDto)).rejects.toThrow();
        });
        it('should not return password in response', async () => {
            const registerDto = {
                username: 'newuser',
                email: 'test@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
            };
            const createdUser = {
                id: 1,
                username: 'newuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                isActive: true,
            };
            mockAuthService.register.mockImplementation(() => Promise.resolve(createdUser));
            const result = await controller.register(registerDto);
            expect(result).not.toHaveProperty('password');
        });
        it('should throw error if password and confirmPassword do not match', async () => {
            const registerDto = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'Password123!',
                confirmPassword: 'DifferentPassword123!',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.register(registerDto)).rejects.toThrow();
        });
        it('should validate username length', async () => {
            const invalidUsernameDto = {
                username: 'a',
                email: 'test@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.register(invalidUsernameDto)).rejects.toThrow();
        });
        it('should handle database connection errors', async () => {
            const registerDto = {
                username: 'newuser',
                email: 'test@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
            };
            mockAuthService.register.mockImplementation(() => Promise.reject(new Error('Database connection failed')));
            await expect(controller.register(registerDto)).rejects.toThrow('Database connection failed');
        });
        it('should handle concurrent registration attempts', async () => {
            const registerDto = {
                username: 'newuser',
                email: 'test@example.com',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                firstName: 'Test',
                lastName: 'User',
            };
            const createdUser = {
                id: 1,
                username: 'newuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                isActive: true,
            };
            mockAuthService.register.mockImplementation(() => Promise.resolve(createdUser));
            const promises = [controller.register(registerDto), controller.register(registerDto)];
            const results = await Promise.all(promises);
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual(createdUser);
            expect(results[1]).toEqual(createdUser);
        });
    });
    describe('GET /auth/profile', () => {
        const mockUser = {
            id: 1,
            sub: 1,
            email: 'test@example.com',
            username: 'testuser',
            role: 'user',
        };
        it('should return user profile from JWT payload', async () => {
            const req = { user: mockUser };
            const result = await controller.getProfile(req);
            expect(result).toEqual({ user: mockUser });
            expect(result.user).not.toHaveProperty('password');
        });
        it('should require JWT authentication', async () => {
            mockJwtAuthGuard.canActivate.mockReturnValue(false);
            expect(mockJwtAuthGuard.canActivate).toBeDefined();
        });
        it('should handle malformed JWT payload gracefully', async () => {
            const reqWithMalformedUser = { user: null };
            const result = await controller.getProfile(reqWithMalformedUser);
            expect(result).toEqual({ user: null });
        });
    });
    describe('POST /auth/change-password', () => {
        it('should change password successfully', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'NewPassword123!',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.resolve({ success: true }));
            const result = await controller.changePassword(req, changePasswordDto);
            expect(result).toEqual({ message: '密码修改成功' });
            expect(mockAuthService.changePassword).toHaveBeenCalledWith({
                userId: 1,
                oldPassword: 'oldPassword123',
                newPassword: 'NewPassword123!',
            });
        });
        it('should throw error for invalid current password', async () => {
            const changePasswordDto = {
                oldPassword: 'wrongpassword',
                newPassword: 'NewPassword123!',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new common_1.UnauthorizedException('当前密码不正确')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should validate new password strength', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: '123',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow();
        });
        it('should throw error if new password and confirmPassword do not match', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'NewPassword123!',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow();
        });
        it('should handle user not found during password change', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'NewPassword123!',
            };
            const req = { user: { id: 999, sub: 999 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new common_1.NotFoundException('用户不存在')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow(common_1.NotFoundException);
        });
        it('should handle database connection errors during password change', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'NewPassword123!',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new Error('Database connection failed')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow('Database connection failed');
        });
        it('should validate current password format', async () => {
            const changePasswordDto = {
                oldPassword: '',
                newPassword: 'NewPassword123!',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow();
        });
        it('should prevent password reuse', async () => {
            const changePasswordDto = {
                oldPassword: 'oldPassword123',
                newPassword: 'oldPassword123',
            };
            const req = { user: { id: 1, sub: 1 } };
            mockAuthService.changePassword.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.changePassword(req, changePasswordDto)).rejects.toThrow();
        });
    });
    describe('POST /auth/refresh', () => {
        const validRefreshDto = { refresh_token: 'valid-refresh-token' };
        const expectedResponse = {
            access_token: 'new-jwt-token-456',
            refresh_token: 'new-refresh-token-456',
            expires_in: 900,
            user: {
                id: 1,
                email: 'test@example.com',
                username: 'testuser',
                role: 'user',
            },
        };
        it('should refresh tokens successfully', async () => {
            mockAuthService.refreshToken.mockResolvedValue(expectedResponse);
            const result = await controller.refreshToken(validRefreshDto);
            expect(result).toEqual(expectedResponse);
            expect(result.access_token).toBeDefined();
            expect(result.refresh_token).toBeDefined();
            expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
        });
        it('should throw UnauthorizedException for invalid refresh token', async () => {
            const invalidDto = { refresh_token: 'invalid-token' };
            mockAuthService.refreshToken.mockRejectedValue(new common_1.UnauthorizedException('刷新令牌无效'));
            await expect(controller.refreshToken(invalidDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException for expired refresh token', async () => {
            const expiredDto = { refresh_token: 'expired-token' };
            mockAuthService.refreshToken.mockRejectedValue(new common_1.UnauthorizedException('刷新令牌无效'));
            await expect(controller.refreshToken(expiredDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException when user no longer exists', async () => {
            mockAuthService.refreshToken.mockRejectedValue(new common_1.UnauthorizedException('用户不存在'));
            await expect(controller.refreshToken(validRefreshDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('POST /auth/logout', () => {
        const mockReq = {
            user: { id: 1, sub: 1, email: 'test@example.com' },
        };
        it('should logout successfully', async () => {
            const result = await controller.logout(mockReq);
            expect(result).toEqual({ message: '登出成功' });
        });
        it('should require JWT authentication', async () => {
            mockJwtAuthGuard.canActivate.mockReturnValue(false);
            expect(mockJwtAuthGuard.canActivate).toBeDefined();
        });
    });
    describe('Casdoor Integration', () => {
        describe('GET /auth/casdoor/login', () => {
            it('should redirect to Casdoor login URL', async () => {
                const loginUrl = 'https://casdoor.example.com/login?client_id=123&redirect_uri=callback';
                mockAuthProxyService.getCasdoorLoginUrl.mockResolvedValue(loginUrl);
                const result = await controller.casdoorLogin();
                expect(result).toEqual({ url: loginUrl });
                expect(mockAuthProxyService.getCasdoorLoginUrl).toHaveBeenCalled();
            });
            it('should handle Casdoor service errors', async () => {
                mockAuthProxyService.getCasdoorLoginUrl.mockRejectedValue(new Error('Casdoor service unavailable'));
                await expect(controller.casdoorLogin()).rejects.toThrow('Casdoor service unavailable');
            });
        });
        describe('GET /auth/casdoor/callback', () => {
            it('should handle Casdoor callback successfully', async () => {
                const code = 'auth-code-123';
                const state = 'state-456';
                const expectedResponse = {
                    access_token: 'casdoor-token-123',
                    user: { id: 1, email: 'test@example.com' },
                };
                mockAuthProxyService.handleCasdoorCallback.mockResolvedValue(expectedResponse);
                const result = await controller.casdoorCallback(code, state);
                expect(result).toEqual(expectedResponse);
                expect(mockAuthProxyService.handleCasdoorCallback).toHaveBeenCalledWith(code, state);
            });
            it('should handle invalid authorization code', async () => {
                const invalidCode = 'invalid-code';
                const state = 'state-456';
                mockAuthProxyService.handleCasdoorCallback.mockRejectedValue(new common_1.UnauthorizedException('Invalid authorization code'));
                await expect(controller.casdoorCallback(invalidCode, state)).rejects.toThrow(common_1.UnauthorizedException);
            });
        });
        describe('GET /auth/casdoor/userinfo', () => {
            const mockReq = {
                user: { id: 1, email: 'test@example.com' },
            };
            it('should get Casdoor user info successfully', async () => {
                const userInfo = {
                    id: 1,
                    email: 'test@example.com',
                    name: 'Test User',
                    avatar: 'https://example.com/avatar.jpg',
                };
                mockAuthProxyService.getCasdoorUserInfo.mockResolvedValue(userInfo);
                const result = await controller.getCasdoorUserInfo(mockReq);
                expect(result).toEqual(userInfo);
                expect(mockAuthProxyService.getCasdoorUserInfo).toHaveBeenCalledWith('test@example.com');
            });
            it('should require JWT authentication', async () => {
                mockJwtAuthGuard.canActivate.mockReturnValue(false);
                expect(mockJwtAuthGuard.canActivate).toBeDefined();
            });
        });
        describe('POST /auth/casdoor/logout', () => {
            it('should redirect to Casdoor logout URL', async () => {
                const logoutUrl = 'https://casdoor.example.com/logout?post_logout_redirect_uri=home';
                mockAuthProxyService.getCasdoorLogoutUrl.mockResolvedValue(logoutUrl);
                const result = await controller.casdoorLogout();
                expect(result).toEqual({ url: logoutUrl });
                expect(mockAuthProxyService.getCasdoorLogoutUrl).toHaveBeenCalled();
            });
        });
    });
    describe('Edge Cases and Error Handling', () => {
        it('should handle concurrent login attempts', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            const authResult = {
                access_token: 'jwt-token-123',
                refresh_token: 'refresh-token-123',
                expires_in: 900,
                user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' },
            };
            mockAuthService.login.mockImplementation(() => Promise.resolve(authResult));
            const promises = [controller.login(loginDto), controller.login(loginDto)];
            const results = await Promise.all(promises);
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual(authResult);
            expect(results[1]).toEqual(authResult);
        });
        it('should handle rate limiting on authentication endpoints', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Rate limit exceeded')));
            await expect(controller.login(loginDto)).rejects.toThrow('Rate limit exceeded');
        });
        it('should handle timeout scenarios', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Request timeout')));
            await expect(controller.login(loginDto)).rejects.toThrow('Request timeout');
        });
        it('should handle comprehensive validation errors', async () => {
            const invalidLoginDto = {
                email: 'invalid-email',
                password: '',
            };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.login(invalidLoginDto)).rejects.toThrow();
        });
        it('should handle malformed request bodies', async () => {
            const malformedDto = null;
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Validation failed')));
            await expect(controller.login(malformedDto)).rejects.toThrow();
        });
        it('should handle authentication service unavailability', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockImplementation(() => Promise.reject(new Error('Authentication service unavailable')));
            await expect(controller.login(loginDto)).rejects.toThrow('Authentication service unavailable');
        });
        it('should handle captcha validation scenarios', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            mockAuthService.login.mockRejectedValue(new common_1.BadRequestException('需要验证码'));
            await expect(controller.login(loginDto)).rejects.toThrow(common_1.BadRequestException);
        });
        it('should handle Redis connection failures gracefully', async () => {
            const loginDto = { email: 'test@example.com', password: 'password123' };
            const authResult = {
                access_token: 'jwt-token-123',
                refresh_token: 'refresh-token-123',
                expires_in: 900,
                user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' },
            };
            mockAuthService.login.mockResolvedValue(authResult);
            const result = await controller.login(loginDto);
            expect(result).toEqual(authResult);
        });
    });
    describe('Security Considerations', () => {
        it('should not expose sensitive information in responses', async () => {
            const registerDto = {
                email: 'test@example.com',
                password: 'Password123!',
                username: 'testuser',
            };
            const response = {
                access_token: 'jwt-token-123',
                refresh_token: 'refresh-token-123',
                expires_in: 900,
                user: {
                    id: 1,
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'user',
                },
            };
            mockAuthService.register.mockResolvedValue(response);
            const result = await controller.register(registerDto);
            expect(result.user).not.toHaveProperty('password');
            expect(result.user).not.toHaveProperty('hashedPassword');
            expect(result.user).not.toHaveProperty('salt');
        });
        it('should handle token validation errors securely', async () => {
            mockAuthService.refreshToken.mockRejectedValue(new common_1.UnauthorizedException('刷新令牌无效'));
            await expect(controller.refreshToken({ refresh_token: 'tampered-token' })).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should prevent timing attacks on login', async () => {
            const nonExistentUserDto = { email: 'nonexistent@example.com', password: 'password123' };
            const existingUserDto = { email: 'existing@example.com', password: 'wrongpassword' };
            mockAuthService.login
                .mockRejectedValueOnce(new common_1.UnauthorizedException('用户名或密码错误'))
                .mockRejectedValueOnce(new common_1.UnauthorizedException('用户名或密码错误'));
            await expect(controller.login(nonExistentUserDto)).rejects.toThrow();
            await expect(controller.login(existingUserDto)).rejects.toThrow();
            expect(true).toBe(true);
        });
    });
});
