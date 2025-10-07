import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../constants/error-codes';

/**
 * 业务异常类
 * 借鉴 Snowy-Cloud 的异常处理设计
 * 已升级支持新的错误码体系，同时保持向后兼容性
 */
export class BusinessException extends HttpException {
  constructor(
    message: string,
    code: string = 'BUSINESS_ERROR',
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code,
        message,
        timestamp: new Date().toISOString(),
        success: false,
      },
      statusCode,
    );
  }

  // 常用业务异常 - 使用新的错误码体系
  static userNotFound() {
    return new BusinessException('用户不存在', ERROR_CODES.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  static productNotFound() {
    return new BusinessException('商品不存在', ERROR_CODES.PRODUCT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  static cartItemNotFound() {
    return new BusinessException(
      '购物车商品不存在',
      ERROR_CODES.CART_ITEM_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  }

  static insufficientStock() {
    return new BusinessException(
      '库存不足',
      ERROR_CODES.INSUFFICIENT_STOCK,
      HttpStatus.BAD_REQUEST,
    );
  }

  static orderNotFound() {
    return new BusinessException('订单不存在', ERROR_CODES.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  static paymentFailed() {
    return new BusinessException('支付失败', ERROR_CODES.PAYMENT_FAILED, HttpStatus.BAD_REQUEST);
  }

  static permissionDenied() {
    return new BusinessException('权限不足', ERROR_CODES.FORBIDDEN, HttpStatus.FORBIDDEN);
  }

  static tenantNotFound() {
    return new BusinessException('租户不存在', ERROR_CODES.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  // 新增的业务异常方法
  static userAlreadyExists() {
    return new BusinessException(
      '用户已存在',
      ERROR_CODES.USER_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
    );
  }

  static invalidCredentials() {
    return new BusinessException(
      '用户名或密码错误',
      ERROR_CODES.INVALID_CREDENTIALS,
      HttpStatus.UNAUTHORIZED,
    );
  }

  static accountLocked() {
    return new BusinessException('账户已被锁定', ERROR_CODES.ACCOUNT_LOCKED, HttpStatus.FORBIDDEN);
  }

  static tokenExpired() {
    return new BusinessException('令牌已过期', ERROR_CODES.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
  }

  static invalidToken() {
    return new BusinessException('无效的令牌', ERROR_CODES.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
  }

  static productOutOfStock() {
    return new BusinessException(
      '商品已售罄',
      ERROR_CODES.PRODUCT_OUT_OF_STOCK,
      HttpStatus.BAD_REQUEST,
    );
  }

  static orderAlreadyPaid() {
    return new BusinessException(
      '订单已支付',
      ERROR_CODES.ORDER_ALREADY_PAID,
      HttpStatus.BAD_REQUEST,
    );
  }

  static orderCancelled() {
    return new BusinessException('订单已取消', ERROR_CODES.ORDER_CANCELLED, HttpStatus.BAD_REQUEST);
  }

  static paymentTimeout() {
    return new BusinessException(
      '支付超时',
      ERROR_CODES.PAYMENT_TIMEOUT,
      HttpStatus.REQUEST_TIMEOUT,
    );
  }

  static refundFailed() {
    return new BusinessException('退款失败', ERROR_CODES.REFUND_FAILED, HttpStatus.BAD_REQUEST);
  }

  static validationError(details?: any) {
    return new BusinessException(
      '参数验证失败',
      ERROR_CODES.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
    );
  }

  static rateLimitExceeded() {
    return new BusinessException(
      '请求频率过高',
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  static databaseError() {
    return new BusinessException(
      '数据库操作失败',
      ERROR_CODES.DATABASE_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  static externalServiceError() {
    return new BusinessException(
      '外部服务错误',
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      HttpStatus.BAD_GATEWAY,
    );
  }

  static serviceUnavailable() {
    return new BusinessException(
      '服务暂不可用',
      ERROR_CODES.SERVICE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  static timeoutError() {
    return new BusinessException('请求超时', ERROR_CODES.TIMEOUT_ERROR, HttpStatus.REQUEST_TIMEOUT);
  }
}
