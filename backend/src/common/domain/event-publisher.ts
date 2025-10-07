// 用途：领域事件发布器
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

@Injectable()
export class EventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * 发布所有未提交的领域事件
   */
  async publishAll(events: any[]): Promise<void> {
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }

  /**
   * 发布单个领域事件
   */
  async publish(event: any): Promise<void> {
    await this.eventBus.publish(event);
  }
}
