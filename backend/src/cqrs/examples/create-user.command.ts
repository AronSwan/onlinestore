// 用途：创建用户命令示例
// 作者：后端开发团队
// 时间：2025-10-05

import { CommandBase } from '../commands/command.base';

/**
 * 创建用户命令
 */
export class CreateUserCommand extends CommandBase {
  /**
   * 用户名
   */
  public readonly username: string;

  /**
   * 邮箱
   */
  public readonly email: string;

  /**
   * 密码
   */
  public readonly password: string;

  /**
   * 名字
   */
  public readonly firstName: string;

  /**
   * 姓氏
   */
  public readonly lastName: string;

  /**
   * 角色ID列表
   */
  public readonly roleIds: string[];

  constructor(data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
  }) {
    super();
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.roleIds = data.roleIds;
  }

  protected getData(): Record<string, any> {
    return {
      username: this.username,
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      roleIds: this.roleIds,
    };
  }
}

/**
 * 创建用户结果
 */
export interface CreateUserResult {
  /**
   * 用户ID
   */
  userId: string;

  /**
   * 用户名
   */
  username: string;

  /**
   * 邮箱
   */
  email: string;

  /**
   * 创建时间
   */
  createdAt: Date;
}
