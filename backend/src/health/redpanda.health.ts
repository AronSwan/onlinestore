// 用途：Redpanda 健康检查服务
// 依赖文件：redpanda.service.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedpandaService } from '../messaging/redpanda.service';

@Injectable()
export class RedpandaHealthIndicator extends HealthIndicator {
  constructor(private readonly redpandaService: RedpandaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.redpandaService.healthCheck();

      if (health.status === 'connected') {
        return this.getStatus(key, true, {
          status: health.status,
          details: health.details,
          timestamp: new Date().toISOString(),
        });
      } else {
        return this.getStatus(key, false, {
          error: `Redpanda status: ${health.status}`,
          details: health.details,
          status: health.status,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      return this.getStatus(key, false, {
        error: error.message,
        status: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async checkTopicHealth(key: string, topic: string): Promise<HealthIndicatorResult> {
    try {
      const topicDetails = await this.redpandaService.getTopicDetails(topic);

      // topicDetails 结构通常为 { topics: ITopicMetadata[] }
      // 在不同 kafkajs/Redpanda 版本中结构可能不同，安全取值：
      const topicMeta =
        (topicDetails as any)?.topics?.find((t: any) => t.name === topic) || (topicDetails as any);
      const partitionsCount =
        topicMeta?.partitions && Array.isArray(topicMeta.partitions)
          ? topicMeta.partitions.length
          : 0;

      return this.getStatus(`${key}_${topic}`, true, {
        topic,
        partitions: partitionsCount,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return this.getStatus(`${key}_${topic}`, false, {
        topic,
        error: error.message,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
