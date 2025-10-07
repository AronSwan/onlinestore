import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TracingService } from '../tracing/tracing.service';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 告警状态
 */
export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

/**
 * 告警类型
 */
export enum AlertType {
  SYSTEM = 'system',
  APPLICATION = 'application',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS = 'business',
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  level: AlertLevel;
  condition: string;
  threshold: number;
  duration: number; // 持续时间（秒）
  enabled: boolean;
  tags: string[];
  actions: AlertAction[];
}

/**
 * 告警动作
 */
export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: any;
  enabled: boolean;
}

/**
 * 告警事件
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  level: AlertLevel;
  type: AlertType;
  status: AlertStatus;
  value: number;
  threshold: number;
  timestamp: Date;
  resolvedAt?: Date;
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * 通知渠道配置
 */
export interface NotificationConfig {
  email?: {
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
    templates: {
      subject: string;
      html: string;
      text: string;
    };
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username: string;
    iconEmoji: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    method: 'POST' | 'PUT';
    headers: Record<string, string>;
    timeout: number;
  };
  sms?: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    from: string;
    to: string[];
  };
}

/**
 * 告警统计
 */
export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  suppressed: number;
  byLevel: Record<AlertLevel, number>;
  byType: Record<AlertType, number>;
  recentAlerts: AlertEvent[];
}

/**
 * 告警服务
 */
