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
exports.CartDomainService = exports.CartLimitExceededError = void 0;
const common_1 = require("@nestjs/common");
const cart_item_aggregate_1 = require("../aggregates/cart-item.aggregate");
const cart_repository_1 = require("../repositories/cart.repository");
class CartLimitExceededError extends Error {
}
exports.CartLimitExceededError = CartLimitExceededError;
let CartDomainService = class CartDomainService {
    constructor(cartRepository) {
        this.cartRepository = cartRepository;
    }
    getCartSummary(cartItems) {
        const activeItems = cartItems.filter(item => !item.delFlag);
        const selectedItems = activeItems.filter(item => item.selectFlag);
        const sum = (items) => items.reduce((total, item) => total + item.productPrice * item.productQuantity, 0);
        const countQty = (items) => items.reduce((count, item) => count + item.productQuantity, 0);
        const totalAmount = sum(activeItems);
        const selectedAmount = sum(selectedItems);
        return {
            totalItems: countQty(cartItems),
            selectedItems: countQty(selectedItems),
            totalAmount,
            selectedAmount,
            totalValue: totalAmount,
            selectedValue: selectedAmount,
        };
    }
    async addItemToCart(customerUserId, productId, productSkuId, productName, productBrand, productPrice, productQuantity, productPic, productAttribute) {
        if (!this.cartRepository) {
            throw new Error('CartRepository not injected');
        }
        const currentCount = await this.cartRepository.countByUserId(customerUserId);
        if (currentCount >= 500) {
            throw new CartLimitExceededError('购物车最多添加500件商品');
        }
        const existingItem = await this.cartRepository.findByUserIdAndSkuId(customerUserId, productSkuId);
        if (existingItem) {
            existingItem.mergeQuantity(productQuantity);
            await this.cartRepository.save(existingItem);
            return existingItem;
        }
        const softDeleted = await this.cartRepository.findByUserIdAndSkuIdAnyState(customerUserId, productSkuId);
        if (softDeleted) {
            softDeleted.productName = productName;
            softDeleted.productBrand = productBrand;
            softDeleted.productPrice = productPrice;
            softDeleted.productQuantity = productQuantity;
            softDeleted.productPic = productPic;
            softDeleted.productAttribute = productAttribute;
            softDeleted.selectFlag = true;
            softDeleted.updatedAt = new Date();
            await this.cartRepository.save(softDeleted);
            return softDeleted;
        }
        const newItem = cart_item_aggregate_1.CartItemAggregate.create(customerUserId, productId, productSkuId, productName, productBrand, productPrice, productQuantity, productPic, productAttribute);
        await this.cartRepository.save(newItem);
        return newItem;
    }
    async updateAllSelectFlag(customerUserId, selectFlag) {
        if (!this.cartRepository) {
            throw new Error('CartRepository not injected');
        }
        await this.cartRepository.updateAllSelectFlag(customerUserId, selectFlag);
    }
    async clearSelectedItems(customerUserId) {
        if (!this.cartRepository) {
            throw new Error('CartRepository not injected');
        }
        await this.cartRepository.removeSelectedByUserId(customerUserId);
    }
};
exports.CartDomainService = CartDomainService;
exports.CartDomainService = CartDomainService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cart_repository_1.CartRepository])
], CartDomainService);
