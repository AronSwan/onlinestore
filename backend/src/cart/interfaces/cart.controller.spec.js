"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const cart_controller_1 = require("./cart.controller");
const cart_application_service_1 = require("../application/cart-application.service");
const common_1 = require("@nestjs/common");
describe('CartController', () => {
    let controller;
    let service;
    const mockCartItem = {
        id: 'cart_123456',
        productId: 'product_123456',
        productSkuId: 'sku_123456',
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 2,
        productPic: 'https://example.com/image.jpg',
        productAttribute: '{"color":"黑色","size":"中号"}',
        selectFlag: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPrice: 199.98,
    };
    const mockCartSummary = {
        totalItems: 3,
        selectedItems: 2,
        totalValue: 299.97,
        selectedValue: 199.97,
    };
    const mockPagedCart = {
        items: [mockCartItem],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    };
    const mockCartApplicationService = {
        getCartItems: jest.fn(),
        getSelectedCartItems: jest.fn(),
        addCartItem: jest.fn(),
        updateCartItem: jest.fn(),
        updateAllSelectFlag: jest.fn(),
        removeCartItem: jest.fn(),
        removeCartItems: jest.fn(),
        clearSelectedItems: jest.fn(),
        getCartSummary: jest.fn(),
        getCartItemCount: jest.fn(),
    };
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            controllers: [cart_controller_1.CartController],
            providers: [{ provide: cart_application_service_1.CartApplicationService, useValue: mockCartApplicationService }],
        }).compile();
        controller = module.get(cart_controller_1.CartController);
        service = module.get(cart_application_service_1.CartApplicationService);
    });
    describe('getCartItems', () => {
        it('should return paginated cart items', async () => {
            const customerUserId = 'user_123456';
            const page = 1;
            const limit = 20;
            mockCartApplicationService.getCartItems.mockResolvedValue(mockPagedCart);
            const result = await controller.getCartItems(customerUserId, page, limit);
            expect(service.getCartItems).toHaveBeenCalledWith(customerUserId, page, limit);
            expect(result).toEqual(mockPagedCart);
        });
        it('should return paginated cart items with default values', async () => {
            const customerUserId = 'user_123456';
            mockCartApplicationService.getCartItems.mockResolvedValue(mockPagedCart);
            const result = await controller.getCartItems(customerUserId, 1, 20);
            expect(service.getCartItems).toHaveBeenCalledWith(customerUserId, 1, 20);
            expect(result).toEqual(mockPagedCart);
        });
        it('should handle user not found', async () => {
            const customerUserId = 'nonexistent_user';
            mockCartApplicationService.getCartItems.mockRejectedValue(new common_1.NotFoundException('用户不存在'));
            await expect(controller.getCartItems(customerUserId, 1, 20)).rejects.toThrow(common_1.NotFoundException);
        });
    });
    describe('getSelectedCartItems', () => {
        it('should return selected cart items', async () => {
            const customerUserId = 'user_123456';
            const selectedItems = [mockCartItem];
            mockCartApplicationService.getSelectedCartItems.mockResolvedValue(selectedItems);
            const result = await controller.getSelectedCartItems(customerUserId);
            expect(service.getSelectedCartItems).toHaveBeenCalledWith(customerUserId);
            expect(result).toEqual(selectedItems);
        });
        it('should handle empty selected items', async () => {
            const customerUserId = 'user_123456';
            mockCartApplicationService.getSelectedCartItems.mockResolvedValue([]);
            const result = await controller.getSelectedCartItems(customerUserId);
            expect(service.getSelectedCartItems).toHaveBeenCalledWith(customerUserId);
            expect(result).toEqual([]);
        });
    });
    describe('addCartItem', () => {
        it('should successfully add item to cart', async () => {
            const customerUserId = 'user_123456';
            const addCartItemDto = {
                productId: 'product_123456',
                productSkuId: 'sku_123456',
                productName: 'Test Product',
                productBrand: 'Test Brand',
                productPrice: 99.99,
                productQuantity: 2,
                productPic: 'https://example.com/image.jpg',
                productAttribute: '{"color":"黑色","size":"中号"}',
            };
            mockCartApplicationService.addCartItem.mockResolvedValue(mockCartItem);
            const result = await controller.addCartItem(customerUserId, addCartItemDto);
            expect(service.addCartItem).toHaveBeenCalledWith(customerUserId, addCartItemDto);
            expect(result).toEqual(mockCartItem);
        });
        it('should handle insufficient stock', async () => {
            const customerUserId = 'user_123456';
            const addCartItemDto = {
                productId: 'product_123456',
                productSkuId: 'sku_123456',
                productName: 'Test Product',
                productBrand: 'Test Brand',
                productPrice: 99.99,
                productQuantity: 1000,
                productPic: 'https://example.com/image.jpg',
                productAttribute: '{"color":"黑色","size":"中号"}',
            };
            mockCartApplicationService.addCartItem.mockRejectedValue(new common_1.ConflictException('库存不足'));
            await expect(controller.addCartItem(customerUserId, addCartItemDto)).rejects.toThrow(common_1.ConflictException);
        });
        it('should handle invalid product', async () => {
            const customerUserId = 'user_123456';
            const addCartItemDto = {
                productId: 'invalid_product',
                productSkuId: 'sku_123456',
                productName: 'Test Product',
                productBrand: 'Test Brand',
                productPrice: 99.99,
                productQuantity: 2,
                productPic: 'https://example.com/image.jpg',
                productAttribute: '{"color":"黑色","size":"中号"}',
            };
            mockCartApplicationService.addCartItem.mockRejectedValue(new common_1.NotFoundException('商品不存在'));
            await expect(controller.addCartItem(customerUserId, addCartItemDto)).rejects.toThrow(common_1.NotFoundException);
        });
        it('should handle validation errors', async () => {
            const customerUserId = 'user_123456';
            const addCartItemDto = {
                productId: '',
                productSkuId: 'sku_123456',
                productName: 'Test Product',
                productBrand: 'Test Brand',
                productPrice: 99.99,
                productQuantity: 0,
                productPic: 'https://example.com/image.jpg',
                productAttribute: '{"color":"黑色","size":"中号"}',
            };
            mockCartApplicationService.addCartItem.mockRejectedValue(new common_1.BadRequestException('请求参数错误'));
            await expect(controller.addCartItem(customerUserId, addCartItemDto)).rejects.toThrow(common_1.BadRequestException);
        });
    });
    describe('updateCartItem', () => {
        it('should successfully update cart item', async () => {
            const customerUserId = 'user_123456';
            const cartItemId = 'cart_123456';
            const updateCartItemDto = {
                productSkuId: 'sku_123456',
                productQuantity: 3,
                selectFlag: false,
            };
            mockCartApplicationService.updateCartItem.mockResolvedValue(undefined);
            const result = await controller.updateCartItem(customerUserId, cartItemId, updateCartItemDto);
            expect(service.updateCartItem).toHaveBeenCalledWith(customerUserId, cartItemId, updateCartItemDto);
            expect(result).toBeUndefined();
        });
        it('should handle cart item not found', async () => {
            const customerUserId = 'user_123456';
            const cartItemId = 'nonexistent_cart';
            const updateCartItemDto = {
                productSkuId: 'sku_123456',
                productQuantity: 3,
                selectFlag: false,
            };
            mockCartApplicationService.updateCartItem.mockRejectedValue(new common_1.NotFoundException('购物车商品不存在'));
            await expect(controller.updateCartItem(customerUserId, cartItemId, updateCartItemDto)).rejects.toThrow(common_1.NotFoundException);
        });
        it('should propagate service NotFoundException (item not found)', async () => {
            const customerUserId = 'user_123456';
            const cartItemId = 'nonexistent_cart';
            const updateCartItemDto = { productQuantity: 3 };
            mockCartApplicationService.updateCartItem.mockRejectedValue(new common_1.NotFoundException('购物车商品不存在'));
            await expect(controller.updateCartItem(customerUserId, cartItemId, updateCartItemDto)).rejects.toThrow(common_1.NotFoundException);
        });
    });
    describe('updateAllSelectFlag', () => {
        it('should successfully update all select flags', async () => {
            const customerUserId = 'user_123456';
            const selectFlag = true;
            mockCartApplicationService.updateAllSelectFlag.mockResolvedValue(undefined);
            const result = await controller.updateAllSelectFlag(customerUserId, selectFlag);
            expect(service.updateAllSelectFlag).toHaveBeenCalledWith(customerUserId, selectFlag);
            expect(result).toBeUndefined();
        });
        it('should handle empty cart', async () => {
            const customerUserId = 'user_123456';
            const selectFlag = false;
            mockCartApplicationService.updateAllSelectFlag.mockResolvedValue(undefined);
            const result = await controller.updateAllSelectFlag(customerUserId, selectFlag);
            expect(service.updateAllSelectFlag).toHaveBeenCalledWith(customerUserId, selectFlag);
            expect(result).toBeUndefined();
        });
    });
    describe('removeCartItem', () => {
        it('should successfully remove cart item', async () => {
            const customerUserId = 'user_123456';
            const cartItemId = 'cart_123456';
            mockCartApplicationService.removeCartItem.mockResolvedValue(undefined);
            const result = await controller.removeCartItem(customerUserId, cartItemId);
            expect(service.removeCartItem).toHaveBeenCalledWith(customerUserId, cartItemId);
            expect(result).toBeUndefined();
        });
        it('should silently no-op (200) for nonexistent item — DELETE idempotency', async () => {
            const customerUserId = 'user_123456';
            const cartItemId = 'nonexistent_cart';
            mockCartApplicationService.removeCartItem.mockResolvedValue(undefined);
            await expect(controller.removeCartItem(customerUserId, cartItemId)).resolves.toBeUndefined();
        });
    });
    describe('removeCartItems', () => {
        it('should successfully remove multiple cart items', async () => {
            const customerUserId = 'user_123456';
            const cartItemIds = ['cart_123456', 'cart_789012'];
            mockCartApplicationService.removeCartItems.mockResolvedValue(undefined);
            const result = await controller.removeCartItems(customerUserId, cartItemIds);
            expect(service.removeCartItems).toHaveBeenCalledWith(customerUserId, cartItemIds);
            expect(result).toBeUndefined();
        });
        it('should handle empty cart item ids', async () => {
            const customerUserId = 'user_123456';
            const cartItemIds = [];
            mockCartApplicationService.removeCartItems.mockResolvedValue(undefined);
            const result = await controller.removeCartItems(customerUserId, cartItemIds);
            expect(service.removeCartItems).toHaveBeenCalledWith(customerUserId, cartItemIds);
            expect(result).toBeUndefined();
        });
        it('should tolerate nonexistent ids in batch (soft-filter by uid+id)', async () => {
            const customerUserId = 'user_123456';
            const cartItemIds = ['cart_123456', 'nonexistent_cart'];
            mockCartApplicationService.removeCartItems.mockResolvedValue(undefined);
            await expect(controller.removeCartItems(customerUserId, cartItemIds)).resolves.toBeUndefined();
        });
    });
    describe('clearSelectedItems', () => {
        it('should successfully clear selected items', async () => {
            const customerUserId = 'user_123456';
            mockCartApplicationService.clearSelectedItems.mockResolvedValue(undefined);
            const result = await controller.clearSelectedItems(customerUserId);
            expect(service.clearSelectedItems).toHaveBeenCalledWith(customerUserId);
            expect(result).toBeUndefined();
        });
        it('should handle no selected items', async () => {
            const customerUserId = 'user_123456';
            mockCartApplicationService.clearSelectedItems.mockResolvedValue(undefined);
            const result = await controller.clearSelectedItems(customerUserId);
            expect(service.clearSelectedItems).toHaveBeenCalledWith(customerUserId);
            expect(result).toBeUndefined();
        });
    });
    describe('getCartSummary', () => {
        it('should return cart summary', async () => {
            const customerUserId = 'user_123456';
            mockCartApplicationService.getCartSummary.mockResolvedValue(mockCartSummary);
            const result = await controller.getCartSummary(customerUserId);
            expect(service.getCartSummary).toHaveBeenCalledWith(customerUserId);
            expect(result).toEqual(mockCartSummary);
        });
        it('should handle empty cart summary', async () => {
            const customerUserId = 'user_123456';
            const emptySummary = {
                totalItems: 0,
                selectedItems: 0,
                totalValue: 0,
                selectedValue: 0,
            };
            mockCartApplicationService.getCartSummary.mockResolvedValue(emptySummary);
            const result = await controller.getCartSummary(customerUserId);
            expect(service.getCartSummary).toHaveBeenCalledWith(customerUserId);
            expect(result).toEqual(emptySummary);
        });
    });
    describe('getCartItemCount', () => {
        it('should return cart item count', async () => {
            const customerUserId = 'user_123456';
            const itemCount = 3;
            mockCartApplicationService.getCartItemCount.mockResolvedValue(itemCount);
            const result = await controller.getCartItemCount(customerUserId);
            expect(service.getCartItemCount).toHaveBeenCalledWith(customerUserId);
            expect(result).toEqual(itemCount);
        });
        it('should return zero for empty cart', async () => {
            const customerUserId = 'user_123456';
            mockCartApplicationService.getCartItemCount.mockResolvedValue(0);
            const result = await controller.getCartItemCount(customerUserId);
            expect(service.getCartItemCount).toHaveBeenCalledWith(customerUserId);
            expect(result).toEqual(0);
        });
    });
});
