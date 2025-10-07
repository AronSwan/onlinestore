import * as bcrypt from 'bcrypt';

export class UserSecurity {
  private passwordHash: string;
  private isActive: boolean;
  private loginCount: number;
  private lastLoginAt?: Date;

  private constructor(passwordHash: string, isActive: boolean = true) {
    this.passwordHash = passwordHash;
    this.isActive = isActive;
    this.loginCount = 0;
  }

  public static async create(password: string): Promise<UserSecurity> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    return new UserSecurity(passwordHash);
  }

  public static createFromHash(passwordHash: string, isActive: boolean = true): UserSecurity {
    return new UserSecurity(passwordHash, isActive);
  }

  public async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.passwordHash);
  }

  public async updatePassword(newPassword: string): Promise<void> {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(newPassword, saltRounds);
  }

  public async recordSuccessfulLogin(): Promise<void> {
    this.loginCount++;
    this.lastLoginAt = new Date();
  }

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  public isActiveAccount(): boolean {
    return this.isActive;
  }

  public getLoginStats() {
    return {
      loginCount: this.loginCount,
      lastLoginAt: this.lastLoginAt,
      // 兼容老代码：同时提供 lastLogin 字段
      lastLogin: this.lastLoginAt,
    };
  }

  /**
   * 返回内部密码哈希，兼容持久化层的调用
   */
  public getPasswordHash(): string {
    return this.passwordHash;
  }

  /**
   * 向后兼容：有些持久化层代码期望名为 lastLogin 的字段
   */
  public getLoginStatsLegacy() {
    return {
      loginCount: this.loginCount,
      lastLogin: this.lastLoginAt,
      lastLoginAt: this.lastLoginAt,
    };
  }
}
