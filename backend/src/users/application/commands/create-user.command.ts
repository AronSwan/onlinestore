/**
 * 创建用户命令，基于PrestaShop CQRS模式
 * 封装用户创建的所有必要数据和验证规则
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

export class CreateUserCommand {
  public readonly email: string;
  public readonly password: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly birthday?: string;
  public readonly phone?: string;
  public readonly address?: UserAddress;
  public readonly preferences?: UserPreferences;

  constructor(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthday?: string;
    phone?: string;
    address?: UserAddress;
    preferences?: UserPreferences;
  }) {
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.birthday = data.birthday;
    this.phone = data.phone;
    this.address = data.address;
    this.preferences = data.preferences;
  }

  /**
   * 获取用户的全名
   */
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * 检查是否提供了生日
   */
  public hasBirthday(): boolean {
    return !!this.birthday && this.birthday !== '0000-00-00';
  }

  /**
   * 检查是否提供了完整地址
   */
  public hasCompleteAddress(): boolean {
    return !!(this.address?.street && this.address?.city && this.address?.country);
  }

  /**
   * 获取用户偏好设置
   */
  public getPreferences(): UserPreferences {
    return {
      newsletterSubscription: this.preferences?.newsletterSubscription ?? false,
      marketingEmails: this.preferences?.marketingEmails ?? false,
      preferredLanguage: this.preferences?.preferredLanguage ?? 'en',
      timezone: this.preferences?.timezone ?? 'UTC',
    };
  }
}
