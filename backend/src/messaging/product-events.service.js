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
exports.ProductEventsService = void 0;
const common_1 = require("@nestjs/common");
const redpanda_service_1 = require("./redpanda.service");
const config_1 = require("@nestjs/config");
let ProductEventsService = class ProductEventsService {
    constructor(redpandaService, configService) {
        this.redpandaService = redpandaService;
        this.configService = configService;
        this.PRODUCT_CREATED_TOPIC = 'products.created';
        this.PRODUCT_UPDATED_TOPIC = 'products.updated';
        this.PRODUCT_VIEWED_TOPIC = 'products.viewed';
        this.INVENTORY_UPDATED_TOPIC = 'inventory.updated';
    }
    async onModuleInit() {
        await this.initializeTopics();
        await this.startConsumers();
    }
    async initializeTopics() {
        const topics = [
            this.PRODUCT_CREATED_TOPIC,
            this.PRODUCT_UPDATED_TOPIC,
            this.PRODUCT_VIEWED_TOPIC,
            this.INVENTORY_UPDATED_TOPIC,
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
        const productViewedConsumerId = await this.redpandaService.createConsumer({
            groupId: 'analytics-processors',
            topics: [this.PRODUCT_VIEWED_TOPIC],
        });
        await this.redpandaService.consumeMessages(productViewedConsumerId, async (payload) => {
            await this.handleProductViewed(JSON.parse(payload.value.toString('utf8')));
        });
        const inventoryConsumerId = await this.redpandaService.createConsumer({
            groupId: 'inventory-processors',
            topics: [this.INVENTORY_UPDATED_TOPIC],
        });
        await this.redpandaService.consumeMessages(inventoryConsumerId, async (payload) => {
            await this.handleInventoryUpdated(JSON.parse(payload.value.toString('utf8')));
        });
    }
    async publishProductCreated(event) {
        await this.redpandaService.sendMessage({
            topic: this.PRODUCT_CREATED_TOPIC,
            key: event.productId.toString(),
            value: event,
            headers: {
                eventType: 'product.created',
                source: 'products-service',
            },
        });
    }
    async publishProductUpdated(event) {
        await this.redpandaService.sendMessage({
            topic: this.PRODUCT_UPDATED_TOPIC,
            key: event.productId.toString(),
            value: event,
            headers: {
                eventType: 'product.updated',
                source: 'products-service',
            },
        });
    }
    async publishProductViewed(event) {
        await this.redpandaService.sendMessage({
            topic: this.PRODUCT_VIEWED_TOPIC,
            key: event.productId.toString(),
            value: event,
            headers: {
                eventType: 'product.viewed',
                source: 'products-service',
            },
        });
    }
    async publishInventoryUpdated(event) {
        await this.redpandaService.sendMessage({
            topic: this.INVENTORY_UPDATED_TOPIC,
            key: event.productId.toString(),
            value: event,
            headers: {
                eventType: 'inventory.updated',
                source: 'products-service',
            },
        });
    }
    async handleProductViewed(event) {
        console.log('处理产品浏览事件:', event.productId);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            console.log(`✅ 产品 ${event.productId} 浏览事件处理完成`);
        }
        catch (error) {
            console.error(`❌ 产品 ${event.productId} 浏览事件处理失败:`, error);
        }
    }
    async handleInventoryUpdated(event) {
        console.log('处理库存更新事件:', event.productId);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            console.log(`✅ 产品 ${event.productId} 库存更新处理完成`);
        }
        catch (error) {
            console.error(`❌ 产品 ${event.productId} 库存更新处理失败:`, error);
        }
    }
};
exports.ProductEventsService = ProductEventsService;
exports.ProductEventsService = ProductEventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redpanda_service_1.RedpandaService,
        config_1.ConfigService])
], ProductEventsService);
