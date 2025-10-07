import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 退款信息DTO
 */
export class RefundInfoDto {
  @ApiProperty({
    description: '退款ID',
    example: 'REFUND_1234567890ABCDEF',
  })
  refundId: string;

  @ApiProperty({
    description: '退款金额',
    example: 50.0,
  })
  amount: number;

  @ApiProperty({
    description: '退款货币',
    example: 'CNY',
  })
  currency: string;

  @ApiProperty({
    description: '退款状态',
    example: 'PROCESSING',
    enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '退款原因',
    example: '用户申请退款',
  })
  reason?: string;

  @ApiProperty({
    description: '退款创建时间',
    example: '2024-01-01T13:00:00Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: '退款完成时间',
    example: '2024-01-01T13:05:00Z',
  })
  completedAt?: string;

  @ApiPropertyOptional({
    description: '支付网关退款号',
    example: '2024010122001234567890123457',
  })
  gatewayRefundId?: string;
}

/**
 * 支付状态响应DTO
 */
export class PaymentStatusResponseDto {
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
    example: 'SUCCEEDED',
    enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'CLOSED'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '实际支付金额',
    example: 99.99,
  })
  paidAmount?: number;

  @ApiPropertyOptional({
    description: '支付完成时间',
    example: '2024-01-01T12:00:00Z',
  })
  paidAt?: string;

  @ApiPropertyOptional({
    description: '失败原因',
    example: '余额不足',
  })
  failureReason?: string;

  @ApiPropertyOptional({
    description: '支付网关订单号',
    example: '2024010122001234567890123456',
  })
  gatewayOrderId?: string;

  @ApiProperty({
    description: '订单创建时间',
    example: '2024-01-01T11:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: '订单更新时间',
    example: '2024-01-01T12:00:00Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '订单过期时间',
    example: '2024-01-01T12:00:00Z',
  })
  expireTime?: string;

  @ApiPropertyOptional({
    description: '订单关闭时间',
    example: '2024-01-01T12:30:00Z',
  })
  closedAt?: string;

  @ApiPropertyOptional({
    description: '退款记录',
    type: [RefundInfoDto],
  })
  refunds?: RefundInfoDto[];

  @ApiPropertyOptional({
    description: '支付详情',
    example: {
      buyerId: '2088123456789012',
      buyerLogonId: 'buyer@example.com',
      sellerId: '2088987654321098',
      fundBillList: '[{"amount":"99.99","fundChannel":"ALIPAYACCOUNT"}]',
    },
  })
  paymentDetails?: Record<string, any>;

  @ApiPropertyOptional({
    description: '区块链交易信息（加密货币支付）',
    example: {
      txHash: '0x1234567890abcdef...',
      confirmations: 6,
      blockHeight: 12345678,
      fromAddress: '0xabcdef1234567890...',
      toAddress: '0x1234567890abcdef...',
      network: 'TRC20',
      fee: 0.001,
    },
  })
  blockchainInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description: '风险评估信息',
    example: {
      riskLevel: 'LOW',
      riskScore: 0.1,
      riskFactors: ['normal_ip', 'verified_user'],
    },
  })
  riskInfo?: Record<string, any>;
}
