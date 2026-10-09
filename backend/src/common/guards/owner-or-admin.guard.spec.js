"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const owner_or_admin_guard_1 = require("./owner-or-admin.guard");
describe('OwnerOrAdminGuard', () => {
    let guard;
    let reflector;
    const buildContext = (user, params) => {
        const request = { user, params };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: () => jest.fn(),
            getClass: () => jest.fn(),
        };
    };
    beforeEach(() => {
        reflector = { getAllAndOverride: jest.fn() };
        guard = new owner_or_admin_guard_1.OwnerOrAdminGuard(reflector);
    });
    it('admin 直接放行（不看路径参数）', () => {
        reflector.getAllAndOverride.mockReturnValue('userId');
        expect(guard.canActivate(buildContext({ sub: 1, role: 'admin' }, { userId: '999' }))).toBe(true);
    });
    it('本人（sub 与路径参数一致）放行', () => {
        reflector.getAllAndOverride.mockReturnValue('userId');
        expect(guard.canActivate(buildContext({ sub: 42, role: 'user' }, { userId: '42' }))).toBe(true);
    });
    it('他人资源拒绝 403（数字与字符串严格比对）', () => {
        reflector.getAllAndOverride.mockReturnValue('userId');
        expect(() => guard.canActivate(buildContext({ sub: 42, role: 'user' }, { userId: '999' }))).toThrow(common_1.ForbiddenException);
    });
    it('无认证用户拒绝 401（fail-closed）', () => {
        reflector.getAllAndOverride.mockReturnValue('userId');
        expect(() => guard.canActivate(buildContext(undefined, { userId: '1' }))).toThrow(common_1.UnauthorizedException);
    });
    it('路径参数缺失拒绝 403', () => {
        reflector.getAllAndOverride.mockReturnValue('userId');
        expect(() => guard.canActivate(buildContext({ sub: 1, role: 'user' }, {}))).toThrow(common_1.ForbiddenException);
    });
    it('未声明 @OwnerParam 时显式拒绝（接线错误可见，无静默默认）', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        expect(() => guard.canActivate(buildContext({ sub: 7, role: 'user' }, { id: '7' }))).toThrow(common_1.ForbiddenException);
    });
    it('moderator 不给旁路（从严，非 admin 即走归属比对）', () => {
        reflector.getAllAndOverride.mockReturnValue('id');
        expect(() => guard.canActivate(buildContext({ sub: 1, role: 'moderator' }, { id: '2' }))).toThrow(common_1.ForbiddenException);
    });
    it('sub 为数字 0 也不误判为缺认证', () => {
        reflector.getAllAndOverride.mockReturnValue('id');
        expect(guard.canActivate(buildContext({ sub: 0, role: 'user' }, { id: '0' }))).toBe(true);
    });
    it('元数据键为常量（防止拼写漂移）', () => {
        expect(owner_or_admin_guard_1.OWNERSHIP_PARAM_KEY).toBe('ownershipParam');
    });
});
