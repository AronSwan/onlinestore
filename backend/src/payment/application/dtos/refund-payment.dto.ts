import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 退款申请DTO
 */
export class RefundPaymentDto {
  @ApiProperty({
    description: '支付订单ID',
    example: 'PAY_1234567890ABCDEF',
  })
  @IsString()
  paymentOrderId: string;

  @ApiProperty({
    description: '退款金额',
    example: 50.0,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.01)
  @Max(999999.99)
  refundAmount: number;

  @ApiProperty({
    description: '货币类型',
    example: 'CNY',
    enum: ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH'],
  })
  @IsString()
  @IsEnum(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH'])
  currency: string;

  @ApiProperty({
    description: '退款原因',
    example: '用户申请退款',
    maxLength: 500,
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: '退款说明',
    example: '商品质量问题，用户要求退款',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '操作员ID（可选，从JWT token中获取）',
    example: 'admin_123',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
