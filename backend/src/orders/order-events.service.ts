import { Injectable } from '@nestjs/common';
import { MonitoringService } from '../monitoring/monitoring.service';

export interface OrderCreatedEvent {
  eventId: string;
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
  metadata: {
    source: string;
    attempt: number;
    traceId: string;
  };
}

export interface OrderStatusUpdatedEvent {
  orderId: number;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
}

@Injectable()
export class OrderEventsService {
  constructor(private readonly monitoring: MonitoringService) {}

  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      // 模拟发布到消息队列
      console.log('发布订单创建事件:', {
        topic: 'order.created',
        eventId: event.eventId,
        orderId: event.orderId,
        userId: event.userId,
      });

      this.monitoring.incrementKafkaMessagesProduced('order.created');
    } catch (error) {
      this.monitoring.incrementKafkaDlqMessages('order.created', 'publish_error');
      throw error;
    }
  }

  async publishOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void> {
    try {
      // 模拟发布到消息队列
      console.log('发布订单状态更新事件:', {
        topic: 'order.status.updated',
        orderId: event.orderId,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
      });

      this.monitoring.incrementKafkaMessagesProduced('order.status.updated');
    } catch (error) {
      this.monitoring.incrementKafkaDlqMessages('order.status.updated', 'publish_error');
      throw error;
    }
  }

  async getMessageHistory(topic: string, limit: number, offset: number): Promise<any[]> {
    try {
      // 模拟从消息存储查询历史
      return [
        {
          topic,
          offset,
          timestamp: new Date().toISOString(),
          message: '模拟消息历史记录',
        },
      ];
    } catch (error) {
      this.monitoring.incrementKafkaDlqMessages(topic, 'query_error');
      throw error;
    }
  }
}
