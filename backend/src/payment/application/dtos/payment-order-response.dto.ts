import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 支付订单响应DTO
 */
export class PaymentOrderResponseDto {
  @ApiProperty({
    description: '支付订单ID',
    example: 'PAY_1234567890ABCDEF',
  })
  paymentOrderId: string;

  @ApiProperty({
    description: '商户订单ID',
    example: 'ORDER_20240101_123456',
  })
  merchantOrderId: string;

  @ApiProperty({
    description: '支付金额',
    example: 99.99,
  })
  amount: number;

  @ApiProperty({
    description: '货币类型',
    example: 'CNY',
  })
  currency: string;

  @ApiProperty({
    description: '支付方式',
    example: 'ALIPAY',
  })
  paymentMethod: string;

  @ApiProperty({
    description: '支付状态',
    example: 'PENDING',
    enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'CLOSED'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '支付URL（用于跳转支付）',
    example: 'https://openapi.alipay.com/gateway.do?...',
  })
  paymentUrl?: string;

  @ApiPropertyOptional({
    description: '支付二维码（Base64编码）',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCode?: string;

  @ApiPropertyOptional({
    description: '订单过期时间',
    example: '2024-01-01T12:00:00Z',
  })
  expireTime?: string;

  @ApiProperty({
    description: '订单创建时间',
    example: '2024-01-01T11:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: '支付网关订单号',
    example: '2024010122001234567890123456',
  })
  gatewayOrderId?: string;

  @ApiPropertyOptional({
    description: '支付说明',
    example: '请在30分钟内完成支付',
  })
  paymentInstructions?: string;

  @ApiPropertyOptional({
    description: '扩展信息',
    example: {
      qrCodeUrl: 'https://example.com/qr/123456',
      deepLink: 'alipays://platformapi/startapp?...',
    },
  })
  extraInfo?: Record<string, any>;
}
