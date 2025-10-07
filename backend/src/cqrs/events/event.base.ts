// 用途：CQRS事件基础类
// 作者：后端开发团队
// 时间：2025-10-05

import { v4 as uuidv4 } from 'uuid';

/**
 * 事件基础接口
 * 所有事件都应该实现此接口
 */
export interface IEvent {
  /**
   * 事件唯一标识符
   */
  id: string;

  /**
   * 事件创建时间
   */
  timestamp: Date;

  /**
   * 事件类型
   */
  eventType: string;

  /**
   * 事件版本
   */
  version: number;

  /**
   * 事件元数据
   */
  metadata?: Record<string, any>;

  /**
   * 聚合根ID
   */
  aggregateId?: string;

  /**
   * 事件流版本
   */
  streamVersion?: number;
}

/**
 * 抽象事件基类
 * 提供事件的基本实现
 */
export abstract class EventBase implements IEvent {
  /**
   * 事件唯一标识符
   */
  public readonly id: string;

  /**
   * 事件创建时间
   */
  public readonly timestamp: Date;

  /**
   * 事件类型
   */
  public readonly eventType: string;

  /**
   * 事件版本
   */
  public readonly version: number;

  /**
   * 事件元数据
   */
  public readonly metadata?: Record<string, any>;

  /**
   * 聚合根ID
   */
  public readonly aggregateId?: string;

  /**
   * 事件流版本
   */
  public readonly streamVersion?: number;

  constructor(
    eventType: string,
    options?: {
      version?: number;
      metadata?: Record<string, any>;
      aggregateId?: string;
      streamVersion?: number;
    },
  ) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.eventType = eventType;
    this.version = options?.version ?? 1;
    this.metadata = options?.metadata;
    this.aggregateId = options?.aggregateId;
    this.streamVersion = options?.streamVersion;
  }

  /**
   * 获取事件名称
   */
  public getName(): string {
    return this.constructor.name;
  }

  /**
   * 序列化事件
   */
  public serialize(): string {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp,
      eventType: this.eventType,
      version: this.version,
      metadata: this.metadata,
      aggregateId: this.aggregateId,
      streamVersion: this.streamVersion,
      type: this.getName(),
      data: this.getData(),
    });
  }

  /**
   * 获取事件数据
   * 子类需要实现此方法
   */
  protected abstract getData(): Record<string, any>;
}

/**
 * 领域事件接口
 */
export interface IDomainEvent extends IEvent {
  /**
   * 事件是否已被处理
   */
  isProcessed?: boolean;

  /**
   * 事件处理时间
   */
  processedAt?: Date;
}

/**
 * 领域事件基类
 */
export abstract class DomainEventBase extends EventBase implements IDomainEvent {
  public isProcessed?: boolean;
  public processedAt?: Date;

  constructor(
    eventType: string,
    options?: {
      version?: number;
      metadata?: Record<string, any>;
      aggregateId?: string;
      streamVersion?: number;
    },
  ) {
    super(eventType, options);
  }

  /**
   * 标记事件为已处理
   */
  public markAsProcessed(): void {
    this.isProcessed = true;
    this.processedAt = new Date();
  }
}

/**
 * 集成事件接口
 */
export interface IIntegrationEvent extends IEvent {
  /**
   * 事件来源服务
   */
  sourceService: string;

  /**
   * 目标服务
   */
  targetService?: string;

  /**
   * 关联ID，用于追踪跨服务操作
   */
  correlationId?: string;
}

/**
 * 集成事件基类
 */
export abstract class IntegrationEventBase extends EventBase implements IIntegrationEvent {
  public readonly sourceService: string;
  public readonly targetService?: string;
  public readonly correlationId?: string;

  constructor(
    eventType: string,
    sourceService: string,
    options?: {
      version?: number;
      metadata?: Record<string, any>;
      aggregateId?: string;
      streamVersion?: number;
      targetService?: string;
      correlationId?: string;
    },
  ) {
    super(eventType, options);
    this.sourceService = sourceService;
    this.targetService = options?.targetService;
    this.correlationId = options?.correlationId;
  }
}

/**
 * 事件存储接口
 */
export interface IEventStore {
  /**
   * 保存事件
   */
  saveEvent(event: IEvent): Promise<void>;

  /**
   * 获取聚合根的事件流
   */
  getEvents(aggregateId: string, fromVersion?: number): Promise<IEvent[]>;

  /**
   * 获取所有事件
   */
  getAllEvents(): Promise<IEvent[]>;

  /**
   * 获取指定类型的事件
   */
  getEventsByType(eventType: string): Promise<IEvent[]>;
}

/**
 * 事件处理器结果接口
 */
export interface IEventHandlerResult {
  /**
   * 是否成功
   */
  success: boolean;

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
 * 成功事件处理器结果
 */
export class EventHandlerSuccess implements IEventHandlerResult {
  public readonly success = true;
  public readonly metadata?: Record<string, any>;

  constructor(metadata?: Record<string, any>) {
    this.metadata = metadata;
  }
}

/**
 * 失败事件处理器结果
 */
export class EventHandlerFailure implements IEventHandlerResult {
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
