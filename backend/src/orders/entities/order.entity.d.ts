import { OrderItem } from './order-item.entity';
import { User } from '../../users/entities/user.entity';
export declare enum OrderStatus {
    PENDING = "pending",
    PAID = "paid",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare class Order {
    id: number;
    user?: User;
    userId: number;
    orderNumber: string;
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    items: OrderItem[];
    shippingAddress?: string;
    recipientName?: string;
    recipientPhone?: string;
    paymentMethod?: string;
    notes?: string;
    createdAt: Date;
    shippedAt?: Date;
    paidAt?: Date;
    completedAt?: Date;
    updatedAt: Date;
}
