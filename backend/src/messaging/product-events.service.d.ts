import { OnModuleInit } from '@nestjs/common';
import { RedpandaService } from './redpanda.service';
import { ConfigService } from '@nestjs/config';
export interface ProductCreatedEvent {
    productId: number;
    name: string;
    price: number;
    category: any;
    timestamp: string;
}
export interface ProductUpdatedEvent {
    productId: number;
    name?: string;
    price?: number;
    stock?: number;
    oldPrice?: number;
    timestamp: string;
}
export interface ProductViewedEvent {
    productId: number;
    userId?: number;
    timestamp: string;
}
export interface InventoryUpdatedEvent {
    productId: number;
    oldStock: number;
    newStock: number;
    change: number;
    reason: 'order' | 'manual' | 'system';
    timestamp: string;
}
export declare class ProductEventsService implements OnModuleInit {
    private readonly redpandaService;
    private readonly configService;
    private readonly PRODUCT_CREATED_TOPIC;
    private readonly PRODUCT_UPDATED_TOPIC;
    private readonly PRODUCT_VIEWED_TOPIC;
    private readonly INVENTORY_UPDATED_TOPIC;
    constructor(redpandaService: RedpandaService, configService: ConfigService);
    onModuleInit(): Promise<void>;
    private initializeTopics;
    private startConsumers;
    publishProductCreated(event: ProductCreatedEvent): Promise<void>;
    publishProductUpdated(event: ProductUpdatedEvent): Promise<void>;
    publishProductViewed(event: ProductViewedEvent): Promise<void>;
    publishInventoryUpdated(event: InventoryUpdatedEvent): Promise<void>;
    private handleProductViewed;
    private handleInventoryUpdated;
}
