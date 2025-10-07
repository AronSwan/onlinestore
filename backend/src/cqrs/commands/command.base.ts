// 用途：CQRS命令基础类
// 作者：后端开发团队
// 时间：2025-10-05

import { v4 as uuidv4 } from 'uuid';

/**
 * 命令基础接口
 * 所有命令都应该实现此接口
 */
export interface ICommand {
  /**
   * 命令唯一标识符
   */
  id: string;

  /**
   * 命令创建时间
   */
  timestamp: Date;

  /**
   * 命令元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 抽象命令基类
 * 提供命令的基本实现
 */
export abstract class CommandBase implements ICommand {
  /**
   * 命令唯一标识符
   */
  public readonly id: string;

  /**
   * 命令创建时间
   */
  public readonly timestamp: Date;

  /**
   * 命令元数据
   */
  public readonly metadata?: Record<string, any>;

  constructor(metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.metadata = metadata;
  }

  /**
   * 获取命令名称
   */
  public getName(): string {
    return this.constructor.name;
  }

  /**
   * 序列化命令
   */
  public serialize(): string {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp,
      metadata: this.metadata,
      type: this.getName(),
      data: this.getData(),
    });
  }

  /**
   * 获取命令数据
   * 子类需要实现此方法
   */
  protected abstract getData(): Record<string, any>;
}

/**
 * 命令结果接口
 */
export interface ICommandResult<T = any> {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 结果数据
   */
  data?: T;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 错误代码
   */
  errorCode?: string;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 成功命令结果
 */
export class CommandSuccess<T = any> implements ICommandResult<T> {
  public readonly success = true;
  public readonly data: T;
  public readonly metadata?: Record<string, any>;

  constructor(data: T, metadata?: Record<string, any>) {
    this.data = data;
    this.metadata = metadata;
  }
}

/**
 * 失败命令结果
 */
export class CommandFailure implements ICommandResult {
  public readonly success = false;
  public readonly error: string;
  public readonly errorCode?: string;
  public readonly metadata?: Record<string, any>;

  constructor(error: string, errorCode?: string, metadata?: Record<string, any>) {
    this.error = error;
    this.errorCode = errorCode;
    this.metadata = metadata;
  }
}
