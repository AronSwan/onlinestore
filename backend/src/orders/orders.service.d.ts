import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderData, UpdateOrderData } from './dto/order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus } from './entities/order.entity';
import { MonitoringService } from '../monitoring/monitoring.service';
import { OrderEventsService } from '../messaging/order-events.service';
import { AuditService } from '../common/audit/audit.service';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly productRepository;
    private readonly monitoring;
    private readonly orderEventsService;
    private readonly auditService;
    private readonly logger;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, productRepository: Repository<Product>, monitoring: MonitoringService, orderEventsService: OrderEventsService, auditService: AuditService);
    create(orderData: CreateOrderData): Promise<Order>;
    findById(id: number): Promise<Order | null>;
    findByUserId(userId: number, page?: number, limit?: number): Promise<{
        orders: Order[];
        total: number;
    }>;
    findAll(page?: number, limit?: number): Promise<{
        orders: Order[];
        total: number;
    }>;
    update(id: number, updateData: UpdateOrderData): Promise<Order>;
    updateStatus(id: number, status: OrderStatus): Promise<Order>;
    delete(id: number): Promise<void>;
    getMessageHistory(topic: string, limit: number, offset: number): Promise<any[]>;
    getStatistics(): Promise<{
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        totalRevenue: number;
    }>;
    private generateOrderNumber;
    private publishOrderCreatedEvent;
    private publishOrderStatusUpdatedEvent;
}
