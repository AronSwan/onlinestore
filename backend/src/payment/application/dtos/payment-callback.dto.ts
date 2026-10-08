import { IsString, IsOptional, IsNumber, IsObject, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 支付回调DTO
 * 用于接收第三方支付平台的回调数据
 */
export class PaymentCallbackDto {
  @ApiProperty({
    description: '商户订单号',
    example: 'ORDER_20240101_123456',
  })
  @IsString()
  outTradeNo: string;

  @ApiProperty({
    description: '支付网关订单号',
    example: '2024010122001234567890123456',
  })
  @IsString()
  gatewayOrderId: string;

  @ApiProperty({
    description: '交易状态',
    example: 'TRADE_SUCCESS',
  })
  @IsString()
  tradeStatus: string;

  @ApiProperty({
    description: '订单总金额',
    example: 99.99,
  })
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({
    description: '实际收款金额',
    example: 99.99,
  })
  @IsOptional()
  @IsNumber()
  receiptAmount?: number;

  @ApiPropertyOptional({
    description: '支付完成时间（ISO 8601格式）',
    example: '2024-01-01T12:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  gmtPayment?: string;

  @ApiPropertyOptional({
    description: '买家用户号',
    example: '2088123456789012',
  })
  @IsOptional()
  @IsString()
  buyerId?: string;

  @ApiPropertyOptional({
    description: '买家支付宝账号',
    example: 'buyer@example.com',
  })
  @IsOptional()
  @IsString()
  buyerLogonId?: string;

  @ApiPropertyOptional({
    description: '卖家支付宝用户号',
    example: '2088987654321098',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({
    description: '卖家支付宝账号',
    example: 'seller@example.com',
  })
  @IsOptional()
  @IsString()
  sellerEmail?: string;

  @ApiPropertyOptional({
    description: '交易创建时间',
    example: '2024-01-01T11:55:00Z',
  })
  @IsOptional()
  @IsISO8601()
  gmtCreate?: string;

  @ApiPropertyOptional({
    description: '交易关闭时间',
    example: '2024-01-01T12:30:00Z',
  })
  @IsOptional()
  @IsISO8601()
  gmtClose?: string;

  @ApiPropertyOptional({
    description: '资金详情',
    example: '[{"amount":"99.99","fundChannel":"ALIPAYACCOUNT"}]',
  })
  @IsOptional()
  @IsString()
  fundBillList?: string;

  @ApiPropertyOptional({
    description: '回传参数',
    example: '{"userId":"123","orderId":"456"}',
  })
  @IsOptional()
  @IsString()
  passbackParams?: string;

  @ApiPropertyOptional({
    description: '优惠券信息',
    example: '[{"name":"满减券","amount":"10.00"}]',
  })
  @IsOptional()
  @IsString()
  voucherDetailList?: string;

  @ApiPropertyOptional({
    description: '原始回调数据',
    example: {},
  })
  @IsOptional()
  @IsObject()
  rawData?: Record<string, any>;

  @ApiPropertyOptional({
    description: '签名',
    example: 'abc123def456...',
  })
  @IsOptional()
  @IsString()
  sign?: string;

  @ApiPropertyOptional({
    description: '签名类型',
    example: 'RSA2',
  })
  @IsOptional()
  @IsString()
  signType?: string;

  @ApiPropertyOptional({
    description: '字符集',
    example: 'utf-8',
  })
  @IsOptional()
  @IsString()
  charset?: string;

  @ApiPropertyOptional({
    description: '版本号',
    example: '1.0',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    description: '应用ID',
    example: '2021001234567890',
  })
  @IsOptional()
  @IsString()
  appId?: string;

  // 加密货币支付特有字段
  @ApiPropertyOptional({
    description: '区块链交易哈希',
    example: '0x1234567890abcdef...',
  })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiPropertyOptional({
    description: '区块确认数',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  confirmations?: number;

  @ApiPropertyOptional({
    description: '发送方地址',
    example: '0xabcdef1234567890...',
  })
  @IsOptional()
  @IsString()
  fromAddress?: string;

  @ApiPropertyOptional({
    description: '接收方地址',
    example: '0x1234567890abcdef...',
  })
  @IsOptional()
  @IsString()
  toAddress?: string;

  @ApiPropertyOptional({
    description: '网络类型',
    example: 'TRC20',
  })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({
    description: '合约地址',
    example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  })
  @IsOptional()
  @IsString()
  contractAddress?: string;

  @ApiPropertyOptional({
    description: '区块高度',
    example: 12345678,
  })
  @IsOptional()
  @IsNumber()
  blockHeight?: number;

  @ApiPropertyOptional({
    description: '矿工费',
    example: 0.001,
  })
  @IsOptional()
  @IsNumber()
  fee?: number;
}
