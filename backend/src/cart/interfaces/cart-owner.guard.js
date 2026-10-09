"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartOwnerGuard = void 0;
const common_1 = require("@nestjs/common");
let CartOwnerGuard = class CartOwnerGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request?.user;
        if (!user || user.sub === undefined || user.sub === null) {
            throw new common_1.UnauthorizedException('未认证：请先登录后再操作购物车');
        }
        const customerUserId = request?.params?.customerUserId;
        if (customerUserId === undefined || customerUserId === null || customerUserId === '') {
            throw new common_1.ForbiddenException('只能操作本人购物车');
        }
        if (String(user.sub) !== String(customerUserId)) {
            throw new common_1.ForbiddenException('只能操作本人购物车');
        }
        return true;
    }
};
exports.CartOwnerGuard = CartOwnerGuard;
exports.CartOwnerGuard = CartOwnerGuard = __decorate([
    (0, common_1.Injectable)()
], CartOwnerGuard);
