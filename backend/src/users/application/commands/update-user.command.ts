/**
 * 更新用户命令，基于PrestaShop CQRS模式
 * 封装用户更新的所有必要数据和验证规则
 */

export interface UserAddress {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface UserPreferences {
  newsletterSubscription?: boolean;
  marketingEmails?: boolean;
  preferredLanguage?: string;
  timezone?: string;
}

export class UpdateUserCommand {
  public readonly userId: string;
  public readonly email?: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly birthday?: string;
  public readonly phone?: string;
  public readonly address?: UserAddress;
  public readonly preferences?: UserPreferences;

  constructor(data: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    birthday?: string;
    phone?: string;
    address?: UserAddress;
    preferences?: UserPreferences;
  }) {
    this.userId = data.userId;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.birthday = data.birthday;
    this.phone = data.phone;
    this.address = data.address;
    this.preferences = data.preferences;
  }

  /**
   * 检查是否有任何更新字段
   */
  public hasUpdates(): boolean {
    return !!(
      this.email ||
      this.firstName ||
      this.lastName ||
      this.birthday ||
      this.phone ||
      this.address ||
      this.preferences
    );
  }

  /**
   * 获取用户的全名（如果提供了姓名字段）
   */
  public getFullName(): string | null {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`.trim();
    }
    return null;
  }

  /**
   * 检查是否更新了生日
   */
  public hasBirthdayUpdate(): boolean {
    return !!this.birthday && this.birthday !== '0000-00-00';
  }

  /**
   * 检查是否提供了完整地址更新
   */
  public hasCompleteAddressUpdate(): boolean {
    return !!(this.address?.street && this.address?.city && this.address?.country);
  }

  /**
   * 获取更新的用户偏好设置
   */
  public getUpdatedPreferences(): UserPreferences | null {
    if (!this.preferences) {
      return null;
    }

    return {
      newsletterSubscription: this.preferences.newsletterSubscription ?? false,
      marketingEmails: this.preferences.marketingEmails ?? false,
      preferredLanguage: this.preferences.preferredLanguage ?? 'en',
      timezone: this.preferences.timezone ?? 'UTC',
    };
  }
}
