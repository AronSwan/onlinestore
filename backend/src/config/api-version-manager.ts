// 用途：API版本控制管理，支持多版本API共存
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:40:00

import { createMasterConfiguration } from './unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

export class ApiVersionManager {
  private static readonly SUPPORTED_VERSIONS = ['v1', 'v2'];
  private static readonly DEFAULT_VERSION = 'v1';
  private static readonly DEPRECATION_WARNING_DAYS = 90;

  /**
   * 验证API版本
   */
  static validateVersion(version: string): { valid: boolean; message?: string } {
    if (!version) {
      return { valid: true, message: `使用默认版本: ${this.DEFAULT_VERSION}` };
    }

    if (!this.SUPPORTED_VERSIONS.includes(version)) {
      return {
        valid: false,
        message: `不支持的API版本: ${version}。支持的版本: ${this.SUPPORTED_VERSIONS.join(', ')}`,
      };
    }

    // 检查版本弃用状态
    const deprecationInfo = this.getDeprecationInfo(version);
    if (deprecationInfo.isDeprecated) {
      return {
        valid: true,
        message: `警告: API版本 ${version} 已弃用。将在 ${deprecationInfo.daysUntilRemoval} 天后移除`,
      };
    }

    return { valid: true };
  }

  /**
   * 获取版本配置
   */
  static getVersionConfig(version: string) {
    const baseConfig = {
      // 通用配置
      rateLimit: 1000,
      timeout: 30000,
      maxPayloadSize: '10mb',

      // 版本特定配置
      features: this.getVersionFeatures(version),
      endpoints: this.getVersionEndpoints(version),
      security: this.getVersionSecurity(version),
    };

    return baseConfig;
  }

  /**
   * 处理版本路由
   */
  static routeToVersion(version: string, path: string): string {
    const cleanPath = path.replace(/^\/+/, '');

    switch (version) {
      case 'v1':
        return `/api/v1/${cleanPath}`;
      case 'v2':
        return `/api/v2/${cleanPath}`;
      default:
        return `/api/${this.DEFAULT_VERSION}/${cleanPath}`;
    }
  }

  /**
   * 生成版本化响应头
   */
  static generateVersionHeaders(version: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Version': version,
      'X-API-Deprecated': this.getDeprecationInfo(version).isDeprecated ? 'true' : 'false',
    };

    const deprecationInfo = this.getDeprecationInfo(version);
    if (deprecationInfo.isDeprecated) {
      headers['X-API-Deprecation-Date'] = deprecationInfo.removalDate.toISOString();
      headers['X-API-Sunset'] = `将在 ${deprecationInfo.daysUntilRemoval} 天后移除`;
    }

