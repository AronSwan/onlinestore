import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnhancedBusinessException, ErrorContext } from '../exceptions/enhanced-business.exception';

/**
 * 错误统计信息
 */
export interface ErrorStats {
  errorCode: string;
  category: string;
  count: number;
  lastOccurrence: Date;
  averageResponseTime: number;
  affectedUsers: Set<string>;
  endpoints: Set<string>;
}

/**
 * 错误趋势信息
 */
export interface ErrorTrend {
  timeWindow: string;
  errorCount: number;
  uniqueErrors: number;
  topErrors: Array<{ errorCode: string; count: number }>;
  affectedEndpoints: number;
}

/**
 * 错误报告服务
 * 负责错误的收集、统计、分析和报告
 */
@Injectable()
export class ErrorReporterService {
  private readonly logger = new Logger(ErrorReporterService.name);
  private readonly errorStats = new Map<string, ErrorStats>();
  private readonly errorHistory: Array<{
    error: EnhancedBusinessException;
    context: ErrorContext;
    timestamp: Date;
  }> = [];

  // 配置参数
  private readonly maxHistorySize: number;
  private readonly alertThresholds: {
    errorRate: number;
    criticalErrorCount: number;
    timeWindow: number;
  };

  constructor(private readonly configService: ConfigService) {
    this.maxHistorySize = this.configService.get<number>('error.maxHistorySize', 10000);
    this.alertThresholds = {
      errorRate: this.configService.get<number>('error.alertThresholds.errorRate', 0.1), // 10%
      criticalErrorCount: this.configService.get<number>(
        'error.alertThresholds.criticalErrorCount',
        50,
      ),
      timeWindow: this.configService.get<number>('error.alertThresholds.timeWindow', 300000), // 5分钟
    };
  }

