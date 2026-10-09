import { OrdersService } from './orders.service';
import { CreateOrderData, UpdateOrderData } from './dto/order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(createOrderData: CreateOrderData, req: any): Promise<import("./entities/order.entity").Order>;
    findAll(page: number, limit: number, status?: string, startDate?: string, endDate?: string): Promise<{
        orders: import("./entities/order.entity").Order[];
        total: number;
    }>;
    findByUserId(userId: number, page: number, limit: number, status?: string): Promise<{
        orders: import("./entities/order.entity").Order[];
        total: number;
    }>;
    findOne(id: number, req: any): Promise<import("./entities/order.entity").Order>;
    update(id: number, updateOrderData: UpdateOrderData): Promise<import("./entities/order.entity").Order>;
    remove(id: number): Promise<void>;
    getStatistics(): Promise<{
        totalOrders: number;
        pendingOrders: number;
        completedOrders: number;
        totalRevenue: number;
    }>;
    getMessageHistory(topic: string, limit: number, offset: number): Promise<any[]>;
}
