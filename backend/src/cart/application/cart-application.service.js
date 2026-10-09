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
var CartApplicationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartApplicationService = void 0;
const common_1 = require("@nestjs/common");
const cart_domain_service_1 = require("../domain/services/cart-domain.service");
const cart_repository_1 = require("../domain/repositories/cart.repository");
const cart_item_response_dto_1 = require("./dto/cart-item-response.dto");
const cart_summary_response_dto_1 = require("./dto/cart-summary-response.dto");
const paged_cart_response_dto_1 = require("./dto/paged-cart-response.dto");
let CartApplicationService = CartApplicationService_1 = class CartApplicationService {
    constructor(cartDomainService, cartRepository) {
        this.cartDomainService = cartDomainService;
        this.cartRepository = cartRepository;
        this.logger = new common_1.Logger(CartApplicationService_1.name);
    }
    async getCartItems(customerUserId, page = 1, limit = 20) {
        try {
            const { items, total } = await this.cartRepository.findByUserIdWithPagination(customerUserId, page, limit);
            const cartItems = items.map(item => new cart_item_response_dto_1.CartItemResponseDto(item.id, item.productId, item.productSkuId, item.productName, item.productBrand, item.productPrice, item.productQuantity, item.productPic, item.productAttribute, item.selectFlag, item.createdAt, item.updatedAt));
            return new paged_cart_response_dto_1.PagedCartResponseDto(cartItems, total, page, limit);
        }
        catch (error) {
            this.logger.error(`获取购物车商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getSelectedCartItems(customerUserId) {
        try {
            const items = await this.cartRepository.findSelectedByUserId(customerUserId);
            return items.map(item => new cart_item_response_dto_1.CartItemResponseDto(item.id, item.productId, item.productSkuId, item.productName, item.productBrand, item.productPrice, item.productQuantity, item.productPic, item.productAttribute, item.selectFlag, item.createdAt, item.updatedAt));
        }
        catch (error) {
            this.logger.error(`获取选中购物车商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async addCartItem(customerUserId, addCartItemDto) {
        try {
            const cartItem = await this.cartDomainService.addItemToCart(customerUserId, addCartItemDto.productId, addCartItemDto.productSkuId, addCartItemDto.productName, addCartItemDto.productBrand, addCartItemDto.productPrice, addCartItemDto.productQuantity, addCartItemDto.productPic, addCartItemDto.productAttribute || '');
            this.logger.log(`用户 ${customerUserId} 添加商品 ${addCartItemDto.productSkuId} 到购物车`);
            return new cart_item_response_dto_1.CartItemResponseDto(cartItem.id, cartItem.productId, cartItem.productSkuId, cartItem.productName, cartItem.productBrand, cartItem.productPrice, cartItem.productQuantity, cartItem.productPic, cartItem.productAttribute, cartItem.selectFlag, cartItem.createdAt, cartItem.updatedAt);
        }
        catch (error) {
            if (error instanceof cart_domain_service_1.CartLimitExceededError) {
                throw new common_1.BadRequestException(error.message);
            }
            this.logger.error(`添加购物车商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async updateCartItem(customerUserId, cartItemId, updateCartItemDto) {
        try {
            const cartItem = await this.cartRepository.findByUserIdAndItemId(customerUserId, cartItemId);
            if (!cartItem) {
                throw new common_1.NotFoundException('购物车商品不存在');
            }
            if (updateCartItemDto.productQuantity != null) {
                cartItem.updateQuantity(updateCartItemDto.productQuantity);
            }
            if (updateCartItemDto.selectFlag != null) {
                cartItem.setSelectFlag(updateCartItemDto.selectFlag);
            }
            await this.cartRepository.save(cartItem);
            this.logger.log(`用户 ${customerUserId} 更新购物车商品 ${cartItemId}`);
        }
        catch (error) {
            this.logger.error(`更新购物车商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async updateAllSelectFlag(customerUserId, selectFlag) {
        try {
            await this.cartDomainService.updateAllSelectFlag(customerUserId, selectFlag);
            this.logger.log(`用户 ${customerUserId} 批量更新选中状态: ${selectFlag}`);
        }
        catch (error) {
            this.logger.error(`批量更新选中状态失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async removeCartItem(customerUserId, cartItemId) {
        try {
            const cartItem = await this.cartRepository.findByUserIdAndItemId(customerUserId, cartItemId);
            if (cartItem) {
                await this.cartRepository.remove(cartItem.id);
            }
            this.logger.log(`用户 ${customerUserId} 删除购物车商品 ${cartItemId}`);
        }
        catch (error) {
            this.logger.error(`删除购物车商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async removeCartItems(customerUserId, cartItemIds) {
        try {
            await this.cartRepository.removeBatch(customerUserId, cartItemIds);
            this.logger.log(`用户 ${customerUserId} 批量删除购物车商品: ${cartItemIds.join(', ')}`);
        }
        catch (error) {
            this.logger.error(`批量删除购物车商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async clearSelectedItems(customerUserId) {
        try {
            await this.cartDomainService.clearSelectedItems(customerUserId);
            this.logger.log(`用户 ${customerUserId} 清空选中商品`);
        }
        catch (error) {
            this.logger.error(`清空选中商品失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCartSummary(customerUserId) {
        try {
            const cartItems = await this.cartRepository.findByUserId(customerUserId);
            const summary = this.cartDomainService.getCartSummary(cartItems);
            return new cart_summary_response_dto_1.CartSummaryResponseDto(summary.totalItems, summary.selectedItems, summary.totalValue, summary.selectedValue);
        }
        catch (error) {
            this.logger.error(`获取购物车摘要失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getCartItemCount(customerUserId) {
        try {
            return await this.cartRepository.countByUserId(customerUserId);
        }
        catch (error) {
            this.logger.error(`统计购物车商品数量失败: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.CartApplicationService = CartApplicationService;
exports.CartApplicationService = CartApplicationService = CartApplicationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cart_domain_service_1.CartDomainService,
        cart_repository_1.CartRepository])
], CartApplicationService);
