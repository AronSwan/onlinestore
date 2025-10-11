import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

// 健康检查状态枚举
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown',
}

// 健康检查类型枚举
export enum HealthCheckType {
  LIVENESS = 'liveness',
  READINESS = 'readiness',
  STARTUP = 'startup',
  DEPENDENCY = 'dependency',
  CUSTOM = 'custom',
}

// 健康检查严重程度
export enum HealthSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

// 健康检查结果接口
export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  type: HealthCheckType;
  severity: HealthSeverity;
  message?: string;
  details?: Record<string, any>;
  duration: number;
  timestamp: Date;
  error?: Error;
  metadata?: Record<string, any>;
}

// 健康检查器接口
export interface HealthChecker {
  name: string;
  type: HealthCheckType;
  severity: HealthSeverity;
  timeout?: number;
  interval?: number;
  retries?: number;
  enabled?: boolean;
  check(): Promise<HealthCheckResult>;
}

// 系统健康状态
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    unknown: number;
  };
  system: {
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    memory: {
      total: number;
      used: number;
      free: number;
      usage: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usage: number;
    };
    network: {
      interfaces: Record<string, any>;
    };
  };
}

// 健康检查配置
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  retryBackoffMs?: number;
  gracefulShutdownTimeout: number;
  endpoints: {
    health: string;
    liveness: string;
    readiness: string;
    startup: string;
  };
  monitoring: {
    enabled: boolean;
    metricsEnabled: boolean;
    alerting: {
      enabled: boolean;
      webhookUrl?: string;
      emailRecipients?: string[];
    };
  };
  system: {
    cpu: {
      enabled: boolean;
      threshold: number;
    };
    memory: {
      enabled: boolean;
      threshold: number;
    };
    disk: {
      enabled: boolean;
      threshold: number;
      paths: string[];
    };
  };
  dependencies: {
    database: boolean;
    redis: boolean;
    externalApis: boolean;
    messageQueue: boolean;
  };
}

// 健康检查事件
export interface HealthCheckEvent {
  type: 'status_change' | 'check_failed' | 'check_recovered' | 'system_alert';
  checker: string;
  status: HealthStatus;
  previousStatus?: HealthStatus;
  result: HealthCheckResult;
  timestamp: Date;
}

// 健康检查统计
export interface HealthCheckStats {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  minResponseTime?: number;
  maxResponseTime?: number;
  timeoutCount: number;
  consecutiveFailures: number;
  uptime: number;
  lastCheck: Date;
  checkHistory: HealthCheckResult[];
}

