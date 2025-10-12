import { Injectable, Logger } from '@nestjs/common';
import { OpenObserveConfigService } from './config/openobserve-config.service';
import { SecureQueryBuilder } from './utils/query-builder';
import { OpenObserveError, RetryHandler, ErrorMetrics } from './utils/error-handler';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

/**
 * 查询结果接口
 */
export interface QueryResult {
  data: any[];
  total: number;
  took: number;
  error?: string;
  requestId?: string;
}

/**
 * 数据写入结果接口
 */
export interface DataIngestionResult {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
  requestId?: string;
}

/**
 * 系统健康状态接口
 */
export interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  details: Record<string, any>;
  responseTime?: number;
  requestId?: string;
}

/**
 * 数据统计接口
 */
export interface DataStatistics {
  totalRecords: number;
  streams: Record<string, number>;
  storageSize: number;
  ingestionRate: number;
  requestId?: string;
}

/**
 * 数据完整性验证结果接口
 */
export interface DataIntegrityResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
  requestId?: string;
}

/**
 * 改进的OpenObserve服务
 * 修复了安全、性能和可靠性问题
 */
@Injectable()
export class OpenObserveService {
  private readonly logger = new Logger(OpenObserveService.name);
  private axiosInstance: AxiosInstance;

  constructor(private readonly configService: OpenObserveConfigService) {
    this.initializeAxiosInstance();
  }

