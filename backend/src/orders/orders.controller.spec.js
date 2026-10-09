"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
const products_service_1 = require("../products/products.service");
const users_service_1 = require("../users/users.service");
const config_1 = require("@nestjs/config");
const typed_mock_factory_1 = require("../../test/utils/typed-mock-factory");
const order_entity_1 = require("./entities/order.entity");
const common_1 = require("@nestjs/common");
const reqOf = (sub = 1, role = 'user') => ({ user: { sub, email: 'spec@test.local', role } });
describe('OrdersController', () => {
    let controller;
    let ordersService;
    const mockOrdersService = {
        create: (0, typed_mock_factory_1.createMockedFunction)(),
        findAll: (0, typed_mock_factory_1.createMockedFunction)(),
        findOne: (0, typed_mock_factory_1.createMockedFunction)(),
        update: (0, typed_mock_factory_1.createMockedFunction)(),
        remove: (0, typed_mock_factory_1.createMockedFunction)(),
        findByUserId: (0, typed_mock_factory_1.createMockedFunction)(),
        updateStatus: (0, typed_mock_factory_1.createMockedFunction)(),
        getStatistics: (0, typed_mock_factory_1.createMockedFunction)(),
        findById: (0, typed_mock_factory_1.createMockedFunction)(),
        delete: (0, typed_mock_factory_1.createMockedFunction)(),
    };
    const mockProductsService = {
        findOne: (0, typed_mock_factory_1.createMockedFunction)(),
    };
    const mockUsersService = {
        findOne: (0, typed_mock_factory_1.createMockedFunction)(),
    };
    const mockConfigService = {
        get: (0, typed_mock_factory_1.createMockedFunction)(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [orders_controller_1.OrdersController],
            providers: [
                {
                    provide: orders_service_1.OrdersService,
                    useValue: mockOrdersService,
                },
                {
                    provide: products_service_1.ProductsService,
                    useValue: mockProductsService,
                },
                {
                    provide: users_service_1.UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: config_1.ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();
        controller = module.get(orders_controller_1.OrdersController);
        ordersService = module.get(orders_service_1.OrdersService);
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
                        unitPrice: 19.99,
                    },
                ],
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                billingAddress: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA',
                },
                recipientName: '测购人',
                recipientPhone: '13800138000',
                paymentMethod: 'alipay',
            };
            const createdOrder = {
                id: 1,
                ...createOrderDto,
                orderNumber: 'ORD1234567890',
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
                totalAmount: 39.98,
                createdAt: new Date(),
                updatedAt: new Date(),
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                recipientName: 'John Doe',
                recipientPhone: '123-456-7890',
                paymentMethod: 'alipay',
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
                        order: {},
                        product: {},
                    },
                ],
            };
            jest.spyOn(ordersService, 'create').mockResolvedValue(createdOrder);
            const result = await controller.create(createOrderDto, reqOf(1));
            expect(result).toEqual(createdOrder);
            expect(ordersService.create).toHaveBeenCalledWith({ ...createOrderDto, userId: 1 });
        });
        it('should throw error for invalid user', async () => {
            const createOrderDto = {
                userId: 999,
                items: [
                    {
                        productId: 1,
                        quantity: 2,
                        unitPrice: 19.99,
                    },
                ],
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                recipientName: '测购人',
                recipientPhone: '13800138000',
                paymentMethod: 'alipay',
            };
            jest.spyOn(ordersService, 'create').mockRejectedValue(new common_1.NotFoundException('用户不存在'));
            await expect(controller.create(createOrderDto, reqOf(1))).rejects.toThrow(new common_1.NotFoundException('用户不存在'));
        });
        it('should throw error for invalid product', async () => {
            const createOrderDto = {
                userId: 1,
                items: [
                    {
                        productId: 999,
                        quantity: 2,
                        unitPrice: 19.99,
                    },
                ],
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                recipientName: '测购人',
                recipientPhone: '13800138000',
                paymentMethod: 'alipay',
            };
            jest.spyOn(ordersService, 'create').mockRejectedValue(new common_1.NotFoundException('产品不存在'));
            await expect(controller.create(createOrderDto, reqOf(1))).rejects.toThrow(new common_1.NotFoundException('产品不存在'));
        });
        it('should throw error for insufficient stock', async () => {
            const createOrderDto = {
                userId: 1,
                items: [
                    {
                        productId: 1,
                        quantity: 200,
                        unitPrice: 19.99,
                    },
                ],
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                recipientName: '测购人',
                recipientPhone: '13800138000',
                paymentMethod: 'alipay',
            };
            jest.spyOn(ordersService, 'create').mockRejectedValue(new common_1.BadRequestException('库存不足'));
            await expect(controller.create(createOrderDto, reqOf(1))).rejects.toThrow(new common_1.BadRequestException('库存不足'));
        });
        it('should validate required fields', async () => {
            const invalidDto = {
                userId: 1,
                items: [],
                shippingAddress: '123 Main St, New York, NY 10001, USA',
            };
            jest.spyOn(ordersService, 'create').mockRejectedValue(new Error('无效的订单数据'));
            await expect(controller.create(invalidDto, reqOf(1))).rejects.toThrow(new Error('无效的订单数据'));
        });
        it('should calculate total amount correctly', async () => {
            const createOrderDto = {
                userId: 1,
                items: [
                    {
                        productId: 1,
                        quantity: 2,
                        unitPrice: 19.99,
                    },
                    {
                        productId: 2,
                        quantity: 1,
                        unitPrice: 29.99,
                    },
                ],
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                recipientName: '测购人',
                recipientPhone: '13800138000',
                paymentMethod: 'alipay',
            };
            const createdOrder = {
                id: 1,
                ...createOrderDto,
                orderNumber: 'ORD1234567890',
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
                totalAmount: 69.97,
                createdAt: new Date(),
                updatedAt: new Date(),
                shippingAddress: '123 Main St, New York, NY 10001, USA',
                recipientName: 'John Doe',
                recipientPhone: '123-456-7890',
                paymentMethod: 'alipay',
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
                        order: {},
                        product: {},
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
                        order: {},
                        product: {},
                    },
                ],
            };
            jest.spyOn(ordersService, 'create').mockResolvedValue(createdOrder);
            const result = await controller.create(createOrderDto, reqOf(1));
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
                            order: {},
                            product: {},
                        },
                    ],
                    status: order_entity_1.OrderStatus.PENDING,
                    paymentStatus: order_entity_1.PaymentStatus.PENDING,
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
                            order: {},
                            product: {},
                        },
                    ],
                    status: order_entity_1.OrderStatus.SHIPPED,
                    paymentStatus: order_entity_1.PaymentStatus.PAID,
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
    unitPrice: 29.99;
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
                            order: {},
                            product: {},
                        },
                    ],
                    status: order_entity_1.OrderStatus.PENDING,
                    paymentStatus: order_entity_1.PaymentStatus.PENDING,
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
                .mockRejectedValue(new common_1.NotFoundException('用户不存在'));
            await expect(controller.findByUserId(userId, 1, 10)).rejects.toThrow(new common_1.NotFoundException('用户不存在'));
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
            await controller.findByUserId(userId, 1, 10, 'shipped');
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
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
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
                        order: {},
                        product: {},
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(ordersService, 'findById').mockResolvedValue(order);
            const result = await controller.findOne(1, reqOf(1));
            expect(result).toEqual(order);
            expect(ordersService.findById).toHaveBeenCalledWith(1);
        });
        it('should throw error for non-existent order', async () => {
            jest.spyOn(ordersService, 'findById').mockRejectedValue(new common_1.NotFoundException('订单不存在'));
            await expect(controller.findOne(999, reqOf(1))).rejects.toThrow(new common_1.NotFoundException('订单不存在'));
        });
        it('should handle invalid id format', async () => {
            jest
                .spyOn(ordersService, 'findById')
                .mockRejectedValue(new common_1.BadRequestException('无效的订单ID'));
            await expect(controller.findOne(0, reqOf(1))).rejects.toThrow(new common_1.BadRequestException('无效的订单ID'));
        });
        it('should include user information', async () => {
            const order = {
                id: 1,
                userId: 1,
                orderNumber: 'ORD1234567890',
                totalAmount: 39.98,
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'hashedPassword',
                    role: 'user',
                    isActive: true,
                    avatar: '',
                    phone: '',
                    casdoorId: '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastLoginAt: new Date(),
                    loginCount: 0,
                    failedLoginAttempts: 0,
                    lastFailedLoginAt: null,
                    accountLockedUntil: null,
                    addresses: [],
                    customerProfile: null,
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
                        order: {},
                        product: {},
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            jest.spyOn(ordersService, 'findById').mockResolvedValue(order);
            const result = await controller.findOne(1, reqOf(1));
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
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
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
                        order: {},
                        product: {},
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const updatedOrder = {
                ...existingOrder,
                ...updateOrderDto,
                status: order_entity_1.OrderStatus.CONFIRMED,
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
            await expect(controller.update(999, updateDto)).rejects.toThrow(new Error('订单不存在'));
        });
        it('should validate status update', async () => {
            const existingOrder = {
                id: 1,
                userId: 1,
                orderNumber: 'ORD1234567890',
                totalAmount: 39.98,
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
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
                        order: {},
                        product: {},
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
            await expect(controller.update(1, invalidUpdateDto)).rejects.toThrow(new Error('无效的订单状态'));
        });
        it('should not allow update of immutable fields', async () => {
            const existingOrder = {
                id: 1,
                userId: 1,
                orderNumber: 'ORD1234567890',
                totalAmount: 39.98,
                status: order_entity_1.OrderStatus.PENDING,
                paymentStatus: order_entity_1.PaymentStatus.PENDING,
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
                        order: {},
                        product: {},
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
            expect(result.id).toBe(1);
            expect(result.userId).toBe(1);
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
            await expect(controller.remove(999)).rejects.toThrow(new Error('订单不存在'));
        });
        it('should handle invalid id format', async () => {
            jest.spyOn(ordersService, 'delete').mockRejectedValue(new Error('无效的订单ID'));
            await expect(controller.remove(0)).rejects.toThrow(new Error('无效的订单ID'));
        });
        it('should not allow deletion of completed orders', async () => {
            jest.spyOn(ordersService, 'delete').mockRejectedValue(new Error('无法删除已完成的订单'));
            await expect(controller.remove(1)).rejects.toThrow(new Error('无法删除已完成的订单'));
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
