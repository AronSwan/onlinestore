"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const cart_owner_guard_1 = require("./cart-owner.guard");
function createContext(user, params = { customerUserId: '1' }) {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ user, params }),
        }),
    };
}
describe('CartOwnerGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new cart_owner_guard_1.CartOwnerGuard();
    });
    describe('无认证用户（JwtAuthGuard 未先行执行或被绕过）', () => {
        it('req.user 缺失时抛 401 UnauthorizedException', () => {
            expect(() => guard.canActivate(createContext(undefined))).toThrow(common_1.UnauthorizedException);
        });
        it('req.user 为 null 时抛 401 UnauthorizedException', () => {
            expect(() => guard.canActivate(createContext(null))).toThrow(common_1.UnauthorizedException);
        });
        it('req.user 缺少 sub 时抛 401 UnauthorizedException', () => {
            expect(() => guard.canActivate(createContext({ email: 'a@b.c', role: 'user' }))).toThrow(common_1.UnauthorizedException);
        });
    });
    describe('路径参数与令牌主体不一致', () => {
        it('customerUserId 不等于 sub 时抛 403 ForbiddenException', () => {
            const context = createContext({ sub: 1, email: 'a@b.c', role: 'user' }, {
                customerUserId: '2',
            });
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
            expect(() => guard.canActivate(context)).toThrow(/只能操作本人购物车/);
        });
        it('数字 sub 与他人字符串 id 不匹配时抛 403 ForbiddenException', () => {
            const context = createContext({ sub: 100, email: 'a@b.c', role: 'user' }, {
                customerUserId: '100.0',
            });
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
    });
    describe('路径参数与令牌主体一致', () => {
        it('customerUserId 等于 sub（数字）时放行', () => {
            const context = createContext({ sub: 1, email: 'a@b.c', role: 'user' }, {
                customerUserId: '1',
            });
            expect(guard.canActivate(context)).toBe(true);
        });
        it('sub 为字符串形式（兼容未来载荷变化）时仍可比对放行', () => {
            const context = createContext({ sub: '42', email: 'a@b.c', role: 'user' }, {
                customerUserId: '42',
            });
            expect(guard.canActivate(context)).toBe(true);
        });
    });
    describe('缺参 fail-closed', () => {
        it('路由未携带 customerUserId 参数时抛 403 ForbiddenException', () => {
            const context = createContext({ sub: 1, email: 'a@b.c', role: 'user' }, {});
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
    });
});
