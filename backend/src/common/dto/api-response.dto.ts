import { ApiProperty } from '@nestjs/swagger';

/**
 * 标准API响应格式
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ description: '响应状态码', example: 200 })
  code: number;

  @ApiProperty({ description: '响应消息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '时间戳', example: '2025-01-26T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: '请求ID', example: 'req_123456789' })
  requestId?: string;
}

/**
 * 分页响应格式
 */
export class PaginatedResponseDto<T = any> {
  @ApiProperty({ description: '数据列表' })
  items: T[];

  @ApiProperty({ description: '总数量', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页', example: false })
  hasPrev: boolean;
}

/**
 * 错误响应格式
 */
export class ErrorResponseDto {
  @ApiProperty({ description: '错误状态码', example: 400 })
  code: number;

  @ApiProperty({ description: '错误消息', example: '请求参数错误' })
  message: string;

  @ApiProperty({ description: '错误详情', example: ['用户名不能为空', '密码长度至少6位'] })
  errors?: string[];

  @ApiProperty({ description: '时间戳', example: '2025-01-26T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: '请求路径', example: '/api/auth/login' })
  path?: string;

  @ApiProperty({ description: '请求ID', example: 'req_123456789' })
  requestId?: string;
}

/**
 * 业务错误码枚举
 */
export enum BusinessErrorCode {
  // 通用错误 (1000-1999)
  INVALID_PARAMETER = 1001,
  RESOURCE_NOT_FOUND = 1002,
  OPERATION_FAILED = 1003,
  PERMISSION_DENIED = 1004,

  // 认证错误 (2000-2999)
  UNAUTHORIZED = 2001,
  TOKEN_EXPIRED = 2002,
  TOKEN_INVALID = 2003,
  LOGIN_FAILED = 2004,
  USER_NOT_FOUND = 2005,
  USER_ALREADY_EXISTS = 2006,
  PASSWORD_INCORRECT = 2007,

  // 业务错误 (3000-3999)
  PRODUCT_NOT_FOUND = 3001,
  PRODUCT_OUT_OF_STOCK = 3002,
  CART_ITEM_NOT_FOUND = 3003,
  ORDER_NOT_FOUND = 3004,
  ORDER_STATUS_INVALID = 3005,
  PAYMENT_FAILED = 3006,
  INSUFFICIENT_BALANCE = 3007,

  // 系统错误 (5000-5999)
  INTERNAL_SERVER_ERROR = 5001,
  DATABASE_ERROR = 5002,
  CACHE_ERROR = 5003,
  EXTERNAL_SERVICE_ERROR = 5004,
}

/**
 * 业务错误码描述映射
 */
export const BusinessErrorMessages = {
  [BusinessErrorCode.INVALID_PARAMETER]: '请求参数无效',
  [BusinessErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [BusinessErrorCode.OPERATION_FAILED]: '操作失败',
  [BusinessErrorCode.PERMISSION_DENIED]: '权限不足',

  [BusinessErrorCode.UNAUTHORIZED]: '未授权访问',
  [BusinessErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [BusinessErrorCode.TOKEN_INVALID]: '令牌无效',
  [BusinessErrorCode.LOGIN_FAILED]: '登录失败',
  [BusinessErrorCode.USER_NOT_FOUND]: '用户不存在',
  [BusinessErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [BusinessErrorCode.PASSWORD_INCORRECT]: '密码错误',

  [BusinessErrorCode.PRODUCT_NOT_FOUND]: '商品不存在',
  [BusinessErrorCode.PRODUCT_OUT_OF_STOCK]: '商品库存不足',
  [BusinessErrorCode.CART_ITEM_NOT_FOUND]: '购物车商品不存在',
  [BusinessErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [BusinessErrorCode.ORDER_STATUS_INVALID]: '订单状态无效',
  [BusinessErrorCode.PAYMENT_FAILED]: '支付失败',
  [BusinessErrorCode.INSUFFICIENT_BALANCE]: '余额不足',

  [BusinessErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [BusinessErrorCode.DATABASE_ERROR]: '数据库错误',
  [BusinessErrorCode.CACHE_ERROR]: '缓存错误',
  [BusinessErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
};
