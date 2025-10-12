import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ValidationPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { OpenObserveService } from './openobserve.service';
import {
  BaseQueryDto,
  CorrelationQueryDto,
  StatisticsQueryDto,
  IntegrityQueryDto,
  IngestDataDto,
  CleanupDataDto,
  UserBehaviorAnalyticsDto,
  SystemPerformanceAnalyticsDto,
  SecurityEventsAnalyticsDto,
  BusinessMetricsAnalyticsDto
} from './dto/query.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { OpenObserveError } from './utils/error-handler';
import { IngestEmailVerificationDto } from './dto/ingest.dto';
import { SecureQueryBuilder } from './utils/query-builder';
import { ParameterizedQueryBuilder } from './utils/parameterized-query-builder';
import { FieldWhitelistService } from './config/field-whitelist.service';
import { MetricsCollector } from './utils/metrics-collector';
import { BatchWriter } from './utils/batch-writer';
import { ResponseWrapperService } from './utils/response-wrapper.service';

/**
 * 改进的OpenObserve控制器
 * 使用DTO验证和类型安全
 */
@Controller('openobserve')
@UseGuards(ApiKeyGuard)
export class OpenObserveController {
  private readonly logger = new Logger(OpenObserveController.name);

  constructor(
    private readonly openObserveService: OpenObserveService,
    private readonly fieldWhitelistService: FieldWhitelistService,
    private readonly metricsCollector: MetricsCollector,
    private readonly batchWriter: BatchWriter,
    private readonly responseWrapperService: ResponseWrapperService,
  ) {}

