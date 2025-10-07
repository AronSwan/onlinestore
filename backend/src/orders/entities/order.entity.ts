// 用途：订单实体定义
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export class Order {
  id: number;
  userId: number;
  orderNumber: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: any[];
  user?: any;
  createdAt: Date;
  shippedAt?: Date;
  paidAt?: Date;
  completedAt?: Date;
  shippingAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  paymentMethod?: string;
  notes?: string;
}
