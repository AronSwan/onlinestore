import { OnModuleInit } from '@nestjs/common';
import { RedpandaService } from './redpanda.service';
import { ConfigService } from '@nestjs/config';
export interface OrderCreatedEvent {
    eventId: string;
    orderId: number;
    orderNumber: string;
    userId: number;
    totalAmount: number;
    items: Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
    }>;
    timestamp: string;
    metadata?: Record<string, any>;
}
export interface OrderStatusUpdatedEvent {
    orderId: number;
    oldStatus: string;
    newStatus: string;
    updatedBy: string;
    timestamp: string;
}
export interface PaymentProcessedEvent {
    orderId: number;
    paymentId: string;
    amount: number;
    status: string;
    timestamp: string;
}
export declare class OrderEventsService implements OnModuleInit {
    private readonly redpandaService;
    private readonly configService;
    private readonly ORDER_CREATED_TOPIC;
    private readonly ORDER_UPDATED_TOPIC;
    private readonly PAYMENT_PROCESSED_TOPIC;
    private readonly INVENTORY_UPDATE_TOPIC;
    constructor(redpandaService: RedpandaService, configService: ConfigService);
    onModuleInit(): Promise<void>;
    private initializeTopics;
    private startConsumers;
    publishOrderCreated(event: OrderCreatedEvent): Promise<void>;
    publishOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void>;
    publishPaymentProcessed(event: PaymentProcessedEvent): Promise<void>;
    getMessageHistory(topic: string, limit: number, offset: number): Promise<any[]>;
    reprocessOrderEvent(event: any): Promise<void>;
    private handleOrderCreated;
    private handlePaymentProcessed;
}
