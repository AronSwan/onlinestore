"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const cart_application_service_1 = require("./cart-application.service");
const cart_repository_1 = require("../domain/repositories/cart.repository");
const cart_domain_service_1 = require("../domain/services/cart-domain.service");
const cart_item_aggregate_1 = require("../domain/aggregates/cart-item.aggregate");
describe('CartApplicationService 契约', () => {
    let service;
    let repo;
    let domain;
    const makeAggregate = (sku, qty = 1) => new cart_item_aggregate_1.CartItemAggregate(`cart_test_${sku}`, 'u1', 'p1', sku, 'name', 'brand', 100, qty, '', '{}', true, false, new Date(), new Date());
    beforeEach(async () => {
        repo = {
            findByUserIdAndItemId: jest.fn(),
            findByUserIdAndSkuId: jest.fn(),
            findByUserIdAndSkuIdAnyState: jest.fn(),
            remove: jest.fn(),
            removeBatch: jest.fn(),
            save: jest.fn(),
            countByUserId: jest.fn().mockResolvedValue(0),
        };
        domain = {
            addItemToCart: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                cart_application_service_1.CartApplicationService,
                { provide: cart_repository_1.CartRepository, useValue: repo },
                { provide: cart_domain_service_1.CartDomainService, useValue: domain },
            ],
        }).compile();
        service = module.get(cart_application_service_1.CartApplicationService);
    });
    describe('updateCartItem', () => {
        it('按路径 (uid, cartItemId) 定位——不再按 body.productSkuId', async () => {
            const agg = makeAggregate('sku-1', 2);
            repo.findByUserIdAndItemId.mockResolvedValue(agg);
            await service.updateCartItem('u1', 'cart_test_sku-1', { productQuantity: 5 });
            expect(repo.findByUserIdAndItemId).toHaveBeenCalledWith('u1', 'cart_test_sku-1');
            expect(repo.findByUserIdAndSkuId).not.toHaveBeenCalled();
            expect(repo.save).toHaveBeenCalled();
        });
        it('只带 productQuantity 的合法请求（skuId 已可选）', async () => {
            repo.findByUserIdAndItemId.mockResolvedValue(makeAggregate('sku-1', 1));
            await expect(service.updateCartItem('u1', 'cart_test_sku-1', { productQuantity: 3 })).resolves.toBeUndefined();
        });
        it('productQuantity 为 null 时跳过（不落 500）', async () => {
            repo.findByUserIdAndItemId.mockResolvedValue(makeAggregate('sku-1', 1));
            await service.updateCartItem('u1', 'cart_test_sku-1', { productQuantity: null });
            expect(repo.save).toHaveBeenCalled();
        });
        it('条目不存在抛 NotFoundException（404，非裸 Error 500）', async () => {
            repo.findByUserIdAndItemId.mockResolvedValue(null);
            await expect(service.updateCartItem('u1', 'nonexistent', { productQuantity: 2 })).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
    });
    describe('removeCartItem', () => {
        it('按 (uid, cartItemId) 定位删除——uid 过滤防 A 删 B', async () => {
            const agg = makeAggregate('sku-1');
            repo.findByUserIdAndItemId.mockResolvedValue(agg);
            await service.removeCartItem('u1', 'cart_test_sku-1');
            expect(repo.findByUserIdAndItemId).toHaveBeenCalledWith('u1', 'cart_test_sku-1');
            expect(repo.remove).toHaveBeenCalledWith('cart_test_sku-1');
        });
        it('查无条目静默成功（DELETE 幂等语义）', async () => {
            repo.findByUserIdAndItemId.mockResolvedValue(null);
            await expect(service.removeCartItem('u1', 'nope')).resolves.toBeUndefined();
            expect(repo.remove).not.toHaveBeenCalled();
        });
    });
    describe('removeCartItems（P0 IDOR 修复回归）', () => {
        it('批量删除必须携带 uid 传给仓储（双键过滤）', async () => {
            await service.removeCartItems('u1', ['a', 'b']);
            expect(repo.removeBatch).toHaveBeenCalledWith('u1', ['a', 'b']);
        });
    });
    describe('addCartItem', () => {
        it('上限业务错误转 BadRequestException（非 500）', async () => {
            domain.addItemToCart.mockRejectedValue(new cart_domain_service_1.CartLimitExceededError('购物车最多添加500件商品'));
            await expect(service.addCartItem('u1', {
                productId: 'p',
                productSkuId: 's',
                productName: 'n',
                productBrand: 'b',
                productPrice: 1,
                productQuantity: 1,
                productPic: '',
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
    });
});
describe('CartDomainService.addItemToCart 软删复活', () => {
    it('活行未命中时查软删行并复活（量取本次值）', async () => {
        const repo = {
            countByUserId: jest.fn().mockResolvedValue(0),
            findByUserIdAndSkuId: jest.fn().mockResolvedValue(null),
            findByUserIdAndSkuIdAnyState: jest.fn().mockResolvedValue(makeSoftDeleted()),
            save: jest.fn(),
        };
        const svc = new cart_domain_service_1.CartDomainService(repo);
        const result = await svc.addItemToCart('u1', 'p1', 'sku-x', 'n', 'b', 9.9, 3, '', '{}');
        expect(result.productQuantity).toBe(3);
        expect(repo.save).toHaveBeenCalled();
    });
    it('软删行也未命中才走新建', async () => {
        const repo = {
            countByUserId: jest.fn().mockResolvedValue(0),
            findByUserIdAndSkuId: jest.fn().mockResolvedValue(null),
            findByUserIdAndSkuIdAnyState: jest.fn().mockResolvedValue(null),
            save: jest.fn(),
        };
        const svc = new cart_domain_service_1.CartDomainService(repo);
        const result = await svc.addItemToCart('u1', 'p1', 'sku-new', 'n', 'b', 1, 2, '', '{}');
        expect(result.productQuantity).toBe(2);
        expect(result.productSkuId).toBe('sku-new');
        expect(repo.save).toHaveBeenCalled();
    });
    function makeSoftDeleted() {
        return new cart_item_aggregate_1.CartItemAggregate('cart_soft', 'u1', 'p1', 'sku-x', 'old-name', 'old-brand', 1, 99, '', '{}', false, true, new Date(), new Date());
    }
});
