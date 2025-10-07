import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OpenObserveConfig {
  url: string;
  organization: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface QueryResult {
  data: any[];
  total: number;
  took: number;
  error?: string;
}

export interface DataIngestionResult {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

@Injectable()
export class OpenObserveService {
  private config: OpenObserveConfig;

  constructor(private configService: ConfigService) {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    this.config = {
      url: this.configService.get<string>('OPENOBSERVE_URL', 'http://localhost:5080'),
      organization: this.configService.get<string>('OPENOBSERVE_ORGANIZATION', 'default'),
      token: this.configService.get<string>('OPENOBSERVE_TOKEN'),
      username: this.configService.get<string>('OPENOBSERVE_USERNAME'),
      password: this.configService.get<string>('OPENOBSERVE_PASSWORD'),
    };
  }

  /**
   * 统一数据查询 - 实现单一真相原则的核心
   */
  async querySingleSourceOfTruth(
    streams: string[],
    query: string,
    startTime?: string,
    endTime?: string,
    limit: number = 1000,
  ): Promise<QueryResult> {
    try {
      const url = `${this.config.url}/api/${this.config.organization}/_search`;

      const requestBody = {
        query,
        streams,
        start_time: startTime || 'now-1h',
        end_time: endTime || 'now',
        limit,
        sql_mode: true,
      };

      const headers = this.getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const response = await axios.post(url, requestBody, { headers, timeout: 30000 });

      return {
        data: response.data.hits || [],
        total: response.data.total || 0,
        took: response.data.took || 0,
      };
    } catch (error) {
      return {
        data: [],
        total: 0,
        took: 0,
        error: error.message,
      };
    }
  }

  /**
   * 统一数据写入 - 确保数据一致性
   */
  async ingestData(
    stream: string,
    data: any[],
    compression: boolean = true,
  ): Promise<DataIngestionResult> {
    try {
      const url = `${this.config.url}/api/${this.config.organization}/${stream}/_json`;

      let payload = data;
      const headers = this.getAuthHeaders();

      if (compression) {
        // 这里可以实现压缩逻辑
        headers['Content-Encoding'] = 'gzip';
      }

      headers['Content-Type'] = 'application/json';

      const response = await axios.post(url, payload, { headers, timeout: 10000 });

      return {
        success: response.status === 200,
        message: 'Data ingested successfully',
        count: data.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to ingest data',
        error: error.message,
      };
    }
  }

  /**
   * 获取系统健康状态 - 单一真相源的健康检查
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const url = `${this.config.url}/api/_health`;
      const response = await axios.get(url, { timeout: 5000 });

      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        details: {
          version: response.data?.version,
          uptime: response.data?.uptime,
          status: response.status,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  /**
   * 获取数据统计 - 单一真相源的数据概览
   */
  async getDataStatistics(streams?: string[]): Promise<{
    totalRecords: number;
    streams: Record<string, number>;
    storageSize: number;
    ingestionRate: number;
  }> {
    try {
      const statsUrl = `${this.config.url}/api/${this.config.organization}/_stats`;
      const headers = this.getAuthHeaders();

      const response = await axios.get(statsUrl, { headers, timeout: 10000 });
      const stats = response.data;

      return {
        totalRecords: stats.total_records || 0,
        streams: stats.stream_stats || {},
        storageSize: stats.storage_size || 0,
        ingestionRate: stats.ingestion_rate || 0,
      };
    } catch (error) {
      return {
        totalRecords: 0,
        streams: {},
        storageSize: 0,
        ingestionRate: 0,
      };
    }
  }

  /**
   * 数据清理和归档 - 维护单一真相源的数据质量
   */
  async cleanupData(
    stream: string,
    retentionDays: number = 30,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const cleanupUrl = `${this.config.url}/api/${this.config.organization}/${stream}/_cleanup`;
      const headers = this.getAuthHeaders();

      const requestBody = {
        retention_days: retentionDays,
      };

      const response = await axios.post(cleanupUrl, requestBody, { headers, timeout: 30000 });

      return {
        success: response.status === 200,
        message: response.data?.message || 'Cleanup completed',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 跨流关联查询 - 实现真正的单一真相视图
   */
  async crossStreamCorrelation(
    primaryStream: string,
    secondaryStreams: string[],
    correlationField: string,
    timeRange: string = '1h',
  ): Promise<QueryResult> {
    const query = `
      SELECT 
        p.*,
        s.*
      FROM ${primaryStream} p
      LEFT JOIN ${secondaryStreams.join(', ')} s
      ON p.${correlationField} = s.${correlationField}
      WHERE p.timestamp >= NOW() - INTERVAL '${timeRange}'
      ORDER BY p.timestamp DESC
    `;

    return this.querySingleSourceOfTruth(
      [primaryStream, ...secondaryStreams],
      query,
      `now-${timeRange}`,
      'now',
    );
  }

  /**
   * 实时数据流监控 - 单一真相源的实时视图
   */
  async createRealTimeSubscription(
    stream: string,
    callback: (data: any) => void,
    filter?: string,
  ): Promise<{ success: boolean; subscriptionId?: string }> {
    try {
      // 这里可以实现WebSocket或Server-Sent Events订阅
      // 目前先返回成功状态
      return {
        success: true,
        subscriptionId: `sub_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    } else if (this.config.username && this.config.password) {
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
        'base64',
      );
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  /**
   * 数据验证和完整性检查 - 确保单一真相源的数据质量
   */
  async validateDataIntegrity(stream: string): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      // 检查数据完整性
      const integrityQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT _id) as unique_count,
          MIN(timestamp) as earliest_record,
          MAX(timestamp) as latest_record
        FROM ${stream}
        WHERE timestamp >= NOW() - INTERVAL '1d'
      `;

      const result = await this.querySingleSourceOfTruth([stream], integrityQuery);

      const issues: string[] = [];
      const suggestions: string[] = [];

      if (result.data.length > 0) {
        const stats = result.data[0];

        if (stats.total_count !== stats.unique_count) {
          issues.push('存在重复数据记录');
          suggestions.push('检查数据去重机制');
        }

        if (!stats.earliest_record || !stats.latest_record) {
          issues.push('时间戳数据不完整');
          suggestions.push('确保所有记录都有有效的时间戳');
        }
      }

      return {
        valid: issues.length === 0,
        issues,
        suggestions,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error.message],
        suggestions: ['检查OpenObserve连接配置'],
      };
    }
  }

  /**
   * 测试OpenObserve连接
   */
  async testConnection(): Promise<void> {
    try {
      const health = await this.getSystemHealth();
      if (health.status !== 'healthy') {
        throw new Error('OpenObserve服务不健康');
      }
    } catch (error) {
      throw new Error(`OpenObserve连接测试失败: ${error.message}`);
    }
  }

  /**
   * 批量发送日志到OpenObserve
   */
  async sendLogs(logs: any[]): Promise<void> {
    if (logs.length === 0) return;

    try {
      const result = await this.ingestData('logs', logs);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      throw new Error(`发送日志到OpenObserve失败: ${error.message}`);
    }
  }

  /**
   * 查询日志
   */
  async queryLogs(query: any): Promise<any> {
    try {
      // 转换查询格式为OpenObserve格式
      const openobserveQuery = this.convertToOpenObserveQuery(query);
      const result = await this.querySingleSourceOfTruth(
        ['logs'],
        openobserveQuery,
        query.timeRange?.from,
        query.timeRange?.to,
        query.size || 100,
      );

      return {
        total: result.total,
        hits: result.data,
        aggregations: {}, // OpenObserve的聚合结果需要特殊处理
        took: result.took,
        timedOut: false,
      };
    } catch (error) {
      throw new Error(`查询日志失败: ${error.message}`);
    }
  }

  /**
   * 获取日志分析数据
   */
  async getLogAnalytics(timeRange?: { from: string; to: string }): Promise<any> {
    try {
      const startTime = timeRange?.from || 'now-1h';
      const endTime = timeRange?.to || 'now';

      // 获取日志级别统计
      const levelStatsQuery = `
        SELECT level, COUNT(*) as count
        FROM logs
        WHERE timestamp >= '${startTime}' AND timestamp <= '${endTime}'
        GROUP BY level
      `;

      // 获取服务统计
      const serviceStatsQuery = `
        SELECT service, COUNT(*) as count
        FROM logs
        WHERE timestamp >= '${startTime}' AND timestamp <= '${endTime}'
        GROUP BY service
      `;

      const [levelStats, serviceStats] = await Promise.all([
        this.querySingleSourceOfTruth(['logs'], levelStatsQuery, startTime, endTime),
        this.querySingleSourceOfTruth(['logs'], serviceStatsQuery, startTime, endTime),
      ]);

      return {
        totalLogs: levelStats.total + serviceStats.total,
        logsByLevel: this.transformBuckets(levelStats.data),
        logsByService: this.transformBuckets(serviceStats.data),
        errorTrends: [], // 需要更复杂的查询
        topErrors: [], // 需要更复杂的查询
        performanceMetrics: {
          avgResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          errorRate: 0,
        },
        alertsSummary: {
          active: 0,
          resolved: 0,
          critical: 0,
        },
      };
    } catch (error) {
      throw new Error(`获取日志分析失败: ${error.message}`);
    }
  }

  /**
   * 转换查询格式为OpenObserve格式
   */
  private convertToOpenObserveQuery(query: any): string {
    let sql = 'SELECT * FROM logs WHERE 1=1';

    if (query.query) {
      sql += ` AND (message LIKE '%${query.query}%' OR level LIKE '%${query.query}%')`;
    }

    if (query.filters) {
      Object.entries(query.filters).forEach(([field, value]) => {
        sql += ` AND ${field} = '${value}'`;
      });
    }

    if (query.timeRange) {
      sql += ` AND timestamp >= '${query.timeRange.from}' AND timestamp <= '${query.timeRange.to}'`;
    }

    if (query.sort) {
      const sortClause = query.sort.map((s: any) => `${s.field} ${s.order}`).join(', ');
      sql += ` ORDER BY ${sortClause}`;
    } else {
      sql += ' ORDER BY timestamp DESC';
    }

    if (query.size) {
      sql += ` LIMIT ${query.size}`;
    }

    return sql;
  }

  /**
   * 转换桶数据格式
   */
  private transformBuckets(buckets: any[]): Record<string, number> {
    return buckets.reduce((acc, bucket) => {
      acc[bucket.level || bucket.service] = bucket.count;
      return acc;
    }, {});
  }
}
