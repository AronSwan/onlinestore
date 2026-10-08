import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartApplicationService } from './cart-application.service';
import { CartRepository } from '../domain/repositories/cart.repository';
import { CartDomainService, CartLimitExceededError } from '../domain/services/cart-domain.service';
import { CartItemAggregate } from '../domain/aggregates/cart-item.aggregate';

/**
 * 双盲B2席（2026-10-08）实证：本层此前零测试——父提交带两 bug 仍 33/33 绿。
 * 本 spec 守住 f3037ec 及加固批的新契约：按路径 id 定位、not-found 404、
 * 上限 400、批量删除 uid 过滤、软删行复活。
 */
describe('CartApplicationService 契约', () => {
  let service: CartApplicationService;
  let repo: {
    findByUserIdAndItemId: jest.Mock;
    findByUserIdAndSkuId: jest.Mock;
    findByUserIdAndSkuIdAnyState: jest.Mock;
    remove: jest.Mock;
    removeBatch: jest.Mock;
    save: jest.Mock;
    countByUserId: jest.Mock;
  };
  let domain: {
    addItemToCart: jest.Mock;
  };

  const makeAggregate = (sku: string, qty = 1): CartItemAggregate =>
    new CartItemAggregate(
      `cart_test_${sku}`,
      'u1',
      'p1',
      sku,
      'name',
      'brand',
      100,
      qty,
      '',
      '{}',
      true,
      false,
      new Date(),
      new Date(),
    );

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartApplicationService,
        { provide: CartRepository, useValue: repo },
        { provide: CartDomainService, useValue: domain },
      ],
    }).compile();

    service = module.get<CartApplicationService>(CartApplicationService);
  });

  describe('updateCartItem', () => {
    it('按路径 (uid, cartItemId) 定位——不再按 body.productSkuId', async () => {
      const agg = makeAggregate('sku-1', 2);
      repo.findByUserIdAndItemId.mockResolvedValue(agg);

      await service.updateCartItem('u1', 'cart_test_sku-1', { productQuantity: 5 } as any);

      expect(repo.findByUserIdAndItemId).toHaveBeenCalledWith('u1', 'cart_test_sku-1');
      expect(repo.findByUserIdAndSkuId).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('只带 productQuantity 的合法请求（skuId 已可选）', async () => {
      repo.findByUserIdAndItemId.mockResolvedValue(makeAggregate('sku-1', 1));

      await expect(
        service.updateCartItem('u1', 'cart_test_sku-1', { productQuantity: 3 } as any),
      ).resolves.toBeUndefined();
    });

    it('productQuantity 为 null 时跳过（不落 500）', async () => {
      repo.findByUserIdAndItemId.mockResolvedValue(makeAggregate('sku-1', 1));

      await service.updateCartItem('u1', 'cart_test_sku-1', { productQuantity: null } as any);

      expect(repo.save).toHaveBeenCalled();
    });

    it('条目不存在抛 NotFoundException（404，非裸 Error 500）', async () => {
      repo.findByUserIdAndItemId.mockResolvedValue(null);

      await expect(
        service.updateCartItem('u1', 'nonexistent', { productQuantity: 2 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
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
      domain.addItemToCart.mockRejectedValue(new CartLimitExceededError('购物车最多添加500件商品'));

      await expect(
        service.addCartItem('u1', {
          productId: 'p',
          productSkuId: 's',
          productName: 'n',
          productBrand: 'b',
          productPrice: 1,
          productQuantity: 1,
          productPic: '',
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
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
    const svc = new CartDomainService(repo as any);
    const result = await svc.addItemToCart('u1', 'p1', 'sku-x', 'n', 'b', 9.9, 3, '', '{}');

    // 复活：量取本次新增值（删除语义=旧量已弃），save 落库（delFlag 恒写 false）
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
    const svc = new CartDomainService(repo as any);
    const result = await svc.addItemToCart('u1', 'p1', 'sku-new', 'n', 'b', 1, 2, '', '{}');

    expect(result.productQuantity).toBe(2);
    expect(result.productSkuId).toBe('sku-new');
    expect(repo.save).toHaveBeenCalled();
  });

  function makeSoftDeleted(): CartItemAggregate {
    return new CartItemAggregate(
      'cart_soft',
      'u1',
      'p1',
      'sku-x',
      'old-name',
      'old-brand',
      1,
      99, // 软删前旧量——复活时应被本次值覆盖
      '',
      '{}',
      false,
      true, // delFlag=true（软删行）
      new Date(),
      new Date(),
    );
  }
});
