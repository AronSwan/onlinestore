import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 服务类型枚举
 */
export enum ServiceType {
  CORE = 'core',
  ENHANCEMENT = 'enhancement',
  ANALYTICS = 'analytics',
  RECOMMENDATION = 'recommendation',
  SEARCH = 'search',
  NOTIFICATION = 'notification',
  DATABASE = 'database',
  CACHE = 'cache',
  EXTERNAL_API = 'external_api',
  PAYMENT = 'payment',
}

/**
 * 降级级别枚举
 */
export enum DegradationLevel {
  NORMAL = 0,
  LIGHT = 1,
  MODERATE = 2,
  HEAVY = 3,
  EMERGENCY = 4,
}

/**
 * 降级服务
 */
@Injectable()
export class DegradationService {
  private readonly logger = new Logger(DegradationService.name);
  private degradedServices = new Set<string>();
  private config: any = {};

  constructor(private readonly configService: ConfigService) {
    this.loadConfig();
  }

  /**
   * 检查服务是否应该降级
   */
  shouldDegrade(serviceName: string): boolean {
    return this.degradedServices.has(serviceName);
  }

  /**
   * 启用降级
   */
  async enableDegradation(serviceName: string): Promise<void> {
    this.degradedServices.add(serviceName);
    this.logger.warn(`Degradation enabled for service: ${serviceName}`);
  }

  /**
   * 禁用降级
   */
  async disableDegradation(serviceName: string): Promise<void> {
    this.degradedServices.delete(serviceName);
    this.logger.log(`Degradation disabled for service: ${serviceName}`);
  }

  /**
   * 触发降级
   */
  triggerDegradation(serviceName: string, error: any): void {
    this.enableDegradation(serviceName);
    this.logger.error(`Auto-degradation triggered for ${serviceName}:`, error);
  }

  /**
   * 获取超时时间
   */
  getTimeout(serviceName: string): number {
    return this.config.timeouts?.[serviceName] || 5000;
  }

  /**
   * 获取状态
   */
  async getStatus(): Promise<any> {
    return {
      degradedServices: Array.from(this.degradedServices),
      config: this.config,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<any> {
    return this.config;
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: any): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.logger.log('Degradation config updated');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      timeouts: {
        default: 5000,
        PaymentService: 10000,
        OrderService: 8000,
        UserService: 3000,
      },
      autoRecovery: true,
      recoveryInterval: 60000,
    };
  }
}
