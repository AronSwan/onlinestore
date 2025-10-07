/**
 * 增强的用户实体，基于PrestaShop领域模型设计
 * 集成值对象和业务规则
 */

import { AggregateRoot } from '@nestjs/cqrs';
import { FirstName } from '../value-objects/first-name.value-object';
import { LastName } from '../value-objects/last-name.value-object';
import { EnhancedEmail } from '../value-objects/enhanced-email.value-object';
import { Birthday } from '../value-objects/birthday.value-object';
import { UserConstraintException, InvalidUserOperationException } from '../errors/user.errors';

export interface UserPreferences {
  newsletterSubscription?: boolean;
  marketingEmails?: boolean;
  preferredLanguage?: string;
  timezone?: string;
}

export interface UserAddress {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export class EnhancedUser extends AggregateRoot {
  private constructor(
    public readonly id: string,
    private _email: EnhancedEmail,
    private _firstName: FirstName,
    private _lastName: LastName,
    private _birthday: Birthday,
    private _hashedPassword: string,
    private _phone?: string,
    private _address?: UserAddress,
    private _preferences?: UserPreferences,
    private _isActive: boolean = true,
    private _emailVerified: boolean = false,
    private _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
    private _lastLoginAt?: Date,
  ) {
    super();
  }

  // Getters for accessing private properties
  get email(): EnhancedEmail {
    return this._email;
  }
  get firstName(): FirstName {
    return this._firstName;
  }
  get lastName(): LastName {
    return this._lastName;
  }
  get birthday(): Birthday {
    return this._birthday;
  }
  get hashedPassword(): string {
    return this._hashedPassword;
  }
  get phone(): string | undefined {
    return this._phone;
  }
  get address(): UserAddress | undefined {
    return this._address;
  }
  get preferences(): UserPreferences | undefined {
    return this._preferences;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get emailVerified(): boolean {
    return this._emailVerified;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  /**
   * 创建新用户
   */
  public static create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthday?: string;
    phone?: string;
    address?: UserAddress;
    preferences?: UserPreferences;
  }): EnhancedUser {
    // 创建值对象进行验证
    const email = new EnhancedEmail(data.email);
    const firstName = new FirstName(data.firstName);
    const lastName = new LastName(data.lastName);
    const birthday = data.birthday ? new Birthday(data.birthday) : Birthday.createEmpty();

    // 生成用户ID
    const id = this.generateId();

    const user = new EnhancedUser(
      id,
      email,
      firstName,
      lastName,
      birthday,
      data.password, // 已经是哈希后的密码
      data.phone,
      data.address,
      data.preferences || this.getDefaultPreferences(),
      true, // 默认激活
      false, // 默认未验证邮箱
      new Date(),
      new Date(),
    );

    // 发布用户创建事件
    user.apply(new UserCreatedEvent(user.id, user.email.value));

    return user;
  }

  /**
   * 从持久化数据重建用户
   */
  public static fromPersistence(data: any): EnhancedUser {
    const email = new EnhancedEmail(data.email);
    const firstName = new FirstName(data.firstName);
    const lastName = new LastName(data.lastName);
    const birthday = data.birthday ? new Birthday(data.birthday) : Birthday.createEmpty();

    return new EnhancedUser(
      data.id,
      email,
      firstName,
      lastName,
      birthday,
      data.hashedPassword,
      data.phone,
      data.address,
      data.preferences,
      data.isActive,
      data.emailVerified,
      data.createdAt,
      data.updatedAt,
      data.lastLoginAt,
    );
  }

  /**
   * 更新邮箱
   */
  public updateEmail(newEmail: string): void {
    const email = new EnhancedEmail(newEmail);

    if (this._email.isEqualTo(email)) {
      return; // 邮箱没有变化
    }

    this._email = email;
    this._emailVerified = false; // 重置邮箱验证状态
    this._updatedAt = new Date();

    this.apply(new UserEmailUpdatedEvent(this.id, email.value));
  }

  /**
   * 更新个人信息
   */
  public updatePersonalInfo(data: {
    firstName?: string;
    lastName?: string;
    birthday?: string;
    phone?: string;
  }): void {
    let hasChanges = false;

    if (data.firstName && data.firstName !== this._firstName.value) {
      this._firstName = new FirstName(data.firstName);
      hasChanges = true;
    }

    if (data.lastName && data.lastName !== this._lastName.value) {
      this._lastName = new LastName(data.lastName);
      hasChanges = true;
    }

    if (data.birthday && data.birthday !== this._birthday.value) {
      this._birthday = new Birthday(data.birthday);
      hasChanges = true;
    }

    if (data.phone !== undefined && data.phone !== this._phone) {
      this._phone = data.phone;
      hasChanges = true;
    }

    if (hasChanges) {
      this._updatedAt = new Date();
      this.apply(new UserPersonalInfoUpdatedEvent(this.id));
    }
  }

