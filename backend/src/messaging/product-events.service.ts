// 用途：产品事件处理服务，处理产品相关的异步事件
// 依赖文件：redpanda.service.ts
// 作者：后端开发团队
// 时间：2025-09-30 00:00:00

import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedpandaService } from './redpanda.service';
import { ConfigService } from '@nestjs/config';

export interface ProductCreatedEvent {
  productId: number;
  name: string;
  price: number;
  category: any;
  timestamp: string;
}

export interface ProductUpdatedEvent {
  productId: number;
  name?: string;
  price?: number;
  stock?: number;
  oldPrice?: number;
  timestamp: string;
}

export interface ProductViewedEvent {
  productId: number;
  userId?: number;
  timestamp: string;
}

export interface InventoryUpdatedEvent {
  productId: number;
  oldStock: number;
  newStock: number;
  change: number;
  reason: 'order' | 'manual' | 'system';
  timestamp: string;
}

@Injectable()
export class ProductEventsService implements OnModuleInit {
  private readonly PRODUCT_CREATED_TOPIC = 'products.created';
  private readonly PRODUCT_UPDATED_TOPIC = 'products.updated';
  private readonly PRODUCT_VIEWED_TOPIC = 'products.viewed';
  private readonly INVENTORY_UPDATED_TOPIC = 'inventory.updated';

  constructor(
    private readonly redpandaService: RedpandaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // 初始化时创建必要的主题
    await this.initializeTopics();

    // 启动消费者处理产品相关事件
    await this.startConsumers();
  }

  private async initializeTopics(): Promise<void> {
    const topics = [
      this.PRODUCT_CREATED_TOPIC,
      this.PRODUCT_UPDATED_TOPIC,
      this.PRODUCT_VIEWED_TOPIC,
      this.INVENTORY_UPDATED_TOPIC,
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
    // 产品浏览事件消费者 - 处理用户行为分析
    const productViewedConsumerId = await this.redpandaService.createConsumer({
      groupId: 'analytics-processors',
      topics: [this.PRODUCT_VIEWED_TOPIC],
    });

    await this.redpandaService.consumeMessages(productViewedConsumerId, async message => {
      await this.handleProductViewed(message.value);
    });

    // 库存更新事件消费者
    const inventoryConsumerId = await this.redpandaService.createConsumer({
      groupId: 'inventory-processors',
      topics: [this.INVENTORY_UPDATED_TOPIC],
    });

    await this.redpandaService.consumeMessages(inventoryConsumerId, async message => {
      await this.handleInventoryUpdated(message.value);
    });
  }

  /**
   * 发布产品创建事件
   */
  async publishProductCreated(event: ProductCreatedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.PRODUCT_CREATED_TOPIC,
      key: event.productId.toString(),
      value: event,
      headers: {
        eventType: 'product.created',
        source: 'products-service',
      },
    });
  }

  /**
   * 发布产品更新事件
   */
  async publishProductUpdated(event: ProductUpdatedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.PRODUCT_UPDATED_TOPIC,
      key: event.productId.toString(),
      value: event,
      headers: {
        eventType: 'product.updated',
        source: 'products-service',
      },
    });
  }

  /**
   * 发布产品浏览事件
   */
  async publishProductViewed(event: ProductViewedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.PRODUCT_VIEWED_TOPIC,
      key: event.productId.toString(),
      value: event,
      headers: {
        eventType: 'product.viewed',
        source: 'products-service',
      },
    });
  }

  /**
   * 发布库存更新事件
   */
  async publishInventoryUpdated(event: InventoryUpdatedEvent): Promise<void> {
    await this.redpandaService.sendMessage({
      topic: this.INVENTORY_UPDATED_TOPIC,
      key: event.productId.toString(),
      value: event,
      headers: {
        eventType: 'inventory.updated',
        source: 'products-service',
      },
    });
  }

  /**
   * 处理产品浏览事件
   */
  private async handleProductViewed(event: ProductViewedEvent): Promise<void> {
    console.log('处理产品浏览事件:', event.productId);

    // 这里可以添加用户行为分析逻辑：
    // 1. 更新产品热度
    // 2. 记录用户偏好
    // 3. 触发推荐算法
    // 4. 发送实时统计

    try {
      // 模拟异步处理
      await new Promise(resolve => setTimeout(resolve, 50));
      console.log(`✅ 产品 ${event.productId} 浏览事件处理完成`);
    } catch (error) {
      console.error(`❌ 产品 ${event.productId} 浏览事件处理失败:`, error);
    }
  }

  /**
   * 处理库存更新事件
   */
  private async handleInventoryUpdated(event: InventoryUpdatedEvent): Promise<void> {
    console.log('处理库存更新事件:', event.productId);

    // 这里可以添加库存相关逻辑：
    // 1. 更新库存缓存
    // 2. 触发补货提醒
    // 3. 发送库存预警
    // 4. 更新统计信息

    try {
      // 模拟异步处理
      await new Promise(resolve => setTimeout(resolve, 50));
      console.log(`✅ 产品 ${event.productId} 库存更新处理完成`);
    } catch (error) {
      console.error(`❌ 产品 ${event.productId} 库存更新处理失败:`, error);
    }
  }
}
