import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TracingService } from '../tracing/tracing.service';

/**
 * 熔断器状态枚举
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // 关闭状态：正常工作
  OPEN = 'OPEN', // 开启状态：熔断中
  HALF_OPEN = 'HALF_OPEN', // 半开状态：尝试恢复
}

/**
 * 熔断器配置接口
 */
export interface CircuitBreakerConfig {
  /** 失败阈值 */
  failureThreshold: number;
  /** 成功阈值（半开状态下） */
  successThreshold: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重置时间（毫秒） */
  resetTimeout: number;
  /** 监控窗口大小 */
  monitoringPeriod: number;
  /** 最小请求数 */
  minimumNumberOfCalls: number;
  /** 慢调用阈值（毫秒） */
  slowCallDurationThreshold: number;
  /** 慢调用比例阈值 */
  slowCallRateThreshold: number;
}

/**
 * 熔断器统计信息
 */
export interface CircuitBreakerStats {
  /** 总调用次数 */
  totalCalls: number;
  /** 成功次数 */
  successfulCalls: number;
  /** 失败次数 */
  failedCalls: number;
  /** 慢调用次数 */
  slowCalls: number;
  /** 失败率 */
  failureRate: number;
  /** 慢调用率 */
  slowCallRate: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 最后失败时间 */
  lastFailureTime?: Date;
  /** 最后成功时间 */
  lastSuccessTime?: Date;
}

/**
 * 调用结果
 */
