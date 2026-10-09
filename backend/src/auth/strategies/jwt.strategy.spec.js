"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const jwt_strategy_1 = require("./jwt.strategy");
describe('JwtStrategy', () => {
    let strategy;
    let usersService;
    const nowSec = Math.floor(Date.now() / 1000);
    const validPayload = {
        sub: 42,
        email: 'user@example.com',
        role: 'user',
        iat: nowSec,
        exp: nowSec + 900,
    };
    beforeEach(() => {
        usersService = { findById: jest.fn() };
        const configService = {
            get: jest.fn((key, defaultValue) => {
                if (key === 'master.jwt.algorithm')
                    return 'HS256';
                if (key === 'master.jwt.secret')
                    return 'unit-test-secret-0123456789abcdef0123456789';
                return defaultValue;
            }),
        };
        strategy = new jwt_strategy_1.JwtStrategy(usersService, configService);
    });
    it('载荷合法且用户存在 → 返回 { sub, email, role }', async () => {
        usersService.findById.mockResolvedValue({
            id: 42,
            email: 'user@example.com',
            isActive: true,
            role: 'user',
        });
        await expect(strategy.validate(validPayload)).resolves.toEqual({
            sub: 42,
            email: 'user@example.com',
            role: 'user',
        });
        expect(usersService.findById).toHaveBeenCalledWith(42);
    });
    it('用户不存在 → 抛 UnauthorizedException（用户不存在）', async () => {
        usersService.findById.mockResolvedValue(null);
        await expect(strategy.validate(validPayload)).rejects.toThrow('用户不存在');
    });
    it('用户被禁用 → 抛 UnauthorizedException', async () => {
        usersService.findById.mockResolvedValue({ id: 42, isActive: false });
        await expect(strategy.validate(validPayload)).rejects.toThrow(common_1.UnauthorizedException);
    });
    it.each([
        ['payload 为空', undefined],
        ['sub 非正数', { ...validPayload, sub: 0 }],
        ['sub 类型错误', { ...validPayload, sub: '42' }],
        ['email 缺失', { ...validPayload, email: undefined }],
        ['email 格式非法', { ...validPayload, email: 'not-an-email' }],
        ['role 非法', { ...validPayload, role: 'superuser' }],
        ['exp 缺失', { ...validPayload, exp: undefined }],
        ['exp 已过期', { ...validPayload, exp: nowSec - 10 }],
    ])('%s → 抛 UnauthorizedException（无效的JWT载荷）', async (_name, payload) => {
        await expect(strategy.validate(payload)).rejects.toThrow('无效的JWT载荷');
        expect(usersService.findById).not.toHaveBeenCalled();
    });
    it("typ='refresh' 的载荷 → 抛 UnauthorizedException（刷新令牌不能用于接口访问）", async () => {
        await expect(strategy.validate({ ...validPayload, typ: 'refresh' })).rejects.toThrow('刷新令牌不能用于接口访问');
        expect(usersService.findById).not.toHaveBeenCalled();
    });
});
