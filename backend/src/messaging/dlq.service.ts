import { Injectable, Logger } from '@nestjs/common';
import { MonitoringService } from '../monitoring/monitoring.service';
import { OrderEventsService } from './order-events.service';
import { RedpandaService } from './redpanda.service';

@Injectable()
export class DlqService {
  private readonly logger = new Logger(DlqService.name);
  private isTestMode = false;

  constructor(
    private readonly redpanda: RedpandaService,
    private readonly monitoring: MonitoringService,
    private readonly orderEvents: OrderEventsService,
  ) {}

  enableTestMode() {
    this.isTestMode = true;
    this.logger.warn('死信队列服务进入测试模式');
  }

  async processDlqMessages() {
    const consumer = await this.redpanda.createConsumer({
      groupId: 'dlq-processor',
      topics: ['orders.dlq', 'payments.dlq'],
      maxBatchSize: 50,
      maxRetries: 0, // 不再重试
    });

    (consumer as any).on('message', async (message: any) => {
      try {
        (this.monitoring as any).incrementKafkaDlqMessages(message.topic, 'received');
        this.logger.debug(`收到死信消息: ${JSON.stringify(message.headers)}`);

        // 根据原始主题重新处理消息
        const originalTopic = message.headers['x-original-topic'];
        const retryCount = message.headers['x-retry-count'] || 0;

        if (this.isTestMode) {
          this.logger.log(`[测试模式] 死信消息处理: ${message.topic} ${message.key}`);
          return;
        }

        if (originalTopic === 'orders') {
          await this.orderEvents.reprocessOrderEvent({
            ...message.value,
            metadata: {
              ...message.value.metadata,
              isRetry: true,
              retryCount: parseInt(retryCount) + 1,
            },
          });
        }

        (this.monitoring as any).incrementKafkaDlqMessages(message.topic, 'processed');
        this.logger.debug(`死信消息处理完成: ${message.topic}/${message.key}`);
      } catch (error) {
        this.logger.error(`处理死信消息失败: ${error.message}`, error.stack);
        (this.monitoring as any).incrementKafkaDlqMessages(message.topic, 'process_error');

        // 记录原始消息内容用于调试
        if (this.isTestMode) {
          this.logger.error(`[测试模式] 失败消息内容: ${JSON.stringify(message.value)}`);
        }
      }
    });

    (consumer as any).on('error', (error: Error) => {
      this.logger.error(`死信队列消费者错误: ${error.message}`, error.stack);
      this.monitoring.setKafkaConnectionStatus(false);
    });

    await (consumer as any).connect();
    this.monitoring.setKafkaConnectionStatus(true);
  }
}
