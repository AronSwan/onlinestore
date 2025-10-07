/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { CartApplicationService } from '../application/cart-application.service';
import { CartDomainService } from '../domain/services/cart-domain.service';
import { CartRepository } from '../domain/repositories/cart.repository';
import { CartItemAggregate } from '../domain/aggregates/cart-item.aggregate';

describe('Cart Integration Tests', () => {
  let cartApplicationService: CartApplicationService;
  let cartDomainService: CartDomainService;
  let cartRepository: CartRepository;

  const mockCartRepository = {
    findByUserId: jest.fn(),
    findByUserIdAndSkuId: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    removeByUserIdAndSkuIds: jest.fn(),
    clearByUserId: jest.fn(),
    countByUserId: jest.fn(),
    findSelectedByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartApplicationService,
        CartDomainService,
        {
          provide: CartRepository,
          useValue: mockCartRepository,
        },
      ],
    }).compile();

    cartApplicationService = module.get<CartApplicationService>(CartApplicationService);
    cartDomainService = module.get<CartDomainService>(CartDomainService);
    cartRepository = module.get<CartRepository>(CartRepository);
  });

  describe('CartDomainService', () => {
    it('should validate add to cart', () => {
      expect(() => {
        cartDomainService.validateAddToCart('product1', 'sku1', 1);
      }).not.toThrow();

      expect(() => {
        cartDomainService.validateAddToCart('', 'sku1', 1);
      }).toThrow('商品ID和SKU ID不能为空');

      expect(() => {
        cartDomainService.validateAddToCart('product1', 'sku1', 0);
      }).toThrow('商品数量必须大于0');
    });

    it('should calculate cart total', () => {
      const cartItems = [
        new CartItemAggregate(
          'item1',
          'user1',
          'product1',
          'sku1',
          'Product 1',
          'Brand 1',
          100,
          2,
          'pic1.jpg',
          '{}',
          true,
          false,
          new Date(),
          new Date(),
        ),
        new CartItemAggregate(
          'item2',
          'user1',
          'product2',
          'sku2',
          'Product 2',
          'Brand 2',
          50,
          1,
          'pic2.jpg',
          '{}',
          true,
          false,
          new Date(),
          new Date(),
        ),
      ];

      const total = cartDomainService.calculateCartTotal(cartItems);
      expect(total).toBe(250); // 100*2 + 50*1
    });

    it('should calculate cart item count', () => {
      const cartItems = [
        new CartItemAggregate(
          'item1',
          'user1',
          'product1',
          'sku1',
          'Product 1',
          'Brand 1',
          100,
          2,
          'pic1.jpg',
          '{}',
          true,
          false,
          new Date(),
          new Date(),
        ),
        new CartItemAggregate(
          'item2',
          'user1',
          'product2',
          'sku2',
          'Product 2',
          'Brand 2',
          50,
          3,
          'pic2.jpg',
          '{}',
          false,
          false,
          new Date(),
          new Date(),
        ),
      ];

      const count = cartDomainService.calculateCartItemCount(cartItems);
      expect(count).toBe(5); // 2 + 3
    });
  });

  describe('CartItemAggregate', () => {
    it('should create cart item', () => {
      const cartItem = CartItemAggregate.create(
        'user1',
        'product1',
        'sku1',
        'Product 1',
        'Brand 1',
        100,
        2,
        'pic1.jpg',
        '{}',
      );

      expect(cartItem.customerUserId).toBe('user1');
      expect(cartItem.productId).toBe('product1');
      expect(cartItem.productSkuId).toBe('sku1');
      expect(cartItem.productQuantity).toBe(2);
      expect(cartItem.selectFlag).toBe(true);
    });

    it('should update quantity', () => {
      const cartItem = new CartItemAggregate(
        'item1',
        'user1',
        'product1',
        'sku1',
        'Product 1',
        'Brand 1',
        100,
        2,
        'pic1.jpg',
        '{}',
      );

      cartItem.updateQuantity(5);
      expect(cartItem.productQuantity).toBe(5);

      expect(() => {
        cartItem.updateQuantity(0);
      }).toThrow('商品数量必须大于0');

      expect(() => {
        cartItem.updateQuantity(1000);
      }).toThrow('单个商品数量不能超过999');
    });

    it('should toggle select flag', () => {
      const cartItem = new CartItemAggregate(
        'item1',
        'user1',
        'product1',
        'sku1',
        'Product 1',
        'Brand 1',
        100,
        2,
        'pic1.jpg',
        '{}',
      );

      expect(cartItem.selectFlag).toBe(true);
      cartItem.toggleSelect();
      expect(cartItem.selectFlag).toBe(false);
      cartItem.toggleSelect();
      expect(cartItem.selectFlag).toBe(true);
    });

    it('should calculate total price', () => {
      const cartItem = new CartItemAggregate(
        'item1',
        'user1',
        'product1',
        'sku1',
        'Product 1',
        'Brand 1',
        100,
        3,
        'pic1.jpg',
        '{}',
      );

      expect(cartItem.getTotalPrice()).toBe(300);
    });

    it('should validate cart item', () => {
      const validCartItem = new CartItemAggregate(
        'item1',
        'user1',
        'product1',
        'sku1',
        'Product 1',
        'Brand 1',
        100,
        2,
        'pic1.jpg',
        '{}',
      );

      expect(validCartItem.validate()).toBe(true);

      const invalidCartItem = new CartItemAggregate(
        'item1',
        '',
        'product1',
        'sku1',
        'Product 1',
        'Brand 1',
        100,
        2,
        'pic1.jpg',
        '{}',
      );

      expect(invalidCartItem.validate()).toBe(false);
    });
  });
});
