import {
  IsNumber,
  IsInt,
  IsString,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../enums/order.enums';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';

export class OrderItemDto {
  @IsNumber()
  productId: number;

  // 终验整改(2026-10-03 #3): 小数数量会造出分数库存——限定正整数
  @IsInt()
  @Min(1)
  quantity: number;

  // V13: 单价由服务端按商品现价定价, 客户端字段仅兼容保留(被忽略)
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateOrderData {
  // V13(2026-10-03): userId 由服务端从令牌注入(controller 覆盖), 客户端可不传;
  // 传了也会被覆盖——归属不可由请求体决定
  @IsOptional()
  @IsNumber()
  userId?: number;

  // 终验整改(2026-10-03 #4): 空 items 会造出零元空订单
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  shippingAddress: string;

  @IsString()
  recipientName: string;

  @IsString()
  recipientPhone: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderData {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  shippingCompany?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
