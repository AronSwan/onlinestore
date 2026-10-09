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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderEventsService = void 0;
const common_1 = require("@nestjs/common");
const redpanda_service_1 = require("./redpanda.service");
const config_1 = require("@nestjs/config");
let OrderEventsService = class OrderEventsService {
    constructor(redpandaService, configService) {
        this.redpandaService = redpandaService;
        this.configService = configService;
        this.ORDER_CREATED_TOPIC = 'orders.created';
        this.ORDER_UPDATED_TOPIC = 'orders.updated';
        this.PAYMENT_PROCESSED_TOPIC = 'payments.processed';
        this.INVENTORY_UPDATE_TOPIC = 'inventory.updated';
    }
    async onModuleInit() {
        try {
            await this.initializeTopics();
        }
        catch (error) {
            console.warn('[OrderEventsService] 初始化主题失败（事件功能降级）:', error?.message);
        }
        try {
            await this.startConsumers();
        }
        catch (error) {
            console.warn('[OrderEventsService] 启动事件消费者失败（事件功能降级）:', error?.message);
        }
    }
    async initializeTopics() {
        const topics = [
            this.ORDER_CREATED_TOPIC,
            this.ORDER_UPDATED_TOPIC,
            this.PAYMENT_PROCESSED_TOPIC,
            this.INVENTORY_UPDATE_TOPIC,
        ];
        for (const topic of topics) {
            try {
                await this.redpandaService.createTopic(topic, 3, 1);
            }
            catch (error) {
                console.warn(`主题创建失败 ${topic}:`, error.message);
            }
        }
    }
    async startConsumers() {
        const consumerConfig = {
            groupId: 'order-processors',
            topics: [this.ORDER_CREATED_TOPIC],
            maxBatchSize: 100,
            options: {
                maxBatchInterval: 5000,
                deadLetterTopic: 'orders.created.dlq',
                maxRetries: 3,
                isolationLevel: 'read_committed',
            },
        };
        const orderCreatedConsumerId = await this.redpandaService.createConsumer(consumerConfig);
        await this.redpandaService.consumeMessages(orderCreatedConsumerId, async (payload) => {
            await this.handleOrderCreated(JSON.parse(payload.value.toString('utf8')));
        });
        const paymentConsumerId = await this.redpandaService.createConsumer({
            groupId: 'payment-processors',
            topics: [this.PAYMENT_PROCESSED_TOPIC],
        });
        await this.redpandaService.consumeMessages(paymentConsumerId, async (payload) => {
            await this.handlePaymentProcessed(JSON.parse(payload.value.toString('utf8')));
        });
    }
    async publishOrderCreated(event) {
        await this.redpandaService.sendMessage({
            topic: this.ORDER_CREATED_TOPIC,
            key: event.orderId.toString(),
            value: event,
            headers: {
                eventType: 'order.created',
                source: 'orders-service',
            },
        });
    }
    async publishOrderStatusUpdated(event) {
        await this.redpandaService.sendMessage({
            topic: this.ORDER_UPDATED_TOPIC,
            key: event.orderId.toString(),
            value: event,
            headers: {
                eventType: 'order.updated',
                source: 'orders-service',
            },
        });
    }
    async publishPaymentProcessed(event) {
        await this.redpandaService.sendMessage({
            topic: this.PAYMENT_PROCESSED_TOPIC,
            key: event.orderId.toString(),
            value: event,
            headers: {
                eventType: 'payment.processed',
                source: 'payments-service',
            },
        });
    }
    async getMessageHistory(topic, limit, offset) {
        return this.redpandaService.queryMessages({
            topic,
            limit,
            offset,
            fromTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });
    }
    async reprocessOrderEvent(event) {
        if (event.metadata?.isRetry) {
            console.log(`♻️ 重试处理订单事件: ${event.orderId} (尝试 ${event.metadata.retryCount}次)`);
        }
        await this.handleOrderCreated(event);
    }
    async handleOrderCreated(event) {
        console.log('处理订单创建事件:', event.orderId);
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`✅ 订单 ${event.orderId} 异步处理完成`);
        }
        catch (error) {
            console.error(`❌ 订单 ${event.orderId} 处理失败:`, error);
        }
    }
    async handlePaymentProcessed(event) {
        console.log('处理支付事件:', event.orderId);
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`✅ 支付 ${event.paymentId} 异步处理完成`);
        }
        catch (error) {
            console.error(`❌ 支付 ${event.paymentId} 处理失败:`, error);
        }
    }
};
exports.OrderEventsService = OrderEventsService;
exports.OrderEventsService = OrderEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redpanda_service_1.RedpandaService,
        config_1.ConfigService])
], OrderEventsService);