@Injectable()
export class AlertingService implements OnModuleInit {
  private readonly logger = new Logger(AlertingService.name);
  private readonly rules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, AlertEvent>();
  private readonly alertHistory: AlertEvent[] = [];
  private notificationConfig: NotificationConfig;
  private emailTransporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: RedisCacheService,
    private readonly tracingService: TracingService,
  ) {
    this.initializeConfig();
  }

  async onModuleInit() {
    this.logger.log('Alerting service initialized');
    await this.loadRules();
    await this.initializeNotifications();
  }

  /**
   * 初始化配置
   */
  private initializeConfig() {
    this.notificationConfig = {
      email: {
        enabled: this.configService.get('ALERT_EMAIL_ENABLED', false),
        smtp: {
          host: this.configService.get('SMTP_HOST', 'localhost'),
          port: this.configService.get('SMTP_PORT', 587),
          secure: this.configService.get('SMTP_SECURE', false),
          auth: {
            user: this.configService.get('SMTP_USER', ''),
            pass: this.configService.get('SMTP_PASS', ''),
          },
        },
        from: this.configService.get('ALERT_EMAIL_FROM', 'alerts@example.com'),
        to: (this.configService.get('ALERT_EMAIL_TO', 'admin@example.com') || 'admin@example.com')
          .split(',')
          .filter(Boolean),
        templates: {
          subject: '[{{level}}] {{title}}',
          html: this.getDefaultEmailTemplate(),
          text: '{{title}}\n\n{{description}}\n\nLevel: {{level}}\nTime: {{timestamp}}',
        },
      },
      slack: {
        enabled: this.configService.get('ALERT_SLACK_ENABLED', false),
        webhookUrl: this.configService.get('SLACK_WEBHOOK_URL', ''),
        channel: this.configService.get('SLACK_CHANNEL', '#alerts'),
        username: this.configService.get('SLACK_USERNAME', 'AlertBot'),
        iconEmoji: this.configService.get('SLACK_ICON', ':warning:'),
      },
      webhook: {
        enabled: this.configService.get('ALERT_WEBHOOK_ENABLED', false),
        url: this.configService.get('WEBHOOK_URL', ''),
        method: this.configService.get('WEBHOOK_METHOD', 'POST') as 'POST' | 'PUT',
        headers: JSON.parse(this.configService.get('WEBHOOK_HEADERS', '{}') || '{}'),
        timeout: this.configService.get('WEBHOOK_TIMEOUT', 5000),
      },
      sms: {
        enabled: this.configService.get('ALERT_SMS_ENABLED', false),
        provider: this.configService.get('SMS_PROVIDER', 'twilio'),
        apiKey: this.configService.get('SMS_API_KEY', ''),
        from: this.configService.get('SMS_FROM', ''),
        to: (this.configService.get('SMS_TO', '') || '').split(',').filter(Boolean),
      },
    };
  }

  /**
   * 加载告警规则
   */
  private async loadRules() {
    // 默认规则
    const defaultRules: AlertRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'CPU usage is above threshold',
        type: AlertType.SYSTEM,
        level: AlertLevel.WARNING,
        condition: 'cpu_usage > threshold',
        threshold: 80,
        duration: 300, // 5分钟
        enabled: true,
        tags: ['system', 'cpu'],
        actions: [
          { type: 'email', config: {}, enabled: true },
          { type: 'slack', config: {}, enabled: true },
        ],
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Memory usage is above threshold',
        type: AlertType.SYSTEM,
        level: AlertLevel.WARNING,
        condition: 'memory_usage > threshold',
        threshold: 85,
        duration: 300,
        enabled: true,
        tags: ['system', 'memory'],
        actions: [{ type: 'email', config: {}, enabled: true }],
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'HTTP error rate is above threshold',
        type: AlertType.APPLICATION,
        level: AlertLevel.ERROR,
        condition: 'error_rate > threshold',
        threshold: 5,
        duration: 180, // 3分钟
        enabled: true,
        tags: ['application', 'http'],
        actions: [
          { type: 'email', config: {}, enabled: true },
          { type: 'slack', config: {}, enabled: true },
          { type: 'webhook', config: {}, enabled: true },
        ],
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Average response time is above threshold',
        type: AlertType.PERFORMANCE,
        level: AlertLevel.WARNING,
        condition: 'avg_response_time > threshold',
        threshold: 1000, // 1秒
        duration: 300,
        enabled: true,
        tags: ['performance', 'response_time'],
        actions: [{ type: 'email', config: {}, enabled: true }],
      },
      {
        id: 'security_breach_attempt',
        name: 'Security Breach Attempt',
        description: 'Multiple failed login attempts detected',
        type: AlertType.SECURITY,
        level: AlertLevel.CRITICAL,
        condition: 'failed_logins > threshold',
        threshold: 10,
        duration: 60, // 1分钟
        enabled: true,
        tags: ['security', 'login'],
        actions: [
          { type: 'email', config: {}, enabled: true },
          { type: 'slack', config: {}, enabled: true },
          { type: 'sms', config: {}, enabled: true },
        ],
      },
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    this.logger.log(`Loaded ${this.rules.size} alert rules`);
  }

  /**
   * 初始化通知渠道
   */
  private async initializeNotifications() {
    // 初始化邮件传输器
    if (this.notificationConfig.email?.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransport(this.notificationConfig.email.smtp);

        // 验证传输器（仅在非测试环境）
        if (process.env.NODE_ENV !== 'test') {
          await this.emailTransporter.verify();
        }

        this.logger.log('Email transporter initialized');
      } catch (error) {
        this.logger.error('Failed to initialize email transporter', error);
        // 在测试环境中，仍然设置一个模拟的传输器
        if (process.env.NODE_ENV === 'test') {
          this.emailTransporter = {
            verify: async () => true,
            sendMail: async () => ({ messageId: 'test-message-id' }),
          } as any;
        }
      }
    }
  }

  /**
   * 检查告警条件
   */
  async checkAlerts(metrics: Record<string, number>) {
    let span;
    try {
      span = this.tracingService.startSpan('alerting.check_alerts');
    } catch (error) {
      this.logger.error('Failed to start tracing span', error);
      // Continue without tracing
    }

    try {
      const rules = Array.from(this.rules.values());
      for (const rule of rules) {
        if (!rule.enabled) continue;

        const shouldAlert = await this.evaluateRule(rule, metrics);

        if (shouldAlert) {
          await this.triggerAlert(rule, metrics);
        } else {
          await this.resolveAlert(rule.id);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check alerts', error);
      if (span) {
        try {
          span.recordException(error);
        } catch (spanError) {
          this.logger.error('Failed to record exception in span', spanError);
        }
      }
    } finally {
      if (span) {
        try {
          span.end();
        } catch (spanError) {
          this.logger.error('Failed to end span', spanError);
        }
      }
    }
  }

  /**
   * 评估告警规则
   */
  private async evaluateRule(rule: AlertRule, metrics: Record<string, number>): Promise<boolean> {
    try {
      // 简单的条件评估
      switch (rule.condition) {
        case 'cpu_usage > threshold':
          return metrics.cpu_usage > rule.threshold;
        case 'memory_usage > threshold':
          return metrics.memory_usage > rule.threshold;
        case 'error_rate > threshold':
          return metrics.error_rate > rule.threshold;
        case 'avg_response_time > threshold':
          return metrics.avg_response_time > rule.threshold;
        case 'failed_logins > threshold':
          return metrics.failed_logins > rule.threshold;
        default:
          // 处理自定义规则，格式应为 "metric_name > threshold"
          const match = rule.condition.match(/^(\w+)\s*>\s*threshold$/);
          if (match) {
            const metricName = match[1];
            return metrics[metricName] > rule.threshold;
          }
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate rule ${rule.id}`, error);
      return false;
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(rule: AlertRule, metrics: Record<string, number>) {
    const alertId = `${rule.id}_${Date.now()}`;
    const existingAlert = this.activeAlerts.get(rule.id);

    // 如果已有活跃告警，检查是否需要更新
    if (existingAlert && existingAlert.status === AlertStatus.ACTIVE) {
      return;
    }

    const alertEvent: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      title: rule.name,
      description: rule.description,
      level: rule.level,
      type: rule.type,
      status: AlertStatus.ACTIVE,
      value: this.getMetricValue(rule, metrics),
      threshold: rule.threshold,
      timestamp: new Date(),
      tags: rule.tags,
      metadata: { metrics, rule },
    };

    this.activeAlerts.set(rule.id, alertEvent);
    this.alertHistory.push(alertEvent);

    // 发送通知
    await this.sendNotifications(alertEvent, rule.actions);

    // 存储到Redis
    await this.storeAlert(alertEvent);

    this.logger.warn(`Alert triggered: ${rule.name}`, {
      alertId,
      level: rule.level,
      value: alertEvent.value,
      threshold: rule.threshold,
    });
  }

  /**
   * 解决告警
   */
  private async resolveAlert(ruleId: string) {
    const activeAlert = this.activeAlerts.get(ruleId);

    if (activeAlert && activeAlert.status === AlertStatus.ACTIVE) {
      activeAlert.status = AlertStatus.RESOLVED;
      activeAlert.resolvedAt = new Date();

      this.activeAlerts.delete(ruleId);

      // 发送解决通知
      const rule = this.rules.get(ruleId);
      if (rule) {
        await this.sendResolutionNotifications(activeAlert, rule.actions);
      }

      await this.storeAlert(activeAlert);

      this.logger.log(`Alert resolved: ${activeAlert.title}`, {
        alertId: activeAlert.id,
        duration: activeAlert.resolvedAt.getTime() - activeAlert.timestamp.getTime(),
      });
    }
  }

  /**
   * 发送通知
   */
  private async sendNotifications(alert: AlertEvent, actions: AlertAction[]) {
    for (const action of actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailNotification(alert);
            break;
          case 'slack':
            await this.sendSlackNotification(alert);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert);
            break;
          case 'sms':
            await this.sendSmsNotification(alert);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send ${action.type} notification`, error);
      }
    }
  }

  /**
   * 发送解决通知
   */
  private async sendResolutionNotifications(alert: AlertEvent, actions: AlertAction[]) {
    const resolutionAlert = {
      ...alert,
      title: `RESOLVED: ${alert.title}`,
      description: `Alert has been resolved: ${alert.description}`,
    };

    await this.sendNotifications(resolutionAlert, actions);
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(alert: AlertEvent) {
    if (!this.notificationConfig.email?.enabled || !this.emailTransporter) {
      this.logger.debug('Email notification skipped: not enabled or transporter not initialized');
      return;
    }

    try {
      const config = this.notificationConfig.email;
      const subject = this.renderTemplate(config.templates.subject, alert);
      const html = this.renderTemplate(config.templates.html, alert);
      const text = this.renderTemplate(config.templates.text, alert);

      await this.emailTransporter.sendMail({
        from: config.from,
        to: config.to,
        subject,
        html,
        text,
      });

      this.logger.log(`Email notification sent for alert: ${alert.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification for alert: ${alert.id}`, error);
    }
  }

  /**
   * 发送Slack通知
   */
  private async sendSlackNotification(alert: AlertEvent) {
    if (!this.notificationConfig.slack?.enabled) {
      return;
    }

    const config = this.notificationConfig.slack;
    const color = this.getSlackColor(alert.level);

    const payload = {
      channel: config.channel,
      username: config.username,
      icon_emoji: config.iconEmoji,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: [
            {
              title: 'Level',
              value: alert.level.toUpperCase(),
              short: true,
            },
            {
              title: 'Type',
              value: alert.type.toUpperCase(),
              short: true,
            },
            {
              title: 'Value',
              value: alert.value.toString(),
              short: true,
            },
            {
              title: 'Threshold',
              value: alert.threshold.toString(),
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: false,
            },
          ],
          footer: 'Monitoring System',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    await axios.post(config.webhookUrl, payload, {
      timeout: 5000,
    });

    this.logger.log(`Slack notification sent for alert: ${alert.id}`);
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(alert: AlertEvent) {
    if (!this.notificationConfig.webhook?.enabled) {
      return;
    }

    const config = this.notificationConfig.webhook;

    await axios({
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: alert,
      timeout: config.timeout,
    });

    this.logger.log(`Webhook notification sent for alert: ${alert.id}`);
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(alert: AlertEvent) {
    if (!this.notificationConfig.sms?.enabled) {
      return;
    }

    // 这里需要根据具体的短信服务提供商实现
    this.logger.log(`SMS notification would be sent for alert: ${alert.id}`);
  }

  /**
   * 获取告警统计
   */
  getStats(): AlertStats {
    const stats: AlertStats = {
      total: this.alertHistory.length,
      active: 0,
      resolved: 0,
      suppressed: 0,
      byLevel: {
        [AlertLevel.INFO]: 0,
        [AlertLevel.WARNING]: 0,
        [AlertLevel.ERROR]: 0,
        [AlertLevel.CRITICAL]: 0,
      },
      byType: {
        [AlertType.SYSTEM]: 0,
        [AlertType.APPLICATION]: 0,
        [AlertType.SECURITY]: 0,
        [AlertType.PERFORMANCE]: 0,
        [AlertType.BUSINESS]: 0,
      },
      recentAlerts: this.alertHistory.slice(-10),
    };

    for (const alert of this.alertHistory) {
      switch (alert.status) {
        case AlertStatus.ACTIVE:
          stats.active++;
          break;
        case AlertStatus.RESOLVED:
          stats.resolved++;
          break;
        case AlertStatus.SUPPRESSED:
          stats.suppressed++;
          break;
      }

      stats.byLevel[alert.level]++;
      stats.byType[alert.type]++;
    }

    return stats;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
    this.logger.log(`Alert rule added: ${rule.id}`);
  }

  /**
   * 更新告警规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.log(`Alert rule updated: ${ruleId}`);
    }
  }

  /**
   * 删除告警规则
   */
  deleteRule(ruleId: string) {
    this.rules.delete(ruleId);
    this.activeAlerts.delete(ruleId);
    this.logger.log(`Alert rule deleted: ${ruleId}`);
  }

  /**
   * 抑制告警
   */
  suppressAlert(alertId: string) {
    const alerts = Array.from(this.activeAlerts.values());
    for (const alert of alerts) {
      if (alert.id === alertId) {
        alert.status = AlertStatus.SUPPRESSED;
        this.logger.log(`Alert suppressed: ${alertId}`);
        break;
      }
    }
  }

  /**
   * 定时清理历史告警
   */
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private async cleanupHistory() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30); // 保留30天

    const before = this.alertHistory.length;
    this.alertHistory.splice(
      0,
      this.alertHistory.findIndex(alert => alert.timestamp > cutoff),
    );
    const after = this.alertHistory.length;

    if (before !== after) {
      this.logger.log(`Cleaned up ${before - after} old alerts`);
    }
  }

  /**
   * 获取指标值
   */
  private getMetricValue(rule: AlertRule, metrics: Record<string, number>): number {
    switch (rule.condition) {
      case 'cpu_usage > threshold':
        return metrics.cpu_usage || 0;
      case 'memory_usage > threshold':
        return metrics.memory_usage || 0;
      case 'error_rate > threshold':
        return metrics.error_rate || 0;
      case 'avg_response_time > threshold':
        return metrics.avg_response_time || 0;
      case 'failed_logins > threshold':
        return metrics.failed_logins || 0;
      default:
        // 处理自定义规则，格式应为 "metric_name > threshold"
        const match = rule.condition.match(/^(\w+)\s*>\s*threshold$/);
        if (match) {
          const metricName = match[1];
          return metrics[metricName] || 0;
        }
        return 0;
    }
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, alert: AlertEvent): string {
    return template
      .replace(/\{\{title\}\}/g, alert.title)
      .replace(/\{\{description\}\}/g, alert.description)
      .replace(/\{\{level\}\}/g, alert.level.toUpperCase())
      .replace(/\{\{type\}\}/g, alert.type.toUpperCase())
      .replace(/\{\{value\}\}/g, alert.value.toString())
      .replace(/\{\{threshold\}\}/g, alert.threshold.toString())
      .replace(/\{\{timestamp\}\}/g, alert.timestamp.toISOString());
  }

  /**
   * 获取Slack颜色
   */
  private getSlackColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO:
        return 'good';
      case AlertLevel.WARNING:
        return 'warning';
      case AlertLevel.ERROR:
        return 'danger';
      case AlertLevel.CRITICAL:
        return '#ff0000';
      default:
        return '#cccccc';
    }
  }

  /**
   * 获取默认邮件模板
   */
  private getDefaultEmailTemplate(): string {
    return `
      <html>
        <body>
          <h2 style="color: {{level === 'critical' ? '#ff0000' : level === 'error' ? '#ff6600' : level === 'warning' ? '#ffaa00' : '#0066cc'}}">
            {{title}}
          </h2>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Level:</strong> {{level}}</p>
          <p><strong>Type:</strong> {{type}}</p>
          <p><strong>Value:</strong> {{value}}</p>
          <p><strong>Threshold:</strong> {{threshold}}</p>
          <p><strong>Time:</strong> {{timestamp}}</p>
        </body>
      </html>
    `;
  }

  /**
   * 存储告警到Redis
   */
  private async storeAlert(alert: AlertEvent) {
    const key = `alert:${alert.id}`;
    await this.cacheService.set(key, JSON.stringify(alert), { ttl: 86400 * 30 }); // 30天
  }
}
