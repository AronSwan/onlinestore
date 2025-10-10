import { IsString, IsNotEmpty, IsOptional, IsObject, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

// 用户行为事件类型枚举
export enum EventType {
  PAGE_VIEW = 'PAGE_VIEW',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  SEARCH = 'SEARCH',
  CART_ADD = 'CART_ADD',
  CART_REMOVE = 'CART_REMOVE',
  CHECKOUT = 'CHECKOUT',
  PURCHASE = 'PURCHASE',
}

// 购物车操作类型枚举
export enum CartOperation {
  CART_ADD = 'CART_ADD',
  CART_REMOVE = 'CART_REMOVE',
}

// 用户行为日志 DTO
export class UserBehaviorLogDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(EventType)
  eventType!: EventType;

  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;
}

// 页面浏览 DTO
export class PageViewDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  page!: string;

  // 自动设置事件类型
  get eventType(): EventType {
    return EventType.PAGE_VIEW;
  }

  static createFromInput(input: { sessionId: string; page: string; userId?: string }): PageViewDto {
    const dto = new PageViewDto();
    dto.sessionId = input.sessionId;
    dto.page = input.page;
    dto.userId = input.userId ?? '';
    return dto;
  }
}

// 商品浏览 DTO
export class ProductViewDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  // 自动设置事件类型
  get eventType(): EventType {
    return EventType.PRODUCT_VIEW;
  }

  static createFromInput(input: { sessionId: string; productId: string; userId?: string }): ProductViewDto {
    const dto = new ProductViewDto();
    dto.sessionId = input.sessionId;
    dto.productId = input.productId;
    dto.userId = input.userId ?? '';
    return dto;
  }
}

// 搜索 DTO
export class SearchDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  searchQuery!: string;

  // 自动设置事件类型
  get eventType(): EventType {
    return EventType.SEARCH;
  }

  static createFromInput(input: { sessionId: string; searchQuery: string; userId?: string }): SearchDto {
    const dto = new SearchDto();
    dto.sessionId = input.sessionId;
    dto.searchQuery = input.searchQuery;
    dto.userId = input.userId ?? '';
    return dto;
  }
}

// 购物车操作 DTO
export class CartOperationDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(CartOperation)
  operation!: CartOperation;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  cartId?: string;

  // 自动设置事件类型
  get eventType(): EventType {
    return this.operation as unknown as EventType;
  }

  // 构造函数用于更严格的初始化
  constructor(init?: Partial<CartOperationDto>) {
    if (init) {
      this.sessionId = init.sessionId as string;
      this.userId = init.userId;
      this.operation = init.operation as CartOperation;
      this.productId = init.productId as string;
      this.quantity = init.quantity as number;
      this.price = init.price as number;
      this.cartId = init.cartId;
    }
  }

  // 工厂方法：显式数值转换并应用默认值
  static create(init: Partial<CartOperationDto>): CartOperationDto {
    const dto = new CartOperationDto();
    dto.sessionId = init.sessionId as string;
    dto.userId = init.userId;
    dto.operation = init.operation as CartOperation;
    dto.productId = init.productId as string;
    dto.quantity = Number(init.quantity);
    dto.price = Number(init.price);
    dto.cartId = init.cartId;
    return dto;
  }

  static createFromInput(input: {
    sessionId: string;
    operation: CartOperation;
    productId: string;
    quantity: number | string;
    price: number | string;
    userId?: string;
    cartId?: string;
  }): CartOperationDto {
    const dto = new CartOperationDto();
    dto.sessionId = input.sessionId;
    dto.userId = input.userId;
    dto.operation = input.operation;
    dto.productId = input.productId;
    dto.quantity = Number(input.quantity);
    dto.price = Number(input.price);
    dto.cartId = input.cartId;
    return dto;
  }
}

// 结账 DTO
export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @Type(() => Number)
  @IsNumber()
  totalAmount!: number;

  // 自动设置事件类型
  get eventType(): EventType {
    return EventType.CHECKOUT;
  }

  constructor(init?: Partial<CheckoutDto>) {
    if (init) {
      this.sessionId = init.sessionId as string;
      this.userId = init.userId;
      this.orderId = init.orderId as string;
      this.totalAmount = Number(init.totalAmount);
    }
  }

  static create(init: Partial<CheckoutDto>): CheckoutDto {
    const dto = new CheckoutDto();
    dto.sessionId = init.sessionId as string;
    dto.userId = init.userId;
    dto.orderId = init.orderId as string;
    dto.totalAmount = Number(init.totalAmount);
    return dto;
  }

  static createFromInput(input: {
    sessionId: string;
    orderId: string;
    totalAmount: number | string;
    userId?: string;
  }): CheckoutDto {
    const dto = new CheckoutDto();
    dto.sessionId = input.sessionId;
    dto.userId = input.userId;
    dto.orderId = input.orderId;
    dto.totalAmount = Number(input.totalAmount);
    return dto;
  }
}

