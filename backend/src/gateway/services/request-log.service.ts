import { Injectable } from '@nestjs/common';

interface RequestLog {
  id: string;
  apiKey: string;
  clientIp: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime?: number;
  timestamp: Date;
  userAgent?: string;
  error?: string;
}

@Injectable()
export class RequestLogService {
  private requestLogs: RequestLog[] = [];
  private readonly MAX_LOGS = 10000; // 最多保存10000条日志

  /**
   * 记录请求日志
   */
  async logRequest(
    apiKey: string,
    clientIp: string,
    endpoint: string,
    method: string = 'GET',
    userAgent?: string,
  ): Promise<void> {
    const log: RequestLog = {
      id: this.generateLogId(),
      apiKey: this.maskApiKey(apiKey),
      clientIp,
      endpoint,
      method,
      timestamp: new Date(),
      userAgent,
    };

    this.requestLogs.push(log);

    // 保持日志数量在限制内
    if (this.requestLogs.length > this.MAX_LOGS) {
      this.requestLogs = this.requestLogs.slice(-this.MAX_LOGS);
    }
  }

  /**
   * 记录请求完成信息
   */
  async logRequestComplete(
    logId: string,
    statusCode: number,
    responseTime: number,
    error?: string,
  ): Promise<void> {
    const log = this.requestLogs.find(l => l.id === logId);
    if (log) {
      log.statusCode = statusCode;
      log.responseTime = responseTime;
      log.error = error;
    }
  }

  /**
   * 获取总请求数
   */
  async getTotalRequests(timeRange: string): Promise<number> {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    return this.requestLogs.filter(log => log.timestamp >= cutoffTime).length;
  }

  /**
   * 按端点统计请求数
   */
  async getRequestsByEndpoint(timeRange: string): Promise<Record<string, number>> {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const filteredLogs = this.requestLogs.filter(log => log.timestamp >= cutoffTime);

    const stats: Record<string, number> = {};
    filteredLogs.forEach(log => {
      stats[log.endpoint] = (stats[log.endpoint] || 0) + 1;
    });

    return stats;
  }

  /**
   * 按API密钥统计请求数
   */
  async getRequestsByApiKey(timeRange: string): Promise<Record<string, number>> {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const filteredLogs = this.requestLogs.filter(log => log.timestamp >= cutoffTime);

    const stats: Record<string, number> = {};
    filteredLogs.forEach(log => {
      stats[log.apiKey] = (stats[log.apiKey] || 0) + 1;
    });

    return stats;
  }

  /**
   * 获取错误率
   */
  async getErrorRate(timeRange: string): Promise<number> {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const filteredLogs = this.requestLogs.filter(log => log.timestamp >= cutoffTime);

    if (filteredLogs.length === 0) {
      return 0;
    }

    const errorCount = filteredLogs.filter(log => log.statusCode && log.statusCode >= 400).length;

    return (errorCount / filteredLogs.length) * 100;
  }

  /**
   * 获取平均响应时间
   */
  async getAverageResponseTime(timeRange: string): Promise<number> {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const filteredLogs = this.requestLogs.filter(
      log => log.timestamp >= cutoffTime && log.responseTime !== undefined,
    );

    if (filteredLogs.length === 0) {
      return 0;
    }

    const totalTime = filteredLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0);
    return totalTime / filteredLogs.length;
  }

  /**
   * 获取最近的请求日志
   */
  async getRecentLogs(limit: number = 100): Promise<RequestLog[]> {
    return this.requestLogs.slice(-limit).reverse(); // 最新的在前面
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 隐藏API密钥
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    return (
      apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4)
    );
  }

  /**
   * 根据时间范围获取截止时间
   */
  private getTimeRangeCutoff(timeRange: string): Date {
    const now = new Date();
    const cutoff = new Date(now);

    switch (timeRange) {
      case '1h':
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case '24h':
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(cutoff.getDate() - 30);
        break;
      default:
        cutoff.setDate(cutoff.getDate() - 1); // 默认24小时
    }

    return cutoff;
  }
}