  /**
   * 单一真相源查询接口
   * 统一查询所有数据流
   */
  @Get('query')
  async querySingleSourceOfTruth(
    @Query(ValidationPipe) queryDto: BaseQueryDto,
  ) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Query request`, { streams: queryDto.streams, query: queryDto.query });
      
      // 使用参数化查询构建器，防止SQL注入
      const parameterizedQuery = ParameterizedQueryBuilder.buildParameterizedQuery(
        queryDto.query,
        {} // 如果查询中有参数，可以在这里传递
      );
      
      const result = await this.openObserveService.querySingleSourceOfTruth(
        queryDto.streams,
        parameterizedQuery.query,
        queryDto.startTime,
        queryDto.endTime,
        queryDto.limit,
      );

      // 记录请求指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(true, duration, 200, {
        operation: 'querySingleSourceOfTruth',
        streams: Array.isArray(queryDto.streams) ? queryDto.streams.join(',') : queryDto.streams,
      });

      // 使用响应包装服务包装响应
      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'querySingleSourceOfTruth',
        streams: queryDto.streams,
        duration,
      });
    } catch (error) {
      // 记录请求指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(false, duration, 500, {
        operation: 'querySingleSourceOfTruth',
        streams: Array.isArray(queryDto.streams) ? queryDto.streams.join(',') : queryDto.streams,
      });
      
      // 记录错误指标
      this.metricsCollector.recordError('QueryError', error.message, {
        operation: 'querySingleSourceOfTruth',
      });
      
      // 使用响应包装服务包装错误
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'querySingleSourceOfTruth'
      );
      
      this.handleError(error, 'querySingleSourceOfTruth');
      throw wrappedError;
    }
  }

  /**
   * 跨流关联查询
   * 实现真正的单一真相视图
   */
  @Get('correlation')
  async crossStreamCorrelation(
    @Query(ValidationPipe) correlationDto: CorrelationQueryDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Correlation query request`, {
        primaryStream: correlationDto.primaryStream,
        secondaryStreams: correlationDto.secondaryStreams,
        correlationField: correlationDto.correlationField,
      });

      const result = await this.openObserveService.crossStreamCorrelation(
        correlationDto.primaryStream,
        correlationDto.secondaryStreams,
        correlationDto.correlationField,
        correlationDto.timeRange,
      );

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'crossStreamCorrelation',
        primaryStream: correlationDto.primaryStream,
        secondaryStreams: correlationDto.secondaryStreams,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'crossStreamCorrelation'
      );
      
      this.handleError(error, 'crossStreamCorrelation');
      throw wrappedError;
    }
  }

  /**
   * 数据统计概览
   * 单一真相源的整体视图
   */
  @Get('statistics')
  async getDataStatistics(
    @Query(ValidationPipe) statsDto: StatisticsQueryDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Statistics request`, { streams: statsDto.streams });

      const result = await this.openObserveService.getDataStatistics(statsDto.streams);

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'getDataStatistics',
        streams: statsDto.streams,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getDataStatistics'
      );
      
      this.handleError(error, 'getDataStatistics');
      throw wrappedError;
    }
  }

  /**
   * 系统健康检查
   * 单一真相源的可用性检查
   */
  @Get('health')
  async getSystemHealth() {
    const requestId = this.generateRequestId();
    
    try {
      const result = await this.openObserveService.getSystemHealth();

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'getSystemHealth',
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getSystemHealth'
      );
      
      this.handleError(error, 'getSystemHealth');
      throw wrappedError;
    }
  }

  /**
   * 数据完整性验证
   * 确保单一真相源的数据质量
   */
  @Get('integrity')
  async validateDataIntegrity(
    @Query(ValidationPipe) integrityDto: IntegrityQueryDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Integrity validation request`, { stream: integrityDto.stream });

      const result = await this.openObserveService.validateDataIntegrity(integrityDto.stream);

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'validateDataIntegrity',
        stream: integrityDto.stream,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'validateDataIntegrity'
      );
      
      this.handleError(error, 'validateDataIntegrity');
      throw wrappedError;
    }
  }

  /**
   * 数据写入接口
   * 统一数据入口
   */
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingestData(
    @Body(ValidationPipe) ingestDto: IngestDataDto,
  ) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Data ingestion request`, {
        stream: ingestDto.stream,
        dataSize: ingestDto.data.length,
        compression: ingestDto.compression,
      });

      // 使用批量写入器，提高性能
      const result = await this.batchWriter.addData(
        ingestDto.stream,
        ingestDto.data,
      );

      // 记录请求指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(true, duration, 200, {
        operation: 'ingestData',
        stream: ingestDto.stream,
        dataSize: ingestDto.data.length.toString(),
      });

      return this.responseWrapperService.createStandardResponse(
        true,
        result,
        'Data ingested successfully',
        requestId,
        {
          operation: 'ingestData',
          stream: ingestDto.stream,
          dataSize: ingestDto.data.length,
          duration,
        }
      );
    } catch (error) {
      // 记录请求指标
      const duration = Date.now() - startTime;
      this.metricsCollector.recordRequest(false, duration, 500, {
        operation: 'ingestData',
        stream: ingestDto.stream,
        dataSize: ingestDto.data.length.toString(),
      });
      
      // 记录错误指标
      this.metricsCollector.recordError('IngestError', error.message, {
        operation: 'ingestData',
        stream: ingestDto.stream,
      });
      
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'ingestData'
      );
      
      this.handleError(error, 'ingestData');
      throw wrappedError;
    }
  }

  /**
   * 专用：邮箱验证数据写入（强校验版本）
   * 使用 IngestEmailVerificationDto 对单条记录字段进行严格校验
   */
  @Post('ingest/email-verification')
  @HttpCode(HttpStatus.OK)
  async ingestEmailVerification(
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    payload: { stream: string; data: IngestEmailVerificationDto[]; compression?: boolean },
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Email verification ingest`, {
        stream: payload.stream,
        dataSize: Array.isArray(payload.data) ? payload.data.length : 0,
        compression: payload.compression,
      });

      const result = await this.openObserveService.ingestData(
        payload.stream,
        payload.data,
        payload.compression,
      );

      return this.responseWrapperService.createStandardResponse(
        true,
        result,
        'Email verification data ingested successfully',
        requestId,
        {
          operation: 'ingestEmailVerification',
          stream: payload.stream,
          dataSize: Array.isArray(payload.data) ? payload.data.length : 0,
        }
      );
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'ingestEmailVerification'
      );
      
      this.handleError(error, 'ingestEmailVerification');
      throw wrappedError;
    }
  }

  /**
   * 数据清理和归档
   * 维护单一真相源的数据质量
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupData(
    @Body(ValidationPipe) cleanupDto: CleanupDataDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Data cleanup request`, {
        stream: cleanupDto.stream,
        retentionDays: cleanupDto.retentionDays,
      });

      const result = await this.openObserveService.cleanupData(
        cleanupDto.stream,
        cleanupDto.retentionDays,
      );

      return this.responseWrapperService.createStandardResponse(
        true,
        result,
        'Data cleanup completed',
        requestId,
        {
          operation: 'cleanupData',
          stream: cleanupDto.stream,
          retentionDays: cleanupDto.retentionDays,
        }
      );
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'cleanupData'
      );
      
      this.handleError(error, 'cleanupData');
      throw wrappedError;
    }
  }

  /**
   * 业务场景示例：用户行为分析
   * 单一真相源的实际应用
   */
  @Get('analytics/user-behavior')
  async getUserBehaviorAnalytics(
    @Query(ValidationPipe) analyticsDto: UserBehaviorAnalyticsDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`User behavior analytics request`, analyticsDto);

      // 使用参数化查询构建器，防止SQL注入
      const query = ParameterizedQueryBuilder.buildUserBehaviorQuery(
        analyticsDto.userId,
        analyticsDto.timeRange,
      );

      const result = await this.openObserveService.querySingleSourceOfTruth(
        ['user_actions', 'products', 'orders', 'user_sessions'],
        query.query,
        `now-${analyticsDto.timeRange}`,
        'now',
      );

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'getUserBehaviorAnalytics',
        userId: analyticsDto.userId,
        timeRange: analyticsDto.timeRange,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getUserBehaviorAnalytics'
      );
      
      this.handleError(error, 'getUserBehaviorAnalytics');
      throw wrappedError;
    }
  }

  /**
   * 业务场景示例：系统性能监控
   */
  @Get('analytics/system-performance')
  async getSystemPerformanceAnalytics(
    @Query(ValidationPipe) analyticsDto: SystemPerformanceAnalyticsDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`System performance analytics request`, analyticsDto);

      // 使用参数化查询构建器，防止SQL注入
      const query = ParameterizedQueryBuilder.buildSystemPerformanceQuery(analyticsDto.timeRange);

      const result = await this.openObserveService.querySingleSourceOfTruth(
        ['http_requests'],
        query.query,
        `now-${analyticsDto.timeRange}`,
        'now',
      );

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'getSystemPerformanceAnalytics',
        timeRange: analyticsDto.timeRange,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getSystemPerformanceAnalytics'
      );
      
      this.handleError(error, 'getSystemPerformanceAnalytics');
      throw wrappedError;
    }
  }

  /**
   * 业务场景示例：安全事件分析
   */
  @Get('analytics/security-events')
  async getSecurityEventsAnalytics(
    @Query(ValidationPipe) analyticsDto: SecurityEventsAnalyticsDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Security events analytics request`, analyticsDto);

      // 使用参数化查询构建器，防止SQL注入
      const query = ParameterizedQueryBuilder.buildSecurityEventsQuery(
        analyticsDto.severity,
        analyticsDto.timeRange,
      );

      const result = await this.openObserveService.querySingleSourceOfTruth(
        ['security_events'],
        query.query,
        `now-${analyticsDto.timeRange}`,
        'now',
      );

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'getSecurityEventsAnalytics',
        severity: analyticsDto.severity,
        timeRange: analyticsDto.timeRange,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getSecurityEventsAnalytics'
      );
      
      this.handleError(error, 'getSecurityEventsAnalytics');
      throw wrappedError;
    }
  }

  /**
   * 业务场景示例：业务指标聚合
   */
  @Get('analytics/business-metrics')
  async getBusinessMetricsAnalytics(
    @Query(ValidationPipe) analyticsDto: BusinessMetricsAnalyticsDto,
  ) {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Business metrics analytics request`, analyticsDto);

      // 使用参数化查询构建器，防止SQL注入
      const query = ParameterizedQueryBuilder.buildBusinessMetricsQuery(analyticsDto.timeRange);

      const result = await this.openObserveService.querySingleSourceOfTruth(
        ['business_events'],
        query.query,
        `now-${analyticsDto.timeRange}`,
        'now',
      );

      return this.responseWrapperService.wrapSuccessResponse(result, requestId, {
        operation: 'getBusinessMetricsAnalytics',
        timeRange: analyticsDto.timeRange,
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getBusinessMetricsAnalytics'
      );
      
      this.handleError(error, 'getBusinessMetricsAnalytics');
      throw wrappedError;
    }
  }

  /**
   * 测试连接
   */
  @Get('test-connection')
  async testConnection() {
    const requestId = this.generateRequestId();
    
    try {
      this.logger.debug(`Connection test request`);

      const result = await this.openObserveService.testConnection();

      return this.responseWrapperService.createStandardResponse(
        true,
        result,
        'Connection test successful',
        requestId,
        {
          operation: 'testConnection',
          responseTime: result.responseTime,
        }
      );
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'testConnection'
      );
      
      this.handleError(error, 'testConnection');
      throw wrappedError;
    }
  }

  /**
   * 获取错误统计
   */
  @Get('error-stats')
  async getErrorStats() {
    const requestId = this.generateRequestId();
    
    try {
      const stats = this.openObserveService.getErrorStats();

      return this.responseWrapperService.wrapSuccessResponse(stats, requestId, {
        operation: 'getErrorStats',
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getErrorStats'
      );
      
      this.handleError(error, 'getErrorStats');
      throw wrappedError;
    }
  }

  /**
   * 重置错误统计
   */
  @Post('reset-error-stats')
  @HttpCode(HttpStatus.OK)
  async resetErrorStats() {
    const requestId = this.generateRequestId();
    
    try {
      this.openObserveService.resetErrorStats();

      return this.responseWrapperService.createStandardResponse(
        true,
        null,
        'Error statistics reset successfully',
        requestId,
        {
          operation: 'resetErrorStats',
        }
      );
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'resetErrorStats'
      );
      
      this.handleError(error, 'resetErrorStats');
      throw wrappedError;
    }
  }

  /**
   * 获取模块状态
   */
  @Get('status')
  async getModuleStatus() {
    const requestId = this.generateRequestId();
    
    try {
      // 返回基本状态信息
      const status = {
        apiVersion: 'v2',
        status: 'active',
        timestamp: new Date().toISOString(),
        features: {
          query: true,
          ingest: true,
          analytics: true,
          healthCheck: true,
          errorStats: true,
          responseWrapper: true,
        },
      };

      return this.responseWrapperService.wrapSuccessResponse(status, requestId, {
        operation: 'getModuleStatus',
      });
    } catch (error) {
      const wrappedError = this.responseWrapperService.wrapErrorResponse(
        error, 
        requestId, 
        'getModuleStatus'
      );
      
      this.handleError(error, 'getModuleStatus');
      throw wrappedError;
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, operation: string): never {
    this.logger.error(`Operation ${operation} failed`, {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
    });

    if (error instanceof OpenObserveError) {
      throw error;
    }

    throw OpenObserveError.fromAxiosError(error, { operation });
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
