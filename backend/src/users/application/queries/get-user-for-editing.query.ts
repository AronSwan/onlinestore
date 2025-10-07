/**
 * 获取用户编辑信息查询，基于PrestaShop CQRS模式
 * 用于获取用户的完整编辑信息
 */

export interface UserForEditingResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthday?: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  address?: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  preferences?: {
    newsletterSubscription: boolean;
    marketingEmails: boolean;
    preferredLanguage: string;
    timezone: string;
  };
  sensitiveData?: {
    loginAttempts: number;
    lastFailedLoginAt?: Date;
    passwordChangedAt?: Date;
    securityQuestions: any[];
  };
}

export interface GetUserForEditingOptions {
  includeAddress?: boolean;
  includePreferences?: boolean;
  includeSensitiveData?: boolean;
}

export class GetUserForEditingQuery {
  public readonly userId: string;
  public readonly options: GetUserForEditingOptions;

  constructor(userId: string, options: GetUserForEditingOptions = {}) {
    this.userId = userId;
    this.options = options;
  }

  /**
   * 验证用户ID格式
   */
  public isValidUserId(): boolean {
    // 简单的UUID格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(this.userId);
  }

  /**
   * 获取查询标识符
   */
  public getQueryId(): string {
    return `get-user-for-editing-${this.userId}`;
  }

  /**
   * 是否包含地址信息
   */
  public shouldIncludeAddress(): boolean {
    return this.options.includeAddress === true;
  }

  /**
   * 是否包含偏好设置
   */
  public shouldIncludePreferences(): boolean {
    return this.options.includePreferences === true;
  }

  /**
   * 是否包含敏感数据
   */
  public shouldIncludeSensitiveData(): boolean {
    return this.options.includeSensitiveData === true;
  }
}
