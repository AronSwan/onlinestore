import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogSanitizerService } from './log-sanitizer.service';
import { SECURITY_CONSTANTS } from './security.constants';
import * as helmet from 'helmet';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private logSanitizer: LogSanitizerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 设置安全头
    this.setSecurityHeaders(req, res);

    // 验证请求大小
    this.validateRequestSize(req);

    // 清理请求日志
    this.sanitizeRequestLog(req);

    // 设置CORS
    this.setCorsHeaders(req, res);

    next();
  }

  /**
   * 设置安全头
   */
  private setSecurityHeaders(req: Request, res: Response): void {
    // 防止点击劫持
    res.setHeader('X-Frame-Options', 'DENY');

    // 防止MIME类型嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS保护
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 强制HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // 内容安全策略
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    );

    // 隐藏服务器信息
    res.removeHeader('X-Powered-By');

    // 防止缓存敏感信息
    if (req.url && (req.url.includes('/payment') || req.url.includes('/auth'))) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }

  /**
   * 验证请求大小
   */
  private validateRequestSize(req: Request): void {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = this.parseSize(SECURITY_CONSTANTS.REQUEST_VALIDATION.MAX_PAYLOAD_SIZE);

      if (size > maxSize) {
        throw new Error('Request payload too large');
      }
    }
  }

  /**
   * 清理请求日志
   */
  private sanitizeRequestLog(req: Request): void {
    // 记录请求信息（清理敏感数据）
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: this.logSanitizer.sanitizeLog(req.body),
      query: this.logSanitizer.sanitizeLog(req.query),
    };

    // 只在开发环境记录详细日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[REQUEST]', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * 设置CORS头
   */
  private setCorsHeaders(req: Request, res: Response): void {
    const origin = req.headers.origin;
    const allowedOrigins = SECURITY_CONSTANTS.REQUEST_VALIDATION.ALLOWED_ORIGINS;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
  }

  /**
   * 解析大小字符串
   */
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };
    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);

    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return value * units[unit];
  }
}
