import { PaymentMethod } from '../enums/order.enums';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';
export declare class OrderItemDto {
    productId: number;
    quantity: number;
    unitPrice?: number;
}
export declare class CreateOrderData {
    userId?: number;
    items: OrderItemDto[];
    shippingAddress: string;
    recipientName: string;
    recipientPhone: string;
    paymentMethod: PaymentMethod;
    notes?: string;
}
export declare class UpdateOrderData {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    shippingCompany?: string;
    trackingNumber?: string;
    notes?: string;
}