  /**
   * 初始化Axios实例
   */
  private initializeAxiosInstance(): void {
    const config = this.configService.getConfig();

    this.axiosInstance = axios.create({
      baseURL: config.url,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'caddy-shopping-site/1.0.0',
      },
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (requestConfig) => {
        const requestId = this.generateRequestId();
        requestConfig.headers['X-Request-ID'] = requestId;
        
        this.logger.debug(`[Request] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
          requestId,
          headers: requestConfig.headers,
        });

        return requestConfig;
      },
      (error) => {
        this.logger.error('[Request] Error', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const requestId = response.headers['x-request-id'] || response.config.headers['X-Request-ID'];
        
        this.logger.debug(`[Response] ${response.status} ${response.config.url}`, {
          requestId,
          status: response.status,
          duration: response.config.metadata?.duration,
        });

        return response;
      },
      (error) => {
        const requestId = error.config?.headers?.['X-Request-ID'];
        
        this.logger.error(`[Response] Error ${error.config?.url}`, {
          requestId,
          status: error.response?.status,
          message: error.message,
        });

        // 转换为OpenObserveError
        const openObserveError = OpenObserveError.fromAxiosError(error, { requestId });
        ErrorMetrics.recordError(openObserveError);
        
        return Promise.reject(openObserveError);
      }
    );

    // 添加请求持续时间记录
    this.axiosInstance.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() };
      return config;
    });

    this.axiosInstance.interceptors.response.use((response) => {
      const startTime = response.config.metadata?.startTime;
      if (startTime) {
        const duration = Date.now() - startTime;
        response.config.metadata = { ...response.config.metadata, duration };
      }
      return response;
    });
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 统一数据查询 - 实现单一真相原则的核心
   * 使用安全的查询构建器防止SQL注入
   */
  async querySingleSourceOfTruth(
    streams: string[],
    query: string,
    startTime?: string,
    endTime?: string,
    limit: number = 1000,
  ): Promise<QueryResult> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      // 验证输入参数
      if (!streams || streams.length === 0) {
        throw OpenObserveError.validationError('Streams array is required', { requestId });
      }

      if (!query || query.trim().length === 0) {
        throw OpenObserveError.validationError('Query string is required', { requestId });
      }

      // 构建时间范围过滤
      const timeFilter = SecureQueryBuilder.buildTimeRangeFilter(startTime, endTime);
      const finalQuery = timeFilter ? `${query} AND ${timeFilter}` : query;

      const requestBody = {
        query: finalQuery,
        streams,
        start_time: startTime || 'now-1h',
        end_time: endTime || 'now',
        limit: Math.min(Math.max(1, limit), 10000), // 限制范围
        sql_mode: true,
      };

      const response = await RetryHandler.executeWithRetry(
        () => this.axiosInstance.post(
          this.configService.getSearchEndpoint(),
          requestBody,
          {
            headers: this.configService.getAuthHeaders(),
          }
        ),
        undefined,
        { requestId, operation: 'querySingleSourceOfTruth' }
      );

      return {
        data: response.data.hits || [],
        total: response.data.total || 0,
        took: response.data.took || 0,
        requestId: response.headers['x-request-id'] || requestId,
      };
    } catch (error) {
      this.logger.error(`Query failed: ${error.message}`, { requestId, streams, query });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'querySingleSourceOfTruth' });
    }
  }

  /**
   * 统一数据写入 - 确保数据一致性
   * 修复压缩功能，实现真正的gzip压缩
   */
  async ingestData(
    stream: string,
    data: any[],
    compression: boolean = true,
  ): Promise<DataIngestionResult> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      if (!stream || stream.trim().length === 0) {
        throw OpenObserveError.validationError('Stream name is required', { requestId });
      }

      if (!data || data.length === 0) {
        throw OpenObserveError.validationError('Data array is required', { requestId });
      }

      const config = this.configService.getConfig();
      const url = this.configService.getApiEndpoint(stream);
      
      let payload: any = data;
      const headers = { ...this.configService.getAuthHeaders() };

      // 真正实现gzip压缩
      if (compression && config.compression) {
        try {
          const jsonString = JSON.stringify(data);
          payload = await gzip(jsonString);
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Type'] = 'application/json';
        } catch (compressionError) {
          this.logger.warn('Compression failed, sending uncompressed data', {
            requestId,
            error: compressionError.message,
          });
          // 压缩失败时使用原始数据
          payload = data;
        }
      }

      const response = await RetryHandler.executeWithRetry(
        () => this.axiosInstance.post(url, payload, { headers }),
        undefined,
        { requestId, operation: 'ingestData', stream, dataSize: data.length }
      );

      return {
        success: response.status === 200,
        message: 'Data ingested successfully',
        count: data.length,
        requestId: response.headers['x-request-id'] || requestId,
      };
    } catch (error) {
      this.logger.error(`Data ingestion failed: ${error.message}`, { requestId, stream, dataSize: data?.length });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'ingestData' });
    }
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      const startTime = Date.now();
      const response = await this.axiosInstance.get(
        this.configService.getHealthEndpoint(),
        {
          headers: this.configService.getAuthHeaders(),
          timeout: 5000,
        }
      );
      const responseTime = Date.now() - startTime;

      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        details: {
          version: response.data?.version,
          uptime: response.data?.uptime,
          status: response.status,
        },
        responseTime,
        requestId: response.headers['x-request-id'] || requestId,
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, { requestId });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'getSystemHealth' });
    }
  }

  /**
   * 获取数据统计
   * 核对API路径准确性
   */
  async getDataStatistics(streams?: string[] | string): Promise<DataStatistics> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      const url = this.configService.getStatsEndpoint();
      const headers = this.configService.getAuthHeaders();

      // 构建查询参数 - 处理字符串和数组两种格式
      const params: any = {};
      if (streams) {
        if (Array.isArray(streams) && streams.length > 0) {
          params.streams = streams.join(',');
        } else if (typeof streams === 'string' && streams.trim().length > 0) {
          params.streams = streams;
        }
      }

      const response = await RetryHandler.executeWithRetry(
        () => this.axiosInstance.get(url, { headers, params }),
        undefined,
        { requestId, operation: 'getDataStatistics', streams }
      );

      // 安全地处理响应数据，提供默认值
      const data = response.data || {};
      
      return {
        totalRecords: data.total_records || data.totalRecords || 0,
        streams: data.stream_stats || data.streamStats || {},
        storageSize: data.storage_size || data.storageSize || 0,
        ingestionRate: data.ingestion_rate || data.ingestionRate || 0,
        requestId: response.headers['x-request-id'] || requestId,
      };
    } catch (error) {
      this.logger.error(`Get statistics failed: ${error.message}`, { requestId, streams });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'getDataStatistics' });
    }
  }

  /**
   * 数据清理和归档
   */
  async cleanupData(
    stream: string,
    retentionDays: number = 30,
  ): Promise<{ success: boolean; message: string; requestId?: string }> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      if (!stream || stream.trim().length === 0) {
        throw OpenObserveError.validationError('Stream name is required', { requestId });
      }

      const retentionDaysSanitized = Math.min(Math.max(1, retentionDays), 365);
      const url = `${this.configService.getApiEndpoint(stream).replace('/_json', '/_cleanup')}`;
      
      const requestBody = {
        retention_days: retentionDaysSanitized,
      };

      const response = await RetryHandler.executeWithRetry(
        () => this.axiosInstance.post(url, requestBody, {
          headers: this.configService.getAuthHeaders(),
        }),
        undefined,
        { requestId, operation: 'cleanupData', stream, retentionDays: retentionDaysSanitized }
      );

      return {
        success: response.status === 200,
        message: response.data?.message || 'Cleanup completed',
        requestId: response.headers['x-request-id'] || requestId,
      };
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`, { requestId, stream, retentionDays });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'cleanupData' });
    }
  }

  /**
   * 跨流关联查询 - 修复SQL生成错误
   */
  async crossStreamCorrelation(
    primaryStream: string,
    secondaryStreams: string[],
    correlationField: string,
    timeRange: string = '1h',
  ): Promise<QueryResult> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      // 验证输入参数
      if (!primaryStream || primaryStream.trim().length === 0) {
        throw OpenObserveError.validationError('Primary stream is required', { requestId });
      }

      if (!secondaryStreams || secondaryStreams.length === 0) {
        throw OpenObserveError.validationError('Secondary streams array is required', { requestId });
      }

      if (!correlationField || correlationField.trim().length === 0) {
        throw OpenObserveError.validationError('Correlation field is required', { requestId });
      }

      // 使用安全的查询构建器
      const query = SecureQueryBuilder.buildCorrelationQuery(
        primaryStream,
        secondaryStreams,
        correlationField,
        timeRange
      );

      return this.querySingleSourceOfTruth(
        [primaryStream, ...secondaryStreams],
        query,
        `now-${timeRange}`,
        'now',
        1000,
      );
    } catch (error) {
      this.logger.error(`Cross stream correlation failed: ${error.message}`, {
        requestId,
        primaryStream,
        secondaryStreams,
        correlationField,
        timeRange,
      });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'crossStreamCorrelation' });
    }
  }

  /**
   * 数据验证和完整性检查
   */
  async validateDataIntegrity(stream: string): Promise<DataIntegrityResult> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      if (!stream || stream.trim().length === 0) {
        throw OpenObserveError.validationError('Stream name is required', { requestId });
      }

      // 构建完整性检查查询
      const integrityQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT _id) as unique_count,
          MIN(timestamp) as earliest_record,
          MAX(timestamp) as latest_record
        FROM ${stream}
        WHERE timestamp >= NOW() - INTERVAL '1d'
      `;

      const result = await this.querySingleSourceOfTruth(
        [stream],
        integrityQuery,
        'now-1d',
        'now',
      );

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
      } else {
        issues.push('未找到任何数据记录');
        suggestions.push('检查数据源和流配置');
      }

      return {
        valid: issues.length === 0,
        issues,
        suggestions,
        requestId,
      };
    } catch (error) {
      this.logger.error(`Data integrity validation failed: ${error.message}`, { requestId, stream });
      
      // 平衡方案：提供准确的错误上下文，同时保持调试信息
      if (error instanceof OpenObserveError) {
        // 对于嵌套调用，提供完整的调用链信息，确保operation反映用户调用的操作
        const enhancedContext = {
          ...error.context,
          operation: 'validateDataIntegrity', // 反映用户调用的操作
          originalOperation: error.context?.operation, // 保留原始操作用于调试
          operationChain: [
            error.context?.operation || 'unknown',
            'validateDataIntegrity'
          ]
        };
        
        const enhancedError = new OpenObserveError(
          error.message,
          error.code,
          error.statusCode,
          enhancedContext,
          error.retryable
        );
        throw enhancedError;
      }

      // 对于非OpenObserveError，创建新的错误
      throw OpenObserveError.fromAxiosError(error, {
        requestId,
        operation: 'validateDataIntegrity', // 反映用户调用的操作
        originalOperation: 'querySingleSourceOfTruth' // 记录实际发生错误的操作
      });
    }
  }

  /**
   * 测试OpenObserve连接
   */
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      const health = await this.getSystemHealth();
      const responseTime = Date.now() - startTime;

      if (health.status !== 'healthy') {
        return {
          success: false,
          message: 'OpenObserve服务不健康',
          responseTime,
        };
      }

      return {
        success: true,
        message: '连接测试成功',
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `连接测试失败: ${error.message}`,
      };
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
   * 查询日志 - 使用安全的查询构建器
   */
  async queryLogs(query: any): Promise<any> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      // 使用安全的查询构建器
      const safeQuery = SecureQueryBuilder.buildLogQuery(query);
      
      const result = await this.querySingleSourceOfTruth(
        ['logs'],
        safeQuery,
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
        requestId: result.requestId,
      };
    } catch (error) {
      this.logger.error(`Query logs failed: ${error.message}`, { requestId, query });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'queryLogs' });
    }
  }

  /**
   * 查询指标 - 使用安全的查询构建器
   */
  async queryMetrics(query: any): Promise<any> {
    const requestId = this.generateRequestId();

    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

      // 使用安全的查询构建器
      const safeQuery = SecureQueryBuilder.buildMetricsQuery(query);

      const result = await this.querySingleSourceOfTruth(
        ['metrics'],
        safeQuery,
        query.timeRange?.from,
        query.timeRange?.to,
        query.size || 100,
      );

      return {
        total: result.total,
        series: result.data, // 指标通常用于可视化序列
        took: result.took,
        timedOut: false,
        requestId: result.requestId,
      };
    } catch (error) {
      this.logger.error(`Query metrics failed: ${error.message}`, { requestId, query });

      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'queryMetrics' });
    }
  }

  /**
   * 获取日志分析数据
   */
  async getLogAnalytics(timeRange?: { from: string; to: string }): Promise<any> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.configService.isEnabled()) {
        throw OpenObserveError.validationError('OpenObserve is not enabled', { requestId });
      }

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
        logsByLevel: this.transformBuckets(levelStats.data, 'level'),
        logsByService: this.transformBuckets(serviceStats.data, 'service'),
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
        requestId,
      };
    } catch (error) {
      this.logger.error(`Get log analytics failed: ${error.message}`, { requestId, timeRange });
      
      if (error instanceof OpenObserveError) {
        throw error;
      }

      throw OpenObserveError.fromAxiosError(error, { requestId, operation: 'getLogAnalytics' });
    }
  }

  /**
   * 改进的桶数据转换方法
   * 支持自定义键选择器
   */
  private transformBuckets(buckets: any[], keySelector: string = 'key'): Record<string, number> {
    if (!buckets || !Array.isArray(buckets)) {
      return {};
    }

    return buckets.reduce((acc, bucket) => {
      // 支持多种键名
      const key = bucket[keySelector] || bucket.level || bucket.service || bucket.name || 'unknown';
      const value = bucket.count || bucket.value || bucket.doc_count || 0;
      acc[key] = value;
      return acc;
    }, {});
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<string, any> {
    return ErrorMetrics.getErrorStats();
  }

  /**
   * 重置错误统计
   */
  resetErrorStats(): void {
    ErrorMetrics.resetStats();
  }
}
