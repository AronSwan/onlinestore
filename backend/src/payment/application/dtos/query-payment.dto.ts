import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 批量查询支付DTO
 */
export class QueryPaymentDto {
  @ApiProperty({
    description: '支付订单ID列表',
    example: ['PAY_1234567890ABCDEF', 'PAY_ABCDEF1234567890'],
    type: [String],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  paymentOrderIds: string[];
}
