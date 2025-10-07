import { Test, TestingModule } from '@nestjs/testing';
import { CartApplicationService } from '../application/cart-application.service';
import { CartDomainService } from '../domain/services/cart-domain.service';
import { CartRepository } from '../domain/repositories/cart.repository';
import { AddCartItemDto } from '../application/dto/add-cart-item.dto';

describe('CartConcurrencyTest', () => {
  let cartApplicationService: CartApplicationService;
  let domainService: CartDomainService;
  let repository: CartRepository;

  const mockUserId = 'test-user-123';
  const mockProductId = 'test-product-456';
  const mockSkuId = 'test-sku-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartApplicationService,
        {
          provide: CartDomainService,
          useValue: {
            addItemToCart: jest.fn().mockResolvedValue({
              id: 'cart-item-1',
              customerUserId: mockUserId,
              productId: mockProductId,
              productSkuId: mockSkuId,
              productName: 'Test Product',
              productQuantity: 1,
              productPrice: 99.99,
              productPic: 'test.jpg',
              productAttribute: '{}',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
            updateCartItem: jest.fn(),
            removeCartItem: jest.fn(),
            getCartItems: jest.fn(),
            getCartSummary: jest.fn(),
            clearCart: jest.fn(),
          },
        },
        {
          provide: CartRepository,
          useValue: {
            findByUserIdAndSkuId: jest.fn(),
            save: jest.fn(),
            findByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    cartApplicationService = module.get<CartApplicationService>(CartApplicationService);
    domainService = module.get<CartDomainService>(CartDomainService);
    repository = module.get<CartRepository>(CartRepository);
  });

  describe('并发添加商品测试', () => {
    beforeEach(() => {
      // 重置mock，确保每个测试都有干净的mock状态
      jest.clearAllMocks();
    });

    it('应该正确处理并发添加相同商品', async () => {
      // 模拟领域服务调用
      let callCount = 0;
      (domainService.addItemToCart as jest.Mock).mockImplementation(async () => {
        callCount++;
        return {
          id: `cart-item-${callCount}`,
          customerUserId: mockUserId,
          productId: mockProductId,
          productSkuId: mockSkuId,
          productName: 'Test Product',
          productQuantity: 1,
          productPrice: 99.99,
          productPic: 'test.jpg',
          productAttribute: '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const addItemDto: AddCartItemDto = {
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 1,
        productPic: 'test.jpg',
        productAttribute: '{}',
      };

      // 并发执行多个添加操作
      const concurrentPromises = Array.from({ length: 5 }, () =>
        cartApplicationService.addCartItem(mockUserId, addItemDto),
      );

      const results = await Promise.all(concurrentPromises);

      // 验证结果
      expect(results).toHaveLength(5);
      expect(results[0].id).toBeDefined();
      expect(results[0].productId).toBe(mockProductId);

      // 验证领域服务被正确调用
      expect(domainService.addItemToCart).toHaveBeenCalledTimes(5);
    });

    it('应该处理领域服务异常', async () => {
      // 模拟领域服务异常
      const domainError = new Error('商品库存不足');
      (domainService.addItemToCart as jest.Mock).mockRejectedValue(domainError);

      const addItemDto: AddCartItemDto = {
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 1,
        productPic: 'test.jpg',
        productAttribute: '{}',
      };

      // 验证应用服务正确传播领域服务异常
      await expect(cartApplicationService.addCartItem(mockUserId, addItemDto)).rejects.toThrow(
        '商品库存不足',
      );
      
      // 验证领域服务被正确调用
      expect(domainService.addItemToCart).toHaveBeenCalledWith(
        mockUserId,
        mockProductId,
        mockSkuId,
        'Test Product',
        'Test Brand',
        99.99,
        1,
        'test.jpg',
        '{}',
      );
    });
  });

  describe('应用服务异常处理测试', () => {
    beforeEach(() => {
      // 重置mock，确保每个测试都有干净的mock状态
      jest.clearAllMocks();
    });

    it('应该正确处理领域服务异常', async () => {
      // 模拟领域服务异常
      (domainService.addItemToCart as jest.Mock).mockRejectedValue(new Error('商品库存不足'));

      const addItemDto: AddCartItemDto = {
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 1,
        productPic: 'test.jpg',
        productAttribute: '{}',
      };

      await expect(cartApplicationService.addCartItem(mockUserId, addItemDto)).rejects.toThrow(
        '商品库存不足',
      );
    });

    it('应该正确处理参数验证异常', async () => {
      // 模拟领域服务参数验证异常
      (domainService.addItemToCart as jest.Mock).mockRejectedValue(new Error('商品数量必须大于0'));

      const addItemDto: AddCartItemDto = {
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 0, // 无效数量
        productPic: 'test.jpg',
        productAttribute: '{}',
      };

      await expect(cartApplicationService.addCartItem(mockUserId, addItemDto)).rejects.toThrow(
        '商品数量必须大于0',
      );
    });
  });

  describe('应用服务功能测试', () => {
    beforeEach(() => {
      // 重置mock，确保每个测试都有干净的mock状态
      jest.clearAllMocks();
    });

    it('应该正确转换领域对象为DTO', async () => {
      // 模拟领域服务返回领域对象
      const mockCartItem = {
        id: 'cart-item-1',
        customerUserId: mockUserId,
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 2,
        productPic: 'test.jpg',
        productAttribute: '{"color": "red"}',
        selectFlag: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      (domainService.addItemToCart as jest.Mock).mockResolvedValue(mockCartItem);

      const addItemDto: AddCartItemDto = {
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 2,
        productPic: 'test.jpg',
        productAttribute: '{"color": "red"}',
      };

      const result = await cartApplicationService.addCartItem(mockUserId, addItemDto);

      // 验证DTO转换正确
      expect(result.id).toBe(mockCartItem.id);
      expect(result.productId).toBe(mockCartItem.productId);
      expect(result.productSkuId).toBe(mockCartItem.productSkuId);
      expect(result.productName).toBe(mockCartItem.productName);
      expect(result.productPrice).toBe(mockCartItem.productPrice);
      expect(result.productQuantity).toBe(mockCartItem.productQuantity);
      expect(result.productPic).toBe(mockCartItem.productPic);
      expect(result.productAttribute).toBe(mockCartItem.productAttribute);
      expect(result.selectFlag).toBe(mockCartItem.selectFlag);
      expect(result.createdAt).toEqual(mockCartItem.createdAt);
      expect(result.updatedAt).toEqual(mockCartItem.updatedAt);
    });

    it('应该正确处理空属性值', async () => {
      // 模拟领域服务返回空属性
      const mockCartItem = {
        id: 'cart-item-1',
        customerUserId: mockUserId,
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 1,
        productPic: 'test.jpg',
        productAttribute: '',
        selectFlag: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (domainService.addItemToCart as jest.Mock).mockResolvedValue(mockCartItem);

      const addItemDto: AddCartItemDto = {
        productId: mockProductId,
        productSkuId: mockSkuId,
        productName: 'Test Product',
        productBrand: 'Test Brand',
        productPrice: 99.99,
        productQuantity: 1,
        productPic: 'test.jpg',
        productAttribute: '',
      };

      const result = await cartApplicationService.addCartItem(mockUserId, addItemDto);

      // 验证空属性处理正确
      expect(result.productBrand).toBe('Test Brand');
      expect(result.productAttribute).toBe('');
      expect(result.selectFlag).toBeUndefined();
    });
  });
});
