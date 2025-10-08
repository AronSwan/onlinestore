import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByUserId: jest.fn(),
    updateStatus: jest.fn(),
    getStatistics: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /orders', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto = {
        userId: 1,
        items: [
          {
            productId: 1,
            quantity: 2,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
        billingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      };

      const createdOrder = {
        id: 1,
        ...createOrderDto,
        orderNumber: 'ORD1234567890',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        totalAmount: 39.98,
        createdAt: new Date(),
        updatedAt: new Date(),
        shippingAddress: '123 Main St, New York, NY 10001, USA',
        recipientName: 'John Doe',
        recipientPhone: '123-456-7890',
        paymentMethod: 'credit_card',
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
      };

      jest.spyOn(ordersService, 'create').mockResolvedValue(createdOrder);

      const result = await controller.create(createOrderDto);

      expect(result).toEqual(createdOrder);
      expect(ordersService.create).toHaveBeenCalledWith(createOrderDto);
    });

    it('should throw error for invalid user', async () => {
      const createOrderDto = {
        userId: 999,
        items: [
          {
            productId: 1,
            quantity: 2,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      };

      jest.spyOn(ordersService, 'create').mockRejectedValue(new NotFoundException('用户不存在'));

      await expect(controller.create(createOrderDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error for invalid product', async () => {
      const createOrderDto = {
        userId: 1,
        items: [
          {
            productId: 999,
            quantity: 2,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      };

      jest.spyOn(ordersService, 'create').mockRejectedValue(new NotFoundException('产品不存在'));

      await expect(controller.create(createOrderDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error for insufficient stock', async () => {
      const createOrderDto = {
        userId: 1,
        items: [
          {
            productId: 1,
            quantity: 200,
            price: 19.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      };

      jest.spyOn(ordersService, 'create').mockRejectedValue(new BadRequestException('库存不足'));

      await expect(controller.create(createOrderDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        userId: 1,
        items: [],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      };

      jest.spyOn(ordersService, 'create').mockRejectedValue(new Error('无效的订单数据'));

      await expect(controller.create(invalidDto)).rejects.toThrow(Error);
    });

    it('should calculate total amount correctly', async () => {
      const createOrderDto = {
        userId: 1,
        items: [
          {
            productId: 1,
            quantity: 2,
            price: 19.99,
          },
          {
            productId: 2,
            quantity: 1,
            price: 29.99,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      };

      const createdOrder = {
        id: 1,
        ...createOrderDto,
        orderNumber: 'ORD1234567890',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        totalAmount: 69.97,
        createdAt: new Date(),
        updatedAt: new Date(),
        shippingAddress: '123 Main St, New York, NY 10001, USA',
        recipientName: 'John Doe',
        recipientPhone: '123-456-7890',
        paymentMethod: 'credit_card',
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
          {
            id: 2,
            orderId: 1,
            productId: 2,
            quantity: 1,
            unitPrice: 29.99,
            totalPrice: 29.99,
            productSnapshot: {
              name: 'Test Product 2',
              image: 'test2.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
      };

      jest.spyOn(ordersService, 'create').mockResolvedValue(createdOrder);

      const result = await controller.create(createOrderDto);

      expect(result.totalAmount).toBe(69.97);
    });
  });
  describe('GET /orders', () => {
    it('should return array of orders', async () => {
      const orders = [
        {
          id: 1,
          userId: 1,
          orderNumber: 'ORD1234567890',
          items: [
            {
              id: 1,
              orderId: 1,
              productId: 1,
              quantity: 2,
              unitPrice: 19.99,
              totalPrice: 39.98,
              productSnapshot: {
                name: 'Test Product',
                image: 'test.jpg',
                specifications: {},
              },
              order: {} as any, // 避免循环引用
              product: {} as any, // 避免循环引用
            },
          ],
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 39.98,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: 2,
          orderNumber: 'ORD1234567891',
          items: [
            {
              id: 2,
              orderId: 2,
              productId: 2,
              quantity: 1,
              unitPrice: 29.99,
              totalPrice: 29.99,
              productSnapshot: {
                name: 'Test Product 2',
                image: 'test2.jpg',
                specifications: {},
              },
              order: {} as any, // 避免循环引用
              product: {} as any, // 避免循环引用
            },
          ],
          status: OrderStatus.SHIPPED,
          paymentStatus: PaymentStatus.PAID,
          totalAmount: 29.99,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(ordersService, 'findAll').mockResolvedValue({
        orders: orders,
        total: 2,
      });

      const result = await controller.findAll(1, 10);

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(2);
      expect(ordersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle pagination parameters', async () => {
      jest.spyOn(ordersService, 'findAll').mockResolvedValue({
        orders: [],
        total: 0,
      });

      const result = await controller.findAll(2, 5);

      expect(ordersService.findAll).toHaveBeenCalledWith(2, 5);
    });

    it('should handle status filter', async () => {
      jest.spyOn(ordersService, 'findAll').mockResolvedValue({
        orders: [],
        total: 0,
      });

      await controller.findAll(1, 10, 'shipped');

      expect(ordersService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle date range filter', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';

      jest.spyOn(ordersService, 'findAll').mockResolvedValue({
        orders: [],
        total: 0,
      });

      await controller.findAll(1, 10, undefined, startDate, endDate);

      expect(ordersService.findAll).toHaveBeenCalledWith(1, 10);
    });
  });
  price: 29.99;
  describe('GET /orders/user/:userId', () => {
    it('should return orders for a specific user', async () => {
      const userId = 1;
      const orders = [
        {
          id: 1,
          userId: 1,
          orderNumber: 'ORD1234567890',
          items: [
            {
              id: 1,
              orderId: 1,
              productId: 1,
              quantity: 2,
              unitPrice: 19.99,
              totalPrice: 39.98,
              productSnapshot: {
                name: 'Test Product',
                image: 'test.jpg',
                specifications: {},
              },
              order: {} as any, // 避免循环引用
              product: {} as any, // 避免循环引用
            },
          ],
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          totalAmount: 39.98,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(ordersService, 'findByUserId').mockResolvedValue({
        orders: orders,
        total: 1,
      });

      const result = await controller.findByUserId(userId, 1, 10);

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
      expect(ordersService.findByUserId).toHaveBeenCalledWith(userId, 1, 10);
    });

    it('should handle user not found', async () => {
      const userId = 999;

      jest
        .spyOn(ordersService, 'findByUserId')
        .mockRejectedValue(new NotFoundException('用户不存在'));

      await expect(controller.findByUserId(userId, 1, 10)).rejects.toThrow(NotFoundException);
    });

    it('should handle pagination parameters', async () => {
      const userId = 1;

      jest.spyOn(ordersService, 'findByUserId').mockResolvedValue({
        orders: [],
        total: 0,
      });

      const result = await controller.findByUserId(userId, 2, 5);

      expect(result.orders).toEqual([]);
      expect(ordersService.findByUserId).toHaveBeenCalledWith(userId, 2, 5);
    });

    it('should handle status filter', async () => {
      const userId = 1;

      jest.spyOn(ordersService, 'findByUserId').mockResolvedValue({
        orders: [],
        total: 0,
      });

      await controller.findByUserId(userId, 1, 10, 'shipped' as OrderStatus);

      expect(ordersService.findByUserId).toHaveBeenCalledWith(userId, 1, 10);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order by id', async () => {
      const order = {
        id: 1,
        userId: 1,
        orderNumber: 'ORD1234567890',
        totalAmount: 39.98,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ordersService, 'findById').mockResolvedValue(order);

      const result = await controller.findOne(1);

      expect(result).toEqual(order);
      expect(ordersService.findById).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent order', async () => {
      jest.spyOn(ordersService, 'findById').mockRejectedValue(new NotFoundException('订单不存在'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid id format', async () => {
      jest
        .spyOn(ordersService, 'findById')
        .mockRejectedValue(new BadRequestException('无效的订单ID'));

      await expect(controller.findOne(0)).rejects.toThrow(BadRequestException);
    });

    it('should include user information', async () => {
      const order = {
        id: 1,
        userId: 1,
        orderNumber: 'ORD1234567890',
        totalAmount: 39.98,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashedPassword',
          role: 'user' as any,
          isActive: true,
          avatar: '',
          phone: '',
          casdoorId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          loginCount: 0,
          failedLoginAttempts: 0,
          lastFailedLoginAt: null as any,
          accountLockedUntil: null as any,
          addresses: [],
          customerProfile: null as any,
        },
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ordersService, 'findById').mockResolvedValue(order);

      const result = await controller.findOne(1);

      expect(result).toEqual(order);
      expect(ordersService.findById).toHaveBeenCalledWith(1);

      if (result) {
        expect(result.user).toBeDefined();
        if (result.user) {
          expect(result.user.username).toBe('testuser');
        }
      }
    });
  });

  describe('PUT /orders/:id', () => {
    it('should update order successfully', async () => {
      const updateOrderDto = {
        status: 'processing',
      };

      const existingOrder = {
        id: 1,
        userId: 1,
        orderNumber: 'ORD1234567890',
        totalAmount: 39.98,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedOrder = {
        ...existingOrder,
        ...updateOrderDto,
        status: OrderStatus.CONFIRMED,
        updatedAt: new Date(),
      };

      jest.spyOn(ordersService, 'findById').mockResolvedValue(existingOrder);
      jest.spyOn(ordersService, 'update').mockResolvedValue(updatedOrder);

      const result = await controller.update(1, updateOrderDto);

      expect(result).toEqual(updatedOrder);
      expect(ordersService.update).toHaveBeenCalledWith(1, updateOrderDto);
    });

    it('should throw error for non-existent order', async () => {
      jest.spyOn(ordersService, 'update').mockRejectedValue(new Error('订单不存在'));

      const updateDto = { status: 'processing' };

      await expect(controller.update(999, updateDto)).rejects.toThrow(Error);
    });

    it('should validate status update', async () => {
      const existingOrder = {
        id: 1,
        userId: 1,
        orderNumber: 'ORD1234567890',
        totalAmount: 39.98,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ordersService, 'findById').mockResolvedValue(existingOrder);

      const invalidUpdateDto = {
        status: 'invalid_status',
      };

      jest.spyOn(ordersService, 'update').mockRejectedValue(new Error('无效的订单状态'));

      await expect(controller.update(1, invalidUpdateDto)).rejects.toThrow(Error);
    });

    it('should not allow update of immutable fields', async () => {
      const existingOrder = {
        id: 1,
        userId: 1,
        orderNumber: 'ORD1234567890',
        totalAmount: 39.98,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: 19.99,
            totalPrice: 39.98,
            productSnapshot: {
              name: 'Test Product',
              image: 'test.jpg',
              specifications: {},
            },
            order: {} as any, // 避免循环引用
            product: {} as any, // 避免循环引用
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ordersService, 'findById').mockResolvedValue(existingOrder);

      const updateWithImmutableFields = {
        id: 999,
        userId: 2,
      };

      const updatedOrder = {
        ...existingOrder,
        updatedAt: new Date(),
      };

      jest.spyOn(ordersService, 'update').mockResolvedValue(updatedOrder);

      const result = await controller.update(1, updateWithImmutableFields);

      expect(result.id).toBe(1); // ID should not change
      expect(result.userId).toBe(1); // User ID should not change
    });
  });

  describe('DELETE /orders/:id', () => {
    it('should delete order successfully', async () => {
      jest.spyOn(ordersService, 'delete').mockResolvedValue(undefined);

      await expect(controller.remove(1)).resolves.toBeUndefined();
      expect(ordersService.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent order', async () => {
      jest.spyOn(ordersService, 'delete').mockRejectedValue(new Error('订单不存在'));

      await expect(controller.remove(999)).rejects.toThrow(Error);
    });

    it('should handle invalid id format', async () => {
      jest.spyOn(ordersService, 'delete').mockRejectedValue(new Error('无效的订单ID'));

      await expect(controller.remove(0)).rejects.toThrow(Error);
    });

    it('should not allow deletion of completed orders', async () => {
      jest.spyOn(ordersService, 'delete').mockRejectedValue(new Error('无法删除已完成的订单'));

      await expect(controller.remove(1)).rejects.toThrow(Error);
    });
  });

  describe('GET /orders/statistics/overview', () => {
    it('should return order statistics', async () => {
      const statistics = {
        totalOrders: 100,
        pendingOrders: 20,
        completedOrders: 80,
        totalRevenue: 5000.0,
      };

      jest.spyOn(ordersService, 'getStatistics').mockResolvedValue(statistics);

      const result = await controller.getStatistics();

      expect(result).toEqual(statistics);
      expect(ordersService.getStatistics).toHaveBeenCalled();
    });

    it('should handle empty statistics', async () => {
      const statistics = {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0.0,
      };

      jest.spyOn(ordersService, 'getStatistics').mockResolvedValue(statistics);

      const result = await controller.getStatistics();

      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(ordersService.getStatistics).toHaveBeenCalled();
    });
  });
});
