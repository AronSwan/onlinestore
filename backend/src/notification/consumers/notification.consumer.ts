import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedpandaService } from '../../messaging/redpanda.service';
import { Topics } from '../../messaging/topics';

export interface NotificationRequestedEvent {
  userId: number;
  channel: 'email' | 'sms' | 'push';
  template: string;
  payload: Record<string, any>;
  requestId?: string;
}

@Injectable()
export class NotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationConsumer.name);
  constructor(private readonly redpanda: RedpandaService) {}

  async onModuleInit() {
    await this.redpanda.createConsumer(
      'notification-service',
      [Topics.NotificationSend],
      async (topic: string, value: NotificationRequestedEvent) => {
        this.logger.log(`Received ${topic} -> ${JSON.stringify(value)}`);
        // TODO: 根据 channel 分发到 Email/SMS/Push 服务，并实现重试与死信策略
      },
    );
  }
}
