import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService, AuditAction, AuditResult, AuditSeverity } from '../audit/audit.service';

/**
 * 审计拦截器
 * 自动记录 HTTP 请求的审计日志
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 创建审计上下文
    const auditContext = this.auditService.createContextFromRequest(request, {
      resourceType: this.extractResourceType(request),
      resourceId: this.extractResourceId(request),
    });

    // 确定审计操作类型
    const action = this.determineAuditAction(request);

    // 如果不需要审计，直接返回
    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(data => {
        // 成功响应的审计日志
        this.logAuditEvent(
          action,
          AuditResult.SUCCESS,
          auditContext,
          request,
          response,
          data,
          startTime,
        );
      }),
      catchError(error => {
        // 错误响应的审计日志
        this.logAuditEvent(
          action,
          AuditResult.FAILED,
          auditContext,
          request,
          response,
          null,
          startTime,
          error,
        );
        throw error;
      }),
    );
  }

  private async logAuditEvent(
    action: AuditAction,
    result: AuditResult,
    auditContext: any,
    request: Request,
    response: Response,
    responseData: any,
    startTime: number,
    error?: any,
  ): Promise<void> {
    try {
      const duration = Date.now() - startTime;
      const severity = this.determineSeverity(action, result, response.statusCode);

      // 准备旧值和新值
      const oldValues = this.extractOldValues(request);
      const newValues = this.extractNewValues(responseData, request.method);

      // 增强审计上下文
      const enhancedContext = {
        ...auditContext,
        metadata: {
          duration,
          statusCode: response.statusCode,
          requestSize: JSON.stringify(request.body || {}).length,
          responseSize: JSON.stringify(responseData || {}).length,
          userAgent: request.headers['user-agent'],
          referer: request.headers.referer,
          ...this.extractBusinessMetadata(request, responseData),
        },
      };

      const description = error
        ? `${action} failed: ${error.message}`
        : `${action} completed successfully`;

      await this.auditService.log(
        action,
        result,
        enhancedContext,
        description,
        severity,
        oldValues,
        newValues,
      );
    } catch (auditError) {
      this.logger.error('Failed to log audit event', auditError);
    }
  }

  private determineAuditAction(request: Request): AuditAction | null {
    const { method, path } = request;
    const pathLower = path.toLowerCase();

    // 用户相关操作
    if (pathLower.includes('/auth/login')) {
      return AuditAction.USER_LOGIN;
    }
    if (pathLower.includes('/auth/logout')) {
      return AuditAction.USER_LOGOUT;
    }
    if (pathLower.includes('/auth/register')) {
      return AuditAction.USER_REGISTER;
    }
    if (pathLower.includes('/auth/reset-password')) {
      return AuditAction.USER_RESET_PASSWORD;
    }
    if (pathLower.includes('/auth/change-password')) {
      return AuditAction.USER_CHANGE_PASSWORD;
    }
    if (pathLower.includes('/users') && method === 'PUT') {
      return AuditAction.USER_UPDATE_PROFILE;
    }
    if (pathLower.includes('/users') && method === 'DELETE') {
      return AuditAction.USER_DELETE_ACCOUNT;
    }

    // 产品相关操作
    if (pathLower.includes('/products') && method === 'GET') {
      return pathLower.includes('/search') ? AuditAction.PRODUCT_SEARCH : AuditAction.PRODUCT_VIEW;
    }
    if (pathLower.includes('/cart') && method === 'POST') {
      return AuditAction.PRODUCT_ADD_TO_CART;
    }
    if (pathLower.includes('/cart') && method === 'DELETE') {
      return AuditAction.PRODUCT_REMOVE_FROM_CART;
    }
    if (pathLower.includes('/wishlist') && method === 'POST') {
      return AuditAction.PRODUCT_ADD_TO_WISHLIST;
    }

    // 订单相关操作
    if (pathLower.includes('/orders') && method === 'POST') {
      return AuditAction.ORDER_CREATE;
    }
    if (pathLower.includes('/orders') && method === 'PUT') {
      if (pathLower.includes('/cancel')) {
        return AuditAction.ORDER_CANCEL;
      }
      if (pathLower.includes('/confirm')) {
        return AuditAction.ORDER_CONFIRM;
      }
      if (pathLower.includes('/ship')) {
        return AuditAction.ORDER_SHIP;
      }
      if (pathLower.includes('/deliver')) {
        return AuditAction.ORDER_DELIVER;
      }
      return AuditAction.ORDER_UPDATE;
    }
    if (pathLower.includes('/orders') && pathLower.includes('/return')) {
      return AuditAction.ORDER_RETURN;
    }
    if (pathLower.includes('/orders') && pathLower.includes('/refund')) {
      return AuditAction.ORDER_REFUND;
    }

    // 支付相关操作
    if (pathLower.includes('/payments') && method === 'POST') {
      return AuditAction.PAYMENT_INITIATE;
    }
    if (pathLower.includes('/payments') && pathLower.includes('/success')) {
      return AuditAction.PAYMENT_SUCCESS;
    }
    if (pathLower.includes('/payments') && pathLower.includes('/failed')) {
      return AuditAction.PAYMENT_FAILED;
    }
    if (pathLower.includes('/payments') && pathLower.includes('/refund')) {
      return AuditAction.PAYMENT_REFUND;
    }

    // 管理员操作
    if (pathLower.includes('/admin')) {
      if (pathLower.includes('/login')) {
        return AuditAction.ADMIN_LOGIN;
      }
      if (pathLower.includes('/users')) {
        return AuditAction.ADMIN_USER_MANAGE;
      }
      if (pathLower.includes('/products')) {
        return AuditAction.ADMIN_PRODUCT_MANAGE;
      }
      if (pathLower.includes('/orders')) {
        return AuditAction.ADMIN_ORDER_MANAGE;
      }
      if (pathLower.includes('/config')) {
        return AuditAction.ADMIN_SYSTEM_CONFIG;
      }
    }

    // 安全相关操作
    if (pathLower.includes('/security')) {
      return AuditAction.SECURITY_SUSPICIOUS_ACTIVITY;
    }

    // 默认不审计
    return null;
  }

  private determineSeverity(
    action: AuditAction,
    result: AuditResult,
    statusCode: number,
  ): AuditSeverity {
    // 失败操作的严重性更高
    if (result === AuditResult.FAILED) {
      if (statusCode >= 500) {
        return AuditSeverity.HIGH;
      }
      if (statusCode >= 400) {
        return AuditSeverity.MEDIUM;
      }
    }

    // 基于操作类型的严重性
    const criticalActions = [
      AuditAction.USER_DELETE_ACCOUNT,
      AuditAction.ADMIN_SYSTEM_CONFIG,
      AuditAction.SECURITY_SUSPICIOUS_ACTIVITY,
      AuditAction.PAYMENT_CHARGEBACK,
    ];

    const highActions = [
      AuditAction.USER_CHANGE_PASSWORD,
      AuditAction.PAYMENT_INITIATE,
      AuditAction.PAYMENT_REFUND,
      AuditAction.ADMIN_LOGIN,
      AuditAction.ADMIN_USER_MANAGE,
    ];

    const mediumActions = [
      AuditAction.USER_LOGIN,
      AuditAction.USER_REGISTER,
      AuditAction.ORDER_CREATE,
      AuditAction.ORDER_CANCEL,
      AuditAction.PAYMENT_SUCCESS,
      AuditAction.PAYMENT_FAILED,
    ];

    if (criticalActions.includes(action)) {
      return AuditSeverity.CRITICAL;
    }
    if (highActions.includes(action)) {
      return AuditSeverity.HIGH;
    }
    if (mediumActions.includes(action)) {
      return AuditSeverity.MEDIUM;
    }

    return AuditSeverity.LOW;
  }

  private extractResourceType(request: Request): string {
    const path = request.path.toLowerCase();

    if (path.includes('/users')) return 'user';
    if (path.includes('/products')) return 'product';
    if (path.includes('/orders')) return 'order';
    if (path.includes('/payments')) return 'payment';
    if (path.includes('/cart')) return 'cart';
    if (path.includes('/wishlist')) return 'wishlist';
    if (path.includes('/auth')) return 'auth';
    if (path.includes('/admin')) return 'admin';

    return 'unknown';
  }

  private extractResourceId(request: Request): string | undefined {
    // 从路径参数中提取资源 ID
    const params = request.params;
    return params?.id || params?.userId || params?.productId || params?.orderId;
  }

  private extractOldValues(request: Request): Record<string, any> | undefined {
    // 对于 PUT/PATCH 请求，可能需要查询当前值作为旧值
    // 这里简化处理，只记录请求参数
    if (['PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return {
        params: request.params,
        query: request.query,
      };
    }
    return undefined;
  }

  private extractNewValues(responseData: any, method: string): Record<string, any> | undefined {
    // 对于创建和更新操作，记录响应数据
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return responseData;
    }
    return undefined;
  }

  private extractBusinessMetadata(request: Request, responseData: any): Record<string, any> {
    const metadata: Record<string, any> = {};

    // 提取业务相关的元数据
    if (request.body) {
      // 订单相关元数据
      if (request.body.amount) {
        metadata.amount = request.body.amount;
      }
      if (request.body.currency) {
        metadata.currency = request.body.currency;
      }
      if (request.body.productId) {
        metadata.productId = request.body.productId;
      }
      if (request.body.quantity) {
        metadata.quantity = request.body.quantity;
      }
    }

    // 从响应中提取元数据
    if (responseData) {
      if (responseData.id) {
        metadata.resultId = responseData.id;
      }
      if (responseData.status) {
        metadata.resultStatus = responseData.status;
      }
    }

    return metadata;
  }
}
