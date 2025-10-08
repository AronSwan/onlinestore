import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

/**
 * 告警级别枚举
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * 告警状态枚举
 */
export enum AlertStatus {
  FIRING = 'firing',
  RESOLVED = 'resolved',
}

/**
 * 告警规则接口
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  condition: string;
  threshold: number;
  duration: number; // 持续时间（秒）
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

/**
 * 告警事件接口
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  resolvedAt?: Date;
}

/**
 * 告警服务
 * 负责监控指标并触发告警
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly alertRules: Map<string, AlertRule> = new Map();
  private readonly activeAlerts: Map<string, AlertEvent> = new Map();
  private readonly alertHistory: AlertEvent[] = [];

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly metricsService: MetricsService,
    private readonly notificationService: NotificationService,
  ) {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultRules(): void {
    // HTTP错误率告警
    this.addAlertRule({
      id: 'http-error-rate',
      name: 'HTTP错误率过高',
      description: '当HTTP错误率超过阈值时触发告警',
      severity: AlertSeverity.WARNING,
      enabled: true,
      condition: 'errorRate',
      threshold: 5, // 5%
      duration: 300, // 5分钟
      labels: { service: 'backend', component: 'http' },
      annotations: {
        summary: 'HTTP错误率过高',
        description: 'HTTP错误率在过去5分钟内超过5%',
      },
    });

    // 平均响应时间告警
    this.addAlertRule({
      id: 'avg-response-time',
      name: '平均响应时间过长',
      description: '当平均响应时间超过阈值时触发告警',
      severity: AlertSeverity.WARNING,
      enabled: true,
      condition: 'avgResponseTime',
      threshold: 1000, // 1000ms
      duration: 300, // 5分钟
      labels: { service: 'backend', component: 'http' },
      annotations: {
        summary: '平均响应时间过长',
        description: '平均响应时间在过去5分钟内超过1000ms',
      },
    });

    // 内存使用率告警
    this.addAlertRule({
      id: 'memory-usage',
      name: '内存使用率过高',
      description: '当内存使用率超过阈值时触发告警',
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      condition: 'memoryUsage',
      threshold: 85, // 85%
      duration: 180, // 3分钟
      labels: { service: 'backend', component: 'system' },
      annotations: {
        summary: '内存使用率过高',
        description: '内存使用率在过去3分钟内超过85%',
      },
    });

    // CPU使用率告警
    this.addAlertRule({
      id: 'cpu-usage',
      name: 'CPU使用率过高',
      description: '当CPU使用率超过阈值时触发告警',
      severity: AlertSeverity.WARNING,
      enabled: true,
      condition: 'cpuUsage',
      threshold: 80, // 80%
      duration: 300, // 5分钟
      labels: { service: 'backend', component: 'system' },
      annotations: {
        summary: 'CPU使用率过高',
        description: 'CPU使用率在过去5分钟内超过80%',
      },
    });

    // 活跃连接数告警
    this.addAlertRule({
      id: 'active-connections',
      name: '活跃连接数过高',
      description: '当活跃连接数超过阈值时触发告警',
      severity: AlertSeverity.WARNING,
      enabled: true,
      condition: 'activeConnections',
      threshold: 100, // 100个连接
      duration: 120, // 2分钟
      labels: { service: 'backend', component: 'system' },
      annotations: {
        summary: '活跃连接数过高',
        description: '活跃连接数在过去2分钟内超过100个',
      },
    });

    // 缓存命中率告警
    this.addAlertRule({
      id: 'cache-hit-rate',
      name: '缓存命中率过低',
      description: '当缓存命中率低于阈值时触发告警',
      severity: AlertSeverity.WARNING,
      enabled: true,
      condition: 'cacheHitRate',
      threshold: 70, // 70%
      duration: 600, // 10分钟
      labels: { service: 'backend', component: 'cache' },
      annotations: {
        summary: '缓存命中率过低',
        description: '缓存命中率在过去10分钟内低于70%',
      },
    });

    this.logger.log(`已初始化 ${this.alertRules.size} 个默认告警规则`);
  }

  /**
   * 添加告警规则
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.debug(`添加告警规则: ${rule.name}`);
  }

  /**
   * 获取所有告警规则
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * 获取启用的告警规则
   */
  getEnabledAlertRules(): AlertRule[] {
    return this.getAlertRules().filter(rule => rule.enabled);
  }

  /**
   * 更新告警规则
   */
  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(id);
    if (!rule) {
      return false;
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(id, updatedRule);
    this.logger.debug(`更新告警规则: ${updatedRule.name}`);
    return true;
  }

  /**
   * 删除告警规则
   */
  deleteAlertRule(id: string): boolean {
    const deleted = this.alertRules.delete(id);
    if (deleted) {
      this.logger.debug(`删除告警规则: ${id}`);
    }
    return deleted;
  }

  /**
   * 获取所有活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit?: number): AlertEvent[] {
    if (limit) {
      return this.alertHistory.slice(-limit);
    }
    return [...this.alertHistory];
  }

  /**
   * 手动解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    this.activeAlerts.delete(alertId);
    this.alertHistory.push({ ...alert });

    this.logger.log(`告警已手动解决: ${alert.ruleName}`);
    return true;
  }

  /**
   * 定期检查告警规则
   * 每分钟执行一次
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlertRules(): Promise<void> {
    try {
      const metrics = this.monitoringService.getMetrics();
      const enabledRules = this.getEnabledAlertRules();

      for (const rule of enabledRules) {
        await this.evaluateRule(rule, metrics);
      }
    } catch (error) {
      this.logger.error('检查告警规则时发生错误', error.stack);
    }
  }

  /**
   * 评估单个告警规则
   */
  private async evaluateRule(rule: AlertRule, metrics: any): Promise<void> {
    const value = this.extractMetricValue(rule.condition, metrics);
    if (value === undefined) {
      return;
    }

    const isThresholdExceeded = value > rule.threshold;
    const alertId = rule.id;

    if (isThresholdExceeded) {
      // 检查是否已有活跃告警
      if (!this.activeAlerts.has(alertId)) {
        // 创建新告警
        const alert: AlertEvent = {
          id: this.generateAlertId(),
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          status: AlertStatus.FIRING,
          message: `${rule.name}: 当前值 ${value} 超过阈值 ${rule.threshold}`,
          value,
          threshold: rule.threshold,
          timestamp: new Date(),
          labels: rule.labels,
          annotations: rule.annotations,
        };

        this.activeAlerts.set(alertId, alert);
        this.alertHistory.push({ ...alert });

        // 发送通知
        await this.sendAlertNotification(alert);

        this.logger.warn(`触发告警: ${rule.name}, 当前值: ${value}, 阈值: ${rule.threshold}`);
      }
    } else {
      // 检查是否有活跃告警需要解决
      if (this.activeAlerts.has(alertId)) {
        const alert = this.activeAlerts.get(alertId)!;
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = new Date();
        this.activeAlerts.delete(alertId);
        this.alertHistory.push({ ...alert });

        // 发送解决通知
        await this.sendAlertResolvedNotification(alert);

        this.logger.log(`告警已解决: ${rule.name}, 当前值: ${value}, 阈值: ${rule.threshold}`);
      }
    }
  }

  /**
   * 从指标中提取特定条件的值
   */
  private extractMetricValue(condition: string, metrics: any): number | undefined {
    switch (condition) {
      case 'errorRate':
        return metrics.errorRate;
      case 'avgResponseTime':
        return metrics.avgResponseTime;
      case 'memoryUsage':
        return metrics.systemInfo?.memoryUsage;
      case 'cpuUsage':
        return metrics.systemInfo?.cpuLoad;
      case 'activeConnections':
        return metrics.activeConnections;
      case 'cacheHitRate':
        return metrics.detailedMetrics?.cache?.hitRate;
      default:
        return undefined;
    }
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 发送告警通知
   */
  private async sendAlertNotification(alert: AlertEvent): Promise<void> {
    try {
      const title = `🚨 ${alert.severity.toUpperCase()}: ${alert.ruleName}`;
      const content = alert.message;
      const adminUserId = 1; // 管理员用户ID

      await this.notificationService.sendNotification(
        adminUserId,
        NotificationType.EMAIL, // 使用邮件通知
        title,
        content,
        {
          alertId: alert.id,
          ruleId: alert.ruleId,
          severity: alert.severity,
          value: alert.value,
          threshold: alert.threshold,
          timestamp: alert.timestamp,
          labels: alert.labels,
          annotations: alert.annotations,
          email: 'admin@example.com', // 管理员邮箱
        },
      );
    } catch (error) {
      this.logger.error('发送告警通知时发生错误', error.stack);
    }
  }

  /**
   * 发送告警解决通知
   */
  private async sendAlertResolvedNotification(alert: AlertEvent): Promise<void> {
    try {
      const title = `✅ 已解决: ${alert.ruleName}`;
      const content = `告警已解决，当前值: ${alert.value}, 阈值: ${alert.threshold}`;
      const adminUserId = 1; // 管理员用户ID

      await this.notificationService.sendNotification(
        adminUserId,
        NotificationType.EMAIL, // 使用邮件通知
        title,
        content,
        {
          alertId: alert.id,
          ruleId: alert.ruleId,
          resolvedAt: alert.resolvedAt,
          labels: alert.labels,
          email: 'admin@example.com', // 管理员邮箱
        },
      );
    } catch (error) {
      this.logger.error('发送告警解决通知时发生错误', error.stack);
    }
  }
}