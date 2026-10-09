"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
describe('JwtAuthGuard', () => {
    let guard;
    let reflector;
    const createMockContext = (headers = {}) => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ headers }),
                getResponse: () => ({}),
            }),
            getHandler: jest.fn(),
            getClass: jest.fn(),
        };
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                jwt_auth_guard_1.JwtAuthGuard,
                {
                    provide: core_1.Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                        get: jest.fn(),
                        getAll: jest.fn(),
                        getAllAndMerge: jest.fn(),
                    },
                },
            ],
        }).compile();
        guard = module.get(jwt_auth_guard_1.JwtAuthGuard);
        reflector = module.get(core_1.Reflector);
    });
    describe('token extraction through canActivate', () => {
        it('should throw UnauthorizedException for missing authorization header', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
            const context = createMockContext({});
            try {
                await guard.canActivate(context);
                fail('Expected UnauthorizedException to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.UnauthorizedException);
                expect(error.message).toBe('JWT令牌缺失');
            }
        });
        it('should throw UnauthorizedException for invalid token format', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
            const context = createMockContext({ authorization: 'InvalidFormat' });
            try {
                await guard.canActivate(context);
                fail('Expected UnauthorizedException to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.UnauthorizedException);
                expect(error.message).toBe('JWT令牌缺失');
            }
        });
        it('should throw UnauthorizedException for missing Bearer prefix', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
            const context = createMockContext({ authorization: 'Token abc123' });
            try {
                await guard.canActivate(context);
                fail('Expected UnauthorizedException to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.UnauthorizedException);
                expect(error.message).toBe('JWT令牌缺失');
            }
        });
        it('should throw UnauthorizedException for Bearer without token', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
            const context = createMockContext({ authorization: 'Bearer' });
            try {
                await guard.canActivate(context);
                fail('Expected UnauthorizedException to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.UnauthorizedException);
                expect(error.message).toBe('JWT令牌缺失');
            }
        });
    });
    describe('canActivate', () => {
        it('should return true for public routes', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
            const context = createMockContext();
            const result = await guard.canActivate(context);
            expect(result).toBe(true);
        });
        it('should throw UnauthorizedException when no authorization header is present', async () => {
            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
            const context = createMockContext({});
            try {
                await guard.canActivate(context);
                fail('Expected UnauthorizedException to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.UnauthorizedException);
                expect(error.message).toBe('JWT令牌缺失');
            }
        });
    });
    describe('handleRequest', () => {
        it('should throw UnauthorizedException for expired token', () => {
            const info = { name: 'TokenExpiredError' };
            expect(() => guard.handleRequest(null, null, info)).toThrow(common_1.UnauthorizedException);
            expect(() => guard.handleRequest(null, null, info)).toThrow('JWT令牌已过期');
        });
        it('should throw UnauthorizedException for invalid token', () => {
            const info = { name: 'JsonWebTokenError' };
            expect(() => guard.handleRequest(null, null, info)).toThrow(common_1.UnauthorizedException);
            expect(() => guard.handleRequest(null, null, info)).toThrow('无效的JWT令牌');
        });
        it('should throw UnauthorizedException for not-yet-active token', () => {
            const info = { name: 'NotBeforeError' };
            expect(() => guard.handleRequest(null, null, info)).toThrow(common_1.UnauthorizedException);
            expect(() => guard.handleRequest(null, null, info)).toThrow('JWT令牌尚未生效');
        });
        it('should return user for valid token', () => {
            const user = { id: 1, email: 'test@example.com' };
            const result = guard.handleRequest(null, user, null);
            expect(result).toBe(user);
        });
        it('should throw generic UnauthorizedException for other errors', () => {
            expect(() => guard.handleRequest(new Error('Some error'), null, null)).toThrow(common_1.UnauthorizedException);
            expect(() => guard.handleRequest(new Error('Some error'), null, null)).toThrow('认证失败');
        });
    });
});
