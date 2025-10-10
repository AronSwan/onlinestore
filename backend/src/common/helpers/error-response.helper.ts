import { Request } from 'express';
import { HttpStatus } from '@nestjs/common';
import { extractErrorInfo } from '../../logging/utils/logging-error.util';

export interface StandardErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path?: string;
  method?: string;
  details?: Record<string, any> | null;
}

/**
 * 构造统一的错误响应体，供控制器层复用
 * - 统一字段：success/statusCode/message/timestamp/path/method/details
 * - 从 error 中提取标准错误信息（name/message/stack）用于日志
 */
export function buildErrorResponse(
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  message: string = 'Internal server error',
  req?: Request,
  error?: unknown,
  details?: Record<string, any> | null,
): StandardErrorResponse {
  const errorInfo = extractErrorInfo(error);

  // 这里不直接返回 error 细节到响应体，遵循最小暴露原则
  // 细节仅用于服务内部日志，响应体仅携带必要信息
  return {
    success: false,
    statusCode: status,
    message,
    timestamp: new Date().toISOString(),
    path: req?.url,
    method: (req as any)?.method,
    details: details ?? null,
  };
}