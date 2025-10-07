import { Email } from '../value-objects/email.value-object';

export class UserBasicInfo {
  private email: Email;
  private username: string;
  private avatar?: string;
  private phone?: string;

  private constructor(email: Email, username: string, avatar?: string, phone?: string) {
    this.email = email;
    this.username = username;
    this.avatar = avatar;
    this.phone = phone;
  }

  public static create(
    email: string,
    username: string,
    avatar?: string,
    phone?: string,
  ): UserBasicInfo {
    const emailObj = Email.create(email);
    return new UserBasicInfo(emailObj, username, avatar, phone);
  }

  public getEmail(): Email {
    return this.email;
  }

  public getUsername(): string {
    return this.username;
  }

  public getAvatar(): string | undefined {
    return this.avatar;
  }

  public getPhone(): string | undefined {
    return this.phone;
  }

  public updateUsername(username: string): void {
    this.username = username;
  }

  public updateAvatar(avatar: string): void {
    this.avatar = avatar;
  }

  public updatePhone(phone: string): void {
    this.phone = phone;
  }
}
