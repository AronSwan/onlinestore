import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HealthStatus,
  HealthCheckResult,
  SystemHealth,
  HealthCheckEvent,
} from './health-check.service';

// Prometheus指标接口
export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: Record<string, string>;
  value: number;
  timestamp?: number;
}

// 告警配置
export interface AlertConfig {
  enabled: boolean;
  webhookUrl?: string;
  emailConfig?: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
    to: string[];
  };
  slackConfig?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
  thresholds: {
    criticalFailures: number;
    consecutiveFailures: number;
    responseTimeMs: number;
  };
}

// 监控统计
export interface MonitoringStats {
  totalChecks: number;
  healthyChecks: number;
  unhealthyChecks: number;
  degradedChecks: number;
  unknownChecks: number;
  averageResponseTime: number;
  uptime: number;
  lastUpdate: Date;
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

// 告警事件
export interface AlertEvent {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'recovery';
  title: string;
  message: string;
  checker: string;
  status: HealthStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class HealthMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthMonitoringService.name);
  private readonly metrics = new Map<string, PrometheusMetric>();
  private readonly alertHistory = new Map<string, AlertEvent[]>();
  private readonly checkerFailureCount = new Map<string, number>();
  private readonly consecutiveFailures = new Map<string, number>();
  private alertConfig: AlertConfig;
  private monitoringStats: MonitoringStats;
  private startTime: Date;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.startTime = new Date();
    this.initializeConfig();
    this.initializeMetrics();
    this.initializeStats();
  }

  async onModuleInit() {
    this.logger.log('Health monitoring service initialized');

    // 注册事件监听器
    this.setupEventListeners();

    // 初始化监控指标
    this.initializePrometheusMetrics();
  }

  async onModuleDestroy() {
    this.logger.log('Health monitoring service destroyed');
  }

  /**
   * 初始化配置
   */
  private initializeConfig() {
    this.alertConfig = {
      enabled: this.configService.get<boolean>('HEALTH_ALERTS_ENABLED', true),
      webhookUrl: this.configService.get<string>('HEALTH_ALERT_WEBHOOK'),
      emailConfig: {
        enabled: this.configService.get<boolean>('HEALTH_EMAIL_ALERTS_ENABLED', false),
        smtp: {
          host: this.configService.get<string>('SMTP_HOST', 'localhost'),
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: this.configService.get<string>('SMTP_USER', ''),
            pass: this.configService.get<string>('SMTP_PASS', ''),
          },
        },
        from: this.configService.get<string>('HEALTH_EMAIL_FROM', 'health@example.com'),
        to: this.configService.get<string>('HEALTH_EMAIL_TO', '').split(',').filter(Boolean),
      },
      slackConfig: {
        enabled: this.configService.get<boolean>('HEALTH_SLACK_ALERTS_ENABLED', false),
        webhookUrl: this.configService.get<string>('HEALTH_SLACK_WEBHOOK', ''),
        channel: this.configService.get<string>('HEALTH_SLACK_CHANNEL', '#alerts'),
      },
      thresholds: {
        criticalFailures: this.configService.get<number>('HEALTH_CRITICAL_FAILURES_THRESHOLD', 3),
        consecutiveFailures: this.configService.get<number>(
          'HEALTH_CONSECUTIVE_FAILURES_THRESHOLD',
          5,
        ),
        responseTimeMs: this.configService.get<number>('HEALTH_RESPONSE_TIME_THRESHOLD', 5000),
      },
    };
  }

  /**
   * 初始化指标
   */
  private initializeMetrics() {
    const baseMetrics: PrometheusMetric[] = [
      {
        name: 'health_check_total',
        help: 'Total number of health checks performed',
        type: 'counter',
        value: 0,
      },
      {
        name: 'health_check_duration_seconds',
        help: 'Duration of health checks in seconds',
        type: 'histogram',
        value: 0,
      },
      {
        name: 'health_check_status',
        help: 'Current health check status (1=healthy, 0=unhealthy)',
        type: 'gauge',
        value: 1,
      },
      {
        name: 'health_check_failures_total',
        help: 'Total number of health check failures',
        type: 'counter',
        value: 0,
      },
      {
        name: 'health_system_uptime_seconds',
        help: 'System uptime in seconds',
        type: 'gauge',
        value: 0,
      },
      {
        name: 'health_alerts_total',
        help: 'Total number of alerts sent',
        type: 'counter',
        value: 0,
      },
    ];

    baseMetrics.forEach(metric => {
      this.metrics.set(metric.name, metric);
    });
  }

  /**
   * 初始化统计
   */
  private initializeStats() {
    this.monitoringStats = {
      totalChecks: 0,
      healthyChecks: 0,
      unhealthyChecks: 0,
      degradedChecks: 0,
      unknownChecks: 0,
      averageResponseTime: 0,
      uptime: 0,
      lastUpdate: new Date(),
      alerts: {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
      },
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners() {
    // 监听健康检查事件
    this.eventEmitter.on('health.check.completed', this.handleHealthCheckCompleted.bind(this));
    this.eventEmitter.on('health.check.failed', this.handleHealthCheckFailed.bind(this));
    this.eventEmitter.on('health.status.changed', this.handleHealthStatusChanged.bind(this));
    this.eventEmitter.on('health.critical.issue', this.handleCriticalIssue.bind(this));
  }

  /**
   * 初始化Prometheus指标
   */
  private initializePrometheusMetrics() {
    // 这里可以集成实际的Prometheus客户端
    this.logger.log('Prometheus metrics initialized');
  }

  /**
   * 处理健康检查完成事件
   */
  @OnEvent('health.check.completed')
  private async handleHealthCheckCompleted(event: HealthCheckEvent) {
    this.updateMetrics(event);
    this.updateStats(event);

    // 重置连续失败计数
    if (event.result.status === HealthStatus.HEALTHY) {
      this.consecutiveFailures.set(event.result.name, 0);
    }
  }

  /**
   * 处理健康检查失败事件
   */
  @OnEvent('health.check.failed')
  private async handleHealthCheckFailed(event: HealthCheckEvent) {
    this.updateMetrics(event);
    this.updateStats(event);

    // 增加失败计数
    const currentFailures = this.checkerFailureCount.get(event.result.name) || 0;
    const consecutiveFailures = this.consecutiveFailures.get(event.result.name) || 0;

    this.checkerFailureCount.set(event.result.name, currentFailures + 1);
    this.consecutiveFailures.set(event.result.name, consecutiveFailures + 1);

    // 检查是否需要发送告警
    await this.checkAndSendAlert(event);
  }

  /**
   * 处理健康状态变化事件
   */
  @OnEvent('health.status.changed')
  private async handleHealthStatusChanged(event: HealthCheckEvent) {
    this.logger.log(`Health status changed for ${event.result.name}: ${event.result.status}`);

    // 如果状态恢复正常，发送恢复告警
    if (event.result.status === HealthStatus.HEALTHY) {
      await this.sendRecoveryAlert(event.result);
    }
  }

  /**
   * 处理关键问题事件
   */
  @OnEvent('health.critical.issue')
  private async handleCriticalIssue(event: HealthCheckEvent) {
    this.logger.error(`Critical health issue detected: ${event.result.name}`);

    await this.sendCriticalAlert(event.result);
  }

  /**
   * 更新指标
   */
  private updateMetrics(event: HealthCheckEvent) {
    const { result } = event;

    // 更新总检查次数
    const totalMetric = this.metrics.get('health_check_total');
    if (totalMetric) {
      totalMetric.value++;
      totalMetric.labels = { checker: result.name, type: result.type };
    }

    // 更新检查持续时间
    const durationMetric = this.metrics.get('health_check_duration_seconds');
    if (durationMetric && result.duration) {
      durationMetric.value = result.duration / 1000; // 转换为秒
      durationMetric.labels = { checker: result.name };
    }

    // 更新健康状态
    const statusMetric = this.metrics.get('health_check_status');
    if (statusMetric) {
      statusMetric.value = result.status === HealthStatus.HEALTHY ? 1 : 0;
      statusMetric.labels = { checker: result.name, status: result.status };
    }

    // 更新失败次数
    if (result.status !== HealthStatus.HEALTHY) {
      const failuresMetric = this.metrics.get('health_check_failures_total');
      if (failuresMetric) {
        failuresMetric.value++;
        failuresMetric.labels = { checker: result.name, status: result.status };
      }
    }

    // 更新系统运行时间
    const uptimeMetric = this.metrics.get('health_system_uptime_seconds');
    if (uptimeMetric) {
      uptimeMetric.value = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    }
  }

  /**
   * 更新统计
   */
  private updateStats(event: HealthCheckEvent) {
    const { result } = event;

    this.monitoringStats.totalChecks++;

    switch (result.status) {
      case HealthStatus.HEALTHY:
        this.monitoringStats.healthyChecks++;
        break;
      case HealthStatus.UNHEALTHY:
        this.monitoringStats.unhealthyChecks++;
        break;
      case HealthStatus.DEGRADED:
        this.monitoringStats.degradedChecks++;
        break;
      default:
        this.monitoringStats.unknownChecks++;
    }

    // 更新平均响应时间
    if (result.duration) {
      const totalResponseTime =
        this.monitoringStats.averageResponseTime * (this.monitoringStats.totalChecks - 1);
      this.monitoringStats.averageResponseTime =
        (totalResponseTime + result.duration) / this.monitoringStats.totalChecks;
    }

    // 更新运行时间
    this.monitoringStats.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    this.monitoringStats.lastUpdate = new Date();
  }

  /**
   * 检查并发送告警
   */
  private async checkAndSendAlert(event: HealthCheckEvent) {
    if (!this.alertConfig.enabled) return;

    const { result } = event;
    const consecutiveFailures = this.consecutiveFailures.get(result.name) || 0;
    const totalFailures = this.checkerFailureCount.get(result.name) || 0;

    // 检查是否达到告警阈值
    const shouldAlert =
      consecutiveFailures >= this.alertConfig.thresholds.consecutiveFailures ||
      totalFailures >= this.alertConfig.thresholds.criticalFailures ||
      (result.duration && result.duration > this.alertConfig.thresholds.responseTimeMs);

    if (shouldAlert) {
      const alertType = result.severity === 'critical' ? 'critical' : 'warning';
      await this.sendAlert(alertType, result);
    }
  }

  /**
   * 发送告警
   */
  private async sendAlert(type: 'critical' | 'warning' | 'info', result: HealthCheckResult) {
    const alert: AlertEvent = {
      id: `${result.name}-${Date.now()}`,
      type,
      title: `Health Check Alert: ${result.name}`,
      message: `Health check '${result.name}' is ${result.status}. ${result.message || ''}`,
      checker: result.name,
      status: result.status,
      timestamp: new Date(),
      metadata: {
        responseTime: result.duration,
        severity: result.severity,
        consecutiveFailures: this.consecutiveFailures.get(result.name),
        totalFailures: this.checkerFailureCount.get(result.name),
      },
    };

    // 保存告警历史
    const history = this.alertHistory.get(result.name) || [];
    history.push(alert);
    this.alertHistory.set(result.name, history.slice(-10)); // 保留最近10条

    // 更新告警统计
    this.monitoringStats.alerts.total++;
    this.monitoringStats.alerts[type]++;

    // 更新告警指标
    const alertsMetric = this.metrics.get('health_alerts_total');
    if (alertsMetric) {
      alertsMetric.value++;
      alertsMetric.labels = { type, checker: result.name };
    }

    // 发送告警通知
    await Promise.all([
      this.sendWebhookAlert(alert),
      this.sendEmailAlert(alert),
      this.sendSlackAlert(alert),
    ]);

    this.logger.warn(`Alert sent: ${alert.title}`);
  }

  /**
   * 发送恢复告警
   */
  private async sendRecoveryAlert(result: HealthCheckResult) {
    const alert: AlertEvent = {
      id: `${result.name}-recovery-${Date.now()}`,
      type: 'info',
      title: `Health Check Recovered: ${result.name}`,
      message: `Health check '${result.name}' has recovered and is now ${result.status}`,
      checker: result.name,
      status: result.status,
      timestamp: new Date(),
    };

    await this.sendAlert('info', result);
  }

  /**
   * 发送关键告警
   */
  private async sendCriticalAlert(result: HealthCheckResult) {
    await this.sendAlert('critical', result);
  }

  /**
   * 发送Webhook告警
   */
  private async sendWebhookAlert(alert: AlertEvent): Promise<void> {
    if (!this.alertConfig.webhookUrl) return;

    try {
      // 这里应该使用HTTP客户端发送webhook
      // 示例实现
      this.logger.log(`Webhook alert sent: ${alert.title}`);
    } catch (error) {
      this.logger.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * 发送邮件告警
   */
  private async sendEmailAlert(alert: AlertEvent): Promise<void> {
    if (!this.alertConfig.emailConfig?.enabled) return;

    try {
      // 这里应该使用邮件客户端发送邮件
      // 示例实现
      this.logger.log(`Email alert sent: ${alert.title}`);
    } catch (error) {
      this.logger.error('Failed to send email alert:', error);
    }
  }

  /**
   * 发送Slack告警
   */
  private async sendSlackAlert(alert: AlertEvent): Promise<void> {
    if (!this.alertConfig.slackConfig?.enabled) return;

    try {
      // 这里应该使用Slack客户端发送消息
      // 示例实现
      this.logger.log(`Slack alert sent: ${alert.title}`);
    } catch (error) {
      this.logger.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * 定期清理统计数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  private cleanupStats() {
    // 清理旧的告警历史
    for (const [checker, history] of this.alertHistory.entries()) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
      const filtered = history.filter(alert => alert.timestamp > cutoff);
      this.alertHistory.set(checker, filtered);
    }

    this.logger.debug('Stats cleanup completed');
  }

  /**
   * 获取Prometheus指标
   */
  getPrometheusMetrics(): string {
    let output = '';

    for (const [name, metric] of this.metrics.entries()) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;

      const labels = metric.labels
        ? Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';
      const labelStr = labels ? `{${labels}}` : '';

      output += `${name}${labelStr} ${metric.value} ${metric.timestamp || Date.now()}\n`;
    }

    return output;
  }

  /**
   * 获取监控统计
   */
  getMonitoringStats(): MonitoringStats {
    return { ...this.monitoringStats };
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(checker?: string): AlertEvent[] {
    if (checker) {
      return this.alertHistory.get(checker) || [];
    }

    const allAlerts: AlertEvent[] = [];
    for (const history of this.alertHistory.values()) {
      allAlerts.push(...history);
    }

    return allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取失败计数
   */
  getFailureCount(checker?: string): Map<string, number> | number {
    if (checker) {
      return this.checkerFailureCount.get(checker) || 0;
    }

    return new Map(this.checkerFailureCount);
  }

  /**
   * 重置失败计数
   */
  resetFailureCount(checker?: string): void {
    if (checker) {
      this.checkerFailureCount.delete(checker);
      this.consecutiveFailures.delete(checker);
    } else {
      this.checkerFailureCount.clear();
      this.consecutiveFailures.clear();
    }
  }
}