// 购买 DTO
export class PurchaseDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @Type(() => Number)
  @IsNumber()
  totalAmount!: number;

  // 自动设置事件类型
  get eventType(): EventType {
    return EventType.PURCHASE;
  }

  constructor(init?: Partial<PurchaseDto>) {
    if (init) {
      this.sessionId = init.sessionId as string;
      this.userId = init.userId;
      this.orderId = init.orderId as string;
      this.totalAmount = Number(init.totalAmount);
    }
  }

  static create(init: Partial<PurchaseDto>): PurchaseDto {
    const dto = new PurchaseDto();
    dto.sessionId = init.sessionId as string;
    dto.userId = init.userId;
    dto.orderId = init.orderId as string;
    dto.totalAmount = Number(init.totalAmount);
    return dto;
  }

  static createFromInput(input: {
    sessionId: string;
    orderId: string;
    totalAmount: number | string;
    userId?: string;
  }): PurchaseDto {
    const dto = new PurchaseDto();
    dto.sessionId = input.sessionId;
    dto.userId = input.userId;
    dto.orderId = input.orderId;
    dto.totalAmount = Number(input.totalAmount);
    return dto;
  }
}

// 自定义事件 DTO
export class CustomEventDto extends UserBehaviorLogDto {
  @IsString()
  @IsNotEmpty()
  customEventType!: string;

  @IsObject()
  eventData!: Record<string, any>;
}

// 业务日志 DTO
export class BusinessLogDto {
  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  constructor(init?: Partial<BusinessLogDto>) {
    if (init) {
      this.action = init.action as string;
      this.userId = init.userId as string;
      this.metadata = init.metadata ?? undefined;
    }
  }

  static create(init: Partial<BusinessLogDto>): BusinessLogDto {
    return new BusinessLogDto(init);
  }
}

// 订单事件 DTO
export class OrderEventDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  event!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  constructor(init?: Partial<OrderEventDto>) {
    if (init) {
      this.orderId = init.orderId as string;
      this.event = init.event as string;
      this.metadata = init.metadata ?? undefined;
    }
  }

  static create(init: Partial<OrderEventDto>): OrderEventDto {
    return new OrderEventDto(init);
  }
}

// 支付事件 DTO
export class PaymentEventDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @IsString()
  @IsNotEmpty()
  event!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  constructor(init?: Partial<PaymentEventDto>) {
    if (init) {
      this.paymentId = init.paymentId as string;
      this.event = init.event as string;
      this.amount = Number(init.amount);
      this.status = init.status as string;
      this.metadata = init.metadata ?? undefined;
    }
  }

  static create(init: Partial<PaymentEventDto>): PaymentEventDto {
    const dto = new PaymentEventDto();
    dto.paymentId = init.paymentId as string;
    dto.event = init.event as string;
    dto.amount = Number(init.amount);
    dto.status = init.status as string;
    dto.metadata = init.metadata ?? undefined;
    return dto;
  }
}

// 库存事件 DTO
export class InventoryEventDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  event!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  constructor(init?: Partial<InventoryEventDto>) {
    if (init) {
      this.productId = init.productId as string;
      this.event = init.event as string;
      this.quantity = Number(init.quantity);
      this.metadata = init.metadata ?? undefined;
    }
  }

  static create(init: Partial<InventoryEventDto>): InventoryEventDto {
    const dto = new InventoryEventDto();
    dto.productId = init.productId as string;
    dto.event = init.event as string;
    dto.quantity = Number(init.quantity);
    dto.metadata = init.metadata ?? undefined;
    return dto;
  }
}

// 系统事件 DTO
export class SystemEventDto {
  @IsString()
  @IsNotEmpty()
  event!: string;

  @IsString()
  @IsNotEmpty()
  level!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// 错误日志 DTO
export class ErrorLogDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

// 分析查询 DTO
export class AnalyticsQueryDto {
  @IsString()
  @IsNotEmpty()
  start!: string;

  @IsString()
  @IsNotEmpty()
  end!: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

// 用户行为分析查询 DTO
export class UserBehaviorAnalyticsQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}

// 热门页面查询 DTO
export class PopularPagesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  limit?: string;
}