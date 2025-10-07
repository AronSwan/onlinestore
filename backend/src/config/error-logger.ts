// 用途：增强错误日志系统，提供更详细的错误信息
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:05:00

import { createMasterConfiguration } from './unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

export class ErrorLogger {
  private static readonly LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
  };

  /**
   * 记录详细错误信息
   */
  static logError(error: Error, context: string, additionalInfo?: Record<string, any>): void {
    const logEntry = this.createLogEntry(this.LOG_LEVELS.ERROR, context, error.message, {
      stack: error.stack,
      name: error.name,
      ...additionalInfo,
    });

    this.outputLog(logEntry);
    this.persistLog(logEntry);
  }

  /**
   * 记录数据库操作错误
   */
  static logDatabaseError(error: Error, operation: string, query?: string, params?: any[]): void {
    this.logError(error, 'DATABASE', {
      operation,
      query: this.sanitizeQuery(query),
      params: this.sanitizeParams(params),
      database: masterConfig.database.database,
      host: masterConfig.database.host,
    });
  }

  /**
   * 记录缓存操作错误
   */
  static logCacheError(error: Error, operation: string, key?: string, value?: any): void {
    this.logError(error, 'CACHE', {
      operation,
      key,
      valueType: typeof value,
      valueSize: this.getSize(value),
      redisHost: masterConfig.redis.host,
    });
  }

  /**
   * 记录API错误
   */
  static logApiError(
    error: Error,
    endpoint: string,
    method: string,
    statusCode?: number,
    requestId?: string,
  ): void {
    this.logError(error, 'API', {
      endpoint,
      method,
      statusCode,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 记录业务逻辑错误
   */
  static logBusinessError(
    error: Error,
    module: string,
    operation: string,
    userId?: string,
    entityId?: string,
  ): void {
    this.logError(error, 'BUSINESS', {
      module,
      operation,
      userId,
      entityId,
      environment: masterConfig.app.env,
    });
  }

  /**
   * 记录警告信息
   */
  static logWarning(message: string, context: string, details?: Record<string, any>): void {
    const logEntry = this.createLogEntry(this.LOG_LEVELS.WARN, context, message, details);

    this.outputLog(logEntry);
  }

  /**
   * 记录性能相关信息
   */
  static logPerformance(
    operation: string,
    duration: number,
    context: string,
    metrics?: Record<string, number>,
  ): void {
    const logEntry = this.createLogEntry(this.LOG_LEVELS.INFO, context, `性能指标: ${operation}`, {
      duration: `${duration}ms`,
      ...metrics,
    });

    if (duration > 1000) {
      // 超过1秒记录警告
      logEntry.level = this.LOG_LEVELS.WARN;
    }

    this.outputLog(logEntry);
  }

  /**
   * 创建日志条目
   */
  private static createLogEntry(
    level: string,
    context: string,
    message: string,
    details?: Record<string, any>,
  ) {
    return {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      details: details || {},
      environment: masterConfig.app.env,
      service: 'caddy-shopping-backend',
      version: '1.0.0',
    };
  }

  /**
   * 输出日志到控制台
   */
  private static outputLog(logEntry: any): void {
    const timestamp = new Date().toLocaleString();
    const level = logEntry.level.padEnd(5);
    const context = `[${logEntry.context}]`.padEnd(12);

    console.log(`${timestamp} ${level} ${context} ${logEntry.message}`);

    if (Object.keys(logEntry.details).length > 0) {
      console.log('详细信息:', JSON.stringify(logEntry.details, null, 2));
    }
  }

  /**
   * 持久化日志（可扩展为文件或数据库存储）
   */
  private static persistLog(logEntry: any): void {
    // 生产环境可以存储到文件或日志服务
    if (masterConfig.app.env === 'production') {
      // 这里可以集成Winston、Pino等日志库
      // 或者发送到ELK、Splunk等日志系统
    }
  }

  /**
   * 清理敏感查询信息
   */
  private static sanitizeQuery(query?: string): string {
    if (!query) return 'N/A';

    // 移除敏感信息（如密码）
    return query.replace(/(password|pwd|secret)=[^&]*/gi, '$1=***');
  }

  /**
   * 清理敏感参数
   */
  private static sanitizeParams(params?: any[]): any[] {
    if (!params) return [];

    return params.map(param => {
      if (typeof param === 'object' && param !== null) {
        const sanitized = { ...param };
        // 移除敏感字段
        ['password', 'token', 'secret'].forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = '***';
          }
        });
        return sanitized;
      }
      return param;
    });
  }

  /**
   * 获取值的大小（近似）
   */
  private static getSize(value: any): string {
    try {
      const json = JSON.stringify(value);
      const size = new Blob([json]).size;

      if (size < 1024) return `${size}B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
      return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    } catch {
      return 'N/A';
    }
  }

  /**
   * 生成错误报告
   */
  static generateErrorReport(): string {
    let report = '📊 错误日志系统配置报告\n\n';

    report += '🔧 配置信息:\n';
    report += `  - 环境: ${masterConfig.app.env}\n`;
    report += `  - 服务: caddy-shopping-backend\n`;
    report += `  - 版本: 1.0.0\n\n`;

    report += '📝 日志级别:\n';
    Object.entries(this.LOG_LEVELS).forEach(([key, value]) => {
      report += `  - ${key}: ${value}\n`;
    });

    report += '\n💡 使用示例:\n';
    report += '  - 数据库错误: logDatabaseError(error, "SELECT", query, params)\n';
    report += '  - API错误: logApiError(error, "/api/orders", "POST", 500, "req-123")\n';
    report +=
      '  - 业务错误: logBusinessError(error, "orders", "create", "user-456", "order-789")\n';

    report += '\n🚨 生产环境建议:\n';
    report += '  - 配置集中式日志收集（ELK、Splunk等）\n';
    report += '  - 设置日志轮转和归档策略\n';
    report += '  - 配置错误告警和通知机制\n';
    report += '  - 定期分析错误模式和趋势\n';

    return report;
  }
}
