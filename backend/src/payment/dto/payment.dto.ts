import { IsString, IsNumber, IsOptional, IsEnum, IsPositive, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '用户ID' })
  @IsNumber()
  @IsPositive()
  userId: number;

  @ApiProperty({ description: '支付金额' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: '货币类型', default: 'CNY' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: '支付方式', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: '支付成功返回地址' })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({ description: '支付结果通知地址' })
  @IsOptional()
  @IsString()
  notifyUrl?: string;

  @ApiPropertyOptional({ description: '支付过期时间（分钟）', minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  expireMinutes?: number;

  @ApiPropertyOptional({ description: '扩展数据' })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: '幂等性键' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: '支付ID' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: '退款金额' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentCallbackDto {
  @ApiProperty({ description: '支付ID' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: '支付状态' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: '支付金额' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: '第三方交易ID' })
  @IsOptional()
  @IsString()
  thirdPartyTransactionId?: string;

  @ApiPropertyOptional({ description: '区块链交易哈希' })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiPropertyOptional({ description: '支付时间' })
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional({ description: '回调签名' })
  @IsOptional()
  @IsString()
  signature?: string;
}
