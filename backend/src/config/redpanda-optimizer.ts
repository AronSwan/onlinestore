// 用途：Redpanda配置优化，生产环境Broker配置
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:15:00

import { createMasterConfiguration } from './unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

export class RedpandaOptimizer {
  /**
   * 验证Redpanda配置
   */
  static validateRedpandaConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查Kafka相关环境变量
    const kafkaHost = process.env.KAFKA_HOST;
    const kafkaPort = process.env.KAFKA_PORT;

    if (!kafkaHost && masterConfig.app.env === 'production') {
      errors.push('生产环境必须设置KAFKA_HOST环境变量');
    }

    if (kafkaHost === 'localhost' && masterConfig.app.env === 'production') {
      warnings.push('生产环境Redpanda主机不应为localhost');
    }

    // 检查Redpanda特定配置
    const replicationFactor = parseInt(process.env.KAFKA_REPLICATION_FACTOR || '3', 10);
    if (replicationFactor < 3 && masterConfig.app.env === 'production') {
      warnings.push('生产环境Redpanda复制因子建议至少为3');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 获取Redpanda优化配置
   */
  static getRedpandaOptimizationConfig() {
    const isProduction = masterConfig.app.env === 'production';

    return {
      // Broker配置
      brokers: isProduction
        ? [`${process.env.KAFKA_HOST || 'localhost'}:${process.env.KAFKA_PORT || '9092'}`]
        : ['localhost:9092'],

      // 客户端配置
      client: {
        clientId: `caddy-shopping-${masterConfig.app.env}`,
        brokers: isProduction
          ? [`${process.env.KAFKA_HOST || 'localhost'}:${process.env.KAFKA_PORT || '9092'}`]
          : ['localhost:9092'],
        ssl: isProduction,
        sasl: isProduction
          ? {
              mechanism: 'scram-sha-256',
              username: process.env.KAFKA_USERNAME || 'admin',
              password: process.env.KAFKA_PASSWORD || 'password',
            }
          : undefined,
        connectionTimeout: 10000,
        authenticationTimeout: 10000,
        reauthenticationThreshold: 30000,
      },

      // 生产者配置
      producer: {
        allowAutoTopicCreation: true,
        transactionTimeout: 60000,
        idempotent: true,
        maxInFlightRequests: 5,
        acks: -1, // 所有副本确认
        compression: 1, // GZIP压缩
        batchSize: 16384,
        lingerMs: 5,
        retries: 10,
        retryBackoff: 100,
      },

      // 消费者配置
      consumer: {
        groupId: `caddy-shopping-consumer-${masterConfig.app.env}`,
        allowAutoTopicCreation: true,
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
        heartbeatInterval: 3000,
        maxBytes: 1048576, // 1MB
        maxBytesPerPartition: 1048576,
        maxWaitMs: 5000,
        retry: {
          maxRetryTime: 30000,
          initialRetryTime: 300,
          factor: 2,
        },
      },

      // Topic配置
      topics: {
        orders: {
          topic: 'orders',
          partitions: 6,
          replicationFactor: parseInt(process.env.KAFKA_REPLICATION_FACTOR || '3', 10),
          config: {
            'cleanup.policy': 'compact',
            'retention.ms': '604800000', // 7天
            'max.message.bytes': '10485760', // 10MB
          },
        },
        payments: {
          topic: 'payments',
          partitions: 3,
          replicationFactor: parseInt(process.env.KAFKA_REPLICATION_FACTOR || '3', 10),
          config: {
            'cleanup.policy': 'compact',
            'retention.ms': '2592000000', // 30天
          },
        },
      },
    };
  }

  /**
   * 生成Redpanda配置报告
   */
  static generateRedpandaReport(): string {
    const validation = this.validateRedpandaConfig();
    const optimization = this.getRedpandaOptimizationConfig();

    let report = `📊 Redpanda配置优化报告 (环境: ${masterConfig.app.env})\n\n`;

    if (validation.errors.length > 0) {
      report += '❌ 错误:\n';
      validation.errors.forEach(error => (report += `  - ${error}\n`));
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += '⚠️  警告:\n';
      validation.warnings.forEach(warning => (report += `  - ${warning}\n`));
      report += '\n';
    }

    report += '🔧 优化配置:\n';
    report += `  - Broker地址: ${optimization.client.brokers.join(', ')}\n`;
    report += `  - 客户端ID: ${optimization.client.clientId}\n`;
    report += `  - 认证: ${optimization.client.sasl ? '启用' : '禁用'}\n`;
    report += `  - 生产者幂等性: ${optimization.producer.idempotent ? '启用' : '禁用'}\n`;
    report += `  - 确认机制: ${optimization.producer.acks === -1 ? '所有副本' : 'Leader副本'}\n`;

    report += '\n📈 Topic配置:\n';
    Object.entries(optimization.topics).forEach(([name, config]) => {
      report += `  - ${name}: ${config.partitions}分区, ${config.replicationFactor}副本\n`;
    });

    report += '\n💡 Redpanda生产环境建议:\n';
    report += '  - 使用3节点以上集群确保高可用\n';
    report += '  - 配置监控和告警系统\n';
    report += '  - 定期备份Topic数据\n';
    report += '  - 优化网络和存储配置\n';
    report += '  - 启用TLS加密通信\n';

    return report;
  }
}
