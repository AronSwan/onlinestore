// 用途：用户创建事件示例
// 作者：后端开发团队
// 时间：2025-10-05

import { DomainEventBase } from '../events/event.base';

/**
 * 用户创建事件
 */
export class UserCreatedEvent extends DomainEventBase {
  /**
   * 用户ID
   */
  public readonly userId: string;

  /**
   * 用户名
   */
  public readonly username: string;

  /**
   * 邮箱
   */
  public readonly email: string;

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

  /**
   * 创建时间
   */
  public readonly createdAt: Date;

  /**
   * 创建者ID
   */
  public readonly createdBy: string;

  constructor(data: {
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    createdAt: Date;
    createdBy: string;
  }) {
    super('UserCreated', {
      aggregateId: data.userId,
      version: 1,
    });

    this.userId = data.userId;
    this.username = data.username;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.roleIds = data.roleIds;
    this.createdAt = data.createdAt;
    this.createdBy = data.createdBy;
  }

  protected getData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      roleIds: this.roleIds,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
    };
  }
}

/**
 * 用户更新事件
 */
export class UserUpdatedEvent extends DomainEventBase {
  /**
   * 用户ID
   */
  public readonly userId: string;

  /**
   * 更新的字段
   */
  public readonly updatedFields: Record<string, any>;

  /**
   * 更新时间
   */
  public readonly updatedAt: Date;

  /**
   * 更新者ID
   */
  public readonly updatedBy: string;

  constructor(data: {
    userId: string;
    updatedFields: Record<string, any>;
    updatedAt: Date;
    updatedBy: string;
  }) {
    super('UserUpdated', {
      aggregateId: data.userId,
      version: 1,
    });

    this.userId = data.userId;
    this.updatedFields = data.updatedFields;
    this.updatedAt = data.updatedAt;
    this.updatedBy = data.updatedBy;
  }

  protected getData(): Record<string, any> {
    return {
      userId: this.userId,
      updatedFields: this.updatedFields,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }
}

/**
 * 用户删除事件
 */
export class UserDeletedEvent extends DomainEventBase {
  /**
   * 用户ID
   */
  public readonly userId: string;

  /**
   * 删除时间
   */
  public readonly deletedAt: Date;

  /**
   * 删除者ID
   */
  public readonly deletedBy: string;

  constructor(data: { userId: string; deletedAt: Date; deletedBy: string }) {
    super('UserDeleted', {
      aggregateId: data.userId,
      version: 1,
    });

    this.userId = data.userId;
    this.deletedAt = data.deletedAt;
    this.deletedBy = data.deletedBy;
  }

  protected getData(): Record<string, any> {
    return {
      userId: this.userId,
      deletedAt: this.deletedAt,
      deletedBy: this.deletedBy,
    };
  }
}

/**
 * 用户角色分配事件
 */
export class UserRoleAssignedEvent extends DomainEventBase {
  /**
   * 用户ID
   */
  public readonly userId: string;

  /**
   * 角色ID
   */
  public readonly roleId: string;

  /**
   * 分配时间
   */
  public readonly assignedAt: Date;

  /**
   * 分配者ID
   */
  public readonly assignedBy: string;

  constructor(data: { userId: string; roleId: string; assignedAt: Date; assignedBy: string }) {
    super('UserRoleAssigned', {
      aggregateId: data.userId,
      version: 1,
    });

    this.userId = data.userId;
    this.roleId = data.roleId;
    this.assignedAt = data.assignedAt;
    this.assignedBy = data.assignedBy;
  }

  protected getData(): Record<string, any> {
    return {
      userId: this.userId,
      roleId: this.roleId,
      assignedAt: this.assignedAt,
      assignedBy: this.assignedBy,
    };
  }
}

/**
 * 用户角色移除事件
 */
export class UserRoleRemovedEvent extends DomainEventBase {
  /**
   * 用户ID
   */
  public readonly userId: string;

  /**
   * 角色ID
   */
  public readonly roleId: string;

  /**
   * 移除时间
   */
  public readonly removedAt: Date;

  /**
   * 移除者ID
   */
  public readonly removedBy: string;

  constructor(data: { userId: string; roleId: string; removedAt: Date; removedBy: string }) {
    super('UserRoleRemoved', {
      aggregateId: data.userId,
      version: 1,
    });

    this.userId = data.userId;
    this.roleId = data.roleId;
    this.removedAt = data.removedAt;
    this.removedBy = data.removedBy;
  }

  protected getData(): Record<string, any> {
    return {
      userId: this.userId,
      roleId: this.roleId,
      removedAt: this.removedAt,
      removedBy: this.removedBy,
    };
  }
}