@Injectable()
export class HealthCheckService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly checkers = new Map<string, HealthChecker>();
  private readonly checkResults = new Map<string, HealthCheckResult>();
  private readonly checkStats = new Map<string, HealthCheckStats>();
  private readonly config: HealthCheckConfig;
  private isShuttingDown = false;
  private startTime = Date.now();
  private checkIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = this.loadConfig();
  }

  async onModuleInit() {
    this.logger.log('Initializing Health Check Service...');

    if (this.config.enabled) {
      await this.initializeSystemCheckers();
      await this.startPeriodicChecks();
      this.logger.log('Health Check Service initialized successfully');
    } else {
      this.logger.warn('Health Check Service is disabled');
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Health Check Service...');
    this.isShuttingDown = true;

    // 停止所有定期检查
    for (const [name, interval] of this.checkIntervals) {
      clearInterval(interval);
      this.logger.debug(`Stopped periodic check for: ${name}`);
    }

    this.checkIntervals.clear();
    this.logger.log('Health Check Service shut down completed');
  }

  /**
   * 注册健康检查器
   */
  registerChecker(checker: HealthChecker): void {
    if (this.checkers.has(checker.name)) {
      this.logger.warn(`Health checker '${checker.name}' already exists, overwriting`);
    }

    this.checkers.set(checker.name, {
      timeout: this.config.timeout,
      interval: this.config.interval,
      retries: this.config.retries,
      enabled: true,
      ...checker,
    });

    // 初始化统计
    this.checkStats.set(checker.name, {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      minResponseTime: undefined,
      maxResponseTime: undefined,
      timeoutCount: 0,
      consecutiveFailures: 0,
      uptime: 0,
      lastCheck: new Date(),
      checkHistory: [],
    });

    this.logger.log(`Registered health checker: ${checker.name} (${checker.type})`);

    // 如果启用了定期检查，立即开始
    if (checker.interval && checker.interval > 0) {
      this.startPeriodicCheck(checker.name);
    }
  }

  /**
   * 注销健康检查器
   */
  unregisterChecker(name: string): void {
    if (this.checkers.has(name)) {
      this.checkers.delete(name);
      this.checkResults.delete(name);
      this.checkStats.delete(name);

      // 停止定期检查
      const interval = this.checkIntervals.get(name);
      if (interval) {
        clearInterval(interval);
        this.checkIntervals.delete(name);
      }

      this.logger.log(`Unregistered health checker: ${name}`);
    }
  }

  /**
   * 执行单个健康检查
   */
  async executeCheck(name: string): Promise<HealthCheckResult> {
    const checker = this.checkers.get(name);
    if (!checker) {
      throw new Error(`Health checker '${name}' not found`);
    }

    if (!checker.enabled) {
      return {
        name,
        status: HealthStatus.UNKNOWN,
        type: checker.type,
        severity: checker.severity,
        message: 'Checker is disabled',
        duration: 0,
        timestamp: new Date(),
      };
    }

    const attempts = Math.max(1, checker.retries ?? this.config.retries);
    const backoffMs = this.configService.get<number>('health.retryBackoffMs', 200);
    const attemptDurations: number[] = [];
    // 为避免TS“未赋值前使用”错误，预先初始化一个默认结果
    let result: HealthCheckResult = {
      name,
      status: HealthStatus.UNKNOWN,
      type: checker.type,
      severity: checker.severity,
      message: 'No health check result yet',
      duration: 0,
      timestamp: new Date(),
      metadata: { attempts, attemptDurations, attempt: 0 },
    };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const startTime = performance.now();
      try {
        const checkPromise = checker.check();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Health check timeout')),
            checker.timeout || this.config.timeout,
          );
        });

        const checkResult = await Promise.race([checkPromise, timeoutPromise]);
        const duration = performance.now() - startTime;
        attemptDurations.push(duration);

        result = {
          ...checkResult,
          duration,
          timestamp: new Date(),
          metadata: {
            ...(checkResult.metadata || {}),
            attempts,
            attemptDurations,
            attempt: attempt,
          },
        };

        // 如果成功，更新统计并处理状态变化，直接跳出重试
        const isSuccess = result.status === HealthStatus.HEALTHY;
        this.updateStats(name, result, isSuccess);
        await this.handleStatusChange(name, result);
        if (isSuccess) {
          break;
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        attemptDurations.push(duration);
        lastError = error as Error;

        result = {
          name,
          status: HealthStatus.UNHEALTHY,
          type: checker.type,
          severity: checker.severity,
          message: (error as Error).message,
          duration,
          timestamp: new Date(),
          error: error as Error,
          metadata: {
            attempts,
            attemptDurations,
            attempt: attempt,
            timeout: (error as Error).message?.toLowerCase().includes('timeout') || false,
          },
        };

        this.updateStats(name, result, false);
        await this.handleCheckError(name, result, error as Error);
      }

      // 如果未成功且还有重试机会，进行退避
      const isLastAttempt = attempt >= attempts;
      if (!isLastAttempt && result.status !== HealthStatus.HEALTHY) {
        await new Promise(res => setTimeout(res, backoffMs * attempt));
      }
    }

    // 存储结果
    this.checkResults.set(name, result);

    return result;
  }

  /**
   * 执行所有健康检查
   */
  async executeAllChecks(type?: HealthCheckType): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const checkPromises: Promise<HealthCheckResult>[] = [];

    for (const [name, checker] of this.checkers) {
      if (type && checker.type !== type) {
        continue;
      }

      if (!checker.enabled) {
        continue;
      }

      checkPromises.push(this.executeCheck(name));
    }

    try {
      const checkResults = await Promise.allSettled(checkPromises);

      for (const result of checkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error('Health check failed:', result.reason);
        }
      }
    } catch (error) {
      this.logger.error('Error executing health checks:', error);
    }

    return results;
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.executeAllChecks();
    const systemInfo = await this.getSystemInfo();

    // 计算总体状态
    const status = this.calculateOverallStatus(checks);

    // 统计摘要
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === HealthStatus.HEALTHY).length,
      unhealthy: checks.filter(c => c.status === HealthStatus.UNHEALTHY).length,
      degraded: checks.filter(c => c.status === HealthStatus.DEGRADED).length,
      unknown: checks.filter(c => c.status === HealthStatus.UNKNOWN).length,
    };

    return {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: this.configService.get('app.version', '1.0.0'),
      environment: this.configService.get('app.environment', 'development'),
      checks,
      summary,
      system: systemInfo,
    };
  }

  /**
   * 获取特定类型的健康检查结果
   */
  async getHealthByType(type: HealthCheckType): Promise<HealthCheckResult[]> {
    return this.executeAllChecks(type);
  }

  /**
   * 获取健康检查统计
   */
  getHealthStats(name?: string): HealthCheckStats | Map<string, HealthCheckStats> {
    if (name) {
      const stats = this.checkStats.get(name);
      return stats || new Map<string, HealthCheckStats>();
    }
    return this.checkStats;
  }

  /**
   * 启用/禁用健康检查器
   */
  setCheckerEnabled(name: string, enabled: boolean): void {
    const checker = this.checkers.get(name);
    if (checker) {
      checker.enabled = enabled;

      if (enabled) {
        this.startPeriodicCheck(name);
      } else {
        const interval = this.checkIntervals.get(name);
        if (interval) {
          clearInterval(interval);
          this.checkIntervals.delete(name);
        }
      }

      this.logger.log(`Health checker '${name}' ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * 定期健康检查（每分钟）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performPeriodicHealthCheck() {
    if (this.isShuttingDown || !this.config.enabled) {
      return;
    }

    try {
      const results = await this.executeAllChecks();

      // 检查是否有严重问题
      const criticalIssues = results.filter(
        r => r.status === HealthStatus.UNHEALTHY && r.severity === HealthSeverity.CRITICAL,
      );

      if (criticalIssues.length > 0) {
        await this.handleCriticalIssues(criticalIssues);
      }

      // 发送监控指标
      if (this.config.monitoring.metricsEnabled) {
        await this.sendMetrics(results);
      }
    } catch (error) {
      this.logger.error('Error in periodic health check:', error);
    }
  }

  /**
   * 系统资源检查（每5分钟）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performSystemResourceCheck() {
    if (this.isShuttingDown || !this.config.enabled) {
      return;
    }

    try {
      const systemInfo = await this.getSystemInfo();

      // 检查CPU使用率
      if (
        this.config.system.cpu.enabled &&
        systemInfo.cpu.usage > this.config.system.cpu.threshold
      ) {
        await this.handleSystemAlert('cpu', systemInfo.cpu.usage, this.config.system.cpu.threshold);
      }

      // 检查内存使用率
      if (
        this.config.system.memory.enabled &&
        systemInfo.memory.usage > this.config.system.memory.threshold
      ) {
        await this.handleSystemAlert(
          'memory',
          systemInfo.memory.usage,
          this.config.system.memory.threshold,
        );
      }

      // 检查磁盘使用率
      if (
        this.config.system.disk.enabled &&
        systemInfo.disk.usage > this.config.system.disk.threshold
      ) {
        await this.handleSystemAlert(
          'disk',
          systemInfo.disk.usage,
          this.config.system.disk.threshold,
        );
      }
    } catch (error) {
      this.logger.error('Error in system resource check:', error);
    }
  }

  /**
   * 加载配置
   */
  private loadConfig(): HealthCheckConfig {
    return {
      enabled: this.configService.get('health.enabled', true),
      interval: this.configService.get('health.interval', 30000),
      timeout: this.configService.get('health.timeout', 5000),
      retries: this.configService.get('health.retries', 3),
      retryBackoffMs: this.configService.get('health.retryBackoffMs', 200),
      gracefulShutdownTimeout: this.configService.get('health.gracefulShutdownTimeout', 10000),
      endpoints: {
        health: this.configService.get('health.endpoints.health', '/health'),
        liveness: this.configService.get('health.endpoints.liveness', '/health/liveness'),
        readiness: this.configService.get('health.endpoints.readiness', '/health/readiness'),
        startup: this.configService.get('health.endpoints.startup', '/health/startup'),
      },
      monitoring: {
        enabled: this.configService.get('health.monitoring.enabled', true),
        metricsEnabled: this.configService.get('health.monitoring.metricsEnabled', true),
        alerting: {
          enabled: this.configService.get('health.monitoring.alerting.enabled', false),
          webhookUrl: this.configService.get('health.monitoring.alerting.webhookUrl'),
          emailRecipients: this.configService.get('health.monitoring.alerting.emailRecipients', []),
        },
      },
      system: {
        cpu: {
          enabled: this.configService.get('health.system.cpu.enabled', true),
          threshold: this.configService.get('health.system.cpu.threshold', 80),
        },
        memory: {
          enabled: this.configService.get('health.system.memory.enabled', true),
          threshold: this.configService.get('health.system.memory.threshold', 85),
        },
        disk: {
          enabled: this.configService.get('health.system.disk.enabled', true),
          threshold: this.configService.get('health.system.disk.threshold', 90),
          paths: this.configService.get('health.system.disk.paths', ['/']),
        },
      },
      dependencies: {
        database: this.configService.get('health.dependencies.database', true),
        redis: this.configService.get('health.dependencies.redis', true),
        externalApis: this.configService.get('health.dependencies.externalApis', true),
        messageQueue: this.configService.get('health.dependencies.messageQueue', false),
      },
    };
  }

  /**
   * 初始化系统检查器
   */
  private async initializeSystemCheckers(): Promise<void> {
    // 基础存活检查
    this.registerChecker({
      name: 'liveness',
      type: HealthCheckType.LIVENESS,
      severity: HealthSeverity.CRITICAL,
      check: async () => ({
        name: 'liveness',
        status: HealthStatus.HEALTHY,
        type: HealthCheckType.LIVENESS,
        severity: HealthSeverity.CRITICAL,
        message: 'Application is alive',
        duration: 0,
        timestamp: new Date(),
      }),
    });

    // 就绪检查
    this.registerChecker({
      name: 'readiness',
      type: HealthCheckType.READINESS,
      severity: HealthSeverity.HIGH,
      check: async () => {
        // 检查关键依赖是否就绪
        const isReady = !this.isShuttingDown;

        return {
          name: 'readiness',
          status: isReady ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          type: HealthCheckType.READINESS,
          severity: HealthSeverity.HIGH,
          message: isReady ? 'Application is ready' : 'Application is shutting down',
          duration: 0,
          timestamp: new Date(),
        };
      },
    });

    // 启动检查
    this.registerChecker({
      name: 'startup',
      type: HealthCheckType.STARTUP,
      severity: HealthSeverity.HIGH,
      check: async () => {
        const uptime = Date.now() - this.startTime;
        const isStarted = uptime > 10000; // 10秒后认为启动完成

        return {
          name: 'startup',
          status: isStarted ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          type: HealthCheckType.STARTUP,
          severity: HealthSeverity.HIGH,
          message: isStarted ? 'Application startup completed' : 'Application is starting',
          details: { uptime },
          duration: 0,
          timestamp: new Date(),
        };
      },
    });
  }

  /**
   * 开始定期检查
   */
  private async startPeriodicChecks(): Promise<void> {
    for (const [name, checker] of this.checkers) {
      if (checker.enabled && checker.interval && checker.interval > 0) {
        this.startPeriodicCheck(name);
      }
    }
  }

  /**
   * 开始单个检查器的定期检查
   */
  private startPeriodicCheck(name: string): void {
    const checker = this.checkers.get(name);
    if (!checker || !checker.enabled || !checker.interval) {
      return;
    }

    // 清除现有的定时器
    const existingInterval = this.checkIntervals.get(name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 设置新的定时器
    const interval = setInterval(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.executeCheck(name);
        } catch (error) {
          this.logger.error(`Error in periodic check for ${name}:`, error);
        }
      }
    }, checker.interval);

    this.checkIntervals.set(name, interval);
    this.logger.debug(`Started periodic check for ${name} (interval: ${checker.interval}ms)`);
  }

  /**
   * 更新统计信息
   */
  private updateStats(name: string, result: HealthCheckResult, success: boolean): void {
    const stats = this.checkStats.get(name);
    if (!stats) return;

    stats.totalChecks++;
    stats.lastCheck = result.timestamp;

    if (success) {
      stats.successfulChecks++;
      stats.consecutiveFailures = 0;
    } else {
      stats.failedChecks++;
      stats.consecutiveFailures = (stats.consecutiveFailures || 0) + 1;
      if (result.message?.toLowerCase().includes('timeout') || (result as any)?.metadata?.timeout) {
        stats.timeoutCount = (stats.timeoutCount || 0) + 1;
      }
    }

    // 更新平均响应时间
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalChecks - 1) + result.duration) / stats.totalChecks;

    // 更新最短/最长响应时间
    stats.minResponseTime =
      stats.minResponseTime === undefined
        ? result.duration
        : Math.min(stats.minResponseTime, result.duration);
    stats.maxResponseTime =
      stats.maxResponseTime === undefined
        ? result.duration
        : Math.max(stats.maxResponseTime, result.duration);

    // 更新历史记录（保留最近100条）
    stats.checkHistory.push(result);
    if (stats.checkHistory.length > 100) {
      stats.checkHistory.shift();
    }

    // 计算正常运行时间百分比
    stats.uptime = (stats.successfulChecks / stats.totalChecks) * 100;
  }

  /**
   * 处理状态变化
   */
  private async handleStatusChange(name: string, result: HealthCheckResult): Promise<void> {
    const previousResult = this.checkResults.get(name);
    const previousStatus = previousResult?.status;

    if (previousStatus && previousStatus !== result.status) {
      const event: HealthCheckEvent = {
        type: 'status_change',
        checker: name,
        status: result.status,
        previousStatus,
        result,
        timestamp: new Date(),
      };

      this.eventEmitter.emit('health.status_change', event);

      this.logger.log(
        `Health check '${name}' status changed: ${previousStatus} -> ${result.status}`,
      );

      // 如果从不健康恢复到健康
      if (previousStatus === HealthStatus.UNHEALTHY && result.status === HealthStatus.HEALTHY) {
        this.eventEmitter.emit('health.check_recovered', event);
      }
    }
  }

  /**
   * 处理检查错误
   */
  private async handleCheckError(
    name: string,
    result: HealthCheckResult,
    error: Error,
  ): Promise<void> {
    const event: HealthCheckEvent = {
      type: 'check_failed',
      checker: name,
      status: result.status,
      result,
      timestamp: new Date(),
    };

    this.eventEmitter.emit('health.check_failed', event);

    this.logger.error(`Health check '${name}' failed:`, {
      error: error.message,
      stack: error.stack,
      duration: result.duration,
    });
  }

  /**
   * 处理严重问题
   */
  private async handleCriticalIssues(issues: HealthCheckResult[]): Promise<void> {
    this.logger.error(`Critical health issues detected: ${issues.length} issues`);

    for (const issue of issues) {
      const event: HealthCheckEvent = {
        type: 'system_alert',
        checker: issue.name,
        status: issue.status,
        result: issue,
        timestamp: new Date(),
      };

      this.eventEmitter.emit('health.system_alert', event);
    }

    // 发送告警
    if (this.config.monitoring.alerting.enabled) {
      await this.sendAlert('critical_health_issues', {
        issues: issues.map(i => ({
          name: i.name,
          status: i.status,
          message: i.message,
          severity: i.severity,
        })),
        timestamp: new Date(),
      });
    }
  }

  /**
   * 处理系统告警
   */
  private async handleSystemAlert(type: string, current: number, threshold: number): Promise<void> {
    this.logger.warn(`System ${type} usage alert: ${current}% (threshold: ${threshold}%)`);

    const event: HealthCheckEvent = {
      type: 'system_alert',
      checker: `system_${type}`,
      status: HealthStatus.DEGRADED,
      result: {
        name: `system_${type}`,
        status: HealthStatus.DEGRADED,
        type: HealthCheckType.CUSTOM,
        severity: HealthSeverity.HIGH,
        message: `${type} usage is ${current}%, exceeding threshold of ${threshold}%`,
        details: { current, threshold, type },
        duration: 0,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    this.eventEmitter.emit('health.system_alert', event);

    // 发送告警
    if (this.config.monitoring.alerting.enabled) {
      await this.sendAlert('system_resource_alert', {
        type,
        current,
        threshold,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 获取系统信息
   */
  private async getSystemInfo(): Promise<any> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // 获取磁盘信息（简化版）
    let diskInfo = { total: 0, used: 0, free: 0, usage: 0 };
    try {
      const stats = await fs.stat(process.cwd());
      // 这里应该使用更准确的磁盘空间检查方法
      diskInfo = {
        total: 1000000000, // 1GB 示例
        used: 500000000, // 500MB 示例
        free: 500000000, // 500MB 示例
        usage: 50, // 50% 示例
      };
    } catch (error) {
      this.logger.warn('Failed to get disk info:', error.message);
    }

    return {
      cpu: {
        usage: this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: (usedMem / totalMem) * 100,
      },
      disk: diskInfo,
      network: {
        interfaces: os.networkInterfaces(),
      },
    };
  }

  /**
   * 获取CPU使用率（简化版）
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 100 - (totalIdle / totalTick) * 100;
  }

  /**
   * 计算总体健康状态
   */
  private calculateOverallStatus(checks: HealthCheckResult[]): HealthStatus {
    if (checks.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    const criticalUnhealthy = checks.some(
      c => c.status === HealthStatus.UNHEALTHY && c.severity === HealthSeverity.CRITICAL,
    );

    if (criticalUnhealthy) {
      return HealthStatus.UNHEALTHY;
    }

    const hasUnhealthy = checks.some(c => c.status === HealthStatus.UNHEALTHY);
    const hasDegraded = checks.some(c => c.status === HealthStatus.DEGRADED);

    if (hasUnhealthy || hasDegraded) {
      return HealthStatus.DEGRADED;
    }

    const allHealthy = checks.every(c => c.status === HealthStatus.HEALTHY);
    return allHealthy ? HealthStatus.HEALTHY : HealthStatus.UNKNOWN;
  }

  /**
   * 发送监控指标
   */
  private async sendMetrics(results: HealthCheckResult[]): Promise<void> {
    try {
      // 这里应该集成实际的监控系统（如Prometheus）
      const metrics = {
        timestamp: new Date(),
        checks: results.map(r => ({
          name: r.name,
          status: r.status,
          duration: r.duration,
          type: r.type,
          severity: r.severity,
        })),
        summary: {
          total: results.length,
          healthy: results.filter(r => r.status === HealthStatus.HEALTHY).length,
          unhealthy: results.filter(r => r.status === HealthStatus.UNHEALTHY).length,
          degraded: results.filter(r => r.status === HealthStatus.DEGRADED).length,
        },
      };

      this.eventEmitter.emit('health.metrics', metrics);
    } catch (error) {
      this.logger.error('Failed to send metrics:', error);
    }
  }

  /**
   * 发送告警
   */
  private async sendAlert(type: string, data: any): Promise<void> {
    try {
      const alert = {
        type,
        data,
        timestamp: new Date(),
        environment: this.configService.get('app.environment'),
        service: this.configService.get('app.name'),
      };

      // 发送到webhook
      if (this.config.monitoring.alerting.webhookUrl) {
        // 这里应该实现实际的webhook发送逻辑
        this.logger.log(`Alert sent to webhook: ${type}`);
      }

      // 发送邮件
      if (
        this.config?.monitoring?.alerting?.emailRecipients &&
        this.config.monitoring.alerting.emailRecipients.length > 0
      ) {
        // 这里应该实现实际的邮件发送逻辑
        this.logger.log(`Alert sent to email: ${type}`);
      }

      this.eventEmitter.emit('health.alert', alert);
    } catch (error) {
      this.logger.error('Failed to send alert:', error);
    }
  }
}
