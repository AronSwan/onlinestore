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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_docs_decorator_1 = require("../../common/decorators/api-docs.decorator");
const cart_application_service_1 = require("../application/cart-application.service");
const add_cart_item_dto_1 = require("../application/dto/add-cart-item.dto");
const update_cart_item_dto_1 = require("../application/dto/update-cart-item.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const cart_owner_guard_1 = require("./cart-owner.guard");
let CartController = class CartController {
    constructor(cartApplicationService) {
        this.cartApplicationService = cartApplicationService;
    }
    async getCartItems(customerUserId, page, limit) {
        return await this.cartApplicationService.getCartItems(customerUserId, page, limit);
    }
    async getSelectedCartItems(customerUserId) {
        return await this.cartApplicationService.getSelectedCartItems(customerUserId);
    }
    async addCartItem(customerUserId, addCartItemDto) {
        return await this.cartApplicationService.addCartItem(customerUserId, addCartItemDto);
    }
    async updateCartItem(customerUserId, cartItemId, updateCartItemDto) {
        await this.cartApplicationService.updateCartItem(customerUserId, cartItemId, updateCartItemDto);
    }
    async updateAllSelectFlag(customerUserId, selectFlag) {
        await this.cartApplicationService.updateAllSelectFlag(customerUserId, selectFlag);
    }
    async removeCartItem(customerUserId, cartItemId) {
        await this.cartApplicationService.removeCartItem(customerUserId, cartItemId);
    }
    async removeCartItems(customerUserId, cartItemIds) {
        await this.cartApplicationService.removeCartItems(customerUserId, cartItemIds);
    }
    async clearSelectedItems(customerUserId) {
        await this.cartApplicationService.clearSelectedItems(customerUserId);
    }
    async getCartSummary(customerUserId) {
        return await this.cartApplicationService.getCartSummary(customerUserId);
    }
    async getCartItemCount(customerUserId) {
        return await this.cartApplicationService.getCartItemCount(customerUserId);
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Get)('items/:customerUserId'),
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCartItems", null);
__decorate([
    (0, common_1.Get)('selected/:customerUserId'),
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getSelectedCartItems", null);
__decorate([
    (0, common_1.Post)('items/:customerUserId'),
    (0, api_docs_decorator_1.ApiCreateResource)(Object, Object, '创建资源'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_cart_item_dto_1.AddCartItemDto]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "addCartItem", null);
__decorate([
    (0, common_1.Put)('items/:customerUserId/:cartItemId'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '更新购物车商品',
        description: '更新购物车中指定商品的数量、选中状态等信息',
        params: [
            {
                name: 'customerUserId',
                description: '用户唯一标识符',
                example: 'user_123456',
            },
            {
                name: 'cartItemId',
                description: '购物车商品唯一标识符',
                example: 'cart_123456',
            },
        ],
        body: { type: Object, description: '更新商品的信息' },
        responses: {
            success: {
                description: '购物车商品不存在',
            },
        },
    }),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Param)('cartItemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_cart_item_dto_1.UpdateCartItemDto]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "updateCartItem", null);
__decorate([
    (0, common_1.Put)('select-all/:customerUserId'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '批量更新选中状态',
        description: '批量设置用户购物车中所有商品的选中状态',
        params: [
            {
                name: 'customerUserId',
                description: '用户唯一标识符',
                example: 'user_123456',
            },
        ],
        body: { type: Object, description: '选中状态标志' },
        responses: {
            success: {
                description: '批量更新成功',
            },
        },
    }),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Body)('selectFlag')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "updateAllSelectFlag", null);
__decorate([
    (0, common_1.Delete)('items/:customerUserId/:cartItemId'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '删除购物车商品',
        description: '从用户购物车中删除指定的商品',
        params: [
            {
                name: 'customerUserId',
                description: '用户唯一标识符',
                example: 'user_123456',
            },
            {
                name: 'cartItemId',
                description: '购物车商品唯一标识符',
                example: 'cart_123456',
            },
        ],
        responses: {
            success: {
                description: '购物车商品不存在',
            },
        },
    }),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Param)('cartItemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "removeCartItem", null);
__decorate([
    (0, common_1.Delete)('items/:customerUserId'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '批量删除购物车商品',
        description: '根据商品ID列表批量删除用户购物车中的商品',
        params: [
            {
                name: 'customerUserId',
                description: '用户唯一标识符',
                example: 'user_123456',
            },
        ],
        body: { type: Object, description: '要删除的购物车商品ID列表' },
        responses: {
            success: {
                description: '批量删除成功',
            },
        },
    }),
    __param(0, (0, common_1.Param)('customerUserId')),
    __param(1, (0, common_1.Body)('cartItemIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "removeCartItems", null);
__decorate([
    (0, common_1.Delete)('selected/:customerUserId'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '清空选中商品',
        description: '删除用户购物车中所有已选中的商品',
        params: [
            {
                name: 'customerUserId',
                description: '用户唯一标识符',
                example: 'user_123456',
            },
        ],
        responses: {
            success: {
                description: '清空选中商品成功',
            },
        },
    }),
    __param(0, (0, common_1.Param)('customerUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "clearSelectedItems", null);
__decorate([
    (0, common_1.Get)('summary/:customerUserId'),
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCartSummary", null);
__decorate([
    (0, common_1.Get)('count/:customerUserId'),
    (0, api_docs_decorator_1.ApiGetResource)(Object, 'API接口'),
    __param(0, (0, common_1.Param)('customerUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCartItemCount", null);
exports.CartController = CartController = __decorate([
    (0, swagger_1.ApiTags)('购物车管理'),
    (0, common_1.Controller)('cart'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, cart_owner_guard_1.CartOwnerGuard),
    __metadata("design:paramtypes", [cart_application_service_1.CartApplicationService])
], CartController);
