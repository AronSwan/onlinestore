// 用途：Redpanda配置管理
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30 00:00:00

import { registerAs } from '@nestjs/config';

export interface RedpandaConfig {
  brokers: string[];
  clientId: string;
  topics: {
    orders: {
      created: string;
      updated: string;
    };
    products: {
      created: string;
      updated: string;
      viewed: string;
    };
    payments: {
      processed: string;
    };
    inventory: {
      updated: string;
    };
  };
  consumer: {
    groupId: string;
    sessionTimeout: number;
    rebalanceTimeout: number;
    heartbeatInterval: number;
  };
  producer: {
    allowAutoTopicCreation: boolean;
    transactionTimeout: number;
    batchSize?: number;
    batchLingerMs?: number;
    enableIdempotence?: boolean;
    deadLetterTopics?: Record<string, string>;
  };
}

export default registerAs(
  'redpanda',
  (): RedpandaConfig => ({
    brokers: process.env.REDPANDA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.REDPANDA_CLIENT_ID || 'caddy-shopping-backend',

    topics: {
      orders: {
        created: 'orders.created',
        updated: 'orders.updated',
      },
      products: {
        created: 'products.created',
        updated: 'products.updated',
        viewed: 'products.viewed',
      },
      payments: {
        processed: 'payments.processed',
      },
      inventory: {
        updated: 'inventory.updated',
      },
    },

    consumer: {
      groupId: process.env.REDPANDA_CONSUMER_GROUP_ID || 'caddy-shopping-consumers',
      sessionTimeout: parseInt(process.env.REDPANDA_SESSION_TIMEOUT || '30000'),
      rebalanceTimeout: parseInt(process.env.REDPANDA_REBALANCE_TIMEOUT || '60000'),
      heartbeatInterval: parseInt(process.env.REDPANDA_HEARTBEAT_INTERVAL || '3000'),
    },

    producer: {
      allowAutoTopicCreation: process.env.REDPANDA_ALLOW_AUTO_TOPIC_CREATION !== 'false',
      transactionTimeout: parseInt(process.env.REDPANDA_TRANSACTION_TIMEOUT || '30000'),
      // 批量发送优化
      batchSize: parseInt(process.env.REDPANDA_BATCH_SIZE || '100'),
      batchLingerMs: parseInt(process.env.REDPANDA_BATCH_LINGER_MS || '100'),
      // 幂等生产者
      enableIdempotence: true,
      // 死信队列配置
      deadLetterTopics: {
        orders: 'orders.dlq',
        payments: 'payments.dlq',
      },
    },
  }),
);
