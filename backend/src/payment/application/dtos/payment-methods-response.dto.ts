import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 费率信息DTO
 */
export class FeeInfoDto {
  @ApiProperty({
    description: '费率（百分比）',
    example: 0.006,
  })
  rate: number;

  @ApiProperty({
    description: '最小费用',
    example: 0.01,
  })
  min: number;

  @ApiPropertyOptional({
    description: '最大费用',
    example: 100.0,
  })
  max?: number;
}

/**
 * 传统支付方式DTO
 */
export class TraditionalPaymentMethodDto {
  @ApiProperty({
    description: '支付方式代码',
    example: 'ALIPAY',
  })
  method: string;

  @ApiProperty({
    description: '支付方式名称',
    example: '支付宝',
  })
  name: string;

  @ApiProperty({
    description: '图标',
    example: 'alipay',
  })
  icon: string;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: '描述',
    example: '支持支付宝扫码支付',
  })
  description: string;

  @ApiProperty({
    description: '费率信息',
    type: FeeInfoDto,
  })
  fees: FeeInfoDto;
}

/**
 * 加密货币支付方式DTO
 */
export class CryptoPaymentMethodDto {
  @ApiProperty({
    description: '支付方式代码',
    example: 'USDT_TRC20',
  })
  method: string;

  @ApiProperty({
    description: '支付方式名称',
    example: 'USDT (TRC20)',
  })
  name: string;

  @ApiProperty({
    description: '图标',
    example: 'usdt',
  })
  icon: string;

  @ApiProperty({
    description: '网络类型',
    example: 'TRC20',
  })
  network: string;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: '描述',
    example: '基于波场网络的USDT支付',
  })
  description: string;

  @ApiProperty({
    description: '费率信息',
    type: FeeInfoDto,
  })
  fees: FeeInfoDto;

  @ApiPropertyOptional({
    description: '合约地址',
    example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  })
  contractAddress?: string;
}

/**
 * 支付方式响应DTO
 */
export class PaymentMethodsResponseDto {
  @ApiProperty({
    description: '传统支付方式',
    type: [TraditionalPaymentMethodDto],
  })
  traditional: TraditionalPaymentMethodDto[];

  @ApiProperty({
    description: '加密货币支付方式',
    type: [CryptoPaymentMethodDto],
  })
  crypto: CryptoPaymentMethodDto[];
}