  /**
   * 更新地址
   */
  public updateAddress(address: UserAddress): void {
    this._address = { ...address };
    this._updatedAt = new Date();
    this.apply(new UserAddressUpdatedEvent(this.id));
  }

  /**
   * 更新偏好设置
   */
  public updatePreferences(preferences: Partial<UserPreferences>): void {
    this._preferences = {
      ...this._preferences,
      ...preferences,
    };
    this._updatedAt = new Date();
    this.apply(new UserPreferencesUpdatedEvent(this.id));
  }

  /**
   * 激活用户
   */
  public activate(): void {
    if (this._isActive) {
      return;
    }

    this._isActive = true;
    this._updatedAt = new Date();
    this.apply(new UserActivatedEvent(this.id));
  }

  /**
   * 停用用户
   */
  public deactivate(): void {
    if (!this._isActive) {
      return;
    }

    this._isActive = false;
    this._updatedAt = new Date();
    this.apply(new UserDeactivatedEvent(this.id));
  }

  /**
   * 验证邮箱
   */
  public verifyEmail(): void {
    if (this._emailVerified) {
      return;
    }

    this._emailVerified = true;
    this._updatedAt = new Date();
    this.apply(new UserEmailVerifiedEvent(this.id, this._email.value));
  }

  /**
   * 记录登录
   */
  public recordLogin(): void {
    this.assertUserIsActive();
    this.assertEmailIsVerified();

    this._lastLoginAt = new Date();
    this.apply(new UserLoggedInEvent(this.id));
  }

  /**
   * 获取全名
   */
  public getFullName(): string {
    return `${this._firstName.getFormatted()} ${this._lastName.getFormatted()}`;
  }

  /**
   * 获取年龄
   */
  public getAge(): number | null {
    return this._birthday.getAge();
  }

  /**
   * 检查是否为成年人
   */
  public isAdult(): boolean {
    return this._birthday.isAdult();
  }

  /**
   * 检查是否有完整地址
   */
  public hasCompleteAddress(): boolean {
    return !!(this._address?.street && this._address?.city && this._address?.country);
  }

  /**
   * 转换为持久化格式
   */
  public toPersistence(): any {
    return {
      id: this.id,
      email: this._email.value,
      firstName: this._firstName.value,
      lastName: this._lastName.value,
      birthday: this._birthday.value,
      hashedPassword: this._hashedPassword,
      phone: this._phone,
      address: this._address,
      preferences: this._preferences,
      isActive: this._isActive,
      emailVerified: this._emailVerified,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt,
    };
  }

  /**
   * 断言用户处于活跃状态
   */
  private assertUserIsActive(): void {
    if (!this._isActive) {
      throw new InvalidUserOperationException('login', 'User account is deactivated');
    }
  }

  /**
   * 断言邮箱已验证
   */
  private assertEmailIsVerified(): void {
    if (!this._emailVerified) {
      throw new InvalidUserOperationException(
        'login',
        'Email address must be verified before login',
      );
    }
  }

  /**
   * 生成用户ID
   */
  private static generateId(): string {
    return require('crypto').randomUUID();
  }

  /**
   * 获取默认偏好设置
   */
  private static getDefaultPreferences(): UserPreferences {
    return {
      newsletterSubscription: false,
      marketingEmails: false,
      preferredLanguage: 'en',
      timezone: 'UTC',
    };
  }
}

// 领域事件
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}

export class UserEmailUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
  ) {}
}

export class UserPersonalInfoUpdatedEvent {
  constructor(public readonly userId: string) {}
}

export class UserAddressUpdatedEvent {
  constructor(public readonly userId: string) {}
}

export class UserPreferencesUpdatedEvent {
  constructor(public readonly userId: string) {}
}

export class UserActivatedEvent {
  constructor(public readonly userId: string) {}
}

export class UserDeactivatedEvent {
  constructor(public readonly userId: string) {}
}

export class UserEmailVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}

export class UserLoggedInEvent {
  constructor(public readonly userId: string) {}
}
