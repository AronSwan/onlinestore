import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
  IsObject,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建支付订单DTO
 */
export class CreatePaymentOrderDto {
  @ApiProperty({
    description: '商户订单ID',
    example: 'ORDER_20240101_123456',
    minLength: 1,
    maxLength: 64,
  })
  @IsString()
  merchantOrderId: string;

  @ApiProperty({
    description: '支付金额',
    example: 99.99,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @ApiProperty({
    description: '货币类型',
    example: 'CNY',
    enum: ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH'],
  })
  @IsString()
  @IsEnum(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH'])
  currency: string;

  @ApiProperty({
    description: '支付方式',
    example: 'ALIPAY',
    enum: [
      'ALIPAY',
      'WECHAT',
      'UNIONPAY',
      'CREDIT_CARD',
      'BANK_TRANSFER',
      'USDT_TRC20',
      'USDT_ERC20',
      'USDT_BEP20',
      'BTC',
      'ETH',
    ],
  })
  @IsString()
  @IsEnum([
    'ALIPAY',
    'WECHAT',
    'UNIONPAY',
    'CREDIT_CARD',
    'BANK_TRANSFER',
    'USDT_TRC20',
    'USDT_ERC20',
    'USDT_BEP20',
    'BTC',
    'ETH',
  ])
  paymentMethod: string;

  @ApiProperty({
    description: '支付主题/商品名称',
    example: '商品购买',
    maxLength: 256,
  })
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: '支付描述',
    example: '购买商品的详细描述',
    maxLength: 1024,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '用户ID（可选，从JWT token中获取）',
    example: 'user_123456',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '异步通知URL',
    example: 'https://example.com/payment/notify',
  })
  @IsOptional()
  @IsUrl()
  notifyUrl?: string;

  @ApiPropertyOptional({
    description: '同步返回URL',
    example: 'https://example.com/payment/return',
  })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: '订单过期时间（ISO 8601格式）',
    example: '2024-01-01T12:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  expireTime?: string;

  @ApiPropertyOptional({
    description: '扩展参数',
    example: {
      productId: 'PROD_123',
      categoryId: 'CAT_456',
      discountCode: 'SAVE10',
    },
  })
  @IsOptional()
  @IsObject()
  extraParams?: Record<string, any>;
}
