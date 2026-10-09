import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
export declare class OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productSnapshot: {
        name: string;
        image: string;
        specifications: Record<string, any>;
    };
    order: Order;
    product: Product;
}
