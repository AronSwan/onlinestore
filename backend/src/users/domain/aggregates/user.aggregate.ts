// 用途：用户聚合根，封装用户相关的业务逻辑
// 依赖文件：user-basic-info.entity.ts, user-security.entity.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { UserId } from '../value-objects/user-id.value-object';
import { UserBasicInfo } from '../entities/user-basic-info.entity';
import { UserSecurity } from '../entities/user-security.entity';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserProfileUpdatedEvent } from '../events/user-profile-updated.event';
import { UserPasswordChangedEvent } from '../events/user-password-changed.event';

export class UserAggregate extends AggregateRoot {
  private id: UserId;
  private basicInfo: UserBasicInfo;
  private security: UserSecurity;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(id: UserId, basicInfo: UserBasicInfo, security: UserSecurity) {
    super();
    this.id = id;
    this.basicInfo = basicInfo;
    this.security = security;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 创建新用户
   */
  public static async create(
    email: string,
    username: string,
    password: string,
    avatar?: string,
    phone?: string,
  ): Promise<UserAggregate> {
    const id = UserId.generate();
    const basicInfo = UserBasicInfo.create(email, username, avatar, phone);
    const security = await UserSecurity.create(password);

    const user = new UserAggregate(id, basicInfo, security);

    // 发布用户注册事件
    user.addDomainEvent(
      new UserRegisteredEvent(user.id.value.toString(), user.basicInfo.getEmail().value),
    );

    return user;
  }

  /**
   * 从现有数据重建用户聚合根
   */
  public static reconstitute(
    id: number,
    email: string,
    username: string,
    passwordHash: string,
    isActive: boolean,
    avatar?: string,
    phone?: string,
    loginCount?: number,
    lastLoginAt?: Date,
    createdAt?: Date,
    updatedAt?: Date,
  ): UserAggregate {
    const userId = UserId.create(id);
    const basicInfo = UserBasicInfo.create(email, username, avatar, phone);
    const security = UserSecurity.createFromHash(passwordHash, isActive);

    const user = new UserAggregate(userId, basicInfo, security);

    if (createdAt) user.createdAt = createdAt;
    if (updatedAt) user.updatedAt = updatedAt;

    return user;
  }

  /**
   * 更新用户基本信息
   */
  public updateProfile(username?: string, avatar?: string, phone?: string): void {
    if (username) {
      this.basicInfo.updateUsername(username);
    }
    if (avatar) {
      this.basicInfo.updateAvatar(avatar);
    }
    if (phone) {
      this.basicInfo.updatePhone(phone);
    }

    this.updatedAt = new Date();

    // 发布用户资料更新事件
    this.addDomainEvent(
      new UserProfileUpdatedEvent({
        userId: this.id.value.toString(),
        email: this.basicInfo.getEmail().value,
        firstName: this.basicInfo.getUsername(),
        lastName: '',
        phone: this.basicInfo.getPhone(),
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * 更改密码
   */
  public async changePassword(newPassword: string): Promise<void> {
    await this.security.updatePassword(newPassword);
    this.updatedAt = new Date();

    // 发布密码更改事件
    this.addDomainEvent(
      new UserPasswordChangedEvent({
        userId: this.id.value.toString(),
        changedAt: new Date(),
      }),
    );
  }

  /**
   * 验证用户登录
   */
  public async validateLogin(password: string): Promise<boolean> {
    return this.security.validatePassword(password);
  }

  /**
   * 记录成功登录
   */
  public async recordSuccessfulLogin(): Promise<void> {
    await this.security.recordSuccessfulLogin();
    this.updatedAt = new Date();
  }

  /**
   * 激活账户
   */
  public activate(): void {
    this.security.activate();
    this.updatedAt = new Date();
  }

  /**
   * 停用账户
   */
  public deactivate(): void {
    this.security.deactivate();
    this.updatedAt = new Date();
  }

  /**
   * 获取用户ID
   */
  public getId(): UserId {
    return this.id;
  }

  /**
   * 获取邮箱
   */
  public getEmail(): string {
    return this.basicInfo.getEmail().value;
  }

  /**
   * 获取用户名
   */
  public getUsername(): string {
    return this.basicInfo.getUsername();
  }

  /**
   * 获取头像
   */
  public getAvatar(): string | undefined {
    return this.basicInfo.getAvatar();
  }

  /**
   * 获取手机号
   */
  public getPhone(): string | undefined {
    return this.basicInfo.getPhone();
  }

  /**
   * 检查账户是否激活
   */
  public isActive(): boolean {
    return this.security.isActiveAccount();
  }

  /**
   * 获取登录统计
   */
  public getLoginStats() {
    return this.security.getLoginStats();
  }

  /**
   * 获取创建时间
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * 获取更新时间
   */
  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * 转换为普通对象（用于序列化）
   */
  public toJSON(): object {
    return {
      id: this.id.value,
      email: this.getEmail(),
      username: this.getUsername(),
      avatar: this.getAvatar(),
      phone: this.getPhone(),
      isActive: this.isActive(),
      ...this.getLoginStats(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
