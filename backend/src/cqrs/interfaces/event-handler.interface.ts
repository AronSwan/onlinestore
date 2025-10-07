// 用途：事件处理器接口
// 作者：后端开发团队
// 时间：2025-10-05

import { IEvent, IEventHandlerResult } from '../events/event.base';

/**
 * 事件处理器接口
 * 定义了处理事件的基本契约
 */
export interface IEventHandler<TEvent extends IEvent = IEvent> {
  /**
   * 处理事件
   * @param event 要处理的事件
   * @returns 事件处理结果
   */
  handle(event: TEvent): Promise<IEventHandlerResult>;

  /**
   * 验证事件
   * @param event 要验证的事件
   * @returns 验证结果
   */
  validate?(event: TEvent): Promise<boolean>;

  /**
   * 获取处理器名称
   */
  getName(): string;

  /**
   * 获取支持的事件类型
   */
  getEventType(): string;
}

/**
 * 异步事件处理器接口
 * 用于处理需要长时间执行的事件
 */
export interface IAsyncEventHandler<TEvent extends IEvent = IEvent> extends IEventHandler<TEvent> {
  /**
   * 异步处理事件
   * @param event 要处理的事件
   * @returns 事件处理结果
   */
  handleAsync(event: TEvent): Promise<IEventHandlerResult>;

  /**
   * 获取事件处理状态
   * @param eventId 事件ID
   * @returns 处理状态
   */
  getProcessingStatus?(eventId: string): Promise<EventProcessingStatus>;
}

/**
 * 事件处理状态枚举
 */
export enum EventProcessingStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

/**
 * 事件处理状态信息
 */
export interface EventProcessingStatusInfo {
  /**
   * 事件ID
   */
  eventId: string;

  /**
   * 处理状态
   */
  status: EventProcessingStatus;

  /**
   * 开始时间
   */
  startTime?: Date;

  /**
   * 结束时间
   */
  endTime?: Date;

  /**
   * 重试次数
   */
  retryCount?: number;

  /**
   * 最大重试次数
   */
  maxRetries?: number;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 事件处理器工厂接口
 */
export interface IEventHandlerFactory {
  /**
   * 创建事件处理器
   * @param eventType 事件类型
   * @returns 事件处理器实例
   */
  createHandler<TEvent extends IEvent>(eventType: string): IEventHandler<TEvent> | null;

  /**
   * 注册事件处理器
   * @param eventType 事件类型
   * @param handlerFactory 处理器工厂函数
   */
  registerHandler<TEvent extends IEvent>(
    eventType: string,
    handlerFactory: () => IEventHandler<TEvent>,
  ): void;

  /**
   * 获取所有已注册的事件类型
   */
  getRegisteredEventTypes(): string[];

  /**
   * 获取指定事件类型的所有处理器
   * @param eventType 事件类型
   * @returns 事件处理器列表
   */
  getHandlers<TEvent extends IEvent>(eventType: string): IEventHandler<TEvent>[];
}

/**
 * 事件中间件接口
 */
export interface IEventMiddleware {
  /**
   * 中间件名称
   */
  name: string;

  /**
   * 执行中间件
   * @param event 事件
   * @param next 下一个中间件或处理器
   * @returns 事件处理结果
   */
  execute<TEvent extends IEvent>(
    event: TEvent,
    next: () => Promise<IEventHandlerResult>,
  ): Promise<IEventHandlerResult>;
}

/**
 * 事件管道接口
 */
export interface IEventPipeline {
  /**
   * 添加中间件
   * @param middleware 中间件
   */
  addMiddleware(middleware: IEventMiddleware): void;

  /**
   * 移除中间件
   * @param middlewareName 中间件名称
   */
  removeMiddleware(middlewareName: string): void;

  /**
   * 执行事件管道
   * @param event 事件
   * @param handler 事件处理器
   * @returns 事件处理结果
   */
  execute<TEvent extends IEvent>(
    event: TEvent,
    handler: IEventHandler<TEvent>,
  ): Promise<IEventHandlerResult>;
}

/**
 * 事件监听器接口
 */
export interface IEventListener<TEvent extends IEvent = IEvent> {
  /**
   * 监听事件
   * @param event 事件
   */
  onEvent(event: TEvent): void;

  /**
   * 获取监听器名称
   */
  getName(): string;
}

/**
 * 事件发布器接口
 */
export interface IEventPublisher {
  /**
   * 发布事件
   * @param event 事件
   */
  publish<TEvent extends IEvent>(event: TEvent): Promise<void>;

  /**
   * 批量发布事件
   * @param events 事件列表
   */
  publishBatch<TEvent extends IEvent>(events: TEvent[]): Promise<void>;

  /**
   * 发布延迟事件
   * @param event 事件
   * @param delay 延迟时间（毫秒）
   */
  publishDelayed<TEvent extends IEvent>(event: TEvent, delay: number): Promise<void>;

  /**
   * 发布定时事件
   * @param event 事件
   * @param scheduledTime 定时时间
   */
  publishScheduled<TEvent extends IEvent>(event: TEvent, scheduledTime: Date): Promise<void>;
}

/**
 * 事件订阅器接口
 */
export interface IEventSubscriber {
  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   */
  subscribe<TEvent extends IEvent>(eventType: string, handler: IEventHandler<TEvent>): void;

  /**
   * 取消订阅事件
   * @param eventType 事件类型
   * @param handler 事件处理器
   */
  unsubscribe<TEvent extends IEvent>(eventType: string, handler: IEventHandler<TEvent>): void;

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void;

  /**
   * 获取所有订阅
   */
  getSubscriptions(): Map<string, IEventHandler[]>;
}

/**
 * 事件重试策略接口
 */
export interface IEventRetryStrategy {
  /**
   * 获取重试延迟时间
   * @param retryCount 当前重试次数
   * @param event 事件
   * @returns 延迟时间（毫秒）
   */
  getRetryDelay(retryCount: number, event: IEvent): number;

  /**
   * 判断是否应该重试
   * @param retryCount 当前重试次数
   * @param event 事件
   * @param error 错误信息
   * @returns 是否应该重试
   */
  shouldRetry(retryCount: number, event: IEvent, error: Error): boolean;

  /**
   * 获取最大重试次数
   * @param event 事件
   * @returns 最大重试次数
   */
  getMaxRetries(event: IEvent): number;
}
