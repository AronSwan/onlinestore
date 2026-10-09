import { ApiProperty } from '@nestjs/swagger';

/**
 * RFC 9457 problem+json 响应形状（Swagger schema 标记类）
 * 自洽B修复（2026-10-09）：替换已不对应实现的 ApiResponseDto/ErrorResponseDto
 * 与 all-exceptions.problem-details.filter 的实际输出逐字段对齐
 */
export class ProblemDetailsDto {
  @ApiProperty({ description: '问题类型 URI（错误码枚举挂账缓建，暂 about:blank）', example: 'about:blank' })
  type: string;

  @ApiProperty({ description: 'HTTP reason phrase', example: 'Bad Request' })
  title: string;

  @ApiProperty({ description: 'HTTP 状态码', example: 400 })
  status: number;

  @ApiProperty({ description: '中文错误说明（校验数组 join）', example: '邮箱格式不正确' })
  detail: string;

  @ApiProperty({ description: '请求路径', example: '/api/auth/login' })
  instance: string;

  @ApiProperty({ description: 'detail 别名（前端兼容，移除挂 /v1 触发器）', example: '邮箱格式不正确', required: false })
  message?: string;

  @ApiProperty({ description: '校验错误明细（class-validator 数组原样）', type: [String], required: false })
  errors?: string[];
}
