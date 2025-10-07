import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CircuitBreakerService, CircuitBreakerState } from './circuit-breaker.service';
import { TracingService } from '../tracing/tracing.service';

/**
 * 设置熔断器状态的请求体
 */
export class SetCircuitBreakerStateDto {
  /** 目标状态 */
  state: 'open' | 'close';

  /** 操作原因 */
  reason?: string;
}

/**
 * 创建熔断器的请求体
 */
export class CreateCircuitBreakerDto {
  /** 熔断器名称 */
  name: string;

  /** 失败阈值 */
  failureThreshold?: number;

  /** 成功阈值 */
  successThreshold?: number;

  /** 超时时间 */
  timeout?: number;

  /** 重置时间 */
  resetTimeout?: number;

  /** 监控窗口 */
  monitoringPeriod?: number;

  /** 最小调用数 */
  minimumNumberOfCalls?: number;

  /** 慢调用阈值 */
  slowCallDurationThreshold?: number;

  /** 慢调用比例阈值 */
  slowCallRateThreshold?: number;
}

/**
 * 熔断器管理控制器
 */
@ApiTags('熔断器管理')
@Controller('api/circuit-breaker')
export class CircuitBreakerController {
  private readonly logger = new Logger(CircuitBreakerController.name);

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly tracingService: TracingService,
  ) {}

  /**
   * 获取所有熔断器状态
   */
  @Get('status')
  @ApiOperation({ summary: '获取所有熔断器状态' })
  @ApiResponse({ status: 200, description: '成功获取熔断器状态列表' })
  async getAllCircuitBreakers() {
    const span = this.tracingService.startSpan('get-all-circuit-breakers');

    try {
      const circuitBreakers = this.circuitBreakerService.getAllCircuitBreakers();

      span?.setAttributes({
        'circuit-breaker.count': circuitBreakers.length,
      });

      return {
        status: HttpStatus.OK,
        message: '成功获取熔断器状态',
        data: {
          circuitBreakers,
          summary: {
            total: circuitBreakers.length,
            open: circuitBreakers.filter(cb => cb.state === CircuitBreakerState.OPEN).length,
            halfOpen: circuitBreakers.filter(cb => cb.state === CircuitBreakerState.HALF_OPEN)
              .length,
            closed: circuitBreakers.filter(cb => cb.state === CircuitBreakerState.CLOSED).length,
          },
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      this.logger.error('获取熔断器状态失败', error.stack);
      throw new HttpException('获取熔断器状态失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 获取特定熔断器状态
   */
  @Get(':name/status')
  @ApiOperation({ summary: '获取特定熔断器状态' })
  @ApiParam({ name: 'name', description: '熔断器名称' })
  @ApiResponse({ status: 200, description: '成功获取熔断器状态' })
  @ApiResponse({ status: 404, description: '熔断器不存在' })
  async getCircuitBreakerStatus(@Param('name') name: string) {
    const span = this.tracingService.startSpan('get-circuit-breaker-status');
    span?.setAttributes({ 'circuit-breaker.name': name });

    try {
      const status = this.circuitBreakerService.getCircuitBreakerStatus(name);

      if (!status) {
        throw new HttpException(`熔断器 ${name} 不存在`, HttpStatus.NOT_FOUND);
      }

      return {
        status: HttpStatus.OK,
        message: '成功获取熔断器状态',
        data: status,
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`获取熔断器 ${name} 状态失败`, error.stack);
      throw new HttpException('获取熔断器状态失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 设置熔断器状态
   */
  @Post(':name/state')
  @ApiOperation({ summary: '设置熔断器状态' })
  @ApiParam({ name: 'name', description: '熔断器名称' })
  @ApiBody({ type: SetCircuitBreakerStateDto })
  @ApiResponse({ status: 200, description: '成功设置熔断器状态' })
  @ApiResponse({ status: 404, description: '熔断器不存在' })
  async setCircuitBreakerState(
    @Param('name') name: string,
    @Body() dto: SetCircuitBreakerStateDto,
  ) {
    const span = this.tracingService.startSpan('set-circuit-breaker-state');
    span?.setAttributes({
      'circuit-breaker.name': name,
      'circuit-breaker.target-state': dto.state,
    });

    try {
      const success = this.circuitBreakerService.setCircuitBreakerState(name, dto.state);

      if (!success) {
        throw new HttpException(`熔断器 ${name} 不存在`, HttpStatus.NOT_FOUND);
      }

      this.logger.log(
        `手动设置熔断器 ${name} 状态为 ${dto.state}，原因: ${dto.reason || '未提供'}`,
      );

      return {
        status: HttpStatus.OK,
        message: `成功设置熔断器状态为 ${dto.state}`,
        data: {
          name,
          state: dto.state,
          reason: dto.reason,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`设置熔断器 ${name} 状态失败`, error.stack);
      throw new HttpException('设置熔断器状态失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 清除熔断器历史
   */
  @Delete(':name/history')
  @ApiOperation({ summary: '清除熔断器历史记录' })
  @ApiParam({ name: 'name', description: '熔断器名称' })
  @ApiResponse({ status: 200, description: '成功清除历史记录' })
  @ApiResponse({ status: 404, description: '熔断器不存在' })
  async clearCircuitBreakerHistory(@Param('name') name: string) {
    const span = this.tracingService.startSpan('clear-circuit-breaker-history');
    span?.setAttributes({ 'circuit-breaker.name': name });

    try {
      const success = this.circuitBreakerService.clearCircuitBreakerHistory(name);

      if (!success) {
        throw new HttpException(`熔断器 ${name} 不存在`, HttpStatus.NOT_FOUND);
      }

      this.logger.log(`清除熔断器 ${name} 历史记录`);

      return {
        status: HttpStatus.OK,
        message: '成功清除熔断器历史记录',
        data: {
          name,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`清除熔断器 ${name} 历史记录失败`, error.stack);
      throw new HttpException('清除熔断器历史记录失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 删除熔断器
   */
  @Delete(':name')
  @ApiOperation({ summary: '删除熔断器' })
  @ApiParam({ name: 'name', description: '熔断器名称' })
  @ApiResponse({ status: 200, description: '成功删除熔断器' })
  @ApiResponse({ status: 404, description: '熔断器不存在' })
  async removeCircuitBreaker(@Param('name') name: string) {
    const span = this.tracingService.startSpan('remove-circuit-breaker');
    span?.setAttributes({ 'circuit-breaker.name': name });

    try {
      const success = this.circuitBreakerService.removeCircuitBreaker(name);

      if (!success) {
        throw new HttpException(`熔断器 ${name} 不存在`, HttpStatus.NOT_FOUND);
      }

      this.logger.log(`删除熔断器 ${name}`);

      return {
        status: HttpStatus.OK,
        message: '成功删除熔断器',
        data: {
          name,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`删除熔断器 ${name} 失败`, error.stack);
      throw new HttpException('删除熔断器失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 获取系统健康状态
   */
  @Get('health')
  @ApiOperation({ summary: '获取熔断器系统健康状态' })
  @ApiResponse({ status: 200, description: '成功获取健康状态' })
  async getHealthStatus() {
    const span = this.tracingService.startSpan('get-circuit-breaker-health');

    try {
      const health = this.circuitBreakerService.getHealthStatus();

      span?.setAttributes({
        'circuit-breaker.health-score': health.healthScore,
        'circuit-breaker.total': health.totalCircuitBreakers,
        'circuit-breaker.open': health.openCircuitBreakers,
      });

      // 根据健康分数确定状态
      let healthStatus = 'healthy';
      if (health.healthScore < 50) {
        healthStatus = 'critical';
      } else if (health.healthScore < 80) {
        healthStatus = 'warning';
      }

      return {
        status: HttpStatus.OK,
        message: '成功获取健康状态',
        data: {
          ...health,
          healthStatus,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      this.logger.error('获取健康状态失败', error.stack);
      throw new HttpException('获取健康状态失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 获取熔断器统计信息
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取熔断器统计信息' })
  @ApiQuery({ name: 'period', description: '统计周期(hours)', required: false })
  @ApiResponse({ status: 200, description: '成功获取统计信息' })
  async getStatistics(@Query('period') period?: string) {
    const span = this.tracingService.startSpan('get-circuit-breaker-statistics');

    try {
      const circuitBreakers = this.circuitBreakerService.getAllCircuitBreakers();
      const periodHours = period ? parseInt(period) : 24;

      // 计算统计信息
      const statistics = {
        totalCircuitBreakers: circuitBreakers.length,
        stateDistribution: {
          closed: circuitBreakers.filter(cb => cb.state === CircuitBreakerState.CLOSED).length,
          open: circuitBreakers.filter(cb => cb.state === CircuitBreakerState.OPEN).length,
          halfOpen: circuitBreakers.filter(cb => cb.state === CircuitBreakerState.HALF_OPEN).length,
        },
        performanceMetrics: {
          totalCalls: circuitBreakers.reduce((sum, cb) => sum + cb.stats.totalCalls, 0),
          successfulCalls: circuitBreakers.reduce((sum, cb) => sum + cb.stats.successfulCalls, 0),
          failedCalls: circuitBreakers.reduce((sum, cb) => sum + cb.stats.failedCalls, 0),
          slowCalls: circuitBreakers.reduce((sum, cb) => sum + cb.stats.slowCalls, 0),
          averageFailureRate:
            circuitBreakers.length > 0
              ? circuitBreakers.reduce((sum, cb) => sum + cb.stats.failureRate, 0) /
                circuitBreakers.length
              : 0,
          averageResponseTime:
            circuitBreakers.length > 0
              ? circuitBreakers.reduce((sum, cb) => sum + cb.stats.averageResponseTime, 0) /
                circuitBreakers.length
              : 0,
        },
        topFailingCircuitBreakers: circuitBreakers
          .filter(cb => cb.stats.failureRate > 0)
          .sort((a, b) => b.stats.failureRate - a.stats.failureRate)
          .slice(0, 5)
          .map(cb => ({
            name: cb.name,
            failureRate: cb.stats.failureRate,
            totalCalls: cb.stats.totalCalls,
            state: cb.state,
          })),
        period: `${periodHours} hours`,
        timestamp: new Date().toISOString(),
      };

      span?.setAttributes({
        'statistics.total-circuit-breakers': statistics.totalCircuitBreakers,
        'statistics.total-calls': statistics.performanceMetrics.totalCalls,
        'statistics.average-failure-rate': statistics.performanceMetrics.averageFailureRate,
      });

      return {
        status: HttpStatus.OK,
        message: '成功获取统计信息',
        data: statistics,
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      this.logger.error('获取统计信息失败', error.stack);
      throw new HttpException('获取统计信息失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      span?.end();
    }
  }

  /**
   * 测试熔断器
   */
  @Post(':name/test')
  @ApiOperation({ summary: '测试熔断器功能' })
  @ApiParam({ name: 'name', description: '熔断器名称' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        simulateFailure: { type: 'boolean', description: '是否模拟失败' },
        delay: { type: 'number', description: '模拟延迟(ms)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '测试执行成功' })
  async testCircuitBreaker(
    @Param('name') name: string,
    @Body() body: { simulateFailure?: boolean; delay?: number },
  ) {
    const span = this.tracingService.startSpan('test-circuit-breaker');
    span?.setAttributes({
      'circuit-breaker.name': name,
      'test.simulate-failure': body.simulateFailure || false,
      'test.delay': body.delay || 0,
    });

    try {
      const testFunction = async () => {
        // 模拟延迟
        if (body.delay && body.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, body.delay));
        }

        // 模拟失败
        if (body.simulateFailure) {
          throw new Error('模拟的测试失败');
        }

        return { success: true, message: '测试成功', timestamp: new Date().toISOString() };
      };

      const result = await this.circuitBreakerService.executeWithCircuitBreaker(name, testFunction);

      return {
        status: HttpStatus.OK,
        message: '熔断器测试完成',
        data: {
          circuitBreakerName: name,
          testResult: result,
          circuitBreakerStatus: this.circuitBreakerService.getCircuitBreakerStatus(name),
        },
      };
    } catch (error) {
      span?.recordException(error);
      span?.setStatus({ code: 2, message: error.message });

      // 测试失败是预期的，返回测试结果
      return {
        status: HttpStatus.OK,
        message: '熔断器测试完成（预期失败）',
        data: {
          circuitBreakerName: name,
          testResult: { success: false, error: error.message },
          circuitBreakerStatus: this.circuitBreakerService.getCircuitBreakerStatus(name),
        },
      };
    } finally {
      span?.end();
    }
  }
}
