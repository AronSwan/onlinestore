import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitoringService, MetricType } from '../monitoring/monitoring.service';
import { EncryptionService } from './encryption.service';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  source: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export enum SecurityEventType {
  // 认证相关
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGOUT = 'LOGOUT',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  MULTIPLE_LOGIN_ATTEMPTS = 'MULTIPLE_LOGIN_ATTEMPTS',

  // 授权相关
  ACCESS_DENIED = 'ACCESS_DENIED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  UNAUTHORIZED_API_ACCESS = 'UNAUTHORIZED_API_ACCESS',

  // 数据安全
  DATA_EXFILTRATION_ATTEMPT = 'DATA_EXFILTRATION_ATTEMPT',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',

  // 系统安全
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ABNORMAL_REQUEST_PATTERN = 'ABNORMAL_REQUEST_PATTERN',

  // 支付安全
  PAYMENT_FRAUD_ATTEMPT = 'PAYMENT_FRAUD_ATTEMPT',
  PAYMENT_CALLBACK_TAMPERING = 'PAYMENT_CALLBACK_TAMPERING',

  // 依赖项安全
  VULNERABLE_DEPENDENCY = 'VULNERABLE_DEPENDENCY',

  // 配置安全
  SECURITY_MISCONFIGURATION = 'SECURITY_MISCONFIGURATION',
}

export enum SecurityEventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface SecurityEventPattern {
  type: SecurityEventType;
  timeWindow: number; // 时间窗口（秒）
  threshold: number; // 阈值
  severity: SecurityEventSeverity;
  action: 'ALERT' | 'BLOCK' | 'RATE_LIMIT';
}

export interface SecurityAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: SecurityEventSeverity;
  message: string;
  events: SecurityEvent[];
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

