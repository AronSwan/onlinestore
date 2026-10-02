import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderData } from './dto/order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus, PaymentStatus } from './entities/order.entity';
import { MonitoringService } from '../monitoring/monitoring.service';
import { OrderEventsService } from '../messaging/order-events.service';


export interface UpdateOrderData {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  shippingCompany?: string;
  trackingNumber?: string;
  notes?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(forwardRef(() => MonitoringService))
    private readonly monitoring: MonitoringService,
    @Inject(forwardRef(() => OrderEventsService))
    private readonly orderEventsService: OrderEventsService,
  ) {}

  async create(orderData: CreateOrderData): Promise<Order> {
    return await this.orderRepository.manager.transaction(async trx => {
      // 生成订单号
      const orderNumber = this.generateOrderNumber();

      // V13(2026-10-03): 金额一律服务端重算——忽略请求体的 totalAmount/items[].unitPrice。
      // 定价在创建订单之前完成, 库存校验与乐观锁版本以事务内最新数据为准。
      const itemsWithPrice: Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        productSnapshot: { name: string; image: string; specifications: Record<string, any> };
        product: Product;
      }> = [];
      let serverTotal = 0;
      for (const item of orderData.items) {
        const product = await trx.getRepository(Product).findOne({
          where: { id: item.productId },
        });
        if (!product || product.stock < item.quantity) {
          throw new Error(`产品 ${item.productId} 库存不足`);
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
            image: (product as any).image || '',
            specifications: {},
          },
        });
      }

      // 创建订单(金额为服务端计算值)
      const order = trx.getRepository(Order).create({
        orderNumber,
        userId: orderData.userId,
        totalAmount: serverTotal,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        shippingAddress: orderData.shippingAddress,
        recipientName: orderData.recipientName,
        recipientPhone: orderData.recipientPhone,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        createdAt: new Date(),
      });

      const savedOrder = await trx.getRepository(Order).save(order);

      // 创建订单项并更新库存(复用定价循环的产品对象与乐观锁版本, 单次查询)
      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        const priced = itemsWithPrice[i];
        const product = priced.product;

        const orderItem = trx.getRepository(OrderItem).create({
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priced.unitPrice,
          totalPrice: priced.totalPrice,
          productSnapshot: priced.productSnapshot,
        });

        await trx.getRepository(OrderItem).save(orderItem);

        // 使用乐观锁更新库存，防止超卖
        const updateResult = await trx
          .getRepository(Product)
          .createQueryBuilder()
          .update(Product)
          .set({ stock: () => `stock - ${item.quantity}` })
          .where('id = :id', { id: item.productId })
          .andWhere('stock >= :quantity', { quantity: item.quantity })
          .andWhere('version = :version', { version: product.version })
          .execute();

        // 检查是否成功更新库存
        if (updateResult.affected === 0) {
          throw new Error(`产品 ${item.productId} 库存不足或已被其他订单修改，请重试`);
        }
      }

      // 发布订单创建事件
      this.publishOrderCreatedEvent(savedOrder, orderData.items).catch(error => {
        console.error('发布订单创建事件失败:', error);
      });

      return savedOrder;
    });
  }

  async findById(id: number): Promise<Order | null> {
    const startDb = process.hrtime.bigint();
    const result = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'user'],
    });
    // 越权审计(2026-10-03): user 关系会把 bcrypt 哈希整包吐给客户端, 统一剥离
    if (result?.user) {
      delete (result.user as any).password;
    }
    const endDb = process.hrtime.bigint();

    this.monitoring.observeDbQuery('detail', 'orders', Number(endDb - startDb) / 1_000_000_000);
    return result;
  }

  async findByUserId(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: Order[]; total: number }> {
    const startDb = process.hrtime.bigint();
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // 越权审计(2026-10-03): 列表同样剥离 user.password
    orders.forEach((o) => {
      if (o.user) delete (o.user as any).password;
    });
    const endDb = process.hrtime.bigint();

    this.monitoring.observeDbQuery('list', 'orders', Number(endDb - startDb) / 1_000_000_000);
    return { orders, total };
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ orders: Order[]; total: number }> {
    const startDb = process.hrtime.bigint();
    const [orders, total] = await this.orderRepository.findAndCount({
      relations: ['items', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const endDb = process.hrtime.bigint();

    this.monitoring.observeDbQuery('list', 'orders', Number(endDb - startDb) / 1_000_000_000);
    return { orders, total };
  }

  async update(id: number, updateData: UpdateOrderData): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('订单不存在');
    }

    // 更新状态相关的时间戳
    if (updateData.status === OrderStatus.SHIPPED && !order.shippedAt) {
      (updateData as any).shippedAt = new Date();
    }
    if (updateData.paymentStatus === PaymentStatus.PAID && !order.paidAt) {
      (updateData as any).paidAt = new Date();
    }
    if (updateData.status === OrderStatus.DELIVERED && !order.completedAt) {
      (updateData as any).completedAt = new Date();
    }

    await this.orderRepository.update(id, updateData);
    const updatedOrder = await this.findById(id);

    if (updateData.status && updatedOrder) {
      this.publishOrderStatusUpdatedEvent(updatedOrder, updateData.status).catch(error => {
        console.error('发布订单状态更新事件失败:', error);
      });
    }

    return updatedOrder!;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('订单不存在');
    }

    // 更新状态相关的时间戳
    const updateData: UpdateOrderData = { status };
    if (status === OrderStatus.SHIPPED && !order.shippedAt) {
      (updateData as any).shippedAt = new Date();
    }
    if (status === OrderStatus.DELIVERED && !order.completedAt) {
      (updateData as any).completedAt = new Date();
    }

    await this.orderRepository.update(id, updateData);
    const updatedOrder = await this.findById(id);

    this.publishOrderStatusUpdatedEvent(updatedOrder!, status).catch(error => {
      console.error('发布订单状态更新事件失败:', error);
    });

    return updatedOrder!;
  }

  async delete(id: number): Promise<void> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('订单不存在');
    }

    await this.orderRepository.delete(id);
  }

  async getMessageHistory(topic: string, limit: number, offset: number): Promise<any[]> {
    try {
      return await this.orderEventsService.getMessageHistory(topic, limit, offset);
    } catch (error) {
      this.monitoring.incrementKafkaDlqMessages(topic, 'query_error');
      throw error;
    }
  }

  async getStatistics(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  }> {
    const startTotal = process.hrtime.bigint();
    const totalOrders = await this.orderRepository.count();
    const endTotal = process.hrtime.bigint();
    this.monitoring.observeDbQuery(
      'count',
      'orders',
      Number(endTotal - startTotal) / 1_000_000_000,
    );

    const startPending = process.hrtime.bigint();
    const pendingOrders = await this.orderRepository.count({
      where: { status: OrderStatus.PENDING },
    });
    const endPending = process.hrtime.bigint();
    this.monitoring.observeDbQuery(
      'count',
      'orders',
      Number(endPending - startPending) / 1_000_000_000,
    );

    const startCompleted = process.hrtime.bigint();
    const completedOrders = await this.orderRepository.count({
      where: { status: OrderStatus.DELIVERED },
    });
    const endCompleted = process.hrtime.bigint();
    this.monitoring.observeDbQuery(
      'count',
      'orders',
      Number(endCompleted - startCompleted) / 1_000_000_000,
    );

    const startRevenue = process.hrtime.bigint();
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalRevenue')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne();
    const endRevenue = process.hrtime.bigint();
    this.monitoring.observeDbQuery(
      'aggregate',
      'orders',
      Number(endRevenue - startRevenue) / 1_000_000_000,
    );

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: parseFloat(result.totalRevenue) || 0,
    };
  }

  private generateOrderNumber(): string {
    return `ORD${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  private async publishOrderCreatedEvent(order: Order, items: any[]): Promise<void> {
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

  private async publishOrderStatusUpdatedEvent(
    order: Order,
    newStatus: OrderStatus,
  ): Promise<void> {
    const event = {
      orderId: order.id,
      oldStatus: order.status,
      newStatus: newStatus,
      updatedBy: 'system',
      timestamp: new Date().toISOString(),
    };

    await this.orderEventsService.publishOrderStatusUpdated(event);
  }
}
