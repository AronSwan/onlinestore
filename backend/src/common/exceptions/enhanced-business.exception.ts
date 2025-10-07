import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ERROR_CODES,
  ErrorCode,
  getHttpStatusFromErrorCode,
  getErrorCategory,
} from '../constants/error-codes';

/**
 * 错误详情接口
 */
export interface ErrorDetail {
  field?: string;
  value?: any;
  constraint?: string;
  message?: string;
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  traceId?: string;
  timestamp?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

/**
 * 增强版业务异常类
 * 支持统一错误码、结构化错误信息、错误上下文和链路追踪
 */
export class EnhancedBusinessException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly category: string;
  public readonly details?: ErrorDetail[];
  public readonly context?: ErrorContext;
  public readonly cause: Error;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: ErrorDetail[],
    context?: ErrorContext,
    cause?: Error,
    retryable: boolean = false,
  ) {
    const httpStatus = getHttpStatusFromErrorCode(errorCode);
    const category = getErrorCategory(errorCode);
    const timestamp = new Date().toISOString();

    const response = {
      success: false,
      errorCode,
      category,
      message: message || EnhancedBusinessException.getDefaultMessage(errorCode),
      details,
      context,
      retryable,
      timestamp,
    };

    super(response, httpStatus);

    this.errorCode = errorCode;
    this.category = category;
    this.details = details;
    this.context = context;
    this.cause = cause || new Error('Unknown error');
    this.retryable = retryable;
    this.timestamp = timestamp;

    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedBusinessException);
    }
  }

  /**
   * 获取默认错误消息
   */
  private static getDefaultMessage(errorCode: ErrorCode): string {
    const messages: Record<string, string> = {
      // 通用错误
      [ERROR_CODES.VALIDATION_ERROR]: '请求参数验证失败',
      [ERROR_CODES.INVALID_PARAMETER]: '请求参数无效',
      [ERROR_CODES.MISSING_PARAMETER]: '缺少必需参数',
      [ERROR_CODES.INVALID_FORMAT]: '参数格式错误',
      [ERROR_CODES.BUSINESS_RULE_VIOLATION]: '违反业务规则',

      // 认证授权错误
      [ERROR_CODES.UNAUTHORIZED]: '未授权访问',
      [ERROR_CODES.INVALID_TOKEN]: '无效的访问令牌',
      [ERROR_CODES.TOKEN_EXPIRED]: '访问令牌已过期',
      [ERROR_CODES.TOKEN_MALFORMED]: '访问令牌格式错误',
      [ERROR_CODES.LOGIN_REQUIRED]: '需要登录',
      [ERROR_CODES.FORBIDDEN]: '禁止访问',
      [ERROR_CODES.PERMISSION_DENIED]: '权限不足',
      [ERROR_CODES.ROLE_INSUFFICIENT]: '角色权限不足',
      [ERROR_CODES.RESOURCE_ACCESS_DENIED]: '资源访问被拒绝',
      [ERROR_CODES.OPERATION_NOT_ALLOWED]: '操作不被允许',

      // 用户模块错误
      [ERROR_CODES.USER_NOT_FOUND]: '用户不存在',
      [ERROR_CODES.USER_PROFILE_NOT_FOUND]: '用户资料不存在',
      [ERROR_CODES.USER_ADDRESS_NOT_FOUND]: '用户地址不存在',
      [ERROR_CODES.USER_ALREADY_EXISTS]: '用户已存在',
      [ERROR_CODES.EMAIL_ALREADY_EXISTS]: '邮箱已被注册',
      [ERROR_CODES.PHONE_ALREADY_EXISTS]: '手机号已被注册',
      [ERROR_CODES.USERNAME_ALREADY_EXISTS]: '用户名已被占用',
      [ERROR_CODES.INVALID_CREDENTIALS]: '用户名或密码错误',
      [ERROR_CODES.PASSWORD_TOO_WEAK]: '密码强度不足',
      [ERROR_CODES.EMAIL_NOT_VERIFIED]: '邮箱未验证',
      [ERROR_CODES.ACCOUNT_LOCKED]: '账户已被锁定',
      [ERROR_CODES.ACCOUNT_DISABLED]: '账户已被禁用',

      // 产品模块错误
      [ERROR_CODES.PRODUCT_NOT_FOUND]: '商品不存在',
      [ERROR_CODES.PRODUCT_CATEGORY_NOT_FOUND]: '商品分类不存在',
      [ERROR_CODES.PRODUCT_VARIANT_NOT_FOUND]: '商品规格不存在',
      [ERROR_CODES.PRODUCT_OUT_OF_STOCK]: '商品已售罄',
      [ERROR_CODES.PRODUCT_INSUFFICIENT_STOCK]: '商品库存不足',
      [ERROR_CODES.PRODUCT_DISCONTINUED]: '商品已下架',
      [ERROR_CODES.PRODUCT_PRICE_CHANGED]: '商品价格已变更',
      [ERROR_CODES.INVALID_PRODUCT_QUANTITY]: '商品数量无效',

      // 订单模块错误
      [ERROR_CODES.ORDER_NOT_FOUND]: '订单不存在',
      [ERROR_CODES.ORDER_ITEM_NOT_FOUND]: '订单商品不存在',
      [ERROR_CODES.ORDER_CANNOT_BE_CANCELLED]: '订单无法取消',
      [ERROR_CODES.ORDER_CANNOT_BE_MODIFIED]: '订单无法修改',
      [ERROR_CODES.ORDER_ALREADY_PAID]: '订单已支付',
      [ERROR_CODES.ORDER_EXPIRED]: '订单已过期',
      [ERROR_CODES.INVALID_ORDER_STATUS]: '订单状态无效',
      [ERROR_CODES.ORDER_AMOUNT_MISMATCH]: '订单金额不匹配',
      [ERROR_CODES.ORDER_STATUS_CONFLICT]: '订单状态冲突',
      [ERROR_CODES.ORDER_CONCURRENT_MODIFICATION]: '订单并发修改冲突',

      // 支付模块错误
      [ERROR_CODES.PAYMENT_NOT_FOUND]: '支付记录不存在',
      [ERROR_CODES.PAYMENT_METHOD_NOT_FOUND]: '支付方式不存在',
      [ERROR_CODES.PAYMENT_FAILED]: '支付失败',
      [ERROR_CODES.PAYMENT_AMOUNT_INVALID]: '支付金额无效',
      [ERROR_CODES.PAYMENT_METHOD_DISABLED]: '支付方式已禁用',
      [ERROR_CODES.PAYMENT_EXPIRED]: '支付已过期',
      [ERROR_CODES.PAYMENT_ALREADY_PROCESSED]: '支付已处理',
      [ERROR_CODES.REFUND_AMOUNT_EXCEEDS]: '退款金额超出限制',
      [ERROR_CODES.REFUND_NOT_ALLOWED]: '不允许退款',
      [ERROR_CODES.PAYMENT_DUPLICATE]: '重复支付',
      [ERROR_CODES.PAYMENT_STATUS_CONFLICT]: '支付状态冲突',

      // 购物车模块错误
      [ERROR_CODES.CART_NOT_FOUND]: '购物车不存在',
      [ERROR_CODES.CART_ITEM_NOT_FOUND]: '购物车商品不存在',
      [ERROR_CODES.CART_EMPTY]: '购物车为空',
      [ERROR_CODES.CART_ITEM_QUANTITY_INVALID]: '购物车商品数量无效',
      [ERROR_CODES.CART_ITEM_PRICE_CHANGED]: '购物车商品价格已变更',
      [ERROR_CODES.CART_EXPIRED]: '购物车已过期',

      // 地址模块错误
      [ERROR_CODES.ADDRESS_NOT_FOUND]: '地址不存在',
      [ERROR_CODES.INVALID_ADDRESS_FORMAT]: '地址格式无效',
      [ERROR_CODES.ADDRESS_OUT_OF_DELIVERY_RANGE]: '地址超出配送范围',

      // 系统错误
      [ERROR_CODES.INTERNAL_SERVER_ERROR]: '服务器内部错误',
      [ERROR_CODES.DATABASE_ERROR]: '数据库错误',
      [ERROR_CODES.CACHE_ERROR]: '缓存错误',
      [ERROR_CODES.NETWORK_ERROR]: '网络错误',
      [ERROR_CODES.SERVICE_UNAVAILABLE]: '服务不可用',
      [ERROR_CODES.TIMEOUT_ERROR]: '请求超时',

      // 第三方服务错误
      [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: '第三方服务错误',
      [ERROR_CODES.PAYMENT_GATEWAY_ERROR]: '支付网关错误',
      [ERROR_CODES.SMS_SERVICE_ERROR]: '短信服务错误',
      [ERROR_CODES.EMAIL_SERVICE_ERROR]: '邮件服务错误',
      [ERROR_CODES.LOGISTICS_SERVICE_ERROR]: '物流服务错误',
      [ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE]: '第三方服务不可用',
      [ERROR_CODES.PAYMENT_GATEWAY_UNAVAILABLE]: '支付网关不可用',
      [ERROR_CODES.SMS_SERVICE_UNAVAILABLE]: '短信服务不可用',
      [ERROR_CODES.EMAIL_SERVICE_UNAVAILABLE]: '邮件服务不可用',

      // 限流和配额错误
      [ERROR_CODES.RATE_LIMIT_EXCEEDED]: '请求频率超出限制',
      [ERROR_CODES.API_QUOTA_EXCEEDED]: 'API配额已用完',
      [ERROR_CODES.CONCURRENT_LIMIT_EXCEEDED]: '并发请求超出限制',
      [ERROR_CODES.REQUEST_TOO_FREQUENT]: '请求过于频繁',
    };

    return messages[errorCode] || '未知错误';
  }

  /**
   * 静态工厂方法 - 用户相关错误
   */
  static userNotFound(userId?: string, context?: ErrorContext): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.USER_NOT_FOUND,
      undefined,
      userId ? [{ field: 'userId', value: userId }] : undefined,
      context,
    );
  }

  static userAlreadyExists(
    field: string,
    value: string,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      field === 'email'
        ? ERROR_CODES.EMAIL_ALREADY_EXISTS
        : field === 'phone'
          ? ERROR_CODES.PHONE_ALREADY_EXISTS
          : ERROR_CODES.USERNAME_ALREADY_EXISTS,
      undefined,
      [{ field, value }],
      context,
    );
  }

  static invalidCredentials(context?: ErrorContext): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.INVALID_CREDENTIALS,
      undefined,
      undefined,
      context,
    );
  }

  /**
   * 静态工厂方法 - 产品相关错误
   */
  static productNotFound(productId?: string, context?: ErrorContext): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.PRODUCT_NOT_FOUND,
      undefined,
      productId ? [{ field: 'productId', value: productId }] : undefined,
      context,
    );
  }

  static insufficientStock(
    productId: string,
    requested: number,
    available: number,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.PRODUCT_INSUFFICIENT_STOCK,
      `商品库存不足，请求数量: ${requested}，可用库存: ${available}`,
      [
        { field: 'productId', value: productId },
        { field: 'requestedQuantity', value: requested },
        { field: 'availableStock', value: available },
      ],
      context,
    );
  }

  /**
   * 静态工厂方法 - 订单相关错误
   */
  static orderNotFound(orderId?: string, context?: ErrorContext): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.ORDER_NOT_FOUND,
      undefined,
      orderId ? [{ field: 'orderId', value: orderId }] : undefined,
      context,
    );
  }

  static orderStatusConflict(
    orderId: string,
    currentStatus: string,
    expectedStatus: string,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.ORDER_STATUS_CONFLICT,
      `订单状态冲突，当前状态: ${currentStatus}，期望状态: ${expectedStatus}`,
      [
        { field: 'orderId', value: orderId },
        { field: 'currentStatus', value: currentStatus },
        { field: 'expectedStatus', value: expectedStatus },
      ],
      context,
    );
  }

  /**
   * 静态工厂方法 - 支付相关错误
   */
  static paymentNotFound(paymentId?: string, context?: ErrorContext): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.PAYMENT_NOT_FOUND,
      undefined,
      paymentId ? [{ field: 'paymentId', value: paymentId }] : undefined,
      context,
    );
  }

  static paymentFailed(
    paymentId: string,
    reason?: string,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.PAYMENT_FAILED,
      reason ? `支付失败: ${reason}` : undefined,
      [{ field: 'paymentId', value: paymentId }],
      context,
    );
  }

  /**
   * 静态工厂方法 - 系统错误
   */
  static databaseError(
    operation: string,
    cause?: Error,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.DATABASE_ERROR,
      `数据库操作失败: ${operation}`,
      [{ field: 'operation', value: operation }],
      context,
      cause,
      true, // 数据库错误通常可重试
    );
  }

  static externalServiceError(
    service: string,
    cause?: Error,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      `第三方服务调用失败: ${service}`,
      [{ field: 'service', value: service }],
      context,
      cause,
      true, // 外部服务错误通常可重试
    );
  }

  /**
   * 静态工厂方法 - 验证错误
   */
  static validationError(
    details: ErrorDetail[],
    context?: ErrorContext,
  ): EnhancedBusinessException {
    return new EnhancedBusinessException(
      ERROR_CODES.VALIDATION_ERROR,
      '请求参数验证失败',
      details,
      context,
    );
  }

  /**
   * 静态工厂方法 - 权限错误
   */
  static permissionDenied(
    resource?: string,
    action?: string,
    context?: ErrorContext,
  ): EnhancedBusinessException {
    const details = [];
    if (resource) details.push({ field: 'resource', value: resource });
    if (action) details.push({ field: 'action', value: action });

    return new EnhancedBusinessException(
      ERROR_CODES.PERMISSION_DENIED,
      resource && action ? `无权限执行操作: ${action} on ${resource}` : undefined,
      details.length > 0 ? details : undefined,
      context,
    );
  }

  /**
   * 转换为JSON格式（用于日志记录）
   */
  public toJSON(): object {
    return {
      name: this.name,
      errorCode: this.errorCode,
      category: this.category,
      message: this.message,
      details: this.details,
      context: this.context,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  /**
   * 转换为客户端响应格式
   */
  public toClientResponse(): object {
    return {
      success: false,
      errorCode: this.errorCode,
      category: this.category,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,
    };
  }
}
