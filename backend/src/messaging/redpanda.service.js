"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedpandaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedpandaService = void 0;
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
const topics_1 = require("./topics");
let RedpandaService = RedpandaService_1 = class RedpandaService {
    constructor() {
        this.logger = new common_1.Logger(RedpandaService_1.name);
        this.consumers = [];
        const isDev = process.env.NODE_ENV !== 'production';
        const kafkaEnabledEnv = process.env.KAFKA_ENABLED;
        const kafkaEnabled = kafkaEnabledEnv === undefined ? !isDev : kafkaEnabledEnv !== 'false';
        if (isDev || !kafkaEnabled) {
            this.kafka = {
                producer: () => ({
                    connect: async () => { },
                    disconnect: async () => { },
                    send: async () => { },
                    on: () => { },
                }),
                admin: () => ({
                    connect: async () => { },
                    disconnect: async () => { },
                    createTopics: async () => { },
                    fetchTopicMetadata: async () => ({ topics: [] }),
                }),
                consumer: () => ({
                    connect: async () => { },
                    disconnect: async () => { },
                    subscribe: async () => { },
                    run: async () => { },
                }),
            };
            this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
            if (!kafkaEnabled) {
                this.logger.log('Kafka/Redpanda disabled via KAFKA_ENABLED=false; using stub client');
            }
        }
        else {
            const brokers = (process.env.REDPANDA_BROKERS || 'localhost:9092').split(',');
            const clientId = process.env.REDPANDA_CLIENT_ID || 'onlinestore-backend';
            const ssl = process.env.REDPANDA_SSL === 'true';
            const saslUser = process.env.REDPANDA_SASL_USERNAME;
            const saslPass = process.env.REDPANDA_SASL_PASSWORD;
            const cfg = {
                clientId,
                brokers,
                ssl: ssl ? {} : undefined,
                sasl: saslUser && saslPass
                    ? { mechanism: 'plain', username: saslUser, password: saslPass }
                    : undefined,
                logLevel: kafkajs_1.logLevel.ERROR,
            };
            this.kafka = new kafkajs_1.Kafka(cfg);
            this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
        }
    }
    async onModuleInit() {
        try {
            const kafkaEnabledEnv = process.env.KAFKA_ENABLED;
            const isDev = process.env.NODE_ENV !== 'production';
            const kafkaEnabled = kafkaEnabledEnv === undefined ? !isDev : kafkaEnabledEnv !== 'false';
            if (!kafkaEnabled) {
                this.logger.log('Kafka/Redpanda is disabled; skipping connection and topic creation');
                return;
            }
            await this.producer.connect();
            this.logger.log('Redpanda producer connected');
            const admin = this.kafka.admin();
            await admin.connect();
            await admin.createTopics({
                topics: Object.values(topics_1.Topics).map(t => ({ topic: t, numPartitions: 3 })),
                waitForLeaders: true,
            });
            await admin.disconnect();
        }
        catch (error) {
            const isDev = process.env.NODE_ENV !== 'production';
            const kafkaEnabledEnv = process.env.KAFKA_ENABLED;
            const kafkaEnabled = kafkaEnabledEnv === undefined ? !isDev : kafkaEnabledEnv !== 'false';
            if (isDev || !kafkaEnabled) {
                this.logger.warn('Failed to connect to Redpanda in development mode, continuing without it');
                this.producer = {
                    connect: async () => { },
                    disconnect: async () => { },
                    send: async () => { },
                    on: () => { },
                };
            }
            else {
                this.logger.error('Failed to connect to Redpanda', error);
                throw error;
            }
        }
    }
    async onModuleDestroy() {
        await Promise.all(this.consumers.map(c => c.disconnect().catch(() => undefined)));
        await this.producer.disconnect().catch(() => undefined);
    }
    async publish(topicOrMsg, payload) {
        if (typeof topicOrMsg === 'string') {
            const msg = {
                topic: topicOrMsg,
                value: payload,
            };
            await this.publish(msg);
            return;
        }
        const msg = topicOrMsg;
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
    async sendMessage(topicOrMsg, value, key) {
        if (typeof topicOrMsg === 'string') {
            await this.publish({ topic: topicOrMsg, value, key });
            return;
        }
        const msg = topicOrMsg;
        await this.publish(msg);
    }
    async createTopic(topicOrCfg, partitions = 3, replication = 1) {
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
            }
            else {
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
        }
        finally {
            await admin.disconnect();
        }
    }
    async createConsumer(configOrGroupId, topics, handler) {
        if (typeof configOrGroupId === 'object' &&
            configOrGroupId !== null &&
            !Array.isArray(configOrGroupId)) {
            const cfg = configOrGroupId;
            return this._createConsumerInternal(cfg.groupId, cfg.topics || [], cfg.handler);
        }
        return this._createConsumerInternal(configOrGroupId, topics, handler);
    }
    async _createConsumerInternal(groupId, topics, handler) {
        const consumer = this.kafka.consumer({ groupId });
        await consumer.connect();
        for (const t of topics) {
            await consumer.subscribe({ topic: t, fromBeginning: false });
        }
        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                try {
                    const val = message.value ? JSON.parse(message.value.toString('utf8')) : undefined;
                    const key = message.key?.toString('utf8');
                    const headers = Object.fromEntries(Object.entries(message.headers || {}).map(([k, v]) => [k, v?.toString() ?? '']));
                    await handler(topic, val, key, headers);
                }
                catch (err) {
                    this.logger.error(`Consumer handler error on topic ${topic}: ${err?.message}`, err?.stack);
                }
            },
        });
        this.consumers.push(consumer);
        return consumer;
    }
    async consumeMessages(consumerInstance, handler) {
        const consumer = consumerInstance;
        if (!consumer || !consumer.run) {
            this.logger.error('consumeMessages: invalid consumer instance');
            return;
        }
        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                try {
                    const val = message.value ? JSON.parse(message.value.toString('utf8')) : undefined;
                    await handler({
                        topic,
                        value: Buffer.from(String(val ?? '')),
                        key: message.key?.toString('utf8') ?? undefined,
                        headers: message.headers,
                    });
                }
                catch (err) {
                    this.logger.error(`consumeMessages handler error: ${err?.message}`, err?.stack);
                }
            },
        });
    }
    async healthCheck() {
        try {
            const admin = this.kafka.admin();
            await admin.connect();
            const metadata = await admin.fetchTopicMetadata();
            await admin.disconnect();
            const brokers = metadata?.brokers
                ? metadata.brokers.map(b => `${b.host}:${b.port}`)
                : [];
            return { status: 'connected', details: metadata, brokers };
        }
        catch (err) {
            this.logger.error('Redpanda healthCheck failed', err?.stack);
            return { status: 'disconnected', error: err?.message ?? 'unknown' };
        }
    }
    async queryMessages(_opts) {
        this.logger.warn('queryMessages called - placeholder implementation');
        return [];
    }
};
exports.RedpandaService = RedpandaService;
exports.RedpandaService = RedpandaService = RedpandaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedpandaService);
