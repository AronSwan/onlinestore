import { ApiProperty } from '@nestjs/swagger';

/**
 * 统一 API 响应的 Swagger schema 标记类
 * 供 api-docs.decorator 的 getSchemaPath 引用，运行时不参与序列化
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '提示信息', required: false })
  message?: string;
}

export class ErrorResponseDto {
  @ApiProperty({ description: '是否成功', example: false })
  success: boolean;

  @ApiProperty({ description: 'HTTP 状态码', example: 400 })
  statusCode: number;

  @ApiProperty({ description: '错误信息' })
  message: string;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;
}

export class PaginatedResponseDto<T = any> {
  @ApiProperty({ description: '数据项列表', isArray: true })
  items: T[];

  @ApiProperty({ description: '总数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 10 })
  limit: number;
}
