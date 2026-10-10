import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderData, UpdateOrderData } from './dto/order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus, PaymentStatus } from './entities/order.entity';
import { MonitoringService } from '../monitoring/monitoring.service';
import { OrderEventsService } from '../messaging/order-events.service';
import {
  AuditService,
  AuditAction,
  AuditResult,
  AuditSeverity,
} from '../common/audit/audit.service';
import { runExclusiveWrite } from '../common/db-write-mutex';
import { OrderSnapshotService } from './order-snapshot.service';
import { SnapshotOperatorType } from './entities/order-snapshot.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
    private readonly auditService: AuditService,
    private readonly orderSnapshotService: OrderSnapshotService,
  ) {}

  async create(orderData: CreateOrderData): Promise<Order> {
    // M5(2026-10-05)：扣减归零自动下架的收集器——事务内只置位，
    // 审计行在事务提交后落（AuditService.log 自带 dataSource.transaction，
    // sqlite 单连接下嵌套事务必败，绝不能在订单事务内调）。
    const autoUnlisted: Array<{ productId: number; productName: string; orderNumber: string }> = [];
    // M3 双盲审 P0(2026-10-05)：下单事务纳入全局写互斥。根因=TypeORM sqlite 单共享
    // 连接上并发 manager.transaction() 交叉 BEGIN/ROLLBACK——双 500/非确定性半提交/
    // 事务悬挂后全站幽灵写。互斥范围内不得嵌套再取锁：事务提交（回落）后才在锁外
    // 落自动下架审计行（AuditService.log 自带一次独立的 runExclusiveWrite）。
    const savedOrder = await runExclusiveWrite(() =>
      this.orderRepository.manager.transaction(async trx => {
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
          // P1-1（M3 双盲审 2026-10-05，X 组共中）：下单路径补 isActive 门禁——
          // 前台列表/详情已过滤下架品，但直购 POST 可绕过。给 400"商品已下架"
          // 而非 404：商品存在且可行动（等上架/换商品），错误信息能指路。
          if (product && !product.isActive) {
            throw new BadRequestException(
              `商品已下架（productId=${item.productId}「${product.name}」暂不可购买）`,
            );
          }
          if (!product || product.stock < item.quantity) {
            // M3：语义化退出码——库存不足是客户端可修正的提交错误，400（与
            // 控制器 ApiDocs "badRequest: 库存不足" 声明一致），不再裸 Error→500。
            throw new BadRequestException(`产品 ${item.productId} 库存不足`);
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
              image: (product as { image?: string }).image || '',
              specifications: {},
            },
          });
        }

        // 金额分位取整(Info #7): decimal(10,2) 列不应存浮点尾差
        serverTotal = Math.round(serverTotal * 100) / 100;

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

        // 创建订单项并更新库存。终验整改(2026-10-03 #5): 逐行重新查询产品——
        // 同商品多行时, 前一行的库存更新会推进乐观锁版本, 缓存的旧 version 会令
        // 第二行 update 命中 0 行而 500; 新鲜查询保证每行拿到当前 version。
        for (let i = 0; i < orderData.items.length; i++) {
          const item = orderData.items[i];
          const priced = itemsWithPrice[i];
          const product = await trx.getRepository(Product).findOne({
            where: { id: item.productId },
          });
          // P1-1：第二处 loadProduct 同样设防（同商品多行/首循环后状态可能已变）。
          if (product && !product.isActive) {
            throw new BadRequestException(
              `商品已下架（productId=${item.productId}「${product.name}」暂不可购买）`,
            );
          }
          if (!product || product.stock < item.quantity) {
            throw new BadRequestException(`产品 ${item.productId} 库存不足`);
          }

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
            // M3：乐观锁冲突语义化——affected=0 是并发写竞争（库存被并发订单
            // 扣走或版本推进），客户端可重试，409 而非裸 Error→500（双盲审 P0
            // 验收口径：并发下单=201+201 或 201+409，绝不 500/半提交）。
            throw new ConflictException(
              `产品 ${item.productId} 库存不足或已被其他订单修改，请重试`,
            );
          }

          // M5(2026-10-05)：库存归零自动下架——与扣减同事务（原子），前台立刻不可见。
          // 扣减守卫 stock >= quantity 且此处为新鲜读，归零判定用算术值即可精确等于 0。
          // 重新上架走 admin.html 既有「上架」按钮（PATCH isActive=true），补货不自动上架。
          if (product.stock - item.quantity === 0) {
            await trx.getRepository(Product).update({ id: item.productId }, { isActive: false });
            autoUnlisted.push({
              productId: item.productId,
              productName: product.name,
              orderNumber,
            });
          }
        }

        // 发布订单创建事件
        this.publishOrderCreatedEvent(savedOrder, orderData.items).catch(error => {
          this.logger.error('发布订单创建事件失败:', error);
        });

        return savedOrder;
      }),
    );

    // M5：事务已提交——自动下架事件落审计行（哈希链化走 AuditService.log 统一入口）。
    // 订单既已成立，审计失败只告警不回滚（与商品写审计同纪律）。
    for (const p of autoUnlisted) {
      try {
        await this.auditService.log(
          AuditAction.PRODUCT_AUTO_UNLIST,
          AuditResult.SUCCESS,
          {
            userId: orderData.userId != null ? String(orderData.userId) : undefined,
            resourceType: 'products',
            resourceId: String(p.productId),
            httpMethod: 'AUTO',
          },
          `auto: stock=0（订单 ${p.orderNumber} 扣减归零，商品自动下架 productId=${p.productId}）`,
          AuditSeverity.LOW,
          undefined,
          {
            event: 'auto: stock=0',
            productId: p.productId,
            productName: p.productName,
            orderNumber: p.orderNumber,
            stockAfter: 0,
            isActive: false,
          },
        );
      } catch (error) {
        this.logger.warn(
          `auto: stock=0 审计行写入失败（productId=${p.productId}, order=${p.orderNumber}）: ${(error as Error).message}`,
        );
      }
    }

    return savedOrder;
  }

  async findById(id: number): Promise<Order | null> {
    const startDb = process.hrtime.bigint();
    const result = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true, user: true },
    });
    // 越权审计(2026-10-03): user 关系会把 bcrypt 哈希整包吐给客户端, 统一剥离
    if (result?.user) {
      delete (result.user as { password?: string }).password;
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
      relations: { items: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // 越权审计(2026-10-03): 列表同样剥离 user.password
    orders.forEach(o => {
      if (o.user) delete (o.user as { password?: string }).password;
    });
    const endDb = process.hrtime.bigint();

    this.monitoring.observeDbQuery('list', 'orders', Number(endDb - startDb) / 1_000_000_000);
    return { orders, total };
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ orders: Order[]; total: number }> {
    const startDb = process.hrtime.bigint();
    const [orders, total] = await this.orderRepository.findAndCount({
      relations: { items: true, user: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // 一审修复(2026-10-03): admin 列表同样剥离 user.password(此前误将补丁落在
    // 不加载 user 关系的 findByUserId 上——锚点撞车, 真 findAll 漏剥)
    orders.forEach(o => {
      if (o.user) delete (o.user as { password?: string }).password;
    });
    const endDb = process.hrtime.bigint();

    this.monitoring.observeDbQuery('list', 'orders', Number(endDb - startDb) / 1_000_000_000);
    return { orders, total };
  }

  /**
   * 更新订单（订单快照批阶段 1 重构——TOCTOU 修复+快照收口+事件外移）
   *
   * 三病一治（方案 v4.1）：
   * - TOCTOU：原"事务外 findById→update"窗口内单据可能被并发改掉——现改为
   *   runExclusiveWrite+事务内"全量 before 读→UPDATE→全量 after 回读"
   * - 快照：after 回读构造全量快照 INSERT（同事务 fail-closed）+changed_fields
   *   行差缓存（DTO 幽灵字段永不出现在 payload——构造自实体回读）
   * - census⑤：事件发布移到互斥块返回后（事务提交后）——防回滚幻影事件
   */
  async update(
    id: number,
    updateData: UpdateOrderData,
    snapshotContext?: {
      operatorType?: SnapshotOperatorType;
      operatorId?: string | null;
      correlationId?: string | null;
    },
  ): Promise<Order> {
    const updatedOrder = await runExclusiveWrite(() =>
      this.orderRepository.manager.transaction(async trx => {
        // 事务内全量 before 读（含 items——快照 payload 需要）
        const before = await trx.getRepository(Order).findOne({
          where: { id },
          relations: { items: true },
        });
        if (!before) {
          throw new Error('订单不存在');
        }
        const beforePayload = this.orderSnapshotService.buildPayload(before);

        // 时间戳守卫（原逻辑保留——但现在读的是事务内最新值）
        if (updateData.status === OrderStatus.SHIPPED && !before.shippedAt) {
          (updateData as { shippedAt?: Date }).shippedAt = new Date();
        }
        if (updateData.paymentStatus === PaymentStatus.PAID && !before.paidAt) {
          (updateData as { paidAt?: Date }).paidAt = new Date();
        }
        if (updateData.status === OrderStatus.DELIVERED && !before.completedAt) {
          (updateData as { completedAt?: Date }).completedAt = new Date();
        }

        await trx.getRepository(Order).update(id, updateData);

        // 事务内全量 after 回读（快照=真实现状，changed_fields=行差）
        const after = await trx.getRepository(Order).findOne({
          where: { id },
          relations: { items: true },
        });
        if (!after) {
          throw new Error(`订单更新后回读失败(id=${id})`);
        }

        // 快照追加（同事务 fail-closed；零变化跳过在 service 内判）
        // 归因透传（双盲 B1 席整改：支付回写记 system_listener+correlationId，
        // 管理端默认 admin——原硬编码 ADMIN 把支付回写也记成 admin=归因失真）
        await this.orderSnapshotService.appendSnapshot(
          trx,
          after,
          beforePayload,
          snapshotContext?.operatorType ?? SnapshotOperatorType.ADMIN,
          snapshotContext?.operatorId ?? null,
          snapshotContext?.correlationId ?? null,
        );

        return after;
      }),
    );

    // census⑤ 修复：事件发布移到互斥块外（事务已提交，无幻影风险）
    if (updateData.status) {
      this.publishOrderStatusUpdatedEvent(updatedOrder, updateData.status).catch(error => {
        this.logger.error('发布订单状态更新事件失败:', error);
      });
    }

    return updatedOrder;
  }

  /**
   * 站内订单币种——totalAmount 列 decimal(10,2) 无币种字段,系统单币种构造
   */
  static readonly ORDER_DEFAULT_CURRENCY = 'CNY';

  /**
   * 支付结果回写（W-3 批:payment 事件监听的落库面）
   *
   * merchantOrderId 是支付侧开放契约(客户端自由传串):先按 orderNumber 精确
   * 匹配,纯数字再回落数字 id——两个唯一键各覆盖一种真实约定。
   * 解析不到返回 null(外部商户号合法存在,不回写不报错);重复事件幂等
   * (paidAt 由 update() 的 !order.paidAt 守卫保首写时间)。
   * 注意:只写 paymentStatus 镜像;order.status(履约生命周期)是否随支付
   * 联动为用户挂账裁决——后端零消费方,不联动不破坏任何链路。
   */
  async findOrderByMerchantOrderId(merchantOrderId: string): Promise<Order | null> {
    let order = await this.orderRepository.findOne({
      where: { orderNumber: merchantOrderId },
    });
    if (!order && /^\d+$/.test(merchantOrderId)) {
      order = await this.orderRepository.findOne({
        where: { id: Number(merchantOrderId) },
      });
    }
    return order ?? null;
  }

  /**
   * 支付成功回写——带金额闸(W-3④):站内订单实付必须与订单总额精确相等
   * (最小单位零容差),不符拒绝回写——防 0.01 元支付把订单刷成 paid。
   */
  async markPaymentSucceeded(
    merchantOrderId: string,
    paidAmount: number,
    currency: string,
  ): Promise<Order | null> {
    const order = await this.findOrderByMerchantOrderId(merchantOrderId);
    if (!order) {
      return null;
    }
    if (
      currency !== OrdersService.ORDER_DEFAULT_CURRENCY ||
      Math.round(paidAmount * 100) !== Math.round(Number(order.totalAmount) * 100)
    ) {
      this.logger.warn(
        `支付金额与订单总额不符,拒绝回写(订单 ${order.orderNumber},总额 ${order.totalAmount},` +
          `实付 ${paidAmount} ${currency})——疑似篡改或错单`,
      );
      return null;
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return order; // 幂等:重复回调/事件重放不再落库
    }
    return this.update(order.id, { paymentStatus: PaymentStatus.PAID }, {
      operatorType: SnapshotOperatorType.SYSTEM_LISTENER,
      correlationId: `payment:${merchantOrderId}`,
    });
  }

  /** 支付失败回写(无金额语义) */
  async markPaymentFailed(merchantOrderId: string): Promise<Order | null> {
    const order = await this.findOrderByMerchantOrderId(merchantOrderId);
    if (!order) {
      return null;
    }
    if (order.paymentStatus === PaymentStatus.FAILED) {
      return order;
    }
    return this.update(order.id, { paymentStatus: PaymentStatus.FAILED }, {
      operatorType: SnapshotOperatorType.SYSTEM_LISTENER,
      correlationId: `payment:${merchantOrderId}`,
    });
  }

  // 恢复注记(2026-10-08)：生产链零调用，但它是 orders spec 十余处事件
  // 发布断言的测试驱动器（"使用updateStatus方法，因为它总是会发布事件"）——
  // 测试基建价值保留
  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const updatedOrder = await runExclusiveWrite(() =>
      this.orderRepository.manager.transaction(async trx => {
        const before = await trx.getRepository(Order).findOne({
          where: { id },
          relations: { items: true },
        });
        if (!before) {
          throw new Error('订单不存在');
        }
        const beforePayload = this.orderSnapshotService.buildPayload(before);

        const updateData: UpdateOrderData = { status };
        if (status === OrderStatus.SHIPPED && !before.shippedAt) {
          (updateData as { shippedAt?: Date }).shippedAt = new Date();
        }
        if (status === OrderStatus.DELIVERED && !before.completedAt) {
          (updateData as { completedAt?: Date }).completedAt = new Date();
        }

        await trx.getRepository(Order).update(id, updateData);
        const after = await trx.getRepository(Order).findOne({
          where: { id },
          relations: { items: true },
        });
        if (!after) {
          throw new Error(`订单状态更新后回读失败(id=${id})`);
        }

        await this.orderSnapshotService.appendSnapshot(
          trx,
          after,
          beforePayload,
          SnapshotOperatorType.ADMIN,
          null,
          null,
        );
        return after;
      }),
    );

    this.publishOrderStatusUpdatedEvent(updatedOrder, status).catch(error => {
      this.logger.error('发布订单状态更新事件失败:', error);
    });

    return updatedOrder;
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

  private async publishOrderCreatedEvent(order: Order, items: unknown[]): Promise<void> {
    const event = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      totalAmount: order.totalAmount,
      items: (items as Array<{ productId: number; quantity: number; unitPrice: number }>).map(
        item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      ),
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
