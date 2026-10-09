import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * RFC 9457 全局异常过滤器——全仓统一错误契约（定调会 S1，2026-10-09）
 *
 * 立法依据：契约席预案（一审立法④+督导修正①）——废 5 变体错误形状，
 * 唯一形状 = application/problem+json：
 *   { type, title, status, detail, instance, errors?, message, retryAfter? }
 * - type 恒 "about:blank"（错误码枚举挂账缓建——首个常量注册时再建）
 * - title = HTTP reason phrase（英文稳定键）
 * - detail = 中文 message；class-validator 数组 join('；')
 * - errors = 数组原样保留（字段级明细，扩展成员）
 * - message = detail 别名（扩展成员）：前端 10 处读 .message（auth.js:515/598、
 *   email-verification.js:48/160、admin.js:415、oauth-handler.js:81、
 *   profile-manager.js:470、login-utils.js——别名移除挂 /v1 触发器）
 * - 5xx：detail 固定「服务器内部错误」（不泄 stack），stack 只进日志
 * - Retry-After 响应头透传（原 V-D 限流对象体的 retryAfter 字段）
 *
 * 兼容映射（消灭源头前的过渡期，filter 兜底识别）：
 * - V-A Nest 默认 {statusCode,message,error} → detail=message
 * - V-B 校验数组 {message: string[]} → detail=join('；')，errors=原数组
 * - V-C 信封 {success:false,message} → detail=message（源头已在施工中改 BadRequest）
 * - V-D 限流 {statusCode,message,retryAfter} → detail+Retry-After 头
 *
 * 豁免清单（不经本 filter 改形）：
 * - payment 回调 ACK（{code,message} HTTP 200——第三方网关协议，非错误通道）
 * - 健康检查直写 res.status().json()
 */
@Catch()
export class AllExceptionsProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problem = this.buildProblem(exception, request);

    if (problem.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${problem.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/problem+json; charset=utf-8',
    };
    if (problem.retryAfter !== undefined) {
      headers['Retry-After'] = String(problem.retryAfter);
    }

    response.status(problem.status).set(headers).json({
      type: 'about:blank',
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      instance: request.originalUrl ?? request.url,
      ...(problem.errors !== undefined ? { errors: problem.errors } : {}),
      message: problem.detail,
    });
  }

  private buildProblem(
    exception: unknown,
    request: Request,
  ): {
    status: number;
    title: string;
    detail: string;
    errors?: string[];
    retryAfter?: number;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const title = exception.name.replace(/Exception$/, '') ||
        HttpStatus[status] ||
        'Error';
      // 自洽席B1:5xx 卫兵对 HttpException 分支同样生效(原只卫非HttpException)
      if (status >= 500) {
        return { status, title, detail: '服务器内部错误', retryAfter: undefined };
      }

      // V-D 限流对象体：提取 retryAfter（自写 RateLimitGuard 的形状）
      let retryAfter: number | undefined;
      let raw = body as any;
      if (raw && typeof raw === 'object' && raw.retryAfter !== undefined) {
        retryAfter = Number(raw.retryAfter);
      }

      let message = raw;
      if (raw && typeof raw === 'object') {
        message = raw.message ?? raw.detail ?? '';
        // V-C 信封半边识别（源头改造完成前）：取 message 字段；
        // 数组是合法形态（V-B），只在非数组 object 时字符串化
        if (typeof message === 'object' && !Array.isArray(message)) {
          message = String(message);
        }
      }

      if (Array.isArray(message)) {
        return {
          status,
          title,
          detail: message.join('；'),
          errors: message,
          retryAfter,
        };
      }
      return {
        status,
        title,
        detail: String(message || exception.message || title),
        retryAfter,
      };
    }

    // 非 HttpException（裸 Error 等）→ 500 通用 problem（不泄内部信息）
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: 'Internal Server Error',
      detail: '服务器内部错误',
    };
  }
}
