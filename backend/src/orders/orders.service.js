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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
const order_entity_2 = require("./entities/order.entity");
const monitoring_service_1 = require("../monitoring/monitoring.service");
const order_events_service_1 = require("../messaging/order-events.service");
const audit_service_1 = require("../common/audit/audit.service");
const db_write_mutex_1 = require("../common/db-write-mutex");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(orderRepository, orderItemRepository, productRepository, monitoring, orderEventsService, auditService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.monitoring = monitoring;
        this.orderEventsService = orderEventsService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(orderData) {
        const autoUnlisted = [];
        const savedOrder = await (0, db_write_mutex_1.runExclusiveWrite)(() => this.orderRepository.manager.transaction(async (trx) => {
            const orderNumber = this.generateOrderNumber();
            const itemsWithPrice = [];
            let serverTotal = 0;
            for (const item of orderData.items) {
                const product = await trx.getRepository(product_entity_1.Product).findOne({
                    where: { id: item.productId },
                });
                if (product && !product.isActive) {
                    throw new common_1.BadRequestException(`商品已下架（productId=${item.productId}「${product.name}」暂不可购买）`);
                }
                if (!product || product.stock < item.quantity) {
                    throw new common_1.BadRequestException(`产品 ${item.productId} 库存不足`);
                }
                const unitPrice = Number(product.price);
                const lineTotal = unitPrice * item.quantity;
                serverTotal += lineTotal;
                itemsWithPrice.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice: lineTotal,
                    product,
                    productSnapshot: {
                        name: product.name,
                        image: product.image || '',
                        specifications: {},
                    },
                });
            }
            serverTotal = Math.round(serverTotal * 100) / 100;
            const order = trx.getRepository(order_entity_1.Order).create({
                orderNumber,
                userId: orderData.userId,
                totalAmount: serverTotal,
                status: order_entity_2.OrderStatus.PENDING,
                paymentStatus: order_entity_2.PaymentStatus.PENDING,
                shippingAddress: orderData.shippingAddress,
                recipientName: orderData.recipientName,
                recipientPhone: orderData.recipientPhone,
                paymentMethod: orderData.paymentMethod,
                notes: orderData.notes,
                createdAt: new Date(),
            });
            const savedOrder = await trx.getRepository(order_entity_1.Order).save(order);
            for (let i = 0; i < orderData.items.length; i++) {
                const item = orderData.items[i];
                const priced = itemsWithPrice[i];
                const product = await trx.getRepository(product_entity_1.Product).findOne({
                    where: { id: item.productId },
                });
                if (product && !product.isActive) {
                    throw new common_1.BadRequestException(`商品已下架（productId=${item.productId}「${product.name}」暂不可购买）`);
                }
                if (!product || product.stock < item.quantity) {
                    throw new common_1.BadRequestException(`产品 ${item.productId} 库存不足`);
                }
                const orderItem = trx.getRepository(order_item_entity_1.OrderItem).create({
                    orderId: savedOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: priced.unitPrice,
                    totalPrice: priced.totalPrice,
                    productSnapshot: priced.productSnapshot,
                });
                await trx.getRepository(order_item_entity_1.OrderItem).save(orderItem);
                const updateResult = await trx
                    .getRepository(product_entity_1.Product)
                    .createQueryBuilder()
                    .update(product_entity_1.Product)
                    .set({ stock: () => `stock - ${item.quantity}` })
                    .where('id = :id', { id: item.productId })
                    .andWhere('stock >= :quantity', { quantity: item.quantity })
                    .andWhere('version = :version', { version: product.version })
                    .execute();
                if (updateResult.affected === 0) {
                    throw new common_1.ConflictException(`产品 ${item.productId} 库存不足或已被其他订单修改，请重试`);
                }
                if (product.stock - item.quantity === 0) {
                    await trx.getRepository(product_entity_1.Product).update({ id: item.productId }, { isActive: false });
                    autoUnlisted.push({
                        productId: item.productId,
                        productName: product.name,
                        orderNumber,
                    });
                }
            }
            this.publishOrderCreatedEvent(savedOrder, orderData.items).catch(error => {
                console.error('发布订单创建事件失败:', error);
            });
            return savedOrder;
        }));
        for (const p of autoUnlisted) {
            try {
                await this.auditService.log(audit_service_1.AuditAction.PRODUCT_AUTO_UNLIST, audit_service_1.AuditResult.SUCCESS, {
                    userId: orderData.userId != null ? String(orderData.userId) : undefined,
                    resourceType: 'products',
                    resourceId: String(p.productId),
                    httpMethod: 'AUTO',
                }, `auto: stock=0（订单 ${p.orderNumber} 扣减归零，商品自动下架 productId=${p.productId}）`, audit_service_1.AuditSeverity.LOW, undefined, { event: 'auto: stock=0', productId: p.productId, productName: p.productName, orderNumber: p.orderNumber, stockAfter: 0, isActive: false });
            }
            catch (error) {
                this.logger.warn(`auto: stock=0 审计行写入失败（productId=${p.productId}, order=${p.orderNumber}）: ${error.message}`);
            }
        }
        return savedOrder;
    }
    async findById(id) {
        const startDb = process.hrtime.bigint();
        const result = await this.orderRepository.findOne({
            where: { id },
            relations: { items: true, user: true },
        });
        if (result?.user) {
            delete result.user.password;
        }
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('detail', 'orders', Number(endDb - startDb) / 1_000_000_000);
        return result;
    }
    async findByUserId(userId, page = 1, limit = 10) {
        const startDb = process.hrtime.bigint();
        const [orders, total] = await this.orderRepository.findAndCount({
            where: { userId },
            relations: { items: true },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        orders.forEach((o) => {
            if (o.user)
                delete o.user.password;
        });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('list', 'orders', Number(endDb - startDb) / 1_000_000_000);
        return { orders, total };
    }
    async findAll(page = 1, limit = 10) {
        const startDb = process.hrtime.bigint();
        const [orders, total] = await this.orderRepository.findAndCount({
            relations: { items: true, user: true },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        orders.forEach((o) => {
            if (o.user)
                delete o.user.password;
        });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('list', 'orders', Number(endDb - startDb) / 1_000_000_000);
        return { orders, total };
    }
    async update(id, updateData) {
        const order = await this.findById(id);
        if (!order) {
            throw new Error('订单不存在');
        }
        if (updateData.status === order_entity_2.OrderStatus.SHIPPED && !order.shippedAt) {
            updateData.shippedAt = new Date();
        }
        if (updateData.paymentStatus === order_entity_2.PaymentStatus.PAID && !order.paidAt) {
            updateData.paidAt = new Date();
        }
        if (updateData.status === order_entity_2.OrderStatus.DELIVERED && !order.completedAt) {
            updateData.completedAt = new Date();
        }
        await this.orderRepository.update(id, updateData);
        const updatedOrder = await this.findById(id);
        if (updateData.status && updatedOrder) {
            this.publishOrderStatusUpdatedEvent(updatedOrder, updateData.status).catch(error => {
                console.error('发布订单状态更新事件失败:', error);
            });
        }
        return updatedOrder;
    }
    async updateStatus(id, status) {
        const order = await this.findById(id);
        if (!order) {
            throw new Error('订单不存在');
        }
        const updateData = { status };
        if (status === order_entity_2.OrderStatus.SHIPPED && !order.shippedAt) {
            updateData.shippedAt = new Date();
        }
        if (status === order_entity_2.OrderStatus.DELIVERED && !order.completedAt) {
            updateData.completedAt = new Date();
        }
        await this.orderRepository.update(id, updateData);
        const updatedOrder = await this.findById(id);
        this.publishOrderStatusUpdatedEvent(updatedOrder, status).catch(error => {
            console.error('发布订单状态更新事件失败:', error);
        });
        return updatedOrder;
    }
    async delete(id) {
        const order = await this.findById(id);
        if (!order) {
            throw new Error('订单不存在');
        }
        await this.orderRepository.delete(id);
    }
    async getMessageHistory(topic, limit, offset) {
        try {
            return await this.orderEventsService.getMessageHistory(topic, limit, offset);
        }
        catch (error) {
            this.monitoring.incrementKafkaDlqMessages(topic, 'query_error');
            throw error;
        }
    }
    async getStatistics() {
        const startTotal = process.hrtime.bigint();
        const totalOrders = await this.orderRepository.count();
        const endTotal = process.hrtime.bigint();
        this.monitoring.observeDbQuery('count', 'orders', Number(endTotal - startTotal) / 1_000_000_000);
        const startPending = process.hrtime.bigint();
        const pendingOrders = await this.orderRepository.count({
            where: { status: order_entity_2.OrderStatus.PENDING },
        });
        const endPending = process.hrtime.bigint();
        this.monitoring.observeDbQuery('count', 'orders', Number(endPending - startPending) / 1_000_000_000);
        const startCompleted = process.hrtime.bigint();
        const completedOrders = await this.orderRepository.count({
            where: { status: order_entity_2.OrderStatus.DELIVERED },
        });
        const endCompleted = process.hrtime.bigint();
        this.monitoring.observeDbQuery('count', 'orders', Number(endCompleted - startCompleted) / 1_000_000_000);
        const startRevenue = process.hrtime.bigint();
        const result = await this.orderRepository
            .createQueryBuilder('order')
            .select('SUM(order.totalAmount)', 'totalRevenue')
            .where('order.status = :status', { status: order_entity_2.OrderStatus.DELIVERED })
            .getRawOne();
        const endRevenue = process.hrtime.bigint();
        this.monitoring.observeDbQuery('aggregate', 'orders', Number(endRevenue - startRevenue) / 1_000_000_000);
        return {
            totalOrders,
            pendingOrders,
            completedOrders,
            totalRevenue: parseFloat(result.totalRevenue) || 0,
        };
    }
    generateOrderNumber() {
        return `ORD${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    async publishOrderCreatedEvent(order, items) {
        const event = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            totalAmount: order.totalAmount,
            items: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
            timestamp: new Date().toISOString(),
            metadata: {
                source: 'orders-service',
                attempt: 1,
                traceId: this.monitoring.getCurrentTraceId(),
            },
        };
        await this.orderEventsService.publishOrderCreated(event);
    }
    async publishOrderStatusUpdatedEvent(order, newStatus) {
        const event = {
            orderId: order.id,
            oldStatus: order.status,
            newStatus: newStatus,
            updatedBy: 'system',
            timestamp: new Date().toISOString(),
        };
        await this.orderEventsService.publishOrderStatusUpdated(event);
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => monitoring_service_1.MonitoringService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => order_events_service_1.OrderEventsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        monitoring_service_1.MonitoringService,
        order_events_service_1.OrderEventsService,
        audit_service_1.AuditService])
], OrdersService);
