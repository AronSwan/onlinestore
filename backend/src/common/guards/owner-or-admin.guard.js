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
exports.OwnerOrAdminGuard = exports.OwnerParam = exports.OWNERSHIP_PARAM_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const role_enum_1 = require("../../auth/enums/role.enum");
exports.OWNERSHIP_PARAM_KEY = 'ownershipParam';
const OwnerParam = (param) => (0, common_1.SetMetadata)(exports.OWNERSHIP_PARAM_KEY, param);
exports.OwnerParam = OwnerParam;
let OwnerOrAdminGuard = class OwnerOrAdminGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request?.user;
        if (!user || user.sub === undefined || user.sub === null) {
            throw new common_1.UnauthorizedException('未认证：请先登录');
        }
        if (user.role === role_enum_1.Role.ADMIN) {
            return true;
        }
        const paramName = this.reflector.getAllAndOverride(exports.OWNERSHIP_PARAM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!paramName) {
            throw new common_1.ForbiddenException('路由未声明 @OwnerParam（归属参数名），拒绝访问');
        }
        const paramValue = request?.params?.[paramName];
        if (paramValue === undefined || paramValue === null || paramValue === '') {
            throw new common_1.ForbiddenException('只能访问本人资源');
        }
        if (String(user.sub) !== String(paramValue)) {
            throw new common_1.ForbiddenException('只能访问本人资源');
        }
        return true;
    }
};
exports.OwnerOrAdminGuard = OwnerOrAdminGuard;
exports.OwnerOrAdminGuard = OwnerOrAdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], OwnerOrAdminGuard);