  /**
   * 报告错误
   */
  reportError(error: EnhancedBusinessException, context: ErrorContext): void {
    const timestamp = new Date();

    // 添加到历史记录
    this.addToHistory(error, context, timestamp);

    // 更新统计信息
    this.updateStats(error, context, timestamp);

    // 检查是否需要发送告警
    this.checkAlerts(error, context);

    // 记录详细日志
    this.logError(error, context);
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(
    error: EnhancedBusinessException,
    context: ErrorContext,
    timestamp: Date,
  ): void {
    this.errorHistory.push({ error, context, timestamp });

    // 保持历史记录大小在限制内
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(
    error: EnhancedBusinessException,
    context: ErrorContext,
    timestamp: Date,
  ): void {
    const key = error.errorCode;
    let stats = this.errorStats.get(key);

    if (!stats) {
      stats = {
        errorCode: error.errorCode,
        category: error.category,
        count: 0,
        lastOccurrence: timestamp,
        averageResponseTime: 0,
        affectedUsers: new Set(),
        endpoints: new Set(),
      };
      this.errorStats.set(key, stats);
    }

    // 更新统计信息
    stats.count++;
    stats.lastOccurrence = timestamp;

    if (context.userId) {
      stats.affectedUsers.add(context.userId);
    }

    if (context.path) {
      stats.endpoints.add(`${context.method} ${context.path}`);
    }

    // 更新平均响应时间
    if (context.duration) {
      stats.averageResponseTime =
        (stats.averageResponseTime * (stats.count - 1) + context.duration) / stats.count;
    }
  }

  /**
   * 检查告警条件
   */
  private checkAlerts(error: EnhancedBusinessException, context: ErrorContext): void {
    const now = Date.now();
    const timeWindow = this.alertThresholds.timeWindow;

    // 检查时间窗口内的错误率
    const recentErrors = this.errorHistory.filter(
      entry => now - entry.timestamp.getTime() <= timeWindow,
    );

    const criticalErrors = recentErrors.filter(
      entry => entry.error.category === 'system' || entry.error.category === 'external',
    );

    // 发送告警
    if (criticalErrors.length >= this.alertThresholds.criticalErrorCount) {
      this.sendCriticalErrorAlert(criticalErrors, timeWindow);
    }

    // 检查特定错误的频率
    const sameErrorCount = recentErrors.filter(
      entry => entry.error.errorCode === error.errorCode,
    ).length;

    if (sameErrorCount >= 10) {
      // 5分钟内同一错误超过10次
      this.sendHighFrequencyErrorAlert(error, sameErrorCount, timeWindow);
    }
  }

  /**
   * 发送严重错误告警
   */
  private sendCriticalErrorAlert(errors: any[], timeWindow: number): void {
    const alertData = {
      type: 'CRITICAL_ERROR_THRESHOLD',
      message: `在过去${timeWindow / 1000}秒内发生了${errors.length}个严重错误`,
      errorCount: errors.length,
      timeWindow: timeWindow / 1000,
      topErrors: this.getTopErrors(errors, 5),
      timestamp: new Date().toISOString(),
    };

    this.logger.error('Critical error threshold exceeded', alertData);

    // 这里可以集成到告警系统
    this.sendToAlertingSystem(alertData);
  }

  /**
   * 发送高频错误告警
   */
  private sendHighFrequencyErrorAlert(
    error: EnhancedBusinessException,
    count: number,
    timeWindow: number,
  ): void {
    const alertData = {
      type: 'HIGH_FREQUENCY_ERROR',
      message: `错误 ${error.errorCode} 在过去${timeWindow / 1000}秒内发生了${count}次`,
      errorCode: error.errorCode,
      category: error.category,
      count,
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn('High frequency error detected', alertData);

    // 这里可以集成到告警系统
    this.sendToAlertingSystem(alertData);
  }

  /**
   * 记录错误日志
   */
  private logError(error: EnhancedBusinessException, context: ErrorContext): void {
    const logData = {
      errorCode: error.errorCode,
      category: error.category,
      message: error.message,
      context,
      retryable: error.retryable,
      stack: error.stack,
    };

    if (error.category === 'system' || error.category === 'external') {
      this.logger.error(`System error occurred: ${error.errorCode}`, logData);
    } else {
      this.logger.warn(`Business error occurred: ${error.errorCode}`, logData);
    }
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats(): Map<string, ErrorStats> {
    return new Map(this.errorStats);
  }

  /**
   * 获取错误趋势
   */
  getErrorTrend(timeWindow: number = 3600000): ErrorTrend {
    // 默认1小时
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      entry => now - entry.timestamp.getTime() <= timeWindow,
    );

    const errorCounts = new Map<string, number>();
    const endpoints = new Set<string>();

    recentErrors.forEach(entry => {
      const errorCode = entry.error.errorCode;
      errorCounts.set(errorCode, (errorCounts.get(errorCode) || 0) + 1);

      if (entry.context.path) {
        endpoints.add(`${entry.context.method} ${entry.context.path}`);
      }
    });

    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([errorCode, count]) => ({ errorCode, count }));

    return {
      timeWindow: `${timeWindow / 1000}s`,
      errorCount: recentErrors.length,
      uniqueErrors: errorCounts.size,
      topErrors,
      affectedEndpoints: endpoints.size,
    };
  }

  /**
   * 获取错误详细报告
   */
  getDetailedReport(): {
    summary: {
      totalErrors: number;
      uniqueErrors: number;
      criticalErrors: number;
      recentErrors: number;
    };
    topErrors: Array<{
      errorCode: string;
      category: string;
      count: number;
      affectedUsers: number;
      affectedEndpoints: number;
      lastOccurrence: Date;
    }>;
    trends: {
      last1Hour: ErrorTrend;
      last24Hours: ErrorTrend;
    };
  } {
    const stats = Array.from(this.errorStats.values());
    const criticalErrors = stats.filter(s => s.category === 'system' || s.category === 'external');
    const recentErrors = this.errorHistory.filter(
      entry => Date.now() - entry.timestamp.getTime() <= 3600000, // 1小时内
    );

    const topErrors = stats
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(stat => ({
        errorCode: stat.errorCode,
        category: stat.category,
        count: stat.count,
        affectedUsers: stat.affectedUsers.size,
        affectedEndpoints: stat.endpoints.size,
        lastOccurrence: stat.lastOccurrence,
      }));

    return {
      summary: {
        totalErrors: this.errorHistory.length,
        uniqueErrors: this.errorStats.size,
        criticalErrors: criticalErrors.reduce((sum, stat) => sum + stat.count, 0),
        recentErrors: recentErrors.length,
      },
      topErrors,
      trends: {
        last1Hour: this.getErrorTrend(3600000),
        last24Hours: this.getErrorTrend(86400000),
      },
    };
  }

  /**
   * 清理历史数据
   */
  cleanup(olderThan: number = 86400000): void {
    // 默认清理1天前的数据
    const cutoff = Date.now() - olderThan;

    // 清理历史记录
    const originalLength = this.errorHistory.length;
    this.errorHistory.splice(
      0,
      this.errorHistory.findIndex(entry => entry.timestamp.getTime() > cutoff),
    );

    this.logger.log(`Cleaned up ${originalLength - this.errorHistory.length} old error records`);
  }

  /**
   * 获取热门错误
   */
  private getTopErrors(errors: any[], limit: number): Array<{ errorCode: string; count: number }> {
    const errorCounts = new Map<string, number>();

    errors.forEach(entry => {
      const errorCode = entry.error.errorCode;
      errorCounts.set(errorCode, (errorCounts.get(errorCode) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([errorCode, count]) => ({ errorCode, count }));
  }

  /**
   * 发送到告警系统
   */
  private sendToAlertingSystem(alertData: any): void {
    // 这里可以集成到具体的告警系统
    // 例如：钉钉、企业微信、邮件、短信等

    // 示例：发送到钉钉
    // await this.dingTalkService.sendAlert(alertData);

    // 示例：发送邮件
    // await this.emailService.sendAlert(alertData);

    this.logger.debug('Alert sent to alerting system', alertData);
  }
}
