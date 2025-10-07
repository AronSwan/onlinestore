import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 多租户配置
 * 借鉴 Snowy-Cloud 的多租户设计
 */
@Injectable()
export class MultiTenantConfig {
  constructor(private configService: ConfigService) {}

  /**
   * 是否启用多租户
   */
  get enabled(): boolean {
    return this.configService.get<boolean>('MULTI_TENANT_ENABLED', false);
  }

  /**
   * 租户识别方式：header | domain | path
   */
  get identifyMode(): string {
    return this.configService.get<string>('TENANT_IDENTIFY_MODE', 'header');
  }

  /**
   * 租户标识字段名
   */
  get tenantField(): string {
    return this.configService.get<string>('TENANT_FIELD', 'tenant-id');
  }

  /**
   * 默认租户ID
   */
  get defaultTenantId(): string {
    return this.configService.get<string>('DEFAULT_TENANT_ID', 'default');
  }

  /**
   * 租户数据库隔离策略：shared | separate
   */
  get isolationStrategy(): string {
    return this.configService.get<string>('TENANT_ISOLATION_STRATEGY', 'shared');
  }
}
