import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer } from 'kafkajs';
import { TopicName } from './topics';
export interface RedpandaProducerMessage<T = any> {
    topic: TopicName;
    key?: string;
    value: T;
    headers?: Record<string, string>;
}
export declare class RedpandaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private kafka;
    private producer;
    private consumers;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    publish(topicOrMsg: TopicName | RedpandaProducerMessage, payload?: unknown): Promise<void>;
    sendMessage(topicOrMsg: TopicName | RedpandaProducerMessage, value?: unknown, key?: string): Promise<void>;
    createTopic(topicOrCfg: string | {
        topic: string;
        partitions?: number;
        replication?: number;
    }, partitions?: number, replication?: number): Promise<void>;
    createConsumer(configOrGroupId: unknown, topics?: TopicName[] | unknown, handler?: (topic: string, value: unknown, key?: string, headers?: Record<string, string>) => Promise<void>): Promise<Consumer>;
    private _createConsumerInternal;
    consumeMessages(consumerInstance: {
        run: (config: Record<string, unknown>) => Promise<void>;
    } | unknown, handler: (payload: {
        topic: string;
        value: Buffer | null;
        key?: string;
        headers?: Record<string, unknown>;
    }) => Promise<void>): Promise<void>;
    healthCheck(): Promise<{
        status: 'connected' | 'disconnected';
        details?: unknown;
        brokers?: string[];
        error?: string;
    }>;
    queryMessages(_opts: Record<string, unknown>): Promise<unknown[]>;
}
