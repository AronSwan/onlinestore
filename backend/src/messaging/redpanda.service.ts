import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, KafkaConfig, Producer, Consumer, logLevel } from 'kafkajs';
import { Topics, TopicName } from './topics';

export interface RedpandaProducerMessage<T = any> {
  topic: TopicName;
  key?: string;
  value: T;
  headers?: Record<string, string>;
}

@Injectable()
export class RedpandaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedpandaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Consumer[] = [];

  constructor() {
    const brokers = (process.env.REDPANDA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.REDPANDA_CLIENT_ID || 'onlinestore-backend';
    const ssl = process.env.REDPANDA_SSL === 'true';
    const saslUser = process.env.REDPANDA_SASL_USERNAME;
    const saslPass = process.env.REDPANDA_SASL_PASSWORD;
    const cfg: KafkaConfig = {
      clientId,
      brokers,
      ssl: ssl ? {} : undefined,
      sasl:
        saslUser && saslPass
          ? { mechanism: 'plain', username: saslUser, password: saslPass }
          : undefined,
      logLevel: logLevel.ERROR,
    };
    this.kafka = new Kafka(cfg);
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Redpanda producer connected');

    // 可选：预创建常用主题
    const admin = this.kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: Object.values(Topics).map(t => ({ topic: t, numPartitions: 3 })),
      waitForLeaders: true,
    });
    await admin.disconnect();
  }

  async onModuleDestroy() {
    await Promise.all(this.consumers.map(c => c.disconnect().catch(() => undefined)));
    await this.producer.disconnect().catch(() => undefined);
  }

  // --------- 兼容适配方法（向后兼容现有调用） ---------

  /**
   * 兼容：publish(topic, payload) 或 publish({ topic, value, key, headers })
   */
  async publish(topicOrMsg: TopicName | RedpandaProducerMessage, payload?: any) {
    if (typeof topicOrMsg === 'string') {
      const msg: RedpandaProducerMessage = {
        topic: topicOrMsg,
        value: payload,
      };
      await this.publish(msg);
      return;
    }
    // 如果传入的是 RedpandaProducerMessage，则直接发送
    const msg = topicOrMsg as RedpandaProducerMessage;
    const payloadObj = {
      topic: msg.topic,
      messages: [
        {
          key: msg.key,
          value: JSON.stringify(msg.value),
          headers: msg.headers,
        },
      ],
    };
    await this.producer.send(payloadObj);
  }

  /**
   * 别名：publishMessage
   */
  async publishMessage(
    topic: TopicName,
    value: any,
    key?: string,
    headers?: Record<string, string>,
  ) {
    await this.publish({ topic, value, key, headers });
  }

  /**
   * 别名：sendMessage / sendMessages - 兼容调用点
   */
  // 兼容：sendMessage(topic, value, key) 或 sendMessage({ topic, value, key })
  async sendMessage(topicOrMsg: TopicName | RedpandaProducerMessage, value?: any, key?: string) {
    if (typeof topicOrMsg === 'string') {
      await this.publishMessage(topicOrMsg, value, key);
      return;
    }
    const msg = topicOrMsg as RedpandaProducerMessage;
    await this.publishMessage(msg.topic, msg.value, msg.key, msg.headers);
  }

  async sendMessages(messages: RedpandaProducerMessage[]) {
    for (const m of messages) {
      await this.publish(m);
    }
  }

  /**
   * 兼容：createTopic(topic, partitions?, replication?) 或 createTopic({ topic, partitions, replication })
   */
  async createTopic(
    topicOrCfg: string | { topic: string; partitions?: number; replication?: number },
    partitions = 3,
    replication = 1,
  ) {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      if (typeof topicOrCfg === 'string') {
        await admin.createTopics({
          topics: [
            { topic: topicOrCfg, numPartitions: partitions, replicationFactor: replication },
          ],
          waitForLeaders: true,
        });
      } else {
        const cfg = topicOrCfg;
        await admin.createTopics({
          topics: [
            {
              topic: cfg.topic,
              numPartitions: cfg.partitions ?? partitions,
              replicationFactor: cfg.replication ?? replication,
            },
          ],
          waitForLeaders: true,
        });
      }
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * 兼容：createConsumer(groupId, topics[], handler) 或 createConsumer(configObject)
   * 如果传入的是 configObject，需包含 { groupId, topics, handler }
   */
  /**
   * 兼容 wrapper：支持两种签名
   * - createConsumer(groupId: string, topics: TopicName[], handler)
   * - createConsumer({ groupId, topics, handler })
   *
   * 实际实现委托给私有方法 _createConsumerInternal，避免递归自调用。
   */
  async createConsumer(configOrGroupId: any, topics?: TopicName[] | any, handler?: any) {
    if (
      typeof configOrGroupId === 'object' &&
      configOrGroupId !== null &&
      !Array.isArray(configOrGroupId)
    ) {
      const cfg = configOrGroupId as { groupId: string; topics?: TopicName[]; handler?: any };
      return this._createConsumerInternal(cfg.groupId, cfg.topics || [], cfg.handler);
    }
    return this._createConsumerInternal(
      configOrGroupId as string,
      topics as TopicName[],
      handler as any,
    );
  }

  private async _createConsumerInternal(
    groupId: string,
    topics: TopicName[],
    handler: (
      topic: string,
      value: any,
      key?: string,
      headers?: Record<string, string>,
    ) => Promise<void>,
  ) {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    for (const t of topics) {
      await consumer.subscribe({ topic: t, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ topic, message }: { topic: string; message: any }) => {
        try {
          const val = message.value ? JSON.parse(message.value.toString('utf8')) : undefined;
          const key = message.key?.toString('utf8');
          const headers = Object.fromEntries(
            Object.entries(message.headers || {}).map(([k, v]) => [k, v?.toString() ?? '']),
          );
          await handler(topic, val, key, headers);
        } catch (err: any) {
          this.logger.error(
            `Consumer handler error on topic ${topic}: ${err?.message}`,
            err?.stack,
          );
        }
      },
    });
    this.consumers.push(consumer);
    return consumer;
  }

  /**
   * 兼容：consumeMessages(consumer, handler) - consumer 可以是 consumer 实例或返回的对象
   */
  async consumeMessages(consumerInstance: any, handler: (message: any) => Promise<void>) {
    if (!consumerInstance || !consumerInstance.run) {
      this.logger.error('consumeMessages: invalid consumer instance');
      return;
    }
    await consumerInstance.run({
      eachMessage: async ({ topic, message }: { topic: string; message: any }) => {
        try {
          const val = message.value ? JSON.parse(message.value.toString('utf8')) : undefined;
          await handler({
            topic,
            value: val,
            key: message.key?.toString('utf8'),
            headers: message.headers,
          });
        } catch (err: any) {
          this.logger.error(`consumeMessages handler error: ${err?.message}`, err?.stack);
        }
      },
    });
  }

  /**
   * 兼容：healthCheck - 做一个简单的 producer/metadata ping
   */
  async healthCheck(): Promise<{
    status: 'connected' | 'disconnected';
    details?: any;
    brokers?: string[];
    error?: string;
  }> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      const metadata = await admin.fetchTopicMetadata();
      await admin.disconnect();
      // fetchTopicMetadata 返回结构未必包含 brokers，安全处理
      const brokers = (metadata as any)?.brokers
        ? (metadata as any).brokers.map((b: any) => `${b.host}:${b.port}`)
        : [];
      return { status: 'connected', details: metadata, brokers };
    } catch (err: any) {
      this.logger.error('Redpanda healthCheck failed', err?.stack);
      return { status: 'disconnected', error: err?.message ?? 'unknown' };
    }
  }

  /**
   * 兼容：getTopicDetails(topic)
   */
  async getTopicDetails(topic: string) {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
      return metadata;
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * 兼容：queryMessages （简单的占位实现，按需扩展）
   */
  async queryMessages(_opts: any): Promise<any[]> {
    // 复杂的消息查询通常需要专门的消费者或存储，这里返回空数组作为占位
    this.logger.warn('queryMessages called - placeholder implementation');
    return [];
  }
}