    return headers;
  }

  /**
   * 版本迁移工具
   */
  static migration = {
    /**
     * 检查v1到v2的迁移兼容性
     */
    checkV1ToV2Compatibility(data: any): { compatible: boolean; issues: string[] } {
      const issues: string[] = [];

      // 检查必填字段
      if (!data.id) {
        issues.push('缺少id字段');
      }

      // 检查字段类型变更
      if (data.createdAt && typeof data.createdAt !== 'string') {
        issues.push('createdAt字段类型应为字符串');
      }

      // 检查已移除字段
      if (data.legacyField) {
        issues.push('legacyField字段在v2中已移除');
      }

      return {
        compatible: issues.length === 0,
        issues,
      };
    },

    /**
     * 将v1数据转换为v2格式
     */
    migrateV1ToV2(data: any): any {
      const migrated = { ...data };

      // 重命名字段
      if (migrated.oldName) {
        migrated.newName = migrated.oldName;
        delete migrated.oldName;
      }

      // 转换日期格式
      if (migrated.createdAt) {
        migrated.createdAt = new Date(migrated.createdAt).toISOString();
      }

      // 添加新字段
      migrated.apiVersion = 'v2';
      migrated.migratedAt = new Date().toISOString();

      return migrated;
    },
  };

  /**
   * 版本功能特性
   */
  private static getVersionFeatures(version: string) {
    const baseFeatures = {
      pagination: true,
      filtering: true,
      sorting: true,
      search: true,
    };

    switch (version) {
      case 'v1':
        return {
          ...baseFeatures,
          bulkOperations: false,
          realTimeUpdates: false,
          webhookSupport: false,
        };
      case 'v2':
        return {
          ...baseFeatures,
          bulkOperations: true,
          realTimeUpdates: true,
          webhookSupport: true,
          graphQL: true,
          openAPI: true,
        };
      default:
        return baseFeatures;
    }
  }

  /**
   * 版本端点配置
   */
  private static getVersionEndpoints(version: string) {
    const baseEndpoints = {
      products: '/products',
      orders: '/orders',
      users: '/users',
      auth: '/auth',
    };

    switch (version) {
      case 'v1':
        return baseEndpoints;
      case 'v2':
        return {
          ...baseEndpoints,
          analytics: '/analytics',
          webhooks: '/webhooks',
          subscriptions: '/subscriptions',
        };
      default:
        return baseEndpoints;
    }
  }

  /**
   * 版本安全配置
   */
  private static getVersionSecurity(version: string) {
    const baseSecurity = {
      httpsRequired: true,
      rateLimiting: true,
      cors: true,
    };

    switch (version) {
      case 'v1':
        return {
          ...baseSecurity,
          jwtExpiration: '1h',
          refreshToken: false,
          twoFactor: false,
        };
      case 'v2':
        return {
          ...baseSecurity,
          jwtExpiration: '24h',
          refreshToken: true,
          twoFactor: true,
          apiKey: true,
          oauth: true,
        };
      default:
        return baseSecurity;
    }
  }

  /**
   * 获取弃用信息
   */
  private static getDeprecationInfo(version: string) {
    const deprecationSchedule: Record<string, { deprecated: boolean; removalDate: Date }> = {
      v1: {
        deprecated: false,
        removalDate: new Date('2026-12-31'),
      },
      v2: {
        deprecated: false,
        removalDate: new Date('2027-12-31'),
      },
    };

    const info = deprecationSchedule[version] || {
      deprecated: false,
      removalDate: new Date('2030-12-31'),
    };

    const daysUntilRemoval = Math.ceil(
      (info.removalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return {
      isDeprecated: info.deprecated,
      removalDate: info.removalDate,
      daysUntilRemoval: Math.max(0, daysUntilRemoval),
    };
  }

  /**
   * 生成API文档链接
   */
  static generateDocumentationLinks(version: string) {
    const baseUrl = 'https://api.caddy-shopping.com/docs';

    return {
      current: `${baseUrl}/${version}`,
      changelog: `${baseUrl}/changelog`,
      migration: `${baseUrl}/migration-guide`,
      support: `${baseUrl}/support`,
    };
  }

  /**
   * 生成版本管理报告
   */
  static generateVersionReport(): string {
    let report = '📊 API版本管理配置报告\n\n';

    report += '🔧 版本信息:\n';
    report += `  - 默认版本: ${this.DEFAULT_VERSION}\n`;
    report += `  - 支持版本: ${this.SUPPORTED_VERSIONS.join(', ')}\n`;
    report += `  - 弃用警告期: ${this.DEPRECATION_WARNING_DAYS}天\n\n`;

    report += '📋 版本特性对比:\n';
    this.SUPPORTED_VERSIONS.forEach(version => {
      const features = this.getVersionFeatures(version);
      const deprecation = this.getDeprecationInfo(version);

      report += `  - ${version}${deprecation.isDeprecated ? ' (已弃用)' : ''}:\n`;
      Object.entries(features).forEach(([feature, enabled]) => {
        report += `    * ${feature}: ${enabled ? '✅' : '❌'}\n`;
      });
    });

    report += '\n🚀 使用示例:\n';
    report += '  - 验证版本: validateVersion("v2")\n';
    report += '  - 路由转换: routeToVersion("v1", "products")\n';
    report += '  - 迁移检查: migration.checkV1ToV2Compatibility(data)\n';

    report += '\n💡 最佳实践:\n';
    report += '  - 新功能在最新版本中开发\n';
    report += '  - 保持向后兼容性至少6个月\n';
    report += '  - 提供清晰的迁移指南\n';
    report += '  - 监控各版本使用情况\n';

    return report;
  }
}
