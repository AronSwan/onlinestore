"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const orders_service_1 = require("./orders.service");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
const order_entity_2 = require("./entities/order.entity");
const monitoring_service_1 = require("../monitoring/monitoring.service");
const order_events_service_1 = require("../messaging/order-events.service");
const audit_service_1 = require("../common/audit/audit.service");
const typed_mock_factory_1 = require("../../test/utils/typed-mock-factory");
const mockCategory = {
    id: 1,
    name: '测试分类',
    slug: 'test-category',
    description: '测试分类描述',
    icon: '',
    isActive: true,
    sortOrder: 1,
    children: [],
    parent: undefined,
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
};
const mockProduct = {
    id: 1,
    name: '测试产品',
    description: '测试产品描述',
    price: 100,
    originalPrice: 120,
    stock: 50,
    views: 0,
    sales: 0,
    favorites: 0,
    isActive: true,
    mainImage: '',
    tags: [],
    specifications: {},
    category: mockCategory,
    images: [],
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
};
const mockOrder = {
    id: 1,
    orderNumber: 'ORD1234567890',
    userId: 1,
    totalAmount: 200,
    status: order_entity_2.OrderStatus.PENDING,
    paymentStatus: order_entity_2.PaymentStatus.PENDING,
    shippingAddress: '测试地址',
    recipientName: '测试收件人',
    recipientPhone: '13800138000',
    paymentMethod: 'alipay',
    notes: '测试备注',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    user: undefined,
};
const mockOrderItem = {
    id: 1,
    orderId: 1,
    productId: 1,
    quantity: 2,
    unitPrice: 100,
    totalPrice: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
};
const mockOrderRepository = {
    create: (0, typed_mock_factory_1.createMockedFunction)(),
    save: (0, typed_mock_factory_1.createMockedFunction)(),
    findOne: (0, typed_mock_factory_1.createMockedFunction)(),
    findAndCount: (0, typed_mock_factory_1.createMockedFunction)(),
    update: (0, typed_mock_factory_1.createMockedFunction)(),
    delete: (0, typed_mock_factory_1.createMockedFunction)(),
    count: (0, typed_mock_factory_1.createMockedFunction)(),
    createQueryBuilder: (0, typed_mock_factory_1.createMockedFunction)(),
    manager: {
        transaction: (0, typed_mock_factory_1.createMockedFunction)(),
    },
};
const mockOrderItemRepository = {
    create: (0, typed_mock_factory_1.createMockedFunction)(),
    save: (0, typed_mock_factory_1.createMockedFunction)(),
    find: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockProductRepository = {
    findOne: (0, typed_mock_factory_1.createMockedFunction)(),
    createQueryBuilder: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockMonitoringService = {
    observeDbQuery: (0, typed_mock_factory_1.createMockedFunction)(),
    incrementKafkaDlqMessages: (0, typed_mock_factory_1.createMockedFunction)(),
    getCurrentTraceId: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockOrderEventsService = {
    publishOrderCreated: (0, typed_mock_factory_1.createMockedFunction)(),
    publishOrderStatusUpdated: (0, typed_mock_factory_1.createMockedFunction)(),
    getMessageHistory: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockAuditService = {
    log: (0, typed_mock_factory_1.createMockedFunction)(),
};
const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
};
const mockTransactionManager = {
    getRepository: jest.fn(),
};
describe('OrdersService', () => {
    let service;
    let orderRepository;
    let orderItemRepository;
    let productRepository;
    let monitoringService;
    let orderEventsService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                orders_service_1.OrdersService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(order_entity_1.Order),
                    useValue: mockOrderRepository,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(order_item_entity_1.OrderItem),
                    useValue: mockOrderItemRepository,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(product_entity_1.Product),
                    useValue: mockProductRepository,
                },
                {
                    provide: monitoring_service_1.MonitoringService,
                    useValue: mockMonitoringService,
                },
                {
                    provide: order_events_service_1.OrderEventsService,
                    useValue: mockOrderEventsService,
                },
                {
                    provide: audit_service_1.AuditService,
                    useValue: mockAuditService,
                },
            ],
        }).compile();
        service = module.get(orders_service_1.OrdersService);
        orderRepository = module.get((0, typeorm_1.getRepositoryToken)(order_entity_1.Order));
        orderItemRepository = module.get((0, typeorm_1.getRepositoryToken)(order_item_entity_1.OrderItem));
        productRepository = module.get((0, typeorm_1.getRepositoryToken)(product_entity_1.Product));
        monitoringService = module.get(monitoring_service_1.MonitoringService);
        orderEventsService = module.get(order_events_service_1.OrderEventsService);
        jest.clearAllMocks();
        mockOrderRepository.manager.transaction.mockImplementation(async (callback) => {
            return callback(mockTransactionManager);
        });
        mockTransactionManager.getRepository.mockImplementation((entity) => {
            if (entity === order_entity_1.Order)
                return {
                    ...mockOrderRepository,
                    create: jest.fn(),
                    save: jest.fn(),
                };
            if (entity === order_item_entity_1.OrderItem)
                return {
                    ...mockOrderItemRepository,
                    create: jest.fn(),
                    save: jest.fn(),
                };
            if (entity === product_entity_1.Product)
                return {
                    ...mockProductRepository,
                    findOne: jest.fn(),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        update: jest.fn().mockReturnThis(),
                        set: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        andWhere: jest.fn().mockReturnThis(),
                        execute: jest.fn().mockResolvedValue({ affected: 1 }),
                    }),
                };
            return mockOrderRepository;
        });
        mockProductRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
        mockOrderRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });
    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });
        it('should have all dependencies injected', () => {
            expect(orderRepository).toBeDefined();
            expect(orderItemRepository).toBeDefined();
            expect(productRepository).toBeDefined();
            expect(monitoringService).toBeDefined();
            expect(orderEventsService).toBeDefined();
        });
    });
    describe('Create Order', () => {
        const createOrderData = {
            userId: 1,
            items: [
                {
                    productId: 1,
                    quantity: 2,
                    unitPrice: 100,
                },
            ],
            totalAmount: 200,
            shippingAddress: '测试地址',
            recipientName: '测试收件人',
            recipientPhone: '13800138000',
            paymentMethod: 'alipay',
            notes: '测试备注',
        };
        it('should successfully create a new order', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({ ...mockProduct, version: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockOrderEventsService.publishOrderCreated.mockResolvedValue(undefined);
            mockMonitoringService.getCurrentTraceId.mockReturnValue('test-trace-id');
            const result = await service.create(createOrderData);
            expect(result).toEqual(mockOrder);
            expect(productRepo.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
            });
            expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                orderNumber: expect.stringMatching(/^ORD/),
                userId: 1,
                totalAmount: 200,
                status: order_entity_2.OrderStatus.PENDING,
                paymentStatus: order_entity_2.PaymentStatus.PENDING,
            }));
            expect(orderItemRepo.create).toHaveBeenCalledWith({
                orderId: 1,
                productId: 1,
                quantity: 2,
                unitPrice: 100,
                totalPrice: 200,
                productSnapshot: { name: '测试产品', image: '', specifications: {} },
            });
            expect(mockOrderEventsService.publishOrderCreated).toHaveBeenCalled();
        });
        it('M5：下单扣到 0 → 同事务置 isActive=false + 提交后落 PRODUCT_AUTO_UNLIST 审计行', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({ ...mockProduct, stock: 2, version: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockAuditService.log.mockResolvedValue({});
            await service.create(createOrderData);
            expect(productRepo.update).toHaveBeenCalledWith({ id: 1 }, { isActive: false });
            expect(mockAuditService.log).toHaveBeenCalledTimes(1);
            const [action, result, context, description, , , newValues] = mockAuditService.log.mock.calls[0];
            expect(action).toBe('PRODUCT_AUTO_UNLIST');
            expect(result).toBe('SUCCESS');
            expect(context).toMatchObject({ resourceType: 'products', resourceId: '1', httpMethod: 'AUTO' });
            expect(String(description)).toContain('auto: stock=0');
            expect(newValues).toMatchObject({ event: 'auto: stock=0', productId: 1, stockAfter: 0, isActive: false });
        });
        it('M5：扣减后仍有余量（stock>quantity）→ 不下架不落审计行', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({ ...mockProduct, stock: 50, version: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
                update: jest.fn(),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            await service.create(createOrderData);
            expect(productRepo.update).not.toHaveBeenCalled();
            expect(mockAuditService.log).not.toHaveBeenCalled();
        });
        it('M5：审计行写入失败 → 订单仍成立（已提交事务不因旁路审计回滚）', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({ ...mockProduct, stock: 2, version: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockAuditService.log.mockRejectedValue(new Error('链写暂时失败'));
            await expect(service.create(createOrderData)).resolves.toBe(mockOrder);
        });
        it('should throw error when product is not found', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue(null),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            await expect(service.create(createOrderData)).rejects.toThrow('产品 1 库存不足');
        });
        it('should throw error when product stock is insufficient', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({
                    ...mockProduct,
                    stock: 1,
                    version: 1,
                }),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            await expect(service.create(createOrderData)).rejects.toThrow('产品 1 库存不足');
        });
        it('should handle event publishing errors gracefully', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({ ...mockProduct, version: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockOrderEventsService.publishOrderCreated.mockRejectedValue(new Error('Event failed'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const result = await service.create(createOrderData);
            expect(result).toEqual(mockOrder);
            expect(consoleSpy).toHaveBeenCalledWith('发布订单创建事件失败:', expect.any(Error));
            consoleSpy.mockRestore();
        });
        it('should generate unique order numbers', async () => {
            const createData = { ...createOrderData, items: [{ ...createOrderData.items[0] }] };
            const productRepo = {
                findOne: jest.fn().mockResolvedValue({ ...mockProduct, version: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
            };
            const orderRepo = {
                create: jest.fn().mockImplementation(data => ({
                    ...mockOrder,
                    ...data,
                    orderNumber: data.orderNumber || `ORD${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                })),
                save: jest.fn().mockImplementation(order => Promise.resolve(order)),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockOrderEventsService.publishOrderCreated.mockResolvedValue(undefined);
            const result1 = await service.create(createData);
            await new Promise(resolve => setTimeout(resolve, 1));
            const result2 = await service.create(createData);
            expect(result1.orderNumber).not.toBe(result2.orderNumber);
            expect(result1.orderNumber).toMatch(/^ORD/);
            expect(result2.orderNumber).toMatch(/^ORD/);
        });
    });
    describe('Find Order By ID', () => {
        it('should return order when found', async () => {
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            const result = await service.findById(1);
            expect(result).toEqual(mockOrder);
            expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: { items: true, user: true },
            });
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('detail', 'orders', expect.any(Number));
        });
        it('should return null when order not found', async () => {
            mockOrderRepository.findOne.mockResolvedValue(null);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            const result = await service.findById(999);
            expect(result).toBeNull();
        });
    });
    describe('Find Orders By User ID', () => {
        it('should return orders for specific user', async () => {
            const orders = [mockOrder];
            const total = 1;
            mockOrderRepository.findAndCount.mockResolvedValue([orders, total]);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            const result = await service.findByUserId(1, 1, 10);
            expect(result).toEqual({ orders, total });
            expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith({
                where: { userId: 1 },
                relations: { items: true },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 10,
            });
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('list', 'orders', expect.any(Number));
        });
        it('should handle pagination correctly', async () => {
            const orders = [mockOrder, mockOrder];
            const total = 2;
            mockOrderRepository.findAndCount.mockResolvedValue([orders, total]);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            const result = await service.findByUserId(1, 2, 5);
            expect(result).toEqual({ orders, total });
            expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith({
                where: { userId: 1 },
                relations: { items: true },
                order: { createdAt: 'DESC' },
                skip: 5,
                take: 5,
            });
        });
    });
    describe('Find All Orders', () => {
        it('should return all orders with pagination', async () => {
            const orders = [mockOrder, mockOrder];
            const total = 2;
            mockOrderRepository.findAndCount.mockResolvedValue([orders, total]);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            const result = await service.findAll(1, 10);
            expect(result).toEqual({ orders, total });
            expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith({
                relations: { items: true, user: true },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 10,
            });
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('list', 'orders', expect.any(Number));
        });
    });
    describe('Update Order', () => {
        const updateOrderData = {
            status: order_entity_2.OrderStatus.SHIPPED,
            paymentStatus: order_entity_2.PaymentStatus.PAID,
            shippingCompany: '顺丰',
            trackingNumber: 'SF1234567890',
            notes: '更新备注',
        };
        it('should successfully update order', async () => {
            mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);
            const updatedOrder = {
                ...mockOrder,
                status: order_entity_2.OrderStatus.SHIPPED,
                paymentStatus: order_entity_2.PaymentStatus.PAID,
                shippedAt: expect.any(Date),
                paidAt: expect.any(Date),
            };
            mockOrderRepository.findOne.mockResolvedValueOnce(updatedOrder);
            mockOrderRepository.update.mockResolvedValue({ affected: 1 });
            mockOrderEventsService.publishOrderStatusUpdated.mockResolvedValue(undefined);
            const result = await service.update(1, updateOrderData);
            expect(result).toEqual(updatedOrder);
            expect(mockOrderRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
                status: order_entity_2.OrderStatus.SHIPPED,
                paymentStatus: order_entity_2.PaymentStatus.PAID,
                shippingCompany: '顺丰',
                trackingNumber: 'SF1234567890',
                notes: '更新备注',
                shippedAt: expect.any(Date),
                paidAt: expect.any(Date),
            }));
            expect(mockOrderEventsService.publishOrderStatusUpdated).toHaveBeenCalledWith(expect.objectContaining({
                orderId: 1,
                oldStatus: order_entity_2.OrderStatus.SHIPPED,
                newStatus: order_entity_2.OrderStatus.SHIPPED,
                updatedBy: 'system',
                timestamp: expect.any(String),
            }));
        });
        it('should set completedAt when status is DELIVERED', async () => {
            mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);
            const completedOrder = {
                ...mockOrder,
                status: order_entity_2.OrderStatus.DELIVERED,
                completedAt: expect.any(Date),
            };
            mockOrderRepository.findOne.mockResolvedValueOnce(completedOrder);
            mockOrderRepository.update.mockResolvedValue({ affected: 1 });
            mockOrderEventsService.publishOrderStatusUpdated.mockResolvedValue(undefined);
            const result = await service.update(1, { status: order_entity_2.OrderStatus.DELIVERED });
            expect(result).toEqual(completedOrder);
            expect(mockOrderRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
                status: order_entity_2.OrderStatus.DELIVERED,
                completedAt: expect.any(Date),
            }));
        });
        it('should throw error when order not found', async () => {
            mockOrderRepository.findOne.mockResolvedValue(null);
            await expect(service.update(999, updateOrderData)).rejects.toThrow('订单不存在');
        });
        it('should handle event publishing errors gracefully', async () => {
            mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);
            const updatedOrder = { ...mockOrder, status: order_entity_2.OrderStatus.SHIPPED };
            mockOrderRepository.findOne.mockResolvedValueOnce(updatedOrder);
            mockOrderRepository.update.mockResolvedValue({ affected: 1 });
            mockOrderEventsService.publishOrderStatusUpdated.mockRejectedValue(new Error('Event failed'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const result = await service.updateStatus(1, order_entity_2.OrderStatus.SHIPPED);
            await new Promise(resolve => setImmediate(resolve));
            expect(result).toEqual(updatedOrder);
            expect(consoleSpy).toHaveBeenCalledWith('发布订单状态更新事件失败:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
    describe('Delete Order', () => {
        it('should successfully delete order', async () => {
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockOrderRepository.delete.mockResolvedValue({ affected: 1 });
            await service.delete(1);
            expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: { items: true, user: true },
            });
            expect(mockOrderRepository.delete).toHaveBeenCalledWith(1);
        });
        it('should throw error when order not found', async () => {
            mockOrderRepository.findOne.mockResolvedValue(null);
            await expect(service.delete(999)).rejects.toThrow('订单不存在');
        });
    });
    describe('Get Message History', () => {
        it('should return message history', async () => {
            const messages = [{ id: 1, topic: 'test', message: 'test message', timestamp: new Date() }];
            mockOrderEventsService.getMessageHistory.mockResolvedValue(messages);
            const result = await service.getMessageHistory('test-topic', 10, 0);
            expect(result).toEqual(messages);
            expect(mockOrderEventsService.getMessageHistory).toHaveBeenCalledWith('test-topic', 10, 0);
        });
        it('should handle query errors and increment DLQ metrics', async () => {
            const error = new Error('Query failed');
            mockOrderEventsService.getMessageHistory.mockRejectedValue(error);
            await expect(service.getMessageHistory('test-topic', 10, 0)).rejects.toThrow(error);
            expect(mockMonitoringService.incrementKafkaDlqMessages).toHaveBeenCalledWith('test-topic', 'query_error');
        });
    });
    describe('Get Statistics', () => {
        it('should return order statistics', async () => {
            mockOrderRepository.count.mockReset();
            mockOrderRepository.count
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(20)
                .mockResolvedValueOnce(70);
            const queryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ totalRevenue: '5000.00' }),
            };
            mockOrderRepository.createQueryBuilder.mockReturnValue(queryBuilder);
            const result = await service.getStatistics();
            expect(result).toEqual({
                totalOrders: 100,
                pendingOrders: 20,
                completedOrders: 70,
                totalRevenue: 5000.0,
            });
            expect(mockOrderRepository.count).toHaveBeenCalledTimes(3);
            expect(queryBuilder.getRawOne).toHaveBeenCalled();
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledTimes(4);
        });
        it('should handle zero revenue correctly', async () => {
            mockOrderRepository.count.mockReset();
            mockOrderRepository.count
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);
            const queryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ totalRevenue: null }),
            };
            mockOrderRepository.createQueryBuilder.mockReturnValue(queryBuilder);
            const result = await service.getStatistics();
            expect(result.totalRevenue).toBe(0);
        });
    });
    describe('Private Methods', () => {
        describe('generateOrderNumber', () => {
            it('should generate unique order numbers', () => {
                const orderNumber1 = service.generateOrderNumber();
                const orderNumber2 = service.generateOrderNumber();
                expect(orderNumber1).toMatch(/^ORD/);
                expect(orderNumber2).toMatch(/^ORD/);
                expect(orderNumber1).not.toBe(orderNumber2);
            });
            it('should generate order numbers with correct format', () => {
                const orderNumber = service.generateOrderNumber();
                expect(orderNumber).toMatch(/^ORD\d+[a-zA-Z0-9]+$/);
                expect(orderNumber.length).toBeGreaterThan(10);
            });
        });
        describe('publishOrderCreatedEvent', () => {
            it('should publish order created event with correct structure', async () => {
                mockOrderEventsService.publishOrderCreated.mockResolvedValue(undefined);
                mockMonitoringService.getCurrentTraceId.mockReturnValue('test-trace-id');
                const items = [{ productId: 1, quantity: 2, unitPrice: 100 }];
                await service.publishOrderCreatedEvent(mockOrder, items);
                expect(mockOrderEventsService.publishOrderCreated).toHaveBeenCalledWith({
                    eventId: expect.stringMatching(/^evt_\d+_[a-zA-Z0-9]+$/),
                    orderId: 1,
                    orderNumber: 'ORD1234567890',
                    userId: 1,
                    totalAmount: 200,
                    items: [
                        {
                            productId: 1,
                            quantity: 2,
                            unitPrice: 100,
                        },
                    ],
                    timestamp: expect.any(String),
                    metadata: {
                        source: 'orders-service',
                        attempt: 1,
                        traceId: 'test-trace-id',
                    },
                });
            });
        });
        describe('publishOrderStatusUpdatedEvent', () => {
            it('should publish order status updated event with correct structure', async () => {
                mockOrderEventsService.publishOrderStatusUpdated.mockResolvedValue(undefined);
                await service.publishOrderStatusUpdatedEvent(mockOrder, order_entity_2.OrderStatus.SHIPPED);
                expect(mockOrderEventsService.publishOrderStatusUpdated).toHaveBeenCalledWith({
                    orderId: 1,
                    oldStatus: order_entity_2.OrderStatus.PENDING,
                    newStatus: order_entity_2.OrderStatus.SHIPPED,
                    updatedBy: 'system',
                    timestamp: expect.any(String),
                });
            });
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete order lifecycle', async () => {
            const productRepo = {
                findOne: jest.fn().mockResolvedValue(mockProduct),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockOrderEventsService.publishOrderCreated.mockResolvedValue(undefined);
            const created = await service.create({
                userId: 1,
                items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
                shippingAddress: '地址',
                recipientName: '收件人',
                recipientPhone: '电话',
                paymentMethod: 'alipay',
            });
            expect(created).toBeDefined();
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            const found = await service.findById(1);
            expect(found).toEqual(mockOrder);
            mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);
            const updatedOrder = { ...mockOrder, status: order_entity_2.OrderStatus.SHIPPED };
            mockOrderRepository.findOne.mockResolvedValueOnce(updatedOrder);
            mockOrderRepository.update.mockResolvedValue({ affected: 1 });
            mockOrderEventsService.publishOrderStatusUpdated.mockResolvedValue(undefined);
            const updated = await service.update(1, { status: order_entity_2.OrderStatus.SHIPPED });
            expect(updated).toBeDefined();
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockOrderRepository.delete.mockResolvedValue({ affected: 1 });
            await service.delete(1);
        });
        it('should handle multiple items in order creation', async () => {
            const createData = {
                userId: 1,
                items: [
                    { productId: 1, quantity: 1, unitPrice: 100 },
                    { productId: 2, quantity: 2, unitPrice: 50 },
                ],
                totalAmount: 200,
                shippingAddress: '地址',
                recipientName: '收件人',
                recipientPhone: '电话',
                paymentMethod: 'alipay',
            };
            const mockProduct2 = { ...mockProduct, id: 2, stock: 10 };
            const productRepo = {
                findOne: jest.fn().mockImplementation((options) => {
                    if (options.where.id === 1)
                        return Promise.resolve(mockProduct);
                    if (options.where.id === 2)
                        return Promise.resolve(mockProduct2);
                    return Promise.resolve(null);
                }),
                createQueryBuilder: jest.fn().mockReturnValue({
                    update: jest.fn().mockReturnThis(),
                    set: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    andWhere: jest.fn().mockReturnThis(),
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                }),
            };
            const orderRepo = {
                create: jest.fn().mockReturnValue(mockOrder),
                save: jest.fn().mockResolvedValue(mockOrder),
            };
            const orderItemRepo = {
                create: jest.fn().mockReturnValue(mockOrderItem),
                save: jest.fn().mockResolvedValue(mockOrderItem),
            };
            mockTransactionManager.getRepository.mockImplementation((entity) => {
                if (entity === order_entity_1.Order)
                    return orderRepo;
                if (entity === order_item_entity_1.OrderItem)
                    return orderItemRepo;
                if (entity === product_entity_1.Product)
                    return productRepo;
                return mockOrderRepository;
            });
            mockOrderEventsService.publishOrderCreated.mockResolvedValue(undefined);
            const result = await service.create(createData);
            expect(result).toEqual(mockOrder);
            expect(productRepo.findOne).toHaveBeenCalledTimes(4);
            expect(orderItemRepo.create).toHaveBeenCalledTimes(2);
        });
    });
    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockOrderRepository.findOne.mockRejectedValue(new Error('Database error'));
            await expect(service.findById(1)).rejects.toThrow('Database error');
        });
        it('should handle transaction errors gracefully', async () => {
            mockOrderRepository.manager.transaction.mockRejectedValue(new Error('Transaction failed'));
            const createData = {
                userId: 1,
                items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
                totalAmount: 100,
                shippingAddress: '地址',
                recipientName: '收件人',
                recipientPhone: '电话',
                paymentMethod: 'alipay',
            };
            await expect(service.create(createData)).rejects.toThrow('Transaction failed');
        });
        it('should handle message history query errors gracefully', async () => {
            mockOrderEventsService.getMessageHistory.mockRejectedValue(new Error('Query error'));
            await expect(service.getMessageHistory('test', 10, 0)).rejects.toThrow('Query error');
            expect(mockMonitoringService.incrementKafkaDlqMessages).toHaveBeenCalledWith('test', 'query_error');
        });
    });
    describe('Performance Monitoring', () => {
        it('should record database query metrics for find operations', async () => {
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            await service.findById(1);
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('detail', 'orders', expect.any(Number));
        });
        it('should record database query metrics for list operations', async () => {
            mockOrderRepository.findAndCount.mockResolvedValue([[mockOrder], 1]);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            await service.findByUserId(1, 1, 10);
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('list', 'orders', expect.any(Number));
        });
        it('should record database query metrics for count operations', async () => {
            mockOrderRepository.count.mockReset();
            mockOrderRepository.count
                .mockResolvedValueOnce(10)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(3);
            const queryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ totalRevenue: '1000' }),
            };
            mockOrderRepository.createQueryBuilder.mockReturnValue(queryBuilder);
            mockMonitoringService.observeDbQuery.mockResolvedValue(undefined);
            await service.getStatistics();
            expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledTimes(4);
        });
    });
    describe('边界情况和错误处理测试', () => {
        describe('订单创建边界测试', () => {
            it('should handle empty order items', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [],
                    totalAmount: 0,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                mockOrderRepository.manager.transaction.mockImplementation(async (callback) => {
                    const mockManager = {
                        getRepository: jest.fn().mockReturnValue({
                            create: jest.fn(),
                            save: jest.fn().mockRejectedValue(new Error('订单项不能为空')),
                        }),
                    };
                    return callback(mockManager);
                });
                await expect(service.create(createOrderDto)).rejects.toThrow('订单项不能为空');
            });
            it('should handle invalid product quantities', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [
                        { productId: 1, quantity: 0, unitPrice: 100 },
                        { productId: 2, quantity: -1, unitPrice: 100 },
                    ],
                    totalAmount: 0,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
            it('should handle extremely large quantities', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [{ productId: 1, quantity: Number.MAX_SAFE_INTEGER, unitPrice: 100 }],
                    totalAmount: Number.MAX_SAFE_INTEGER * 100,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                mockProductRepository.findOne.mockResolvedValue({
                    ...mockProduct,
                    stock: 100,
                });
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
            it('should handle invalid user ID', async () => {
                const createOrderDto = {
                    userId: -1,
                    items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
                    totalAmount: 100,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
            it('should handle missing required fields', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
                    totalAmount: 100,
                };
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
        });
        describe('数据库错误处理测试', () => {
            it('should handle database connection timeout', async () => {
                mockOrderRepository.findOne.mockRejectedValue(new Error('Connection timeout'));
                await expect(service.findById(1)).rejects.toThrow('Connection timeout');
            });
            it('should handle transaction rollback on save failure', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [{ productId: 1, quantity: 2, unitPrice: 100 }],
                    totalAmount: 200,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                mockProductRepository.findOne.mockResolvedValue(mockProduct);
                mockOrderRepository.manager.transaction.mockImplementation(async (callback) => {
                    const mockManager = {
                        getRepository: jest.fn().mockImplementation((entity) => {
                            if (entity === product_entity_1.Product) {
                                return { findOne: jest.fn().mockResolvedValue(mockProduct) };
                            }
                            if (entity === order_item_entity_1.OrderItem) {
                                return { create: jest.fn().mockReturnValue({}) };
                            }
                            return {
                                create: jest.fn().mockReturnValue(mockOrder),
                                save: jest.fn().mockRejectedValue(new Error('Save failed')),
                            };
                        }),
                    };
                    return callback(mockManager);
                });
                await expect(service.create(createOrderDto)).rejects.toThrow('Save failed');
            });
            it('should handle concurrent modification conflicts', async () => {
                mockOrderRepository.findOne.mockResolvedValue(mockOrder);
                mockOrderRepository.update.mockRejectedValue(new Error('Optimistic lock exception'));
                await expect(service.updateStatus(1, order_entity_2.OrderStatus.PAID)).rejects.toThrow('Optimistic lock exception');
            });
        });
        describe('业务逻辑边界测试', () => {
            it('should handle status transition validation', async () => {
                const deliveredOrder = {
                    ...mockOrder,
                    status: order_entity_2.OrderStatus.DELIVERED,
                };
                mockOrderRepository.findOne.mockResolvedValue(deliveredOrder);
                mockOrderRepository.update.mockRejectedValue(new Error('Invalid status transition'));
                await expect(service.updateStatus(1, order_entity_2.OrderStatus.PENDING)).rejects.toThrow();
            });
            it('should handle payment status consistency', async () => {
                const paidOrder = {
                    ...mockOrder,
                    status: order_entity_2.OrderStatus.PAID,
                    paymentStatus: order_entity_2.PaymentStatus.PENDING,
                };
                mockOrderRepository.findOne.mockResolvedValue(paidOrder);
                mockOrderRepository.update.mockRejectedValue(new Error('Payment status inconsistency'));
                await expect(service.updateStatus(1, order_entity_2.OrderStatus.SHIPPED)).rejects.toThrow();
            });
            it('should validate order amount limits', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [
                        { productId: 1, quantity: 1000000, unitPrice: 999999.99 },
                    ],
                    totalAmount: 999999.99 * 1000000,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                const expensiveProduct = {
                    ...mockProduct,
                    price: 999999.99,
                    stock: 1000000,
                };
                mockProductRepository.findOne.mockResolvedValue(expensiveProduct);
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
        });
        describe('并发处理测试', () => {
            it('should handle concurrent order creation for same user', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [{ productId: 1, quantity: 1, unitPrice: 100 }],
                    totalAmount: 100,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                const productRepo = {
                    findOne: jest.fn().mockResolvedValue(mockProduct),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        update: jest.fn().mockReturnThis(),
                        set: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        andWhere: jest.fn().mockReturnThis(),
                        execute: jest.fn().mockResolvedValue({ affected: 1 }),
                    }),
                };
                const orderRepo = {
                    create: jest.fn().mockReturnValue(mockOrder),
                    save: jest.fn().mockResolvedValue(mockOrder),
                };
                const orderItemRepo = {
                    create: jest.fn().mockReturnValue(mockOrderItem),
                    save: jest.fn().mockResolvedValue(mockOrderItem),
                };
                mockOrderRepository.manager.transaction
                    .mockImplementationOnce(async (callback) => {
                    const mockManager = {
                        getRepository: jest.fn().mockImplementation((entity) => {
                            if (entity === order_entity_1.Order)
                                return orderRepo;
                            if (entity === order_item_entity_1.OrderItem)
                                return orderItemRepo;
                            if (entity === product_entity_1.Product)
                                return productRepo;
                            return mockOrderRepository;
                        }),
                    };
                    return callback(mockManager);
                })
                    .mockImplementationOnce(async (callback) => {
                    throw new Error('Duplicate order number');
                });
                const result1 = await service.create(createOrderDto);
                expect(result1).toEqual(mockOrder);
                await expect(service.create(createOrderDto)).rejects.toThrow('Duplicate order number');
            });
            it('should handle concurrent stock updates', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [{ productId: 1, quantity: 50, unitPrice: 100 }],
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                mockProductRepository.findOne.mockResolvedValue({
                    ...mockProduct,
                    stock: 10,
                });
                mockOrderRepository.manager.transaction.mockImplementation(async (callback) => {
                    const mockManager = {
                        getRepository: jest.fn().mockImplementation((entity) => {
                            if (entity === product_entity_1.Product)
                                return mockProductRepository;
                            if (entity === order_item_entity_1.OrderItem) {
                                return { create: jest.fn().mockReturnValue({}), save: jest.fn() };
                            }
                            return {
                                create: jest.fn().mockReturnValue(mockOrder),
                                save: jest.fn().mockResolvedValue(mockOrder),
                            };
                        }),
                    };
                    return callback(mockManager);
                });
                await expect(service.create(createOrderDto)).rejects.toThrow('库存不足');
            });
        });
        describe('性能和资源限制测试', () => {
            it('should handle large order item lists', async () => {
                const largeItemList = Array.from({ length: 1000 }, (_, index) => ({
                    productId: index + 1,
                    quantity: 1,
                    unitPrice: 100,
                }));
                const createOrderDto = {
                    userId: 1,
                    items: largeItemList,
                    totalAmount: 1000 * 100,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
            it('should handle memory pressure during large queries', async () => {
                const largeOrderList = Array.from({ length: 10000 }, (_, index) => ({
                    ...mockOrder,
                    id: index + 1,
                    orderNumber: `ORD${index + 1}`,
                }));
                mockOrderRepository.findAndCount.mockResolvedValue([largeOrderList, 10000]);
                const result = await service.findByUserId(1, 1, 10000);
                expect(result.orders).toHaveLength(10000);
                expect(result.total).toBe(10000);
            });
            it('should handle timeout on slow queries', async () => {
                mockOrderRepository.findAndCount.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 100)));
                await expect(service.findByUserId(1, 1, 10)).rejects.toThrow('Query timeout');
            });
        });
        describe('数据一致性测试', () => {
            it('should maintain referential integrity', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [{ productId: 999999, quantity: 1, unitPrice: 100 }],
                    totalAmount: 100,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                mockProductRepository.findOne.mockResolvedValue(null);
                await expect(service.create(createOrderDto)).rejects.toThrow();
            });
            it('should validate order total calculation', async () => {
                const createOrderDto = {
                    userId: 1,
                    items: [
                        { productId: 1, quantity: 2, unitPrice: 100.5 },
                        { productId: 2, quantity: 3, unitPrice: 200.75 },
                    ],
                    totalAmount: 100.5 * 2 + 200.75 * 3,
                    shippingAddress: '测试地址',
                    recipientName: '测试收件人',
                    recipientPhone: '13800138000',
                    paymentMethod: 'alipay',
                };
                const product1 = { ...mockProduct, id: 1, price: 100.5, version: 1 };
                const product2 = { ...mockProduct, id: 2, price: 200.75, version: 1 };
                const productRepo = {
                    findOne: jest.fn().mockImplementation(({ where }) => where.id === 1 ? product1 : product2),
                    createQueryBuilder: jest.fn().mockReturnValue({
                        update: jest.fn().mockReturnThis(),
                        set: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        andWhere: jest.fn().mockReturnThis(),
                        execute: jest.fn().mockResolvedValue({ affected: 1 }),
                    }),
                };
                const orderRepo = {
                    create: jest.fn().mockImplementation(data => {
                        const expectedTotal = 100.5 * 2 + 200.75 * 3;
                        expect(data.totalAmount).toBeCloseTo(expectedTotal, 2);
                        return { ...mockOrder, ...data };
                    }),
                    save: jest.fn().mockResolvedValue(mockOrder),
                };
                const orderItemRepo = {
                    create: jest.fn().mockReturnValue(mockOrderItem),
                    save: jest.fn().mockResolvedValue(mockOrderItem),
                };
                mockOrderRepository.manager.transaction.mockImplementation(async (callback) => {
                    const mockManager = {
                        getRepository: jest.fn().mockImplementation((entity) => {
                            if (entity === order_entity_1.Order)
                                return orderRepo;
                            if (entity === order_item_entity_1.OrderItem)
                                return orderItemRepo;
                            if (entity === product_entity_1.Product)
                                return productRepo;
                            return mockOrderRepository;
                        }),
                    };
                    return callback(mockManager);
                });
                mockOrderEventsService.publishOrderCreated.mockResolvedValue(undefined);
                await service.create(createOrderDto);
            });
        });
        describe('监控和日志测试', () => {
            it('should record metrics for failed operations', async () => {
                mockOrderRepository.findOne.mockImplementation(() => {
                    mockMonitoringService.observeDbQuery('detail', async () => Promise.resolve());
                    throw new Error('DB Error');
                });
                try {
                    await service.findById(1);
                }
                catch (error) {
                }
                expect(mockMonitoringService.observeDbQuery).toHaveBeenCalledWith('detail', expect.any(Function));
            });
            it('should publish events for order state changes', async () => {
                mockOrderRepository.findOne.mockResolvedValue(mockOrder);
                mockOrderRepository.update.mockResolvedValue({ affected: 1 });
                mockOrderEventsService.publishOrderStatusUpdated.mockResolvedValue(undefined);
                await service.updateStatus(1, order_entity_2.OrderStatus.PAID);
                expect(mockOrderEventsService.publishOrderStatusUpdated).toHaveBeenCalledWith({
                    orderId: 1,
                    oldStatus: order_entity_2.OrderStatus.PENDING,
                    newStatus: order_entity_2.OrderStatus.PAID,
                    timestamp: expect.any(String),
                    updatedBy: 'system',
                });
            });
            it('should handle event publishing failures gracefully', async () => {
                mockOrderRepository.findOne.mockResolvedValue(mockOrder);
                mockOrderRepository.createQueryBuilder.mockReturnValue({
                    ...mockQueryBuilder,
                    execute: jest.fn().mockResolvedValue({ affected: 1 }),
                });
                mockOrderEventsService.publishOrderStatusUpdated.mockRejectedValue(new Error('Event publishing failed'));
                await expect(service.updateStatus(1, order_entity_2.OrderStatus.PAID)).resolves.not.toThrow();
            });
        });
    });
});
