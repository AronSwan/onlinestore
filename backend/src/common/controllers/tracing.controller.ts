import { Controller, Get, Post, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TracingService } from '../tracing/tracing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../auth/enums/role.enum';
import { ApiResponseDto } from '../dto/api-response.dto';
import { trace, SpanKind } from '@opentelemetry/api';

/**
 * 追踪统计信息DTO
 */
export class TracingStatsDto {
  activeSpans: number;
  serviceName: string;
  environment: string;
  totalTraces?: number;
  averageLatency?: number;
  errorRate?: number;
}

/**
 * 追踪健康状态DTO
 */
export class TracingHealthDto {
  status: 'healthy' | 'degraded' | 'unhealthy';
  exporterStatus: {
    jaeger?: 'connected' | 'disconnected' | 'error';
    zipkin?: 'connected' | 'disconnected' | 'error';
    console?: 'enabled' | 'disabled';
  };
  lastExportTime?: Date;
  pendingSpans?: number;
  errors?: string[];
}

/**
 * 分布式追踪控制器
 * 提供追踪系统的监控和管理接口
 */
@ApiTags('Tracing')
@Controller('api/tracing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TracingController {
  constructor(private readonly tracingService: TracingService) {}

  /**
   * 获取追踪统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取追踪统计信息' })
  @ApiResponse({
    status: 200,
    description: '追踪统计信息',
    type: ApiResponseDto,
  })
  async getTracingStats(): Promise<ApiResponseDto<TracingStatsDto>> {
    const stats = this.tracingService.getTracingStats();

    // 添加额外的统计信息
    const enhancedStats: TracingStatsDto = {
      ...stats,
      totalTraces: 0, // 这里需要实际的统计逻辑
      averageLatency: 0, // 这里需要实际的统计逻辑
      errorRate: 0, // 这里需要实际的统计逻辑
    };

    return {
      code: 200,
      data: enhancedStats,
      message: '追踪统计信息获取成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取追踪健康状态
   */
  @Get('health')
  @ApiOperation({ summary: '获取追踪系统健康状态' })
  @ApiResponse({
    status: 200,
    description: '追踪系统健康状态',
    type: ApiResponseDto,
  })
  async getTracingHealth(): Promise<ApiResponseDto<TracingHealthDto>> {
    // 检查追踪系统健康状态
    const health: TracingHealthDto = {
      status: 'healthy',
      exporterStatus: {
        jaeger: 'connected', // 这里需要实际的检查逻辑
        zipkin: 'disconnected',
        console: 'enabled',
      },
      lastExportTime: new Date(),
      pendingSpans: 0,
      errors: [],
    };

    // 根据导出器状态确定整体健康状态
    const hasErrors = Object.values(health.exporterStatus).some(
      status => status === 'error' || status === 'disconnected',
    );

    if (hasErrors) {
      health.status = 'degraded';
    }

    return {
      code: 200,
      data: health,
      message: '追踪系统健康状态获取成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建测试追踪
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '创建测试追踪' })
  @ApiQuery({ name: 'operation', required: false, description: '测试操作名称' })
  @ApiResponse({
    status: 200,
    description: '测试追踪创建成功',
    type: ApiResponseDto,
  })
  async createTestTrace(
    @Query('operation') operation = 'test-operation',
  ): Promise<ApiResponseDto<{ traceId: string; spanId: string }>> {
    return this.tracingService.trace(
      `Test ${operation}`,
      async span => {
        // 模拟一些业务操作
        span.setAttributes({
          'test.operation': operation,
          'test.timestamp': new Date().toISOString(),
          'test.random': Math.random(),
        });

        // 添加事件
        span.addEvent('Test operation started');

        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 100));

        // 创建子Span
        const childSpan = this.tracingService.createChildSpan('Child Operation', span, {
          'child.operation': 'data-processing',
        });

        await this.tracingService.withSpan(childSpan, async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          childSpan.addEvent('Child operation completed');
        });

        span.addEvent('Test operation completed');

        const spanContext = span.spanContext();
        return {
          code: 200,
          data: {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
          },
          message: '测试追踪创建成功',
          timestamp: new Date().toISOString(),
        };
      },
      {
        'test.type': 'manual',
        'test.controller': 'TracingController',
      },
      SpanKind.SERVER,
    );
  }

  /**
   * 创建批量测试追踪
   */
  @Post('test/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '创建批量测试追踪' })
  @ApiQuery({ name: 'count', required: false, description: '测试追踪数量' })
  @ApiResponse({
    status: 200,
    description: '批量测试追踪创建成功',
    type: ApiResponseDto,
  })
  async createBatchTestTraces(
    @Query('count') count = '3',
  ): Promise<ApiResponseDto<{ traces: Array<{ traceId: string; spanId: string }> }>> {
    const traceCount = Math.min(parseInt(count, 10), 10); // 限制最大数量

    const operations = Array.from({ length: traceCount }, (_, i) => ({
      name: `Batch Test ${i + 1}`,
      fn: async (span: any) => {
        span.setAttributes({
          'batch.index': i + 1,
          'batch.total': traceCount,
        });

        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));

        const spanContext = span.spanContext();
        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };
      },
      attributes: {
        'test.type': 'batch',
        'test.batch.size': traceCount,
      },
    }));

    const results = await this.tracingService.traceBatch(operations);

    return {
      code: 200,
      data: { traces: results },
      message: `批量测试追踪创建成功，共 ${traceCount} 个`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取当前追踪上下文
   */
  @Get('context')
  @ApiOperation({ summary: '获取当前追踪上下文' })
  @ApiResponse({
    status: 200,
    description: '当前追踪上下文',
    type: ApiResponseDto,
  })
  async getCurrentTraceContext(): Promise<ApiResponseDto<any>> {
    const traceContext = this.tracingService.getCurrentTraceContext();

    if (!traceContext) {
      return {
        code: 404,
        data: null,
        message: '当前没有活跃的追踪上下文',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      code: 200,
      data: traceContext,
      message: '追踪上下文获取成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 测试异常追踪
   */
  @Post('test/error')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试异常追踪' })
  @ApiQuery({ name: 'errorType', required: false, description: '错误类型' })
  @ApiResponse({
    status: 200,
    description: '异常追踪测试完成',
    type: ApiResponseDto,
  })
  async testErrorTracing(
    @Query('errorType') errorType = 'business',
  ): Promise<ApiResponseDto<{ traceId: string; error: string }>> {
    try {
      return await this.tracingService.trace(
        'Error Test',
        async span => {
          span.setAttributes({
            'test.error.type': errorType,
            'test.error.intentional': true,
          });

          // 根据错误类型抛出不同的异常
          switch (errorType) {
            case 'business':
              throw new Error('Business logic error for testing');
            case 'validation':
              throw new Error('Validation error for testing');
            case 'database':
              throw new Error('Database connection error for testing');
            default:
              throw new Error('Generic error for testing');
          }
        },
        { 'test.type': 'error' },
      );
    } catch (error) {
      // 捕获异常并返回追踪信息
      const currentContext = this.tracingService.getCurrentTraceContext();

      return {
        code: 200,
        data: {
          traceId: currentContext?.traceId || 'unknown',
          error: error.message,
        },
        message: '异常追踪测试完成',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