export interface CallResult {
  /** 是否成功 */
  success: boolean;
  /** 响应时间 */
  responseTime: number;
  /** 错误信息 */
  error?: Error;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 熔断器实例
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;
  private callHistory: CallResult[] = [];
  private readonly logger = new Logger(`CircuitBreaker:${this.name}`);

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig,
    private readonly tracingService?: TracingService,
  ) {}

  /**
   * 执行受保护的调用
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    const span = this.tracingService?.startSpan(`circuit-breaker-${this.name}`);

    try {
      // 检查熔断器状态
      if (this.state === CircuitBreakerState.OPEN) {
        if (this.canAttemptReset()) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.logger.log(`熔断器 ${this.name} 进入半开状态`);
        } else {
          const error = new Error(`熔断器 ${this.name} 处于开启状态，拒绝调用`);
          span?.recordException(error);
          span?.setStatus({ code: 2, message: error.message });
          throw error;
        }
      }

      const startTime = Date.now();
      let result: T;
      let callSuccess = true;
      let error: Error | undefined;

      try {
        // 执行实际调用
        result = (await Promise.race([fn(), this.createTimeoutPromise()])) as T;
      } catch (err) {
        callSuccess = false;
        error = err instanceof Error ? err : new Error(String(err));
        throw error;
      } finally {
        const responseTime = Date.now() - startTime;
        const callResult: CallResult = {
          success: callSuccess,
          responseTime,
          error,
          timestamp: new Date(),
        };

        this.recordCall(callResult);
        span?.setAttributes({
          'circuit-breaker.name': this.name,
          'circuit-breaker.state': this.state,
          'circuit-breaker.success': callSuccess,
          'circuit-breaker.response-time': responseTime,
        });
      }

      return result!;
    } finally {
      span?.end();
    }
  }

  /**
   * 记录调用结果
   */
  private recordCall(result: CallResult): void {
    this.callHistory.push(result);

    // 保持历史记录在监控窗口内
    const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);
    this.callHistory = this.callHistory.filter(call => call.timestamp > cutoffTime);

    if (result.success) {
      this.onSuccess();
    } else {
      this.onFailure();
    }
  }

  /**
   * 处理成功调用
   */
  private onSuccess(): void {
    this.lastFailureTime = undefined;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    }
  }

  /**
   * 处理失败调用
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.open();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      const stats = this.getStats();

      // 检查是否达到熔断条件
      if (this.shouldTrip(stats)) {
        this.open();
      }
    }
  }

  /**
   * 检查是否应该触发熔断
   */
  private shouldTrip(stats: CircuitBreakerStats): boolean {
    // 检查最小调用数
    if (stats.totalCalls < this.config.minimumNumberOfCalls) {
      return false;
    }

    // 检查失败率
    if (stats.failureRate >= this.config.failureThreshold) {
      return true;
    }

    // 检查慢调用率
    if (stats.slowCallRate >= this.config.slowCallRateThreshold) {
      return true;
    }

    return false;
  }

  /**
   * 开启熔断器
   */
  private open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    this.logger.warn(`熔断器 ${this.name} 已开启，将在 ${this.config.resetTimeout}ms 后尝试恢复`);
  }

  /**
   * 重置熔断器
   */
  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = undefined;
    this.logger.log(`熔断器 ${this.name} 已重置为关闭状态`);
  }

  /**
   * 检查是否可以尝试重置
   */
  private canAttemptReset(): boolean {
    return this.nextAttempt ? Date.now() >= this.nextAttempt.getTime() : false;
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`调用超时：${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): CircuitBreakerStats {
    const recentCalls = this.callHistory;
    const totalCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter(call => call.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const slowCalls = recentCalls.filter(
      call => call.responseTime > this.config.slowCallDurationThreshold,
    ).length;

    const failureRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;
    const slowCallRate = totalCalls > 0 ? (slowCalls / totalCalls) * 100 : 0;
    const averageResponseTime =
      totalCalls > 0
        ? recentCalls.reduce((sum, call) => sum + call.responseTime, 0) / totalCalls
        : 0;

    const lastFailure = recentCalls.filter(call => !call.success).pop();
    const lastSuccess = recentCalls.filter(call => call.success).pop();

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      slowCalls,
      failureRate,
      slowCallRate,
      averageResponseTime,
      lastFailureTime: lastFailure?.timestamp,
      lastSuccessTime: lastSuccess?.timestamp,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 获取熔断器名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 手动开启熔断器
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * 手动关闭熔断器
   */
  forceClose(): void {
    this.reset();
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.callHistory = [];
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * 熔断器管理服务
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: CircuitBreakerConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracingService: TracingService,
  ) {
    this.defaultConfig = {
      failureThreshold: this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 50),
      successThreshold: this.configService.get<number>('CIRCUIT_BREAKER_SUCCESS_THRESHOLD', 3),
      timeout: this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 5000),
      resetTimeout: this.configService.get<number>('CIRCUIT_BREAKER_RESET_TIMEOUT', 60000),
      monitoringPeriod: this.configService.get<number>('CIRCUIT_BREAKER_MONITORING_PERIOD', 60000),
      minimumNumberOfCalls: this.configService.get<number>('CIRCUIT_BREAKER_MIN_CALLS', 10),
      slowCallDurationThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_SLOW_CALL_THRESHOLD',
        3000,
      ),
      slowCallRateThreshold: this.configService.get<number>('CIRCUIT_BREAKER_SLOW_CALL_RATE', 50),
    };

    this.logger.log('熔断器服务已初始化');
  }

  /**
   * 获取或创建熔断器
   */
  getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const finalConfig = { ...this.defaultConfig, ...config };
      const circuitBreaker = new CircuitBreaker(name, finalConfig, this.tracingService);
      this.circuitBreakers.set(name, circuitBreaker);
      this.logger.log(`创建熔断器: ${name}`);
    }

    return this.circuitBreakers.get(name)!;
  }

  /**
   * 执行受保护的调用
   */
  async executeWithCircuitBreaker<T>(
    name: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(name, config);
    return circuitBreaker.call(fn);
  }

  /**
   * 获取所有熔断器状态
   */
  getAllCircuitBreakers(): Array<{
    name: string;
    state: CircuitBreakerState;
    stats: CircuitBreakerStats;
  }> {
    return Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
      name,
      state: cb.getState(),
      stats: cb.getStats(),
    }));
  }

  /**
   * 获取特定熔断器状态
   */
  getCircuitBreakerStatus(name: string): {
    name: string;
    state: CircuitBreakerState;
    stats: CircuitBreakerStats;
  } | null {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (!circuitBreaker) {
      return null;
    }

    return {
      name,
      state: circuitBreaker.getState(),
      stats: circuitBreaker.getStats(),
    };
  }

  /**
   * 手动控制熔断器状态
   */
  setCircuitBreakerState(name: string, state: 'open' | 'close'): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (!circuitBreaker) {
      return false;
    }

    if (state === 'open') {
      circuitBreaker.forceOpen();
    } else {
      circuitBreaker.forceClose();
    }

    this.logger.log(`手动设置熔断器 ${name} 状态为: ${state}`);
    return true;
  }

  /**
   * 清除熔断器历史
   */
  clearCircuitBreakerHistory(name: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (!circuitBreaker) {
      return false;
    }

    circuitBreaker.clearHistory();
    this.logger.log(`清除熔断器 ${name} 历史记录`);
    return true;
  }

  /**
   * 删除熔断器
   */
  removeCircuitBreaker(name: string): boolean {
    const removed = this.circuitBreakers.delete(name);
    if (removed) {
      this.logger.log(`删除熔断器: ${name}`);
    }
    return removed;
  }

  /**
   * 定期清理过期数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  private cleanupExpiredData(): void {
    this.logger.debug('开始清理熔断器过期数据');

    for (const [name, circuitBreaker] of this.circuitBreakers) {
      const stats = circuitBreaker.getStats();

      // 如果熔断器长时间没有调用，考虑清理
      if (
        stats.totalCalls === 0 &&
        (!stats.lastSuccessTime ||
          Date.now() - stats.lastSuccessTime.getTime() > 24 * 60 * 60 * 1000)
      ) {
        this.logger.debug(`清理长时间未使用的熔断器: ${name}`);
        this.circuitBreakers.delete(name);
      }
    }
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus(): {
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
    halfOpenCircuitBreakers: number;
    closedCircuitBreakers: number;
    healthScore: number;
  } {
    const all = this.getAllCircuitBreakers();
    const total = all.length;
    const open = all.filter(cb => cb.state === CircuitBreakerState.OPEN).length;
    const halfOpen = all.filter(cb => cb.state === CircuitBreakerState.HALF_OPEN).length;
    const closed = all.filter(cb => cb.state === CircuitBreakerState.CLOSED).length;

    // 健康分数：关闭状态的熔断器比例
    const healthScore = total > 0 ? (closed / total) * 100 : 100;

    return {
      totalCircuitBreakers: total,
      openCircuitBreakers: open,
      halfOpenCircuitBreakers: halfOpen,
      closedCircuitBreakers: closed,
      healthScore,
    };
  }
}
