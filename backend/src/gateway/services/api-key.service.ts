import { Injectable } from '@nestjs/common';

export interface ApiKeyInfo {
  id: string;
  name: string;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
}

@Injectable()
export class ApiKeyService {
  private apiKeys = new Map<string, ApiKeyInfo>();

  constructor() {
    // 初始化一些测试API密钥
    this.initializeTestKeys();
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    const keyInfo = this.apiKeys.get(apiKey);

    if (!keyInfo || !keyInfo.isActive) {
      return false;
    }

    // 更新使用统计
    keyInfo.lastUsedAt = new Date();
    keyInfo.usageCount++;
    this.apiKeys.set(apiKey, keyInfo);

    return true;
  }

  /**
   * 创建新的API密钥
   */
  async createApiKey(name: string, permissions: string[] = []): Promise<string> {
    const apiKey = this.generateApiKey();
    const keyInfo: ApiKeyInfo = {
      id: apiKey,
      name,
      isActive: true,
      permissions,
      createdAt: new Date(),
      usageCount: 0,
    };

    this.apiKeys.set(apiKey, keyInfo);
    return apiKey;
  }

  /**
   * 禁用API密钥
   */
  async revokeApiKey(apiKey: string): Promise<boolean> {
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo) {
      return false;
    }

    keyInfo.isActive = false;
    this.apiKeys.set(apiKey, keyInfo);
    return true;
  }

  /**
   * 获取活跃的API密钥列表
   */
  async getActiveApiKeys(): Promise<ApiKeyInfo[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.isActive)
      .map(key => ({
        ...key,
        id: key.id.substring(0, 8) + '...', // 隐藏完整密钥
      }));
  }

  /**
   * 获取API密钥信息
   */
  async getApiKeyInfo(apiKey: string): Promise<ApiKeyInfo | null> {
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo) {
      return null;
    }

    return {
      ...keyInfo,
      id: keyInfo.id.substring(0, 8) + '...', // 隐藏完整密钥
    };
  }

  /**
   * 检查API密钥权限
   */
  async checkPermission(apiKey: string, permission: string): Promise<boolean> {
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo || !keyInfo.isActive) {
      return false;
    }

    // 如果没有设置权限，默认允许所有操作
    if (keyInfo.permissions.length === 0) {
      return true;
    }

    return keyInfo.permissions.includes(permission) || keyInfo.permissions.includes('*');
  }

  /**
   * 生成API密钥
   */
  private generateApiKey(): string {
    const prefix = 'csk_'; // Caddy Shopping Key
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * 初始化测试密钥
   */
  private initializeTestKeys(): void {
    // 管理员密钥
    const adminKey = 'csk_admin_test_key_123456789';
    this.apiKeys.set(adminKey, {
      id: adminKey,
      name: 'Admin Test Key',
      isActive: true,
      permissions: ['*'],
      createdAt: new Date(),
      usageCount: 0,
    });

    // 只读密钥
    const readOnlyKey = 'csk_readonly_test_key_987654321';
    this.apiKeys.set(readOnlyKey, {
      id: readOnlyKey,
      name: 'Read Only Test Key',
      isActive: true,
      permissions: ['read'],
      createdAt: new Date(),
      usageCount: 0,
    });
  }
}
