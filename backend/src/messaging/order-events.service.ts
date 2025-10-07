// 用途：订单事件处理服务，处理订单相关的异步事件
// 依赖文件：redpanda.service.ts
// 作者：后端开发团队
// 时间：2025-09-30 00:00:00

import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedpandaService } from './redpanda.service';
import { ConfigService } from '@nestjs/config';

export interface OrderCreatedEvent {
  eventId: string; // 唯一事件ID
  orderId: number;
  orderNumber: string;
  userId: number;
  totalAmount: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface OrderStatusUpdatedEvent {
  orderId: number;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
}

export interface PaymentProcessedEvent {
  orderId: number;
  paymentId: string;
  amount: number;
  status: string;
  timestamp: string;
}

@Injectable()
export class OrderEventsService implements OnModuleInit {
  private readonly ORDER_CREATED_TOPIC = 'orders.created';
  private readonly ORDER_UPDATED_TOPIC = 'orders.updated';
  private readonly PAYMENT_PROCESSED_TOPIC = 'payments.processed';
  private readonly INVENTORY_UPDATE_TOPIC = 'inventory.updated';

  constructor(
    private readonly redpandaService: RedpandaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // 初始化时创建必要的主题
    await this.initializeTopics();

    // 启动消费者处理订单相关事件
    await this.startConsumers();
  }

  private async initializeTopics(): Promise<void> {
    const topics = [
      this.ORDER_CREATED_TOPIC,
      this.ORDER_UPDATED_TOPIC,
      this.PAYMENT_PROCESSED_TOPIC,
      this.INVENTORY_UPDATE_TOPIC,
    ];

    for (const topic of topics) {
      try {
        await this.redpandaService.createTopic(topic, 3, 1);
      } catch (error) {
        console.warn(`主题创建失败 ${topic}:`, error.message);
      }
    }
  }

  private async startConsumers(): Promise<void> {
    // 订单创建事件消费者 - 处理库存扣减、通知等
    const consumerConfig: any = {
      groupId: 'order-processors',
      topics: [this.ORDER_CREATED_TOPIC],
      maxBatchSize: 100, // 每批最大消息数
      options: {
        maxBatchInterval: 5000, // 最大批处理间隔(ms)
        deadLetterTopic: 'orders.created.dlq', // 死信队列
        maxRetries: 3, // 最大重试次数
        isolationLevel: 'read_committed', // 事务隔离级别
      },
    };

    const orderCreatedConsumerId = await this.redpandaService.createConsumer(consumerConfig);

    await this.redpandaService.consumeMessages(orderCreatedConsumerId, async message => {
      await this.handleOrderCreated(message.value);
    });

    // 支付处理事件消费者
    const paymentConsumerId = await this.redpandaService.createConsumer({
      groupId: 'payment-processors',
      topics: [this.PAYMENT_PROCESSED_TOPIC],
    });

    await this.redpandaService.consumeMessages(paymentConsumerId, async message => {
      await this.handlePaymentProcessed(message.value);
    });
  }

  /**
   * 发布订单创建事件
   */
  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.ORDER_CREATED_TOPIC,
      key: event.orderId.toString(),
      value: event,
      headers: {
        eventType: 'order.created',
        source: 'orders-service',
      },
    });
  }

  /**
   * 发布订单状态更新事件
   */
  async publishOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.ORDER_UPDATED_TOPIC,
      key: event.orderId.toString(),
      value: event,
      headers: {
        eventType: 'order.updated',
        source: 'orders-service',
      },
    });
  }

  /**
   * 发布支付处理事件
   */
  async publishPaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.PAYMENT_PROCESSED_TOPIC,
      key: event.orderId.toString(),
      value: event,
      headers: {
        eventType: 'payment.processed',
        source: 'payments-service',
      },
    });
  }

  /**
   * 获取消息历史
   */
  async getMessageHistory(topic: string, limit: number, offset: number): Promise<any[]> {
    return this.redpandaService.queryMessages({
      topic,
      limit,
      offset,
      fromTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 默认查询最近7天
    });
  }

  /**
   * 重新处理订单事件
   */
  async reprocessOrderEvent(event: any): Promise<void> {
    if (event.metadata?.isRetry) {
      console.log(`♻️ 重试处理订单事件: ${event.orderId} (尝试 ${event.metadata.retryCount}次)`);
    }
    await this.handleOrderCreated(event);
  }

  /**
   * 处理订单创建事件
   */
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.log('处理订单创建事件:', event.orderId);

    // 这里可以添加异步处理逻辑：
    // 1. 发送订单确认邮件
    // 2. 更新库存缓存
    // 3. 触发数据分析
    // 4. 发送推送通知

    try {
      // 模拟异步处理
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`✅ 订单 ${event.orderId} 异步处理完成`);
    } catch (error) {
      console.error(`❌ 订单 ${event.orderId} 处理失败:`, error);
    }
  }

  /**
   * 处理支付处理事件
   */
  private async handlePaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
    console.log('处理支付事件:', event.orderId);

    // 这里可以添加支付后的处理逻辑：
    // 1. 更新订单支付状态
    // 2. 触发发货流程
    // 3. 发送支付成功通知

    try {
      // 模拟异步处理
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`✅ 支付 ${event.paymentId} 异步处理完成`);
    } catch (error) {
      console.error(`❌ 支付 ${event.paymentId} 处理失败:`, error);
    }
  }
}