@Injectable()
export class SecurityMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(SecurityMonitoringService.name);
  private securityEvents: SecurityEvent[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private eventPatterns: Map<string, SecurityEventPattern> = new Map();
  private blockedIPs: Set<string> = new Set();
  private rateLimitedIPs: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly monitoringService: MonitoringService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async onModuleInit() {
    this.logger.log('初始化安全监控服务...');

    // 初始化安全事件模式
    this.initializeEventPatterns();

    // 加载已阻止的IP列表
    await this.loadBlockedIPs();

    this.logger.log('安全监控服务初始化完成');
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    source: string,
    details: Record<string, any>,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      source,
      userId,
      ip,
      userAgent,
      timestamp: new Date(),
      details: this.encryptSensitiveDetails(details),
      resolved: false,
    };

    // 存储事件
    this.securityEvents.push(event);

    // 限制内存中的事件数量
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }

    // 记录审计日志 - 暂时注释掉，因为审计服务可能不存在
    // await this.auditLogService.log({
    //   action: `SECURITY_EVENT_${type}`,
    //   resource: 'security',
    //   userId,
    //   ip,
    //   details: event.details,
    //   timestamp: event.timestamp,
    // });

    // 发布事件
    this.eventEmitter.emit('security.event', event);

    // 检查是否触发规则
    await this.checkEventPatterns(event);

    // 记录指标
    this.monitoringService.recordMetric({
      name: 'security.events.total',
      type: MetricType.COUNTER,
      value: 1,
      labels: {
        type,
        severity,
      },
      timestamp: Date.now(),
      help: 'Total number of security events',
    });

    this.logger.debug(`安全事件已记录: ${type} - ${severity} - ${source}`);

    return event;
  }

  /**
   * 检查事件模式
   */
  private async checkEventPatterns(event: SecurityEvent): Promise<void> {
    const patternKey = `${event.type}_${event.ip || 'no_ip'}_${event.userId || 'no_user'}`;
    const pattern = this.eventPatterns.get(event.type);

    if (!pattern) {
      return;
    }

    // 获取时间窗口内的事件
    const timeWindow = pattern.timeWindow * 1000; // 转换为毫秒
    const now = Date.now();
    const windowStart = now - timeWindow;

    const recentEvents = this.securityEvents.filter(
      e => e.type === event.type && e.ip === event.ip && e.timestamp.getTime() >= windowStart,
    );

    // 检查是否超过阈值
    if (recentEvents.length >= pattern.threshold) {
      await this.triggerSecurityAlert(pattern, recentEvents);
    }
  }

  /**
   * 触发安全告警
   */
  private async triggerSecurityAlert(
    pattern: SecurityEventPattern,
    events: SecurityEvent[],
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      ruleId: pattern.type,
      ruleName: this.getRuleName(pattern.type),
      severity: pattern.severity,
      message: this.generateAlertMessage(pattern, events),
      events,
      triggeredAt: new Date(),
      acknowledged: false,
    };

    // 存储告警
    this.securityAlerts.push(alert);

    // 限制内存中的告警数量
    if (this.securityAlerts.length > 1000) {
      this.securityAlerts = this.securityAlerts.slice(-500);
    }

    // 记录指标
    this.monitoringService.recordMetric({
      name: 'security.alerts.total',
      type: MetricType.COUNTER,
      value: 1,
      labels: {
        severity: pattern.severity,
        rule: pattern.type,
      },
      timestamp: Date.now(),
      help: 'Total number of security alerts',
    });

    // 根据严重程度和动作类型执行相应操作
    if (pattern.action === 'BLOCK' && events[0]?.ip) {
      await this.blockIP(events[0].ip, '自动阻止 - 触发安全规则');
    } else if (pattern.action === 'RATE_LIMIT' && events[0]?.ip) {
      await this.rateLimitIP(events[0].ip, 15 * 60); // 15分钟
    }

    // 发送通知
    await this.sendSecurityNotification(alert);

    // 发布告警事件
    this.eventEmitter.emit('security.alert', alert);

    this.logger.warn(`安全告警已触发: ${alert.ruleName} - ${alert.severity}`);
  }

  /**
   * 阻止IP
   */
  async blockIP(ip: string, reason: string, durationMinutes: number = 60): Promise<void> {
    this.blockedIPs.add(ip);

    // 记录审计日志 - 暂时注释掉，因为审计服务可能不存在
    // await this.auditLogService.log({
    //   action: 'IP_BLOCKED',
    //   resource: 'security',
    //   details: { ip, reason, durationMinutes },
    //   timestamp: new Date(),
    // });

    // 记录指标
    this.monitoringService.recordMetric({
      name: 'security.ip_blocked.total',
      type: MetricType.COUNTER,
      value: 1,
      timestamp: Date.now(),
      help: 'Total number of blocked IPs',
    });

    this.logger.warn(`IP已阻止: ${ip} - 原因: ${reason}`);

    // 如果有Redis，可以设置过期时间
    // await this.redis.setex(`blocked_ip:${ip}`, durationMinutes * 60, 'true');
  }

  /**
   * 限制IP速率
   */
  async rateLimitIP(ip: string, durationSeconds: number): Promise<void> {
    this.rateLimitedIPs.set(ip, {
      count: 1,
      resetTime: Date.now() + durationSeconds * 1000,
    });

    // 记录审计日志 - 暂时注释掉，因为审计服务可能不存在
    // await this.auditLogService.log({
    //   action: 'IP_RATE_LIMITED',
    //   resource: 'security',
    //   details: { ip, durationSeconds },
    //   timestamp: new Date(),
    // });

    // 记录指标
    this.monitoringService.recordMetric({
      name: 'security.ip_rate_limited.total',
      type: MetricType.COUNTER,
      value: 1,
      timestamp: Date.now(),
      help: 'Total number of rate limited IPs',
    });

    this.logger.warn(`IP已限速: ${ip} - 时长: ${durationSeconds}秒`);
  }

  /**
   * 检查IP是否被阻止
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * 检查IP是否被限速
   */
  isIPRateLimited(ip: string): boolean {
    const rateLimit = this.rateLimitedIPs.get(ip);
    if (!rateLimit) {
      return false;
    }

    // 检查是否已过期
    if (Date.now() > rateLimit.resetTime) {
      this.rateLimitedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * 获取安全事件
   */
  getSecurityEvents(
    filters?: {
      type?: SecurityEventType;
      severity?: SecurityEventSeverity;
      userId?: string;
      ip?: string;
      startDate?: Date;
      endDate?: Date;
      resolved?: boolean;
    },
    pagination?: { page: number; limit: number },
  ): { events: SecurityEvent[]; total: number } {
    let events = [...this.securityEvents];

    // 应用过滤器
    if (filters) {
      if (filters.type) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }
      if (filters.userId) {
        events = events.filter(e => e.userId === filters.userId);
      }
      if (filters.ip) {
        events = events.filter(e => e.ip === filters.ip);
      }
      if (filters.startDate) {
        events = events.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        events = events.filter(e => e.timestamp <= filters.endDate!);
      }
      if (filters.resolved !== undefined) {
        events = events.filter(e => e.resolved === filters.resolved);
      }
    }

    // 按时间倒序排序
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = events.length;

    // 应用分页
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.limit;
      events = events.slice(startIndex, startIndex + pagination.limit);
    }

    return { events, total };
  }

  /**
   * 获取安全告警
   */
  getSecurityAlerts(
    filters?: {
      severity?: SecurityEventSeverity;
      acknowledged?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: { page: number; limit: number },
  ): { alerts: SecurityAlert[]; total: number } {
    let alerts = [...this.securityAlerts];

    // 应用过滤器
    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
      }
      if (filters.startDate) {
        alerts = alerts.filter(a => a.triggeredAt >= filters.startDate!);
      }
      if (filters.endDate) {
        alerts = alerts.filter(a => a.triggeredAt <= filters.endDate!);
      }
    }

    // 按时间倒序排序
    alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    const total = alerts.length;

    // 应用分页
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.limit;
      alerts = alerts.slice(startIndex, startIndex + pagination.limit);
    }

    return { alerts, total };
  }

  /**
   * 确认安全告警
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.securityAlerts.find(a => a.id === alertId);

    if (!alert) {
      throw new Error(`告警不存在: ${alertId}`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    // 记录审计日志 - 暂时注释掉，因为审计服务可能不存在
    // await this.auditLogService.log({
    //   action: 'SECURITY_ALERT_ACKNOWLEDGED',
    //   resource: 'security',
    //   resourceId: alertId,
    //   userId,
    //   details: { alertId, ruleName: alert.ruleName },
    //   timestamp: new Date(),
    // });

    this.logger.log(`安全告警已确认: ${alertId} - 用户: ${userId}`);
  }

  /**
   * 定期清理过期数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredData(): Promise<void> {
    const now = Date.now();
    const retentionDays = this.configService.get<number>('SECURITY_LOG_RETENTION_DAYS', 30);
    const cutoffTime = now - retentionDays * 24 * 60 * 60 * 1000;

    // 清理过期的事件
    const initialEventCount = this.securityEvents.length;
    this.securityEvents = this.securityEvents.filter(e => e.timestamp.getTime() > cutoffTime);
    const removedEvents = initialEventCount - this.securityEvents.length;

    // 清理过期的告警
    const initialAlertCount = this.securityAlerts.length;
    this.securityAlerts = this.securityAlerts.filter(a => a.triggeredAt.getTime() > cutoffTime);
    const removedAlerts = initialAlertCount - this.securityAlerts.length;

    // 清理过期的IP限制
    for (const [ip, rateLimit] of this.rateLimitedIPs.entries()) {
      if (now > rateLimit.resetTime) {
        this.rateLimitedIPs.delete(ip);
      }
    }

    if (removedEvents > 0 || removedAlerts > 0) {
      this.logger.debug(`清理过期数据: ${removedEvents} 个事件, ${removedAlerts} 个告警`);
    }
  }

  /**
   * 初始化事件模式
   */
  private initializeEventPatterns(): void {
    // 登录失败模式
    this.eventPatterns.set(SecurityEventType.LOGIN_FAILED, {
      type: SecurityEventType.LOGIN_FAILED,
      timeWindow: 300, // 5分钟
      threshold: 5,
      severity: SecurityEventSeverity.MEDIUM,
      action: 'ALERT',
    });

    // 多次登录失败模式
    this.eventPatterns.set(SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS, {
      type: SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS,
      timeWindow: 900, // 15分钟
      threshold: 10,
      severity: SecurityEventSeverity.HIGH,
      action: 'BLOCK',
    });

    // 访问拒绝模式
    this.eventPatterns.set(SecurityEventType.ACCESS_DENIED, {
      type: SecurityEventType.ACCESS_DENIED,
      timeWindow: 300, // 5分钟
      threshold: 10,
      severity: SecurityEventSeverity.MEDIUM,
      action: 'ALERT',
    });

    // 权限提升尝试模式
    this.eventPatterns.set(SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT, {
      type: SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      timeWindow: 3600, // 1小时
      threshold: 3,
      severity: SecurityEventSeverity.HIGH,
      action: 'BLOCK',
    });

    // 速率限制超出模式
    this.eventPatterns.set(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      timeWindow: 300, // 5分钟
      threshold: 5,
      severity: SecurityEventSeverity.MEDIUM,
      action: 'RATE_LIMIT',
    });

    // 可疑活动模式
    this.eventPatterns.set(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      timeWindow: 1800, // 30分钟
      threshold: 3,
      severity: SecurityEventSeverity.HIGH,
      action: 'ALERT',
    });
  }

  /**
   * 加载已阻止的IP列表
   */
  private async loadBlockedIPs(): Promise<void> {
    try {
      // 这里可以从数据库或Redis加载已阻止的IP列表
      // const blockedIPs = await this.redis.smembers('blocked_ips');
      // blockedIPs.forEach(ip => this.blockedIPs.add(ip));

      this.logger.debug('已加载阻止IP列表');
    } catch (error) {
      this.logger.error('加载阻止IP列表失败:', error);
    }
  }

  /**
   * 加密敏感详情
   */
  private encryptSensitiveDetails(details: Record<string, any>): Record<string, any> {
    const encrypted = { ...details };

    // 加密敏感字段
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encryptionService.encrypt(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取规则名称
   */
  private getRuleName(type: SecurityEventType): string {
    const ruleNames = {
      [SecurityEventType.LOGIN_FAILED]: '登录失败',
      [SecurityEventType.MULTIPLE_LOGIN_ATTEMPTS]: '多次登录尝试',
      [SecurityEventType.ACCESS_DENIED]: '访问拒绝',
      [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: '权限提升尝试',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: '速率限制超出',
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: '可疑活动',
    };

    return (ruleNames as any)[type] || type;
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(pattern: SecurityEventPattern, events: SecurityEvent[]): string {
    const timeWindow = pattern.timeWindow;
    const threshold = pattern.threshold;
    const count = events.length;
    const ip = events[0]?.ip || '未知';

    return `在 ${timeWindow} 秒内从 IP ${ip} 检测到 ${count} 次 ${this.getRuleName(pattern.type)} 事件（阈值: ${threshold}）`;
  }

  /**
   * 发送安全通知
   */
  private async sendSecurityNotification(alert: SecurityAlert): Promise<void> {
    try {
      // 简单的通知记录，实际项目中可以集成邮件、短信等服务
      this.logger.warn(`安全告警通知: ${alert.severity} - ${alert.message}`);

      // 根据严重程度选择通知渠道
      if (alert.severity === SecurityEventSeverity.CRITICAL) {
        // 发送紧急通知 - 这里可以集成实际的通知服务
        this.logger.error(`🚨 紧急安全告警: ${alert.message}`);
      } else if (alert.severity === SecurityEventSeverity.HIGH) {
        // 发送高优先级通知
        this.logger.error(`⚠️ 高优先级安全告警: ${alert.message}`);
      } else {
        // 发送普通通知
        this.logger.warn(`ℹ️ 安全告警: ${alert.message}`);
      }
    } catch (error) {
      this.logger.error('发送安全通知失败:', error);
    }
  }
}
